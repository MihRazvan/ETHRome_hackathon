#!/usr/bin/env tsx

/**
 * Check Domain Fuses
 *
 * Quick script to check what fuses are burned on a domain
 */

import { createPublicClient, http, parseAbi } from 'viem'
import { sepolia } from 'viem/chains'
import { namehash, normalize } from 'ox/Ens'
import { NAME_WRAPPER_ADDRESS } from '../namewrapper/wrapper.js'
import { FUSES } from '../namewrapper/fuses.js'

const domain = 'ethrome.eth'
const node = namehash(normalize(domain))
const tokenId = BigInt(node)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com')
})

const wrapperAbi = parseAbi([
  'function getData(uint256 tokenId) view returns (address owner, uint32 fuses, uint64 expiry)',
])

async function main() {
  console.log(`\n🔍 Checking fuses for: ${domain}\n`)

  try {
    const data = await publicClient.readContract({
      address: NAME_WRAPPER_ADDRESS[sepolia.id],
      abi: wrapperAbi,
      functionName: 'getData',
      args: [tokenId]
    })

    const [owner, fusesValue, expiry] = data

    console.log(`Owner: ${owner}`)
    console.log(`Fuses: ${fusesValue}`)
    console.log(`Expiry: ${expiry}\n`)

    console.log('Burned fuses:')

    const fuseEntries = Object.entries(FUSES) as [string, number][]
    let hasAnyFuses = false

    for (const [name, value] of fuseEntries) {
      if ((fusesValue & value) === value) {
        console.log(`  ✓ ${name}`)
        hasAnyFuses = true
      }
    }

    if (!hasAnyFuses) {
      console.log('  (none)')
    }

    console.log('')

    // Check if can create subdomains
    const canCreateSubdomains = (fusesValue & FUSES.CANNOT_CREATE_SUBDOMAIN) === 0
    console.log(`Can create subdomains: ${canCreateSubdomains ? '✅ YES' : '❌ NO'}`)

    // Check if parent controllable
    const isParentControllable = (fusesValue & FUSES.PARENT_CANNOT_CONTROL) === 0
    console.log(`Parent can control: ${isParentControllable ? '⚠️  YES (subdomains won\'t be permanent)' : '✅ NO (subdomains can be permanent)'}`)

    console.log('')

    if (canCreateSubdomains && !isParentControllable) {
      console.log('✅ Ready to create permanent subdomains!')
    } else if (!canCreateSubdomains) {
      console.log('❌ CANNOT_CREATE_SUBDOMAIN is burned - cannot create subdomains')
      console.log('   You need to unwrap and re-wrap the domain without this fuse')
    } else {
      console.log('⚠️  Can create subdomains but they won\'t be permanent')
      console.log('   Need to burn PARENT_CANNOT_CONTROL fuse on parent first')
    }

    console.log('')

  } catch (error) {
    console.error('❌ Error:', (error as Error).message)
  }
}

main()
