// Filesystem utilities for gathering files
// Simplified from Blumen

import { constants, createReadStream } from 'node:fs'
import { access, stat, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { FileEntry } from '../types.js'

export const walk = async (
  dir: string,
  verbose = false,
): Promise<[number, FileEntry[]]> => {
  let total = 0
  const files: FileEntry[] = []

  const processDirectory = async (currentDir: string) => {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      // Skip node_modules and hidden files
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue
      }

      if (entry.isDirectory()) {
        await processDirectory(fullPath)
      } else if (entry.isFile()) {
        const size = (await stat(fullPath)).size
        const name = relative(dir, fullPath)
        if (verbose) {
          console.log(`  ${name} (${fileSize(size, 2)})`)
        }
        total += size
        files.push({
          path: name,
          content: createReadStream(fullPath),
          size,
        })
      }
    }
  }

  await processDirectory(dir)
  return [total, files] as const
}

export const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const units = ['KB', 'MB', 'GB', 'TB', 'PB']
const thresh = 1000

export function fileSize(bytes: number, digits = 1): string {
  if (Math.abs(bytes) < thresh) return `${bytes}B`

  let u = -1
  const r = 10 ** digits

  do {
    bytes /= thresh
    ++u
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  )

  return bytes.toFixed(digits) + units[u]
}
