#!/usr/bin/env tsx

/**
 * Simple IPFS Upload Test using Storacha CLI
 *
 * This is a simpler approach that uses the storacha CLI
 * to upload files instead of the Node.js client library
 */

import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdirSync, statSync, writeFileSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function fileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`
}

function getFiles(dir: string): Array<{ name: string; size: number }> {
  const files: Array<{ name: string; size: number }> = []
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name)
    if (entry.isFile()) {
      const stats = statSync(fullPath)
      files.push({ name: entry.name, size: stats.size })
    }
  }

  return files
}

async function main() {
  console.log('🔧 Testing IPFS Upload via Storacha CLI\n')

  // Check if storacha CLI is installed
  try {
    execSync('storacha --version', { stdio: 'pipe' })
  } catch (error) {
    console.error('❌ Storacha CLI not installed')
    console.error('\nPlease install it:')
    console.error('  npm install -g @storacha/cli')
    process.exit(1)
  }

  // Read files from test directory
  const testDir = resolve(__dirname, 'fixtures/example-site')
  console.log(`📦 Directory: ${testDir}\n`)

  const files = getFiles(testDir)

  if (files.length === 0) {
    console.error('❌ No files found in test directory')
    process.exit(1)
  }

  let totalSize = 0
  for (const file of files) {
    totalSize += file.size
    console.log(`  ✓ ${file.name} (${fileSize(file.size)})`)
  }

  console.log(`  Total: ${fileSize(totalSize)} in ${files.length} file(s)\n`)

  // Upload using storacha CLI
  console.log('🚀 Uploading to IPFS via Storacha...')
  console.log('  ⏳ Uploading...\n')

  try {
    const output = execSync(`storacha up "${testDir}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    })

    // Parse the CID from the output
    // Storacha CLI outputs something like: "bafybei... (123 bytes)"
    const lines = output.split('\n')
    let cid = ''

    for (const line of lines) {
      // Look for a line with a CID (starts with bafy or Qm)
      const match = line.match(/(bafy[a-z0-9]{50,}|Qm[A-Za-z0-9]{44})/)
      if (match) {
        cid = match[1]
        break
      }
    }

    if (!cid) {
      console.error('❌ Could not find CID in output:')
      console.error(output)
      process.exit(1)
    }

    console.log('  ✓ Upload complete!\n')
    console.log('✨ Success! Your website is on IPFS:\n')
    console.log(`  Root CID: ${cid}\n`)
    console.log('🌐 View your site at:')
    console.log(`  https://w3s.link/ipfs/${cid}`)
    console.log(`  https://${cid}.ipfs.w3s.link\n`)

    // Save CID to file
    const cidPath = resolve(__dirname, '../../.last-cid')
    writeFileSync(cidPath, cid, 'utf-8')
    console.log('💾 CID saved to .last-cid')

    console.log('\n✅ Test passed! IPFS upload works correctly.')

  } catch (error) {
    console.error('\n❌ Upload failed')

    if (error instanceof Error && 'stderr' in error) {
      const stderr = (error as any).stderr?.toString()
      if (stderr?.includes('not logged in') || stderr?.includes('No space')) {
        console.error('\nIt looks like you need to set up storacha CLI:')
        console.error('  storacha login your-email@example.com')
        console.error('  storacha space use did:key:z6MkqasY5EqUjJsBVSPeg6uV6Fh59s1CqJuxK4cniTsJ2qbb')
      } else {
        console.error(stderr)
      }
    } else {
      console.error((error as Error).message)
    }

    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
