#!/usr/bin/env tsx

/**
 * Burn Parent Domain Fuses
 *
 * This script burns the necessary fuses on the parent domain (ethrome.eth)
 * to allow creating permanent subdomains.
 *
 * Fuses to burn:
 * - CANNOT_UNWRAP: Makes the domain permanently wrapped
 * - PARENT_CANNOT_CONTROL: Allows creating subdomains with PARENT_CANNOT_CONTROL
 *
 * ⚠️  WARNING: This is PERMANENT! Once burned, these fuses cannot be undone.
 *
 * Usage:
 *   npm run burn-parent-fuses              # Dry run
 *   npm run burn-parent-fuses -- --execute # Execute real transaction
 */

import { createPublicClient, createWalletClient, http, parseAbi, Address, Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { namehash, normalize } from 'ox/Ens'
import { FUSES } from '../namewrapper/fuses.js'
import { NAME_WRAPPER_ADDRESS } from '../namewrapper/wrapper.js'
import * as readline from 'readline/promises'

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

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const answer = await rl.question(`${message} [y/N]: `)
  rl.close()

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

async function main() {
  console.log('🔥 Burn Parent Domain Fuses')
  console.log('━'.repeat(70))
  console.log('')

  if (!EXECUTE_MODE) {
    console.log('⚠️  DRY RUN MODE - No transactions will be sent')
    console.log('   Run with --execute flag to execute real transaction')
    console.log('')
  }

  // Validate environment
  const domain = env.SEPOLIA_ENS_DOMAIN
  const ownerAddress = env.SEPOLIA_OWNER_ADDRESS as Address
  const privateKey = env.SEPOLIA_OWNER_PK?.startsWith('0x')
    ? env.SEPOLIA_OWNER_PK as Hex
    : `0x${env.SEPOLIA_OWNER_PK}` as Hex
  const rpcUrl = env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

  if (!domain || !ownerAddress || !privateKey) {
    console.error('❌ Missing configuration in .env')
    process.exit(1)
  }

  console.log(`Domain: ${domain}`)
  console.log(`Owner: ${ownerAddress}`)
  console.log(`Network: Sepolia`)
  console.log('')

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

  const node = namehash(normalize(domain))
  const tokenId = BigInt(node)

  const wrapperAbi = parseAbi([
    'function getData(uint256 tokenId) view returns (address owner, uint32 fuses, uint64 expiry)',
    'function setFuses(bytes32 node, uint16 ownerControlledFuses) returns (uint32)',
  ])

  // Check current fuses
  console.log('📋 Current State:')
  console.log('━'.repeat(70))
  console.log('')

  const data = await publicClient.readContract({
    address: NAME_WRAPPER_ADDRESS[sepolia.id],
    abi: wrapperAbi,
    functionName: 'getData',
    args: [tokenId]
  })

  const [owner, currentFuses, expiry] = data

  console.log(`  Owner: ${owner}`)
  console.log(`  Current fuses: ${currentFuses}`)
  console.log(`  Expiry: ${expiry}`)
  console.log('')

  // Show currently burned fuses
  console.log('  Currently burned fuses:')
  const fuseEntries = Object.entries(FUSES) as [string, number][]
  let hasAnyFuses = false

  for (const [name, value] of fuseEntries) {
    if ((currentFuses & value) === value) {
      console.log(`    ✓ ${name}`)
      hasAnyFuses = true
    }
  }

  if (!hasAnyFuses) {
    console.log('    (none)')
  }

  console.log('')
  console.log('━'.repeat(70))
  console.log('')

  // Define fuses to burn
  const PARENT_FUSES = FUSES.CANNOT_UNWRAP | FUSES.PARENT_CANNOT_CONTROL

  console.log('🔥 Fuses to Burn:')
  console.log('━'.repeat(70))
  console.log('')
  console.log('  CANNOT_UNWRAP (1)')
  console.log('    → Domain will be permanently wrapped')
  console.log('    → Cannot unwrap back to registry')
  console.log('')
  console.log('  PARENT_CANNOT_CONTROL (65536)')
  console.log('    → Allows creating permanent subdomains')
  console.log('    → Subdomains can have PARENT_CANNOT_CONTROL burned')
  console.log('')
  console.log(`  Combined value: ${PARENT_FUSES}`)
  console.log('')

  // Check if already burned
  const alreadyBurned = (currentFuses & PARENT_FUSES) === PARENT_FUSES

  if (alreadyBurned) {
    console.log('✅ These fuses are already burned!')
    console.log('   You can now create permanent subdomains.')
    console.log('')
    return
  }

  console.log('━'.repeat(70))
  console.log('')
  console.log('⚠️  WARNING: This action is PERMANENT and IRREVERSIBLE!')
  console.log('')
  console.log('After burning these fuses:')
  console.log('  ✅ You can create permanent, immutable subdomains')
  console.log('  ✅ Subdomains can be locked with PARENT_CANNOT_CONTROL')
  console.log('  ❌ You cannot unwrap the domain back to registry')
  console.log('  ❌ You cannot undo these fuses')
  console.log('')

  if (EXECUTE_MODE) {
    console.log('━'.repeat(70))
    console.log('')

    const proceed = await confirm('⚠️  Are you absolutely sure you want to burn these fuses?')

    if (!proceed) {
      console.log('❌ Aborted by user')
      process.exit(0)
    }

    console.log('')
    console.log('  ⏳ Burning fuses...')
    console.log('')

    try {
      const hash = await walletClient.writeContract({
        address: NAME_WRAPPER_ADDRESS[sepolia.id],
        abi: wrapperAbi,
        functionName: 'setFuses',
        args: [node, PARENT_FUSES]
      })

      console.log(`  ✓ Transaction sent: ${hash}`)
      console.log('  ⏳ Waiting for confirmation...')
      console.log('')

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`)
      console.log('')

      // Verify fuses were burned
      const newData = await publicClient.readContract({
        address: NAME_WRAPPER_ADDRESS[sepolia.id],
        abi: wrapperAbi,
        functionName: 'getData',
        args: [tokenId]
      })

      const [, newFuses] = newData

      console.log('━'.repeat(70))
      console.log('')
      console.log('✅ SUCCESS!')
      console.log('')
      console.log(`  New fuses value: ${newFuses}`)
      console.log('')
      console.log('  Burned fuses:')

      for (const [name, value] of fuseEntries) {
        if ((newFuses & value) === value) {
          const isNew = (currentFuses & value) !== value
          console.log(`    ${isNew ? '🔥' : '✓ '} ${name}${isNew ? ' (NEWLY BURNED)' : ''}`)
        }
      }

      console.log('')
      console.log('━'.repeat(70))
      console.log('')
      console.log('🎉 Your domain is now ready!')
      console.log('')
      console.log('  Next steps:')
      console.log('    1. Run: npm run test:complete -- --execute')
      console.log('    2. Create your first permanent subdomain: v0.ethrome.eth')
      console.log('    3. Deploy with confidence - it will be immutable!')
      console.log('')

    } catch (error) {
      console.error('')
      console.error('❌ Transaction failed:', (error as Error).message)
      console.error('')
      process.exit(1)
    }

  } else {
    console.log('━'.repeat(70))
    console.log('')
    console.log('[DRY RUN] Would burn fuses on: ' + domain)
    console.log('')
    console.log('Run with --execute to burn fuses for real')
    console.log('')
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
