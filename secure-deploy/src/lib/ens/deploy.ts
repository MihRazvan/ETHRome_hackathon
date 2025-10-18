/**
 * ENS subdomain deployment with Safe
 */

import {
  parseAbi,
  namehash,
  encodeFunctionData,
  type Address,
  type Hex,
} from 'viem'
import { normalize } from 'viem/ens'
import { NAME_WRAPPER_ADDRESS } from './namewrapper/wrapper.js'
import { IMMUTABLE_FUSES } from './namewrapper/fuses.js'
import { encodeContentHash, PUBLIC_RESOLVER_ADDRESS } from './ens.js'
import type { SafeTransaction } from '../safe/client.js'
import type { ChainName } from '../../types.js'

const nameWrapperAbi = parseAbi([
  'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry) returns (bytes32)',
])

const resolverAbi = parseAbi([
  'function setContenthash(bytes32 node, bytes contenthash)',
])

export interface DeploymentPlan {
  createSubdomainTx: SafeTransaction
  setContenthashTx: SafeTransaction
  fullDomain: string
  versionLabel: string
  parentDomain: string
  cid: string
  contentHash: Hex
}

/**
 * Create deployment plan for new subdomain
 */
export function createDeploymentPlan(
  parentDomain: string,
  versionLabel: string,
  cid: string,
  safeAddress: Address,
  chainId: number,
  network: ChainName
): DeploymentPlan {
  const fullDomain = `${versionLabel}.${parentDomain}`
  const parentNode = namehash(normalize(parentDomain))
  const subdomainNode = namehash(normalize(fullDomain))
  const contentHash = encodeContentHash(cid)
  const resolverAddress = PUBLIC_RESOLVER_ADDRESS[network]

  // Transaction 1: Create subdomain owned by Safe
  const expiry = 2524608000n // Far future
  const createSubdomainData = encodeFunctionData({
    abi: nameWrapperAbi,
    functionName: 'setSubnodeRecord',
    args: [
      parentNode,
      versionLabel,
      safeAddress,
      resolverAddress,
      0n, // ttl
      IMMUTABLE_FUSES,
      expiry,
    ],
  })

  const createSubdomainTx: SafeTransaction = {
    to: NAME_WRAPPER_ADDRESS[chainId] as Address,
    value: '0',
    data: createSubdomainData,
  }

  // Transaction 2: Set contenthash
  const setContenthashData = encodeFunctionData({
    abi: resolverAbi,
    functionName: 'setContenthash',
    args: [subdomainNode, contentHash],
  })

  const setContenthashTx: SafeTransaction = {
    to: resolverAddress as Address,
    value: '0',
    data: setContenthashData,
  }

  return {
    createSubdomainTx,
    setContenthashTx,
    fullDomain,
    versionLabel,
    parentDomain,
    cid,
    contentHash,
  }
}
