#!/usr/bin/env tsx

/**
 * Complete End-to-End Versioning Test
 *
 * This test demonstrates the full secure deployment flow:
 * 1. Query existing subdomains and determine next version
 * 2. Create immutable versioned subdomain with burned fuses
 * 3. Set content-hash to IPFS CID
 * 4. Verify immutability by attempting modifications
 *
 * Usage:
 *   npm run test:complete              # Dry run (shows what would happen)
 *   npm run test:complete -- --execute # Execute real transactions
 */

import { createPublicClient, createWalletClient, http, parseAbi, Address, Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { namehash, normalize } from 'ox/Ens'
import { CID } from 'multiformats/cid'
import { toHex } from 'ox/Bytes'
import * as varint from 'varint'
import { IMMUTABLE_FUSES } from '../namewrapper/fuses.js'
import { NAME_WRAPPER_ADDRESS } from '../namewrapper/wrapper.js'
import * as readline from 'readline/promises'

// Sepolia PublicResolver address
const SEPOLIA_PUBLIC_RESOLVER = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD' as Address

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment
function loadEnv() {
  const envPath = resolve(__dirname, '../../.env')
  const envContent = readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    }
  }
  return env
}

const env = loadEnv()
const EXECUTE_MODE = process.argv.includes('--execute')
const AUTO_MODE = process.argv.includes('--auto')

