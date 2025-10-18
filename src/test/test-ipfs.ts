#!/usr/bin/env tsx

/**
 * Test: IPFS Upload via Storacha
 *
 * This script tests the complete IPFS upload flow:
 * 1. Load credentials from .env
 * 2. Create Storacha client with delegation
 * 3. Read files from test directory
 * 4. Upload to IPFS
 * 5. Display CID and gateway URLs
 */

import * as Client from '@storacha/client'
import { StoreMemory } from '@storacha/client/stores/memory'
import * as Proof from '@storacha/client/proof'
import { Signer } from '@storacha/client/principal/ed25519'
import { filesFromPaths } from 'files-from-path'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../../.env')
    const envContent = require('fs').readFileSync(envPath, 'utf-8')
    const env: Record<string, string> = {}

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim()
        }
      }
    }

    return env
  } catch (error) {
    console.error('❌ Error loading .env file:', (error as Error).message)
    console.error('\nMake sure you have a .env file with:')
    console.error('  KEY=MgCY...')
    console.error('  PROOF=mAYI...')
    process.exit(1)
  }
}

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

async function main() {
  console.log('🔧 Initializing Storacha Client...\n')

  // Load credentials
  const env = loadEnv()
  const { KEY, PROOF } = env

  if (!KEY || !PROOF) {
    console.error('❌ Missing credentials in .env file')
    console.error('\nRequired:')
    console.error('  KEY=MgCY...    (from: storacha key create)')
    console.error('  PROOF=mAYI...  (from: storacha delegation create <did> --base64)')
    process.exit(1)
  }

  try {
    // Create Storacha client
    const principal = Signer.parse(KEY)
    const store = new StoreMemory()
    const client = await Client.create({ principal, store })

    console.log(`  ✓ Agent loaded: ${principal.did()}`)

    // Import delegation proof
    const proof = await Proof.parse(PROOF)
    const space = await client.addSpace(proof)
    await client.setCurrentSpace(space.did())

    console.log(`  ✓ Delegation imported`)
    console.log(`  ✓ Space set: ${space.did()} (${space.name || 'unnamed'})\n`)

    // Read files from test directory
    const testDir = resolve(__dirname, 'fixtures/example-site')
    console.log(`📦 Reading directory: ${testDir}\n`)

    const files = await filesFromPaths([testDir])

    if (files.length === 0) {
      console.error('❌ No files found in test directory')
      process.exit(1)
    }

    let totalSize = 0
    for (const file of files) {
      const size = file.size
      totalSize += size
      console.log(`  ✓ ${file.name} (${fileSize(size)})`)
    }

    console.log(`  Total: ${fileSize(totalSize)} in ${files.length} file(s)\n`)

    // Upload to Storacha
    console.log('🚀 Uploading to IPFS via Storacha...')
    console.log('  ⏳ Uploading...')

    const directoryCid = await client.uploadDirectory(files)

    console.log('  ✓ Upload complete!\n')

    // Display results
    console.log('✨ Success! Your website is on IPFS:\n')
    console.log(`  Root CID: ${directoryCid}\n`)
    console.log('🌐 View your site at:')
    console.log(`  https://w3s.link/ipfs/${directoryCid}`)
    console.log(`  https://${directoryCid}.ipfs.w3s.link\n`)

    console.log('📋 Individual files:')
    for (const file of files) {
      console.log(`  https://w3s.link/ipfs/${directoryCid}/${file.name}`)
    }

    // Save CID to file for other tests
    const cidPath = resolve(__dirname, '../../.last-cid')
    writeFileSync(cidPath, directoryCid.toString(), 'utf-8')
    console.log(`\n💾 CID saved to .last-cid`)

  } catch (error) {
    console.error('\n❌ Upload failed:', (error as Error).message)
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
