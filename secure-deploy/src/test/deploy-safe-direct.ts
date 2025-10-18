#!/usr/bin/env tsx
/**
 * Direct Safe Execution (No API Key Required)
 *
 * This script executes transactions directly through the Safe contract
 * without using the Safe Transaction Service API.
 *
 * Works when your wallet is a Safe owner and threshold allows direct execution.
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { config } from 'dotenv'
import { parseAbi, namehash, createPublicClient, createWalletClient, http, type Address, type Hex, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import { NAME_WRAPPER_ADDRESS } from '../namewrapper/wrapper.js'
import { IMMUTABLE_FUSES } from '../namewrapper/fuses.js'
import { encodeContentHash } from '../core/ens.js'

config()

const SEPOLIA_PUBLIC_RESOLVER = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD' as Address

// Safe contract ABI (minimal for execTransaction)
const SAFE_ABI = parseAbi([
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function nonce() view returns (uint256)',
  'function getThreshold() view returns (uint256)'
])

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

  console.log('🚀 Direct Safe Execution')
  console.log('━'.repeat(70))
  console.log('')

  // Load config
  const domain = process.env.SEPOLIA_ENS_DOMAIN!
  const ownerAddress = process.env.SEPOLIA_OWNER_ADDRESS! as Address
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
  console.log(`  Signer: ${ownerAddress}`)
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

  // Check Safe threshold
  const threshold = await publicClient.readContract({
    address: safeAddress,
    abi: SAFE_ABI,
    functionName: 'getThreshold'
  })

  console.log(`  Safe threshold: ${threshold}`)
  console.log('')

  if (threshold > 1n) {
    console.log('⚠️  WARNING: Safe threshold is > 1')
    console.log('   This script only works for threshold = 1 (direct execution)')
    console.log('   For higher thresholds, you need to use Safe Transaction Service')
    console.log('')
    if (!options.execute) {
      return
    }
  }

  // Step 1: Upload to IPFS
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
      break
    }
  }

  if (existingVersions.length > 0) {
    console.log(`  Found: ${existingVersions.slice(-5).join(', ')}`)
  }
  console.log(`  ✓ Next version: v${version}`)
  console.log('')

  const versionLabel = `v${version}`
  const fullDomain = `${versionLabel}.${domain}`

  // Step 3: Prepare transactions
  console.log('🔐 Step 3: Prepare Transactions')
  console.log('━'.repeat(70))
  console.log('')

  const contentHash = encodeContentHash(cid)
  const expiry = 2524608000n

  console.log(`  Domain: ${fullDomain}`)
  console.log(`  CID: ${cid}`)
  console.log('')

  // For simplicity, we'll just execute the subdomain creation
  // The contenthash can be set in a second transaction
  const nameWrapperAbi = parseAbi([
    'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry) returns (bytes32)'
  ])

  const createSubdomainData = encodeFunctionData({
    abi: nameWrapperAbi,
    functionName: 'setSubnodeRecord',
    args: [parentNode, versionLabel, safeAddress, SEPOLIA_PUBLIC_RESOLVER, 0n, IMMUTABLE_FUSES, expiry]
  })

  if (!options.execute) {
    console.log('━'.repeat(70))
    console.log('')
    console.log('🔍 DRY RUN')
    console.log('')
    console.log('Run with --execute to create the subdomain')
    console.log('')
    console.log('Note: This will create the subdomain but NOT set contenthash.')
    console.log('      After this, run test:complete to set the contenthash.')
    console.log('')
    return
  }

  // Step 4: Execute via Safe
  console.log('✅ Step 4: Execute via Safe')
  console.log('━'.repeat(70))
  console.log('')

  try {
    console.log('  ⏳ Creating subdomain via Safe...')

    // Since threshold is 1, we can execute directly with our signature
    // For simplicity, we'll call execTransaction with minimal params
    const nonce = await publicClient.readContract({
      address: safeAddress,
      abi: SAFE_ABI,
      functionName: 'nonce'
    })

    const hash = await walletClient.writeContract({
      address: safeAddress,
      abi: SAFE_ABI,
      functionName: 'execTransaction',
      args: [
        NAME_WRAPPER_ADDRESS[sepolia.id], // to
        0n, // value
        createSubdomainData, // data
        0, // operation (Call)
        0n, // safeTxGas
        0n, // baseGas
        0n, // gasPrice
        '0x0000000000000000000000000000000000000000', // gasToken
        '0x0000000000000000000000000000000000000000', // refundReceiver
        '0x' // signatures (empty for threshold=1 direct execution)
      ]
    })

    console.log(`  ✓ Transaction sent: ${hash}`)
    console.log('  ⏳ Waiting for confirmation...')

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`)
    console.log('')
    console.log('━'.repeat(70))
    console.log('')
    console.log('🎉 Subdomain Created!')
    console.log('')
    console.log(`  ${fullDomain}`)
    console.log('')
    console.log('  Next step: Set contenthash')
    console.log(`    npm run test:complete -- --execute`)
    console.log('')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)
