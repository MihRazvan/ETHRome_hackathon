/**
 * Custom error classes for secure-deploy CLI
 */

export class DeployError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'DeployError'
  }
}

export class ConfigError extends DeployError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR')
    this.name = 'ConfigError'
  }
}

export class IPFSError extends DeployError {
  constructor(message: string) {
    super(message, 'IPFS_ERROR')
    this.name = 'IPFSError'
  }
}

export class ENSError extends DeployError {
  constructor(message: string) {
    super(message, 'ENS_ERROR')
    this.name = 'ENSError'
  }
}

export class SafeError extends DeployError {
  constructor(message: string) {
    super(message, 'SAFE_ERROR')
    this.name = 'SafeError'
  }
}

export class GitError extends DeployError {
  constructor(message: string) {
    super(message, 'GIT_ERROR')
    this.name = 'GitError'
  }
}

export class ValidationError extends DeployError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}
