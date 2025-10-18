// ENS utilities for content-hash encoding
// Adapted from Blumen: https://github.com/StauroDEV/blumen

import { CID } from 'multiformats/cid'
import type { Address } from 'ox/Address'
import { toHex } from 'ox/Bytes'
import { namehash, normalize } from 'ox/Ens'
import * as varint from 'varint'
import type { ChainName } from '../types.js'

const IPFS_CODEC = 0xe3

const concatUint8Arrays = (
  array1: Uint8Array,
  array2: Uint8Array,
): Uint8Array => {
  const result = new Uint8Array(array1.length + array2.length)
  result.set(array1, 0)
  result.set(array2, array1.length)
  return result
}

export const prepareUpdateEnsArgs = ({
  cid,
  domain,
}: {
  cid: string
  domain: string
}): {
  contentHash: string
  node: `0x${string}`
} => {
  const node = namehash(normalize(domain))
  const code = IPFS_CODEC
  const bytes = CID.parse(cid).toV1().bytes
  const codeBytes = Uint8Array.from(varint.encode(code))

  return {
    contentHash: toHex(concatUint8Arrays(codeBytes, bytes)).slice(2),
    node,
  }
}

export const encodeContentHash = (cid: string): `0x${string}` => {
  const code = IPFS_CODEC
  const bytes = CID.parse(cid).toV1().bytes
  const codeBytes = Uint8Array.from(varint.encode(code))
  return toHex(concatUint8Arrays(codeBytes, bytes)) as `0x${string}`
}

export const setContentHash = {
  name: 'setContenthash',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    {
      type: 'bytes32',
      name: 'node',
    },
    {
      type: 'bytes',
      name: 'contenthash',
    },
  ],
  outputs: [],
} as const

export const PUBLIC_RESOLVER_ADDRESS: Record<ChainName, Address> = {
  mainnet: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
  sepolia: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
  goerli: '0xd7a4F6473f32aC2Af804B3686AE8F1932bC35750',
} as const

export const chainToRpcUrl = (chain: ChainName): string => {
  switch (chain) {
    case 'mainnet':
      return 'https://ethereum-rpc.publicnode.com'
    case 'sepolia':
      return 'https://ethereum-sepolia-rpc.publicnode.com'
    case 'goerli':
      return 'https://ethereum-goerli-rpc.publicnode.com'
  }
}
