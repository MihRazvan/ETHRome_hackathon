#!/usr/bin/env tsx
/**
 * Safe-Integrated Deployment Script
 *
 * This script creates a Safe multisig proposal for deploying a new immutable version.
 * Instead of executing immediately, it creates a proposal that requires Safe signer approval.
 *
 * Flow:
 * 1. Upload site to IPFS (if CID not provided)
 * 2. Determine next version number
 * 3. Create ENS transaction data
 * 4. Propose to Safe with rich metadata
 * 5. Wait for Safe approval
 * 6. Safe signers execute the transaction
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { config } from 'dotenv'
import { parseAbi, namehash, createPublicClient, createWalletClient, http, type Address, type Hex, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import { NAME_WRAPPER_ADDRESS } from '../namewrapper/wrapper.js'
import { FUSES, IMMUTABLE_FUSES } from '../namewrapper/fuses.js'
import { encodeContentHash } from '../core/ens.js'
import { prepareSafeTransactionData, generateSafeTransactionSignature } from '../core/safe.js'
import type { SafeTransactionData } from '../types.js'

config()

const SEPOLIA_PUBLIC_RESOLVER = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD' as Address

interface DeployOptions {
  cid?: string
  siteDir?: string
  execute?: boolean
}

async function main() {
  const args = process.argv.slice(2)
  const options: DeployOptions = {
    execute: args.includes('--execute'),
    cid: args.find(arg => arg.startsWith('--cid='))?.split('=')[1],
    siteDir: args.find(arg => !arg.startsWith('--')) || './src/test/fixtures/example-site'
  }

  console.log('🚀 Safe-Integrated Deployment')
  console.log('━'.repeat(70))
  console.log('')

  // Load config
  const domain = process.env.SEPOLIA_ENS_DOMAIN!
  const ownerAddress = process.env.SEPOLIA_OWNER_ADDRESS! as Address
  const ownerPk = process.env.SEPOLIA_OWNER_PK! as Hex
  const safeAddress = process.env.SAFE_ADDRESS! as Address
  const rpcUrl = process.env.SEPOLIA_RPC_URL!

  if (!domain || !ownerAddress || !ownerPk || !safeAddress) {
    console.error('❌ Missing required environment variables')
    console.error('   Required: SEPOLIA_ENS_DOMAIN, SEPOLIA_OWNER_ADDRESS, SEPOLIA_OWNER_PK, SAFE_ADDRESS')
    process.exit(1)
  }

  console.log('📋 Configuration')
  console.log('━'.repeat(70))
  console.log(`  Parent Domain: ${domain}`)
  console.log(`  Owner: ${ownerAddress}`)
  console.log(`  Safe: ${safeAddress}`)
  console.log(`  Network: Sepolia`)
  console.log('')

  // Setup clients
  const account = privateKeyToAccount(ownerPk)
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  })
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl)
  })

  // Step 1: Get or upload IPFS CID
  let cid = options.cid
  if (!cid) {
    console.log('📦 Step 1: Upload to IPFS')
    console.log('━'.repeat(70))
    console.log(`  Site directory: ${options.siteDir}`)
    console.log('')

    if (!existsSync(options.siteDir)) {
      console.error(`❌ Directory not found: ${options.siteDir}`)
      process.exit(1)
    }

    console.log('  ⏳ Uploading to Storacha...')
    const output = execSync(`storacha up "${options.siteDir}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    })

    const match = output.match(/bafy[a-z0-9]+/i)
    if (!match) {
      console.error('❌ Failed to extract CID from upload')
      console.error(output)
      process.exit(1)
    }

    cid = match[0]
    console.log(`  ✓ Uploaded: ${cid}`)
    console.log('')
  } else {
    console.log('📦 Step 1: Using provided CID')
    console.log('━'.repeat(70))
    console.log(`  CID: ${cid}`)
    console.log('')
  }

  // Step 2: Determine next version
  console.log('🔍 Step 2: Determine Next Version')
  console.log('━'.repeat(70))
  console.log('')

  const wrapperAbi = parseAbi([
    'function getData(uint256 tokenId) view returns (address owner, uint32 fuses, uint64 expiry)',
  ])

  const parentNode = namehash(normalize(domain))
  let version = 0
  const existingVersions: string[] = []

  // Check v0-v99
  for (let i = 0; i < 100; i++) {
    const versionLabel = `v${i}`
    const subdomainNode = namehash(normalize(`${versionLabel}.${domain}`))
    const tokenId = BigInt(subdomainNode)

    try {
      const data = await publicClient.readContract({
        address: NAME_WRAPPER_ADDRESS[sepolia.id],
        abi: wrapperAbi,
        functionName: 'getData',
        args: [tokenId]
      })

      const [owner] = data
      if (owner !== '0x0000000000000000000000000000000000000000') {
        existingVersions.push(versionLabel)
        version = i + 1
      }
    } catch {
      // Version doesn't exist
    }
  }

  if (existingVersions.length > 0) {
    console.log(`  Found existing versions: ${existingVersions.slice(-5).join(', ')}${existingVersions.length > 5 ? '...' : ''}`)
  }
  console.log(`  ✓ Next version: v${version}`)
  console.log(`  ✓ Will create: v${version}.${domain}`)
  console.log('')

  const versionLabel = `v${version}`
  const fullDomain = `${versionLabel}.${domain}`

  // Step 3: Create ENS transaction data
  console.log('🔐 Step 3: Prepare Safe Transaction')
  console.log('━'.repeat(70))
  console.log('')

  const contentHash = encodeContentHash(cid)
  const labelHash = namehash(versionLabel)
  const expiry = 2524608000n // Jan 1, 2050

  console.log(`  Domain: ${fullDomain}`)
  console.log(`  Owner: ${safeAddress}`)
  console.log(`  Resolver: ${SEPOLIA_PUBLIC_RESOLVER}`)
  console.log(`  Content-Hash: ${contentHash}`)
  console.log(`  Fuses: ${IMMUTABLE_FUSES} (CANNOT_UNWRAP | CANNOT_SET_RESOLVER | PARENT_CANNOT_CONTROL | CAN_EXTEND_EXPIRY)`)
  console.log(`  Expiry: ${expiry} (Jan 1, 2050)`)
  console.log('')

  // Encode the setSubnodeRecord call
  const nameWrapperAbi = parseAbi([
    'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry) returns (bytes32)'
  ])

  const txData: SafeTransactionData = {
    to: NAME_WRAPPER_ADDRESS[sepolia.id],
    value: 0n,
    data: publicClient.encodeFunctionData({
      abi: nameWrapperAbi,
      functionName: 'setSubnodeRecord',
      args: [parentNode, versionLabel, safeAddress, SEPOLIA_PUBLIC_RESOLVER, 0n, IMMUTABLE_FUSES, expiry]
    }) as Hex,
    operation: 0, // Call
    nonce: 0n // Will be fetched from Safe
  }

  // Also need to set the contenthash after subdomain creation
  const resolverAbi = parseAbi([
    'function setContenthash(bytes32 node, bytes contenthash)'
  ])

  const subdomainNode = namehash(normalize(fullDomain))
  const setContentHashData = publicClient.encodeFunctionData({
    abi: resolverAbi,
    functionName: 'setContenthash',
    args: [subdomainNode, contentHash]
  }) as Hex

  console.log('📝 Step 4: Create Safe Proposal')
  console.log('━'.repeat(70))
  console.log('')
  console.log('⚠️  NOTE: This script creates the first transaction (subdomain creation).')
  console.log('   After this is approved and executed, you need to manually create')
  console.log('   a second transaction to set the contenthash.')
  console.log('')
  console.log('   For the hackathon demo, you can combine both into a MultiSend transaction.')
  console.log('')

  if (!options.execute) {
    console.log('🔍 DRY RUN - Transaction Preview')
    console.log('━'.repeat(70))
    console.log('')
    console.log('Transaction 1: Create Subdomain')
    console.log(`  To: ${NAME_WRAPPER_ADDRESS[sepolia.id]}`)
    console.log(`  Data: ${txData.data}`)
    console.log('')
    console.log('Transaction 2: Set Content-Hash')
    console.log(`  To: ${SEPOLIA_PUBLIC_RESOLVER}`)
    console.log(`  Data: ${setContentHashData}`)
    console.log('')
    console.log('━'.repeat(70))
    console.log('')
    console.log('To create this proposal in Safe, you need to:')
    console.log('  1. Go to https://app.safe.global')
    console.log(`  2. Select your Safe: ${safeAddress}`)
    console.log('  3. Create new transaction')
    console.log('  4. Use the transaction data above')
    console.log('')
    console.log('Or run with --execute to use Safe Transaction Service API')
    console.log('(requires Safe Transaction Service setup)')
    console.log('')
    return
  }

  console.log('✅ Creating Safe proposal via Safe Transaction Service...')
  console.log('')
  console.log('⚠️  Safe Transaction Service integration not yet implemented.')
  console.log('   For now, please create the transaction manually in Safe UI:')
  console.log('')
  console.log(`   🔗 https://app.safe.global/home?safe=sep:${safeAddress}`)
  console.log('')
  console.log('━'.repeat(70))
  console.log('')
  console.log('🎉 Summary')
  console.log('━'.repeat(70))
  console.log('')
  console.log(`  Next version: v${version}.${domain}`)
  console.log(`  IPFS CID: ${cid}`)
  console.log(`  Safe: ${safeAddress}`)
  console.log('')
  console.log('  Preview site:')
  console.log(`    https://w3s.link/ipfs/${cid}`)
  console.log('')
  console.log('  After deployment:')
  console.log(`    https://${fullDomain}.limo`)
  console.log(`    https://app.ens.domains/${fullDomain}?chainId=11155111`)
  console.log('')
}

main().catch(console.error)
