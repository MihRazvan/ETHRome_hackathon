/**
 * Direct ENS execution (for parent owner)
 */

import { createWalletClient, http, type Address, type Hex, type PublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia, mainnet } from 'viem/chains'
import { NAME_WRAPPER_ADDRESS } from './namewrapper/wrapper.js'
import { ENSError } from '../errors.js'
import type { DeploymentPlan } from './deploy.js'

/**
 * Execute subdomain creation directly (parent owner only)
 */
export async function createSubdomainDirect(
  plan: DeploymentPlan,
  ownerPrivateKey: Hex,
  rpcUrl: string,
  chainId: number,
  publicClient: PublicClient
): Promise<Hex> {
  const account = privateKeyToAccount(ownerPrivateKey)
  const chain = chainId === 11155111 ? sepolia : mainnet

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  })

  try {
    // Send transaction with pre-encoded data
    const hash = await walletClient.sendTransaction({
      to: plan.createSubdomainTx.to,
      data: plan.createSubdomainTx.data,
      value: 0n,
    })

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash })

    return hash
  } catch (error: any) {
    throw new ENSError(`Failed to create subdomain: ${error.message}`)
  }
}
