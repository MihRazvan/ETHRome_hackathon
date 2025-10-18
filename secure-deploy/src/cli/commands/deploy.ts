/**
 * Deploy command - Main deployment workflow
 */

import { createPublicClient, http } from 'viem'
import { sepolia, mainnet } from 'viem/chains'
import { Logger } from '../../lib/logger.js'
import { loadConfig, validateDeployConfig, type Config } from '../../lib/config.js'
import { uploadToIPFS, getIPFSUrls } from '../../lib/ipfs/upload.js'
import { calculateBuildHash, formatHash, formatSize } from '../../lib/hash/build.js'
import { getFullCommitInfo, isWorkingDirectoryClean } from '../../lib/git/commit.js'
import { detectNextVersion, buildFullDomain } from '../../lib/ens/version.js'
import { createDeploymentPlan } from '../../lib/ens/deploy.js'
import { createSubdomainDirect } from '../../lib/ens/execute.js'
import { initSafeClient, sendSafeTransaction, getSafeTransactionUrl } from '../../lib/safe/client.js'
import { generateSafeDescription } from '../../lib/safe/metadata.js'
import { DeployError, GitError } from '../../lib/errors.js'

export interface DeployOptions extends Partial<Config> {
  directory: string
  skipGitCheck?: boolean
  dryRun?: boolean
}

/**
 * Main deploy command
 */
