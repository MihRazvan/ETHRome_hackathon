/**
 * Query and decode ENS contenthash
 */

import { parseAbi, type PublicClient, type Address, type Hex } from 'viem'
import { namehash, normalize } from 'viem/ens'
import { ENSError } from '../errors.js'
import { CID } from 'multiformats/cid'
import * as varint from 'varint'

const resolverAbi = parseAbi([
  'function contenthash(bytes32 node) view returns (bytes)',
])

export interface ContenthashResult {
  contenthash: Hex
  cid: string | null
  type: 'ipfs' | 'ipns' | 'swarm' | 'onion' | 'unknown' | 'empty'
}

/**
 * Get contenthash for a domain
 */
export async function getContenthash(
  domain: string,
  resolverAddress: Address,
  publicClient: PublicClient
): Promise<ContenthashResult> {
  const node = namehash(normalize(domain))

  try {
    const contenthash = await publicClient.readContract({
      address: resolverAddress,
      abi: resolverAbi,
      functionName: 'contenthash',
      args: [node],
    })

    // Empty contenthash
    if (contenthash === '0x' || contenthash.length <= 2) {
      return {
        contenthash: '0x' as Hex,
        cid: null,
        type: 'empty',
      }
    }

    // Try to decode based on codec
    const type = detectContenthashType(contenthash)
    let cid: string | null = null

    if (type === 'ipfs') {
      try {
        cid = decodeIPFSContenthash(contenthash)
      } catch {
        // Failed to decode, leave as null
      }
    }

    return {
      contenthash,
      cid,
      type,
    }
  } catch (error: any) {
    throw new ENSError(`Failed to get contenthash: ${error.message}`)
  }
}

/**
 * Detect contenthash type from codec prefix
 */
function detectContenthashType(contenthash: Hex): ContenthashResult['type'] {
  if (contenthash.startsWith('0xe3')) return 'ipfs'
  if (contenthash.startsWith('0xe5')) return 'ipns'
  if (contenthash.startsWith('0xe4')) return 'swarm'
  if (contenthash.startsWith('0xbc')) return 'onion'
  return 'unknown'
}

/**
 * Decode IPFS contenthash to CID
 */
function decodeIPFSContenthash(contenthash: Hex): string {
  // Remove 0x prefix
  const hex = contenthash.slice(2)
  const bytes = Buffer.from(hex, 'hex')

  // Decode varint codec (should be 0xe3 for IPFS)
  varint.decode(bytes)
  const codecLength = varint.decode.bytes || 0

  // Rest is the CID bytes
  const cidBytes = bytes.slice(codecLength)

  // Parse CID
  const cid = CID.decode(cidBytes)

  // Return as v0 or v1 string
  return cid.toString()
}
