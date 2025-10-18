/**
 * Build hash calculation for verification
 */

import { createHash } from 'crypto'
import { readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'

export interface BuildHash {
  hash: string
  algorithm: 'sha256'
  fileCount: number
  totalSize: number
}

/**
 * Calculate hash of build directory
 */
export function calculateBuildHash(directory: string): BuildHash {
  const files = getAllFiles(directory)
  const hash = createHash('sha256')

  let totalSize = 0

  // Sort files for deterministic hashing
  const sortedFiles = files.sort()

  for (const file of sortedFiles) {
    const relativePath = relative(directory, file)
    const content = readFileSync(file)

    // Hash both the path and content
    hash.update(relativePath)
    hash.update(content)

    totalSize += content.length
  }

  return {
    hash: hash.digest('hex'),
    algorithm: 'sha256',
    fileCount: files.length,
    totalSize,
  }
}

/**
 * Get all files in directory recursively
 */
function getAllFiles(directory: string): string[] {
  const files: string[] = []

  function walk(dir: string) {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          walk(fullPath)
        }
      } else if (stat.isFile()) {
        files.push(fullPath)
      }
    }
  }

  walk(directory)
  return files
}

/**
 * Format hash for display (first 8 chars)
 */
export function formatHash(hash: string): string {
  return hash.substring(0, 8)
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