export async function deployCommand(options: DeployOptions): Promise<void> {
  const logger = new Logger({ quiet: options.quiet, debug: options.debug })

  logger.header('🚀 Secure Deploy')
  logger.newline()

  try {
    // Load and validate config
    const config = loadConfig(options)
    validateDeployConfig(config)

    // Display configuration
    logger.section('📋 Configuration')
    logger.table({
      'Network': config.network,
      'Parent Domain': config.ensDomain!,
      'Safe Address': config.safeAddress!,
      'Build Directory': options.directory,
    })
    logger.newline()

    // Step 1: Calculate build hash
    logger.section('🔐 Step 1: Calculate Build Hash')
    const buildHash = calculateBuildHash(options.directory)
    logger.success(`Build hash: ${formatHash(buildHash.hash)}...`)
    logger.log(`  Files: ${buildHash.fileCount}, Size: ${formatSize(buildHash.totalSize)}`)
    logger.newline()

    // Step 2: Get Git commit info
    logger.section('🔖 Step 2: Git Commit Info')
    let commitInfo
    try {
      commitInfo = getFullCommitInfo(process.cwd())
      logger.success(`Commit: ${commitInfo.shortHash} - ${commitInfo.message.split('\n')[0]}`)
      logger.log(`  Author: ${commitInfo.author.name}`)
      if (commitInfo.url) {
        logger.log(`  URL: ${commitInfo.url}`)
      }

      // Warn if working directory is not clean
      if (!isWorkingDirectoryClean() && !options.skipGitCheck) {
        logger.warn('Working directory has uncommitted changes')
        logger.log('  Consider committing changes first or use --skip-git-check')
      }
    } catch (error) {
      if (error instanceof GitError) {
        logger.warn('Not a git repository - deployment will proceed without commit info')
      } else {
        throw error
      }
    }
    logger.newline()

    // Step 3: Upload to IPFS
    logger.section('📦 Step 3: Upload to IPFS')
    const ipfsResult = await uploadToIPFS(options.directory, logger)
    logger.log(`  CID: ${ipfsResult.cid}`)
    logger.log(`  URL: ${ipfsResult.url}`)
    logger.newline()

    // Step 4: Initialize clients
    logger.section('🔌 Step 4: Initialize Clients')
    const chain = config.network === 'mainnet' ? mainnet : sepolia
    const publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    })
    logger.success('Public client initialized')

    const safeClient = await initSafeClient({
      safeAddress: config.safeAddress!,
      signerPrivateKey: config.ownerPrivateKey!,
      rpcUrl: config.rpcUrl!,
      apiKey: config.safeApiKey,
    })
    logger.success('Safe client initialized')
    logger.newline()

    // Step 5: Detect next version
    logger.section('🔍 Step 5: Detect Next Version')
    const { version, existing } = await detectNextVersion(
      config.ensDomain!,
      publicClient,
      chain.id
    )

    if (existing.length > 0) {
      logger.log(`  Existing: ${existing.slice(-3).join(', ')}`)
    }
    logger.success(`Next version: v${version}`)

    const fullDomain = buildFullDomain(version, config.ensDomain!)
    logger.log(`  Full domain: ${fullDomain}`)
    logger.newline()

    // Step 6: Create deployment plan
    logger.section('📝 Step 6: Create Deployment Plan')
    const plan = createDeploymentPlan(
      config.ensDomain!,
      `v${version}`,
      ipfsResult.cid,
      config.safeAddress!,
      chain.id,
      config.network
    )
    logger.success('Deployment plan created')
    logger.log(`  Domain: ${plan.fullDomain}`)
    logger.log(`  CID: ${plan.cid}`)
    logger.log(`  Content-hash: ${plan.contentHash.slice(0, 20)}...`)
    logger.newline()

    // Generate enhanced metadata
    const metadata = generateSafeDescription({
      domain: fullDomain,
      cid: ipfsResult.cid,
      commit: commitInfo,
      buildHash,
      timestamp: new Date().toISOString(),
    })

    if (options.debug) {
      logger.section('📋 Safe Transaction Metadata')
      logger.log(metadata)
      logger.newline()
    }

    if (options.dryRun) {
      logger.section('🔍 DRY RUN - Preview')
      logger.log('')
      logger.log('This deployment would:')
      logger.log(`  1. Create subdomain: ${fullDomain}`)
      logger.log(`  2. Set content-hash to: ${ipfsResult.cid}`)
      logger.log(`  3. Apply immutable fuses`)
      logger.log('')
      logger.log('Preview URLs:')
      for (const url of getIPFSUrls(ipfsResult.cid, fullDomain)) {
        logger.log(`  ${url}`)
      }
      logger.newline()
      logger.log('Run without --dry-run to execute')
      return
    }

    // Step 7: Execute deployment
    logger.section('✅ Step 7: Execute Deployment')

    // Transaction 1: Create subdomain (direct execution by parent owner)
    const spinner1 = logger.spinner('Creating subdomain (parent owner)...')
    spinner1.start()
    const subdomainHash = await createSubdomainDirect(
      plan,
      config.ownerPrivateKey!,
      config.rpcUrl!,
      chain.id,
      publicClient
    )
    spinner1.succeed(`Subdomain created: ${fullDomain}`)
    logger.log(`  TX Hash: ${subdomainHash}`)
    logger.newline()

    // Transaction 2: Set contenthash (via Safe)
    logger.log('Next step: Set contenthash via Safe')
    const spinner2 = logger.spinner('Proposing contenthash to Safe...')
    spinner2.start()
    const result2 = await sendSafeTransaction(safeClient, plan.setContenthashTx, chain.id)
    spinner2.succeed(`Contenthash proposal created`)
    if (result2.safeTxHash) {
      logger.log(`  Safe TX Hash: ${result2.safeTxHash}`)
    }
    logger.newline()

    // Success!
    logger.header('🎉 Subdomain Created!')
    logger.newline()
    logger.success(`Subdomain: ${fullDomain}`)
    logger.log(`  Owner: ${config.safeAddress} (Safe)`)
    logger.log(`  IPFS CID: ${ipfsResult.cid}`)
    if (commitInfo) {
      logger.log(`  Git Commit: ${commitInfo.shortHash}`)
    }
    logger.log(`  Build Hash: ${formatHash(buildHash.hash)}...`)
    logger.newline()

    logger.warn('⚠️  Action Required: Set Contenthash')
    logger.log('  1. Go to Safe UI: ' + getSafeTransactionUrl(config.safeAddress!, chain.id))
    logger.log('  2. Review and approve contenthash transaction')
    logger.log('  3. Execute transaction')
    logger.newline()

    logger.log('After execution, your site will be live at:')
    for (const url of getIPFSUrls(ipfsResult.cid, fullDomain)) {
      logger.log(`  ${url}`)
    }
    logger.newline()

  } catch (error: any) {
    logger.error('Deployment failed')
    if (error instanceof DeployError) {
      logger.error(error.message)
      if (error.code) {
        logger.log(`  Error code: ${error.code}`)
      }
    } else {
      logger.error(error.message || 'Unknown error')
    }
    process.exit(1)
  }
}
