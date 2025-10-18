#!/usr/bin/env tsx
/**
 * Transfer ENS Domain Ownership to Safe
 *
 * This script transfers the wrapped ENS domain from your personal wallet to the Safe multisig.
 * After this, only the Safe (with required signatures) can manage the domain.
 */

import { config } from 'dotenv'
import { parseAbi, namehash, createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import { NAME_WRAPPER_ADDRESS } from '../namewrapper/wrapper.js'

config()

async function main() {
  const args = process.argv.slice(2)
  const execute = args.includes('--execute')

  console.log('🔄 Transfer ENS Domain to Safe')
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
    process.exit(1)
  }

  console.log('📋 Configuration')
  console.log('━'.repeat(70))
  console.log(`  Domain: ${domain}`)
  console.log(`  Current Owner: ${ownerAddress}`)
  console.log(`  New Owner (Safe): ${safeAddress}`)
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

  // Check current owner
  const wrapperAbi = parseAbi([
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function getData(uint256 tokenId) view returns (address owner, uint32 fuses, uint64 expiry)'
  ])

  const node = namehash(normalize(domain))
  const tokenId = BigInt(node)

  console.log('🔍 Checking Current Ownership')
  console.log('━'.repeat(70))
  console.log('')

  try {
    const currentOwner = await publicClient.readContract({
      address: NAME_WRAPPER_ADDRESS[sepolia.id],
      abi: wrapperAbi,
      functionName: 'ownerOf',
      args: [tokenId]
    })

    console.log(`  Current owner: ${currentOwner}`)
    console.log('')

    if (currentOwner.toLowerCase() === safeAddress.toLowerCase()) {
      console.log('✅ Domain is already owned by the Safe!')
      console.log('')
      return
    }

    if (currentOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
      console.error(`❌ Domain is owned by ${currentOwner}, not your wallet!`)
      console.error('   Cannot transfer.')
      process.exit(1)
    }

    // Get domain data
    const data = await publicClient.readContract({
      address: NAME_WRAPPER_ADDRESS[sepolia.id],
      abi: wrapperAbi,
      functionName: 'getData',
      args: [tokenId]
    })

    const [, fuses, expiry] = data
    console.log(`  Fuses: ${fuses}`)
    console.log(`  Expiry: ${expiry}`)
    console.log('')

  } catch (error: any) {
    console.error('❌ Error checking ownership:', error.message)
    process.exit(1)
  }

  if (!execute) {
    console.log('━'.repeat(70))
    console.log('')
    console.log('🔍 DRY RUN - Preview')
    console.log('')
    console.log('This will transfer the wrapped ENS domain to your Safe.')
    console.log('After this transfer:')
    console.log('  ✅ Only the Safe can create/manage subdomains')
    console.log('  ✅ Requires Safe signer approval for all operations')
    console.log('  ⚠️  Your personal wallet will no longer control the domain')
    console.log('')
    console.log('Run with --execute to transfer ownership')
    console.log('')
    return
  }

  // Execute transfer
  console.log('🚀 Transferring Ownership')
  console.log('━'.repeat(70))
  console.log('')

  try {
    console.log('  ⏳ Sending transaction...')

    const hash = await walletClient.writeContract({
      address: NAME_WRAPPER_ADDRESS[sepolia.id],
      abi: wrapperAbi,
      functionName: 'safeTransferFrom',
      args: [ownerAddress, safeAddress, tokenId]
    })

    console.log(`  ✓ Transaction sent: ${hash}`)
    console.log('  ⏳ Waiting for confirmation...')
    console.log('')

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`)
    console.log('')
    console.log('━'.repeat(70))
    console.log('')
    console.log('✅ Ownership Transferred!')
    console.log('')
    console.log(`  ${domain} is now owned by Safe: ${safeAddress}`)
    console.log('')
    console.log('  Next steps:')
    console.log('    1. Verify ownership: npm run check:domain')
    console.log('    2. Deploy via Safe: npm run deploy:safe-sdk -- --execute')
    console.log('')
  } catch (error: any) {
    console.error('❌ Error transferring ownership:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)
