/**
 * Git commit information extraction
 */

import { execSync } from 'child_process'
import { GitError } from '../errors.js'

export interface CommitInfo {
  hash: string
  shortHash: string
  message: string
  author: {
    name: string
    email: string
  }
  timestamp: string
  url?: string
}

/**
 * Get current Git commit information
 */
export function getCommitInfo(cwd: string = process.cwd()): CommitInfo {
  try {
    // Check if we're in a git repo
    execSync('git rev-parse --git-dir', {
      cwd,
      stdio: 'pipe',
    })
  } catch {
    throw new GitError('Not a git repository')
  }

  try {
    const hash = execSync('git rev-parse HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    const shortHash = execSync('git rev-parse --short HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    const message = execSync('git log -1 --pretty=%B', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    const authorName = execSync('git log -1 --pretty=%an', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    const authorEmail = execSync('git log -1 --pretty=%ae', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    const timestamp = execSync('git log -1 --pretty=%aI', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    return {
      hash,
      shortHash,
      message,
      author: {
        name: authorName,
        email: authorEmail,
      },
      timestamp,
    }
  } catch (error: any) {
    throw new GitError(`Failed to get commit info: ${error.message}`)
  }
}

/**
 * Check if working directory is clean
 */
export function isWorkingDirectoryClean(cwd: string = process.cwd()): boolean {
  try {
    const status = execSync('git status --porcelain', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    return status === ''
  } catch {
    return false
  }
}

/**
 * Get remote URL and convert to GitHub web URL
 */
export function getRemoteUrl(cwd: string = process.cwd()): string | undefined {
  try {
    const remote = execSync('git config --get remote.origin.url', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    // Convert SSH to HTTPS
    if (remote.startsWith('git@github.com:')) {
      return remote
        .replace('git@github.com:', 'https://github.com/')
        .replace(/\.git$/, '')
    }

    // Convert HTTPS
    if (remote.startsWith('https://github.com/')) {
      return remote.replace(/\.git$/, '')
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * Get full commit info including GitHub URL
 */
export function getFullCommitInfo(cwd: string = process.cwd()): CommitInfo {
  const info = getCommitInfo(cwd)
  const remoteUrl = getRemoteUrl(cwd)

  if (remoteUrl) {
    info.url = `${remoteUrl}/commit/${info.hash}`
  }

  return info
}
