#!/usr/bin/env tsx
/**
 * Check contenthash for a subdomain
 */

import { createPublicClient, http, parseAbi } from 'viem'
import { sepolia } from 'viem/chains'
import { namehash, normalize } from 'ox/Ens'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
const subdomain = process.argv[2] || 'v0.romehackaton.eth'
const rpcUrl = env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

const SEPOLIA_PUBLIC_RESOLVER = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD'

async function main() {
  console.log(`\n🔍 Checking contenthash for: ${subdomain}\n`)

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  })

  const node = namehash(normalize(subdomain))

  const resolverAbi = parseAbi([
    'function contenthash(bytes32 node) view returns (bytes)'
  ])

  try {
    const contenthash = await publicClient.readContract({
      address: SEPOLIA_PUBLIC_RESOLVER,
      abi: resolverAbi,
      functionName: 'contenthash',
      args: [node]
    })

    console.log(`Node: ${node}`)
    console.log(`Contenthash: ${contenthash}`)
    console.log(`Length: ${contenthash.length}`)

    if (contenthash === '0x' || contenthash.length <= 2) {
      console.log('\n❌ No contenthash set!')
    } else {
      console.log('\n✓ Contenthash is set')

      // Try to decode as IPFS CID
      if (contenthash.startsWith('0xe3')) {
        console.log('  Type: IPFS')
        // Remove the codec prefix (0xe3 + varint encoded 0x01) and parse
        console.log(`  Raw: ${contenthash}`)
      }
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
  }
}

main()
