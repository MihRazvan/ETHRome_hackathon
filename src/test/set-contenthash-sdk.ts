#!/usr/bin/env tsx
/**
 * Set Contenthash via Safe SDK
 *
 * Uses Safe SDK to properly handle signatures
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'
import { parseAbi, namehash, createPublicClient, http, type Address, type Hex, encodeFunctionData } from 'viem'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import { createSafeClient } from '@safe-global/sdk-starter-kit'
import { encodeContentHash } from '../core/ens.js'

config()

const SEPOLIA_PUBLIC_RESOLVER = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD' as Address

async function main() {
  const args = process.argv.slice(2)
  const subdomain = args.find(arg => !arg.startsWith('--')) || 'v1.ethrome.eth'
  const execute = args.includes('--execute')

  console.log('🌐 Set Contenthash via Safe SDK')
  console.log('━'.repeat(70))
  console.log('')

  // Load config
  const signerPk = process.env.SEPOLIA_OWNER_PK! as Hex
  const safeAddress = process.env.SAFE_ADDRESS! as Address
  const rpcUrl = process.env.SEPOLIA_RPC_URL!
  const apiKey = process.env.SAFE_API_KEY

  if (!signerPk || !safeAddress || !rpcUrl) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  if (!apiKey) {
    console.error('❌ Missing SAFE_API_KEY')
    console.error('   Get one at: https://developer.safe.global')
    process.exit(1)
  }

  console.log('📋 Configuration')
  console.log('━'.repeat(70))
  console.log(`  Subdomain: ${subdomain}`)
  console.log(`  Safe: ${safeAddress}`)
  console.log(`  Network: Sepolia`)
  console.log('')

  // Get CID
  let cid: string
  try {
    const cidPath = resolve(process.cwd(), '.last-cid')
    cid = readFileSync(cidPath, 'utf-8').trim()
  } catch (error) {
    console.error('❌ No CID found. Run `npm run test:ipfs` first')
    process.exit(1)
  }

  console.log(`  CID: ${cid}`)
  console.log('')

  // Initialize Safe client
  console.log('🔐 Initializing Safe Client')
  console.log('━'.repeat(70))
  console.log('')

  const safeClient = await createSafeClient({
    provider: rpcUrl,
    signer: signerPk,
    safeAddress: safeAddress,
    apiKey: apiKey
  })

  console.log('  ✓ Safe client initialized')
  console.log('')

  // Prepare contenthash transaction
  const contentHash = encodeContentHash(cid)
  const subdomainNode = namehash(normalize(subdomain))

  const resolverAbi = parseAbi([
    'function setContenthash(bytes32 node, bytes contenthash)'
  ])

  const setContentHashData = encodeFunctionData({
    abi: resolverAbi,
    functionName: 'setContenthash',
    args: [subdomainNode, contentHash]
  })

  const transaction = {
    to: SEPOLIA_PUBLIC_RESOLVER,
    data: setContentHashData,
    value: '0'
  }

  console.log('📝 Transaction Data')
  console.log('━'.repeat(70))
  console.log(`  To: ${SEPOLIA_PUBLIC_RESOLVER}`)
  console.log(`  Data: ${setContentHashData.slice(0, 66)}...`)
  console.log(`  Content-Hash: ${contentHash}`)
  console.log('')

  if (!execute) {
    console.log('━'.repeat(70))
    console.log('')
    console.log('🔍 DRY RUN')
    console.log('')
    console.log('Run with --execute to set contenthash via Safe')
    console.log('')
    return
  }

  // Execute via Safe SDK
  console.log('✅ Executing via Safe')
  console.log('━'.repeat(70))
  console.log('')

  try {
    console.log('  ⏳ Sending transaction to Safe...')

    const txResult = await safeClient.send({ transactions: [transaction] })

    console.log('  ✓ Transaction sent!')
    console.log('')

    const safeTxHash = txResult.transactions?.safeTxHash

    if (safeTxHash) {
      console.log(`  Safe Transaction Hash: ${safeTxHash}`)
      console.log('')
    }

    console.log('━'.repeat(70))
    console.log('')
    console.log('🎉 Contenthash Set!')
    console.log('')
    console.log(`  ${subdomain}`)
    console.log(`  IPFS CID: ${cid}`)
    console.log('')
    console.log('  View at:')
    console.log(`    https://${subdomain}.limo`)
    console.log(`    https://w3s.link/ipfs/${cid}`)
    console.log(`    https://app.ens.domains/${subdomain}?chainId=11155111`)
    console.log('')
    console.log(`  View Safe transaction:`)
    console.log(`    https://app.safe.global/transactions/queue?safe=sep:${safeAddress}`)
    console.log('')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('')
    console.error('This might be because:')
    console.error('  1. Safe threshold > 1 (needs more signatures)')
    console.error('  2. Safe needs to be authorized on the resolver')
    console.error('  3. Transaction already exists in queue')
    process.exit(1)
  }
}

main().catch(console.error)
