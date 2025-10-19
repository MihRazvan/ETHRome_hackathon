/**
 * Encode IPFS CID to ENS contenthash format
 */

import { type Hex } from 'viem'
import { CID } from 'multiformats/cid'
import * as varint from 'varint'

/**
 * Encode IPFS CID to ENS contenthash bytes
 */
export function encodeContenthash(cid: string): Hex {
  // Parse CID
  const cidObj = CID.parse(cid)

  // Encode CID to bytes
  const cidBytes = cidObj.bytes

  // Prepend IPFS codec (0xe3 = 227 = ipfs-ns)
  const codec = varint.encode(0xe3)
  const codecBytes = Buffer.from(codec)

  // Combine codec + CID bytes
  const combined = Buffer.concat([codecBytes, cidBytes])

  // Convert to hex
  return `0x${combined.toString('hex')}` as Hex
}
