import type { Hex } from 'ox/Hex'
import type { ReadStream } from 'node:fs'

export type ChainName = 'mainnet' | 'sepolia' | 'goerli'

export type FileEntry = {
  path: string
  content: ReadStream
  size: number
}

export type DeployOptions = {
  ens: string
  safe: string
  repo: string
  chain?: ChainName
  ipfsProvider?: 'storacha'
  delayHours?: number
  verbose?: boolean
  dryRun?: boolean
  rpcUrl?: string
  resolverAddress?: string
}

export type CommitData = {
  hash: string
  shortHash: string
  message: string
  author: {
    name: string
    email: string
    username?: string
  }
  timestamp: string
  url: string
}

export type SafeProposalMetadata = {
  ens: string
  version: number
  newCID: string
  buildHash: string
  commitData: CommitData
  safeAddress: string
  chainId: number
  delayHours: number
}

export type OperationType = 0 | 1 | 2 // Call, DelegateCall, Create

export type SafeTransactionData = {
  to: string
  value: bigint
  data: Hex
  operation: OperationType
  safeTxGas?: bigint
  baseGas?: bigint
  gasPrice?: bigint
  gasToken?: string
  refundReceiver?: string
  nonce: bigint
}
