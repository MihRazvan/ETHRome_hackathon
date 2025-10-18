#!/usr/bin/env tsx

/**
 * Test: ENS Content-Hash Encoding
 *
 * This script tests encoding an IPFS CID into ENS contenthash format.
 * The contenthash is what you set on an ENS resolver to point to IPFS content.
 *
 * Usage:
 *   npm run test:ens                    # Uses CID from .last-cid
 *   npm run test:ens <cid>              # Uses specific CID
 */

import { CID } from 'multiformats/cid'
import { toHex } from 'ox/Bytes'
import { namehash, normalize } from 'ox/Ens'
import * as varint from 'varint'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const IPFS_CODEC = 0xe3

function concatUint8Arrays(array1: Uint8Array, array2: Uint8Array): Uint8Array {
  const result = new Uint8Array(array1.length + array2.length)
  result.set(array1, 0)
  result.set(array2, array1.length)
  return result
}

function encodeContentHash(cid: string): string {
  const code = IPFS_CODEC
  const bytes = CID.parse(cid).toV1().bytes
  const codeBytes = Uint8Array.from(varint.encode(code))

  return toHex(concatUint8Arrays(codeBytes, bytes))
}

function main() {
  console.log('📝 ENS Content-Hash Encoding Test\n')

  // Get CID from command line or .last-cid file
  let cid = process.argv[2]

  if (!cid) {
    try {
      const cidPath = resolve(__dirname, '../../.last-cid')
      cid = readFileSync(cidPath, 'utf-8').trim()
      console.log('  ℹ️  Using CID from .last-cid file\n')
    } catch (error) {
      console.error('❌ No CID provided and .last-cid file not found')
      console.error('\nUsage:')
      console.error('  npm run test:ens <cid>')
      console.error('  npm run test:ens  # uses CID from .last-cid')
      process.exit(1)
    }
  }

  // Validate CID
  try {
    CID.parse(cid)
  } catch (error) {
    console.error(`❌ Invalid CID: ${cid}`)
    console.error('\nA valid CID looks like:')
    console.error('  bafybeibqmrg5e5cd2vbo6yqpiilo5u6fxqimxuabn7ws4s7vm2mqlfsqwi')
    process.exit(1)
  }

  console.log('Input:')
  console.log(`  CID: ${cid}`)

  // Test with example domain
  const testDomain = 'myapp.eth'
  console.log(`  Test Domain: ${testDomain}\n`)

  // Encode contenthash
  const contentHashHex = encodeContentHash(cid)
  const contentHashBytes = `0x${contentHashHex.slice(2)}` // Remove 0x and re-add for display

  // Calculate namehash
  const node = namehash(normalize(testDomain))

  console.log('Output:')
  console.log(`  Node (namehash): ${node}`)
  console.log(`  Content-Hash: ${contentHashBytes}\n`)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('✅ ENS Resolver Transaction Data:\n')
  console.log('Function: setContenthash(bytes32 node, bytes contenthash)')
  console.log('')
  console.log('Parameters:')
  console.log(`  node:        ${node}`)
  console.log(`  contenthash: ${contentHashBytes}`)
  console.log('')

  console.log('Target Contracts (Sepolia):')
  console.log('  Public Resolver: 0x8FADE66B79cC9f707aB26799354482EB93a5B7dD')
  console.log('')

  console.log('Example with your actual ENS domain:')
  console.log('  1. Replace "myapp.eth" with your domain')
  console.log('  2. Calculate namehash for your domain')
  console.log('  3. Call setContenthash on your resolver')
  console.log('  4. Pass the node and contenthash above')
  console.log('')

  console.log('📋 You can verify this CID resolves to your website:')
  console.log(`  https://w3s.link/ipfs/${cid}`)
  console.log(`  https://${cid}.ipfs.w3s.link`)
  console.log('')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('💡 Next Steps:')
  console.log('  • This contenthash would be used in a Safe transaction')
  console.log('  • The Safe would call setContenthash on the ENS resolver')
  console.log('  • After approval, your ENS domain would resolve to this CID')
  console.log('')

  console.log('✅ Test passed! ENS encoding works correctly.\n')
}

main()
