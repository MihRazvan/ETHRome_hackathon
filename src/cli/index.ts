#!/usr/bin/env node
/**
 * Secure Deploy CLI
 *
 * A tool for deploying frontend applications with Safe multisig + immutable ENS versioning
 */

import { config } from 'dotenv'
import { Command } from 'commander'

// Load .env file
config()
import { deployCommand } from './commands/deploy.js'
import { statusCommand } from './commands/status.js'
import { initCommand } from './commands/init.js'
import { setupCommand } from './commands/setup.js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')
)

const program = new Command()

program
  .name('autark')
  .description('Deploy frontends with Safe multisig + immutable ENS versioning')
  .version(packageJson.version)

// Deploy command
program
  .command('deploy')
  .description('Deploy a directory to IPFS and ENS via Safe')
  .argument('<directory>', 'Directory to deploy')
  .option('--ens-domain <domain>', 'ENS parent domain')
  .option('--safe-address <address>', 'Safe multisig address')
  .option('--owner-private-key <key>', 'Owner private key for Safe signing')
  .option('--rpc-url <url>', 'RPC URL')
  .option('--safe-api-key <key>', 'Safe API key')
  .option('--network <network>', 'Network (mainnet, sepolia, goerli)', 'sepolia')
  .option('--skip-git-check', 'Skip git working directory check')
  .option('--dry-run', 'Preview deployment without executing')
  .option('--quiet', 'Minimal output')
  .option('--debug', 'Debug output')
  .action(async (directory, options) => {
    await deployCommand({ directory, ...options })
  })

// Status command
program
  .command('status')
  .description('Check deployment status')
  .option('--subdomain <subdomain>', 'Check specific subdomain')
  .option('--ens-domain <domain>', 'ENS parent domain')
  .option('--rpc-url <url>', 'RPC URL')
  .option('--network <network>', 'Network (mainnet, sepolia, goerli)', 'sepolia')
  .option('--quiet', 'Minimal output')
  .option('--debug', 'Debug output')
  .action(async (options) => {
    await statusCommand(options)
  })

// Init command
program
  .command('init')
  .description('Initialize configuration file')
  .action(async () => {
    await initCommand()
  })

// Setup command
program
  .command('setup')
  .description('Setup git hooks for automatic deployment')
  .option('--branch <branch>', 'Branch to trigger deployments (default: staging)')
  .option('--force', 'Overwrite existing hooks')
  .option('--quiet', 'Minimal output')
  .option('--debug', 'Debug output')
  .action(async (options) => {
    await setupCommand(options)
  })

// Parse CLI arguments
program.parse()
