#!/usr/bin/env tsx
/**
 * Check subdomain ownership
 */

import { config } from 'dotenv'
import { parseAbi, namehash, createPublicClient, http, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import { NAME_WRAPPER_ADDRESS } from '../namewrapper/wrapper.js'

config()

async function main() {
  const subdomain = process.argv[2] || 'v0.ethrome.eth'
  const rpcUrl = process.env.SEPOLIA_RPC_URL!

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  })

  const wrapperAbi = parseAbi([
    'function getData(uint256 tokenId) view returns (address owner, uint32 fuses, uint64 expiry)'
  ])

  const node = namehash(normalize(subdomain))
  const tokenId = BigInt(node)

  try {
    const data = await publicClient.readContract({
      address: NAME_WRAPPER_ADDRESS[sepolia.id],
      abi: wrapperAbi,
      functionName: 'getData',
      args: [tokenId]
    })

    const [owner, fuses, expiry] = data

    console.log(`\n🔍 ${subdomain}`)
    console.log('━'.repeat(70))
    console.log(`  Owner: ${owner}`)
    console.log(`  Fuses: ${fuses}`)
    console.log(`  Expiry: ${expiry}`)
    console.log('')
  } catch (error) {
    console.log(`\n❌ ${subdomain} does not exist or is not wrapped\n`)
  }
}

main()
