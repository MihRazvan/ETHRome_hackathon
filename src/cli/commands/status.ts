/**
 * Status command - Check deployment status
 */

import { createPublicClient, http } from 'viem'
import { sepolia, mainnet } from 'viem/chains'
import { Logger } from '../../lib/logger.js'
import { loadConfig, type Config } from '../../lib/config.js'
import { detectNextVersion, getSubdomainInfo } from '../../lib/ens/version.js'

export interface StatusOptions extends Partial<Config> {
  subdomain?: string
}

/**
 * Status command - Show ENS deployment status
 */
export async function statusCommand(options: StatusOptions): Promise<void> {
  const logger = new Logger({ quiet: options.quiet, debug: options.debug })

  logger.header('📊 Deployment Status')
  logger.newline()

  try {
    const config = loadConfig(options)

    if (!config.ensDomain || !config.rpcUrl) {
      logger.error('Missing required config: ensDomain and rpcUrl')
      logger.log('Set via --ens-domain and --rpc-url or config file')
      process.exit(1)
    }

    const chain = config.network === 'mainnet' ? mainnet : sepolia
    const publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    })

    logger.section('📋 Configuration')
    logger.table({
      'Network': config.network,
      'Parent Domain': config.ensDomain,
    })
    logger.newline()

    if (options.subdomain) {
      // Show specific subdomain info
      logger.section(`🔍 Subdomain: ${options.subdomain}`)
      const info = await getSubdomainInfo(options.subdomain, publicClient, chain.id)

      if (!info.exists) {
        logger.warn('Subdomain does not exist or is not wrapped')
        return
      }

      logger.table({
        'Owner': info.owner,
        'Fuses': info.fuses,
        'Expiry': new Date(Number(info.expiry) * 1000).toISOString(),
      })
    } else {
      // Show version summary
      logger.section('📦 Deployed Versions')
      const { version, existing } = await detectNextVersion(
        config.ensDomain,
        publicClient,
        chain.id
      )

      if (existing.length === 0) {
        logger.log('No versions deployed yet')
      } else {
        logger.log(`Total versions: ${existing.length}`)
        logger.log(`Latest: ${existing[existing.length - 1]}.${config.ensDomain}`)
        logger.newline()

        if (existing.length <= 10) {
          logger.log('All versions:')
          for (const v of existing) {
            logger.log(`  ${v}.${config.ensDomain}`)
          }
        } else {
          logger.log('Recent versions:')
          for (const v of existing.slice(-10)) {
            logger.log(`  ${v}.${config.ensDomain}`)
          }
        }
      }

      logger.newline()
      logger.log(`Next version: v${version}.${config.ensDomain}`)
    }

    logger.newline()

  } catch (error: any) {
    logger.error('Failed to get status')
    logger.error(error.message || 'Unknown error')
    process.exit(1)
  }
}
