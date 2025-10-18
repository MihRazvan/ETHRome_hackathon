/**
 * Logger utilities for CLI output
 * Cypherpunk ASCII aesthetic
 */

import chalk from 'chalk'
import ora, { type Ora } from 'ora'

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

// AUTARK ASCII art logo
const AUTARK_LOGO = `
┌─────────────────────────────────────────────────────────────────────┐
│  █████╗ ██╗   ██╗████████╗ █████╗ ██████╗ ██╗  ██╗                │
│ ██╔══██╗██║   ██║╚══██╔══╝██╔══██╗██╔══██╗██║ ██╔╝                │
│ ███████║██║   ██║   ██║   ███████║██████╔╝█████╔╝                 │
│ ██╔══██║██║   ██║   ██║   ██╔══██║██╔══██╗██╔═██╗                 │
│ ██║  ██║╚██████╔╝   ██║   ██║  ██║██║  ██║██║  ██╗                │
│ ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝                │
│                                                                     │
│ Decentralized • Immutable • Trustless                              │
│ v0.1.0                                                              │
└─────────────────────────────────────────────────────────────────────┘
`

export class Logger {
  private quiet: boolean
  private debug: boolean

  constructor(options: { quiet?: boolean; debug?: boolean } = {}) {
    this.quiet = options.quiet || false
    this.debug = options.debug || false
  }

  info(message: string): void {
    if (!this.quiet) {
      console.log(chalk.dim.cyan('[i]'), message)
    }
  }

  success(message: string): void {
    if (!this.quiet) {
      console.log(chalk.green('[+]'), message)
    }
  }

  warn(message: string): void {
    if (!this.quiet) {
      console.log(chalk.yellow('[!]'), message)
    }
  }

  error(message: string): void {
    console.error(chalk.red('[-]'), message)
  }

  debugLog(message: string): void {
    if (this.debug) {
      console.log(chalk.dim.gray('[DEBUG]'), message)
    }
  }

  header(_message?: string): void {
    if (!this.quiet) {
      console.log()
      console.log(chalk.dim.green(AUTARK_LOGO))
    }
  }

  section(title: string): void {
    if (!this.quiet) {
      console.log()
      const width = 70
      const titleLen = title.length
      const rightPadding = width - titleLen - 4 // 4 = "├─ " + " "
      const line = '─'.repeat(Math.max(0, rightPadding))
      console.log(chalk.dim.white(`├─ ${title} ${line}┤`))
    }
  }

  successBanner(message: string): void {
    if (!this.quiet) {
      console.log()
      const width = 70
      const padding = Math.floor((width - message.length - 2) / 2)
      const leftPad = ' '.repeat(padding)
      const rightPad = ' '.repeat(width - message.length - 2 - padding)
      console.log(chalk.green('╔' + '═'.repeat(width - 2) + '╗'))
      console.log(chalk.green('║') + leftPad + chalk.bold.green(message) + rightPad + chalk.green('║'))
      console.log(chalk.green('╚' + '═'.repeat(width - 2) + '╝'))
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
      spinner: {
        interval: 80,
        frames: ['[>  ]', '[ > ]', '[  >]', '[ < ]'],
      },
      color: 'green',
    })
  }

  table(data: Record<string, string | number | boolean>): void {
    if (!this.quiet) {
      const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length))
      for (const [key, value] of Object.entries(data)) {
        const paddedKey = key.padEnd(maxKeyLength)
        console.log(`  ${chalk.dim.white(paddedKey)}  ${chalk.white(value)}`)
      }
    }
  }
}

// Default logger instance
export const logger = new Logger()
