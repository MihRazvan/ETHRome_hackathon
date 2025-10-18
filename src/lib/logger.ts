/**
 * Logger utilities for CLI output
 */

import chalk from 'chalk'
import ora, { type Ora } from 'ora'

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

export class Logger {
  private quiet: boolean
  private debug: boolean

  constructor(options: { quiet?: boolean; debug?: boolean } = {}) {
    this.quiet = options.quiet || false
    this.debug = options.debug || false
  }

  info(message: string): void {
    if (!this.quiet) {
      console.log(chalk.blue('ℹ'), message)
    }
  }

  success(message: string): void {
    if (!this.quiet) {
      console.log(chalk.green('✓'), message)
    }
  }

  warn(message: string): void {
    if (!this.quiet) {
      console.log(chalk.yellow('⚠'), message)
    }
  }

  error(message: string): void {
    console.error(chalk.red('✗'), message)
  }

  debugLog(message: string): void {
    if (this.debug) {
      console.log(chalk.gray('[DEBUG]'), message)
    }
  }

  header(message: string): void {
    if (!this.quiet) {
      console.log()
      console.log(chalk.bold(message))
      console.log(chalk.gray('━'.repeat(70)))
    }
  }

  section(title: string): void {
    if (!this.quiet) {
      console.log()
      console.log(chalk.cyan(`${title}`))
    }
  }

  log(message: string): void {
    if (!this.quiet) {
      console.log(message)
    }
  }

  newline(): void {
    if (!this.quiet) {
      console.log()
    }
  }

  spinner(text: string): Ora {
    return ora({
      text,
      isEnabled: !this.quiet,
    })
  }

  table(data: Record<string, string | number | boolean>): void {
    if (!this.quiet) {
      const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length))
      for (const [key, value] of Object.entries(data)) {
        const paddedKey = key.padEnd(maxKeyLength)
        console.log(`  ${chalk.gray(paddedKey)}  ${value}`)
      }
    }
  }
}

// Default logger instance
export const logger = new Logger()
