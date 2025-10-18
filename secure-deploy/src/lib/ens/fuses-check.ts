/**
 * Check parent domain fuses
 */

import { parseAbi, type PublicClient, type Address } from 'viem'
import { namehash, normalize } from 'viem/ens'
import { NAME_WRAPPER_ADDRESS } from './namewrapper/wrapper.js'
import { FUSES } from './namewrapper/fuses.js'
import { ENSError } from '../errors.js'

const wrapperAbi = parseAbi([
  'function getData(uint256 tokenId) view returns (address owner, uint32 fuses, uint64 expiry)',
])

export interface ParentFusesCheck {
  hasCannotUnwrap: boolean
  currentFuses: number
  needsBurn: boolean
}

/**
 * Check if parent domain has CANNOT_UNWRAP fuse burned
 */
export async function checkParentFuses(
  parentDomain: string,
  publicClient: PublicClient,
  chainId: number
): Promise<ParentFusesCheck> {
  const node = namehash(normalize(parentDomain))
  const tokenId = BigInt(node)

  try {
    const data = await publicClient.readContract({
      address: NAME_WRAPPER_ADDRESS[chainId] as Address,
      abi: wrapperAbi,
      functionName: 'getData',
      args: [tokenId],
    })

    const [, currentFuses] = data
    const hasCannotUnwrap = (currentFuses & FUSES.CANNOT_UNWRAP) === FUSES.CANNOT_UNWRAP

    return {
      hasCannotUnwrap,
      currentFuses,
      needsBurn: !hasCannotUnwrap,
    }
  } catch (error: any) {
    throw new ENSError(`Failed to check parent fuses: ${error.message}`)
  }
}

/**
 * Burn CANNOT_UNWRAP fuse on parent domain
 */
export async function burnParentFuses(
  parentDomain: string,
  ownerPrivateKey: `0x${string}`,
  rpcUrl: string,
  chainId: number,
  publicClient: PublicClient
): Promise<`0x${string}`> {
  const { createWalletClient, http } = await import('viem')
  const { privateKeyToAccount } = await import('viem/accounts')
  const { sepolia, mainnet } = await import('viem/chains')

  const account = privateKeyToAccount(ownerPrivateKey)
  const chain = chainId === 11155111 ? sepolia : mainnet

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  })

  const node = namehash(normalize(parentDomain))

  const burnAbi = parseAbi([
    'function setFuses(bytes32 node, uint16 ownerControlledFuses) returns (uint32)',
  ])

  try {
    const hash = await walletClient.writeContract({
      address: NAME_WRAPPER_ADDRESS[chainId] as Address,
      abi: burnAbi,
      functionName: 'setFuses',
      args: [node, FUSES.CANNOT_UNWRAP],
    })

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash })

    return hash
  } catch (error: any) {
    throw new ENSError(`Failed to burn parent fuses: ${error.message}`)
  }
}
