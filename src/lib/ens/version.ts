/**
 * ENS version detection and subdomain management
 */

import { parseAbi, namehash, type PublicClient, type Address } from 'viem'
import { normalize } from 'viem/ens'
import { NAME_WRAPPER_ADDRESS } from './namewrapper/wrapper.js'
import { ENSError } from '../errors.js'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

const wrapperAbi = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getData(uint256 tokenId) view returns (address owner, uint32 fuses, uint64 expiry)',
])

export interface SubdomainInfo {
  name: string
  owner: Address
  fuses: number
  expiry: bigint
  exists: boolean
}

/**
 * Detect next available version number
 */
export async function detectNextVersion(
  parentDomain: string,
  publicClient: PublicClient,
  chainId: number,
  maxVersions: number = 200
): Promise<{ version: number; existing: string[] }> {
  const existing: string[] = []
  let nextVersion = 0

  for (let i = 0; i < maxVersions; i++) {
    const versionLabel = `v${i}`
    const fullDomain = `${versionLabel}.${parentDomain}`
    const node = namehash(normalize(fullDomain))
    const tokenId = BigInt(node)

    try {
      const owner = await publicClient.readContract({
        address: NAME_WRAPPER_ADDRESS[chainId] as Address,
        abi: wrapperAbi,
        functionName: 'ownerOf',
        args: [tokenId],
      })

      // Check if it's actually owned (not zero address)
      if (owner === ZERO_ADDRESS) {
        break
      }

      existing.push(versionLabel)
      nextVersion = i + 1
    } catch {
      // Domain doesn't exist or error reading
      break
    }
  }

  return { version: nextVersion, existing }
}

/**
 * Get subdomain information
 */
export async function getSubdomainInfo(
  subdomain: string,
  publicClient: PublicClient,
  chainId: number
): Promise<SubdomainInfo> {
  const node = namehash(normalize(subdomain))
  const tokenId = BigInt(node)

  try {
    const data = await publicClient.readContract({
      address: NAME_WRAPPER_ADDRESS[chainId] as Address,
      abi: wrapperAbi,
      functionName: 'getData',
      args: [tokenId],
    })

    const [owner, fuses, expiry] = data

    return {
      name: subdomain,
      owner,
      fuses,
      expiry,
      exists: owner !== ZERO_ADDRESS,
    }
  } catch (error: any) {
    throw new ENSError(`Failed to get subdomain info: ${error.message}`)
  }
}

/**
 * Format version label
 */
export function formatVersionLabel(version: number): string {
  return `v${version}`
}

/**
 * Build full domain name
 */
export function buildFullDomain(version: number, parentDomain: string): string {
  return `${formatVersionLabel(version)}.${parentDomain}`
}
