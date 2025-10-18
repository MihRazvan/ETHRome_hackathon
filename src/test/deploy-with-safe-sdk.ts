#!/usr/bin/env tsx
/**
 * Safe SDK Deployment Script
 *
 * This script uses the Safe SDK to programmatically:
 * 1. Upload site to IPFS
 * 2. Create Safe transaction
 * 3. Sign and execute via Safe multisig
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { config } from 'dotenv'
import { parseAbi, namehash, createPublicClient, http, type Address, type Hex, encodeFunctionData } from 'viem'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import { createSafeClient } from '@safe-global/sdk-starter-kit'
import { NAME_WRAPPER_ADDRESS } from '../namewrapper/wrapper.js'
import { IMMUTABLE_FUSES } from '../namewrapper/fuses.js'
import { encodeContentHash } from '../core/ens.js'

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

  console.log('🚀 Safe SDK Deployment')
  console.log('━'.repeat(70))
  console.log('')

  // Load config
  const domain = process.env.SEPOLIA_ENS_DOMAIN!
  const ownerPk = process.env.SEPOLIA_OWNER_PK! as Hex
  const safeAddress = process.env.SAFE_ADDRESS! as Address
  const rpcUrl = process.env.SEPOLIA_RPC_URL!

  if (!domain || !ownerPk || !safeAddress || !rpcUrl) {
    console.error('❌ Missing required environment variables')
    console.error('   Required: SEPOLIA_ENS_DOMAIN, SEPOLIA_OWNER_PK, SAFE_ADDRESS, SEPOLIA_RPC_URL')
    process.exit(1)
  }

  console.log('📋 Configuration')
  console.log('━'.repeat(70))
  console.log(`  Parent Domain: ${domain}`)
  console.log(`  Safe: ${safeAddress}`)
  console.log(`  Network: Sepolia`)
  console.log('')

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

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  })

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

  // Step 3: Create Safe transaction
  console.log('🔐 Step 3: Initialize Safe Client')
  console.log('━'.repeat(70))
  console.log('')

  const apiKey = process.env.SAFE_API_KEY
  if (!apiKey) {
    console.error('❌ Missing SAFE_API_KEY')
    console.error('   Get one at: https://developer.safe.global')
    process.exit(1)
  }

  const safeClient = await createSafeClient({
    provider: rpcUrl,
    signer: ownerPk,
    safeAddress: safeAddress,
    apiKey: apiKey
  })

  console.log('  ✓ Safe client initialized')
  console.log('')

  // Step 4: Prepare transaction data
  console.log('📝 Step 4: Prepare Transactions')
  console.log('━'.repeat(70))
  console.log('')

  const contentHash = encodeContentHash(cid)
  const expiry = 2524608000n // Jan 1, 2050

  console.log(`  Domain: ${fullDomain}`)
  console.log(`  Owner: ${safeAddress}`)
  console.log(`  Resolver: ${SEPOLIA_PUBLIC_RESOLVER}`)
  console.log(`  Content-Hash: ${contentHash}`)
  console.log(`  Fuses: ${IMMUTABLE_FUSES}`)
  console.log('')

  // Transaction 1: Create subdomain with locked fuses
  const nameWrapperAbi = parseAbi([
    'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry) returns (bytes32)'
  ])

  const createSubdomainData = encodeFunctionData({
    abi: nameWrapperAbi,
    functionName: 'setSubnodeRecord',
    args: [parentNode, versionLabel, safeAddress, SEPOLIA_PUBLIC_RESOLVER, 0n, IMMUTABLE_FUSES, expiry]
  })

  // Transaction 2: Set contenthash
  const resolverAbi = parseAbi([
    'function setContenthash(bytes32 node, bytes contenthash)'
  ])

  const subdomainNode = namehash(normalize(fullDomain))
  const setContentHashData = encodeFunctionData({
    abi: resolverAbi,
    functionName: 'setContenthash',
    args: [subdomainNode, contentHash]
  })

  // Create Safe transaction batch
  const transactions = [
    {
      to: NAME_WRAPPER_ADDRESS[sepolia.id],
      data: createSubdomainData,
      value: '0'
    },
    {
      to: SEPOLIA_PUBLIC_RESOLVER,
      data: setContentHashData,
      value: '0'
    }
  ]

  console.log('  Transaction 1: Create subdomain')
  console.log(`    To: ${NAME_WRAPPER_ADDRESS[sepolia.id]}`)
  console.log(`    Data: ${createSubdomainData.slice(0, 66)}...`)
  console.log('')
  console.log('  Transaction 2: Set contenthash')
  console.log(`    To: ${SEPOLIA_PUBLIC_RESOLVER}`)
  console.log(`    Data: ${setContentHashData.slice(0, 66)}...`)
  console.log('')

  if (!options.execute) {
    console.log('━'.repeat(70))
    console.log('')
    console.log('🔍 DRY RUN - Transaction Ready')
    console.log('')
    console.log('Run with --execute to send to Safe')
    console.log('')
    return
  }

  // Step 5: Send Safe transaction
  console.log('✅ Step 5: Send Safe Transaction')
  console.log('━'.repeat(70))
  console.log('')

  try {
    console.log('  ⏳ Sending batch transaction to Safe...')
    console.log('')

    const txResult = await safeClient.send({ transactions })

    const safeTxHash = txResult.transactions?.safeTxHash

    console.log('  ✓ Transaction sent to Safe!')
    console.log(`  Safe Transaction Hash: ${safeTxHash}`)
    console.log('')
    console.log('━'.repeat(70))
    console.log('')
    console.log('🎉 Success!')
    console.log('')
    console.log(`  View in Safe: https://app.safe.global/transactions/queue?safe=sep:${safeAddress}`)
    console.log('')
    console.log('  Since your Safe is 1-of-2, the transaction should execute immediately.')
    console.log('  If threshold > 1, other signers need to approve first.')
    console.log('')
    console.log(`  Once executed, your site will be live at:`)
    console.log(`    https://${fullDomain}.limo`)
    console.log(`    https://w3s.link/ipfs/${cid}`)
    console.log('')
  } catch (error) {
    console.error('❌ Error sending Safe transaction:')
    console.error(error)
    process.exit(1)
  }
}

main().catch(console.error)
