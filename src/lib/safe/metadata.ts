/**
 * Enhanced Safe transaction metadata
 */

import type { CommitInfo } from '../git/commit.js'
import type { BuildHash } from '../hash/build.js'
import { formatHash, formatSize } from '../hash/build.js'

export interface DeploymentMetadata {
  domain: string
  cid: string
  commit?: CommitInfo
  buildHash?: BuildHash
  timestamp: string
}

/**
 * Generate enhanced Safe transaction description
 */
export function generateSafeDescription(metadata: DeploymentMetadata): string {
  const lines: string[] = []

  lines.push(`🚀 Deploy ${metadata.domain}`)
  lines.push('')

  // IPFS section
  lines.push('📦 IPFS Deployment')
  lines.push(`CID: ${metadata.cid}`)
  lines.push(`Preview: https://w3s.link/ipfs/${metadata.cid}`)
  lines.push(`ENS: https://${metadata.domain}.limo`)
  lines.push('')

  // Git commit section
  if (metadata.commit) {
    lines.push('🔖 Git Commit')
    lines.push(`Hash: ${metadata.commit.shortHash}`)
    lines.push(`Message: ${metadata.commit.message}`)
    lines.push(`Author: ${metadata.commit.author.name} <${metadata.commit.author.email}>`)
    lines.push(`Date: ${new Date(metadata.commit.timestamp).toLocaleString()}`)
    if (metadata.commit.url) {
      lines.push(`URL: ${metadata.commit.url}`)
    }
    lines.push('')
  }

  // Build hash section
  if (metadata.buildHash) {
    lines.push('🔐 Build Verification')
    lines.push(`Hash: ${formatHash(metadata.buildHash.hash)}...`)
    lines.push(`Files: ${metadata.buildHash.fileCount}`)
    lines.push(`Size: ${formatSize(metadata.buildHash.totalSize)}`)
    lines.push('')
  }

  // Security info
  lines.push('🛡️ Security')
  lines.push('✓ Immutable ENS fuses (CANNOT_UNWRAP | CANNOT_SET_RESOLVER)')
  lines.push('✓ Safe-owned subdomain (multisig required for changes)')
  lines.push('✓ Content-addressable IPFS deployment')
  lines.push('')

  // Timestamp
  lines.push(`⏰ Deployed: ${new Date(metadata.timestamp).toISOString()}`)

  return lines.join('\n')
}

/**
 * Generate short description for transaction list
 */
export function generateShortDescription(
  domain: string,
  commit?: CommitInfo
): string {
  if (commit) {
    return `Deploy ${domain} @ ${commit.shortHash}: ${commit.message.split('\n')[0]}`
  }
  return `Deploy ${domain}`
}