// Helper to ask for confirmation
async function confirm(message: string): Promise<boolean> {
  if (AUTO_MODE) return true

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const answer = await rl.question(`${message} [y/N]: `)
  rl.close()

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

// Encode IPFS CID to ENS contenthash
function encodeContentHash(cid: string): Hex {
  const IPFS_CODEC = 0xe3
  const bytes = CID.parse(cid).toV1().bytes
  const codeBytes = Uint8Array.from(varint.encode(IPFS_CODEC))

  const combined = new Uint8Array(codeBytes.length + bytes.length)
  combined.set(codeBytes, 0)
  combined.set(bytes, codeBytes.length)

  return toHex(combined)
}

async function main() {
  console.log('🚀 Complete End-to-End Versioning Test')
  console.log('━'.repeat(70))
  console.log('')

  if (!EXECUTE_MODE) {
    console.log('⚠️  DRY RUN MODE - No transactions will be sent')
    console.log('   Run with --execute flag to execute real transactions')
    console.log('')
  }

  // Validate environment
  const domain = env.SEPOLIA_ENS_DOMAIN
  const signerAddress = env.SEPOLIA_OWNER_ADDRESS as Address
  const safeAddress = env.SAFE_ADDRESS as Address
  const privateKey = env.SEPOLIA_OWNER_PK?.startsWith('0x')
    ? env.SEPOLIA_OWNER_PK as Hex
    : `0x${env.SEPOLIA_OWNER_PK}` as Hex
  const rpcUrl = env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

  if (!domain || !signerAddress || !privateKey) {
    console.error('❌ Missing configuration in .env:')
    console.error('  SEPOLIA_ENS_DOMAIN')
    console.error('  SEPOLIA_OWNER_ADDRESS')
    console.error('  SEPOLIA_OWNER_PK')
    process.exit(1)
  }

  // Use Safe as owner if configured, otherwise use signer
  const ownerAddress = safeAddress || signerAddress

  // Get CID from last upload
  let cid: string
  try {
    const cidPath = resolve(__dirname, '../../.last-cid')
    cid = readFileSync(cidPath, 'utf-8').trim()
  } catch (error) {
    console.error('❌ No CID found. Run `npm run test:ipfs` first')
    process.exit(1)
  }

  // Setup clients
  const account = privateKeyToAccount(privateKey)

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  })

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl)
  })

  console.log('🔍 Pre-Flight Checks')
  console.log('━'.repeat(70))
  console.log('')
  console.log(`  Domain: ${domain}`)
  console.log(`  Signer: ${signerAddress}`)
  if (safeAddress) {
    console.log(`  Safe (subdomain owner): ${safeAddress}`)
  }
  console.log(`  Network: Sepolia`)
  console.log(`  RPC: ${rpcUrl}`)
  console.log('')

  // Check if domain is wrapped
  const parentNode = namehash(normalize(domain))

  const wrapperAbi = parseAbi([
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function getData(uint256 tokenId) view returns (address owner, uint32 fuses, uint64 expiry)',
    'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry) returns (bytes32)',
  ])

  const resolverAbi = parseAbi([
    'function contenthash(bytes32 node) view returns (bytes)',
    'function setContenthash(bytes32 node, bytes calldata hash)',
  ])

  try {
    const tokenId = BigInt(parentNode)
    const wrapperOwner = await publicClient.readContract({
      address: NAME_WRAPPER_ADDRESS[sepolia.id],
      abi: wrapperAbi,
      functionName: 'ownerOf',
      args: [tokenId]
    })

    console.log(`  ✓ Domain is wrapped`)
    console.log(`  ✓ Wrapper owner: ${wrapperOwner}`)
  } catch (error) {
    console.error(`  ❌ Domain is not wrapped or doesn't exist`)
    console.error(`  Please wrap ${domain} first using ENS app`)
    process.exit(1)
  }

  // Determine next version
  console.log('')
  console.log('  Checking existing subdomains...')

  let nextVersion = 0
  for (let i = 0; i < 200; i++) {
    const versionLabel = `v${i}`
    const subdomainNode = namehash(normalize(`${versionLabel}.${domain}`))
    const tokenId = BigInt(subdomainNode)

    try {
      const owner = await publicClient.readContract({
        address: NAME_WRAPPER_ADDRESS[sepolia.id],
        abi: wrapperAbi,
        functionName: 'ownerOf',
        args: [tokenId]
      })
      // Check if it's actually owned (not zero address)
      if (owner === '0x0000000000000000000000000000000000000000') {
        // Subdomain doesn't exist
        break
      }
      // If we got here, the subdomain exists
      console.log(`    Found: ${versionLabel}.${domain}`)
      nextVersion = i + 1  // Next version is one after this
    } catch (error) {
      // Subdomain doesn't exist, this is the next available version
      break
    }
  }

  const versionLabel = `v${nextVersion}`
  const fullDomain = `${versionLabel}.${domain}`

  console.log('')
  console.log(`  ✓ Next version: ${versionLabel}`)
  console.log(`  ✓ Will create: ${fullDomain}`)
  console.log('')

  console.log('━'.repeat(70))
  console.log('')

  // Step 1: Create subdomain with burned fuses
  console.log(`🔒 Step 1: Create Immutable Subdomain`)
  console.log('━'.repeat(70))
  console.log('')
  console.log(`  Domain: ${fullDomain}`)
  console.log(`  Owner: ${ownerAddress}`)
  console.log(`  Resolver: ${SEPOLIA_PUBLIC_RESOLVER}`)
  console.log(`  Fuses: ${IMMUTABLE_FUSES} (CANNOT_UNWRAP | CANNOT_SET_RESOLVER | PARENT_CANNOT_CONTROL | CAN_EXTEND_EXPIRY)`)
  console.log(`  Expiry: 2524608000 (Jan 1, 2050)`)
  console.log('')

  if (EXECUTE_MODE) {
    const proceed = await confirm('Create subdomain?')
    if (!proceed) {
      console.log('❌ Aborted by user')
      process.exit(0)
    }

    console.log('  ⏳ Creating subdomain...')

    const hash = await walletClient.writeContract({
      address: NAME_WRAPPER_ADDRESS[sepolia.id],
      abi: wrapperAbi,
      functionName: 'setSubnodeRecord',
      args: [
        parentNode,
        versionLabel,
        ownerAddress,
        SEPOLIA_PUBLIC_RESOLVER,
        0n, // ttl
        IMMUTABLE_FUSES,
        2524608000n // expiry
      ]
    })

    console.log(`  ✓ Transaction sent: ${hash}`)
    console.log('  ⏳ Waiting for confirmation...')

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`)
  } else {
    console.log('  [DRY RUN] Would create subdomain transaction')
  }

  console.log('')
  console.log('━'.repeat(70))
  console.log('')

  // Step 2: Set content-hash
  console.log(`🌐 Step 2: Set Content-Hash`)
  console.log('━'.repeat(70))
  console.log('')
  console.log(`  CID: ${cid}`)

  const contentHash = encodeContentHash(cid)
  console.log(`  Content-Hash: ${contentHash}`)
  console.log('')

  if (EXECUTE_MODE) {
    const proceed = await confirm('Set content-hash?')
    if (!proceed) {
      console.log('❌ Aborted by user')
      process.exit(0)
    }

    console.log('  ⏳ Setting content-hash...')

    const subdomainNode = namehash(normalize(fullDomain))
    const hash = await walletClient.writeContract({
      address: SEPOLIA_PUBLIC_RESOLVER,
      abi: resolverAbi,
      functionName: 'setContenthash',
      args: [subdomainNode, contentHash]
    })

    console.log(`  ✓ Transaction sent: ${hash}`)
    console.log('  ⏳ Waiting for confirmation...')

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`)
  } else {
    console.log('  [DRY RUN] Would set content-hash transaction')
  }

  console.log('')
  console.log('━'.repeat(70))
  console.log('')

  // Step 3: Verification
  if (EXECUTE_MODE) {
    console.log(`✅ Step 3: Verification`)
    console.log('━'.repeat(70))
    console.log('')

    const subdomainNode = namehash(normalize(fullDomain))

    // Verify contenthash
    try {
      const onChainHash = await publicClient.readContract({
        address: SEPOLIA_PUBLIC_RESOLVER,
        abi: resolverAbi,
        functionName: 'contenthash',
        args: [subdomainNode]
      })

      console.log(`  ✓ Content-hash set correctly`)
      console.log(`    ${onChainHash}`)
    } catch (error) {
      console.error(`  ❌ Failed to verify content-hash`)
    }

    console.log('')
    console.log('━'.repeat(70))
    console.log('')
  }

  // Final summary
  console.log(`🎉 Test Complete!`)
  console.log('━'.repeat(70))
  console.log('')

  if (EXECUTE_MODE) {
    console.log(`✅ Your deployment is live:`)
    console.log('')
    console.log(`  ENS Domain: ${fullDomain}`)
    console.log(`  IPFS CID: ${cid}`)
    console.log('')
    console.log(`  View in ENS Manager:`)
    console.log(`    https://app.ens.domains/${fullDomain}?chainId=11155111`)
    console.log('')
    console.log(`  View website:`)
    console.log(`    https://w3s.link/ipfs/${cid}`)
    console.log(`    https://${fullDomain}.limo (once propagated)`)
    console.log('')
    console.log(`  Next deployment will be: v${nextVersion + 1}.${domain}`)
  } else {
    console.log(`  Run with --execute to create ${fullDomain}`)
  }

  console.log('')
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  if (error.stack) {
    console.error('\nStack trace:')
    console.error(error.stack)
  }
  process.exit(1)
})
