#!/usr/bin/env tsx
/**
 * Set Contenthash via Safe
 *
 * For subdomains owned by Safe, only the Safe can set the contenthash.
 * This script creates a Safe transaction to set the contenthash.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'
import { parseAbi, namehash, createPublicClient, createWalletClient, http, type Address, type Hex, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import { encodeContentHash } from '../core/ens.js'

config()

const SEPOLIA_PUBLIC_RESOLVER = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD' as Address

// Safe contract ABI
const SAFE_ABI = parseAbi([
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function nonce() view returns (uint256)',
  'function getThreshold() view returns (uint256)'
])

async function main() {
  const args = process.argv.slice(2)
  const subdomain = args.find(arg => !arg.startsWith('--')) || 'v1.ethrome.eth'
  const execute = args.includes('--execute')

  console.log('🌐 Set Contenthash via Safe')
  console.log('━'.repeat(70))
  console.log('')

  // Load config
  const domain = process.env.SEPOLIA_ENS_DOMAIN!
  const signerAddress = process.env.SEPOLIA_OWNER_ADDRESS! as Address
  const signerPk = process.env.SEPOLIA_OWNER_PK! as Hex
  const safeAddress = process.env.SAFE_ADDRESS! as Address
  const rpcUrl = process.env.SEPOLIA_RPC_URL!

  if (!domain || !signerPk || !safeAddress || !rpcUrl) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  console.log('📋 Configuration')
  console.log('━'.repeat(70))
  console.log(`  Subdomain: ${subdomain}`)
  console.log(`  Safe: ${safeAddress}`)
  console.log(`  Signer: ${signerAddress}`)
  console.log(`  Network: Sepolia`)
  console.log('')

  // Get CID
  let cid: string
  try {
    const cidPath = resolve(process.cwd(), '.last-cid')
    cid = readFileSync(cidPath, 'utf-8').trim()
  } catch (error) {
    console.error('❌ No CID found. Run `npm run test:ipfs` first')
    console.error(`   Tried path: ${resolve(process.cwd(), '.last-cid')}`)
    process.exit(1)
  }

  console.log(`  CID: ${cid}`)
  console.log('')

  // Setup clients
  const account = privateKeyToAccount(signerPk)
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
    console.log('⚠️  WARNING: Safe threshold > 1')
    console.log('   This script only supports threshold = 1 (direct execution)')
    console.log('   For higher thresholds, use Safe Transaction Service')
    console.log('')
    if (!execute) {
      return
    }
  }

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

  console.log('🔐 Transaction Data')
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

  // Execute via Safe
  console.log('✅ Executing via Safe')
  console.log('━'.repeat(70))
  console.log('')

  try {
    console.log('  ⏳ Setting contenthash...')

    const hash = await walletClient.writeContract({
      address: safeAddress,
      abi: SAFE_ABI,
      functionName: 'execTransaction',
      args: [
        SEPOLIA_PUBLIC_RESOLVER, // to
        0n, // value
        setContentHashData, // data
        0, // operation (Call)
        0n, // safeTxGas
        0n, // baseGas
        0n, // gasPrice
        '0x0000000000000000000000000000000000000000', // gasToken
        '0x0000000000000000000000000000000000000000', // refundReceiver
        '0x' // signatures (empty for threshold=1)
      ]
    })

    console.log(`  ✓ Transaction sent: ${hash}`)
    console.log('  ⏳ Waiting for confirmation...')
    console.log('')

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`)
    console.log('')
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
  } catch (error: any) {
    console.error('❌ Error:', error.shortMessage || error.message)
    process.exit(1)
  }
}

main().catch(console.error)
