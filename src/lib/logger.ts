/**
 * Logger utilities for CLI output
 * Cypherpunk ASCII aesthetic
 */

import chalk from 'chalk'
import ora, { type Ora } from 'ora'

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

// AUTARK ASCII art logo
const AUTARK_LOGO = `
          _____                    _____                _____                    _____                    _____                    _____
         /\\    \\                  /\\    \\              /\\    \\                  /\\    \\                  /\\    \\                  /\\    \\
        /::\\    \\                /::\\____\\            /::\\    \\                /::\\    \\                /::\\    \\                /::\\____\\
       /::::\\    \\              /:::/    /            \\:::\\    \\              /::::\\    \\              /::::\\    \\              /:::/    /
      /::::::\\    \\            /:::/    /              \\:::\\    \\            /::::::\\    \\            /::::::\\    \\            /:::/    /
     /:::/\\:::\\    \\          /:::/    /                \\:::\\    \\          /:::/\\:::\\    \\          /:::/\\:::\\    \\          /:::/    /
    /:::/__\\:::\\    \\        /:::/    /                  \\:::\\    \\        /:::/__\\:::\\    \\        /:::/__\\:::\\    \\        /:::/____/
   /::::\\   \\:::\\    \\      /:::/    /                   /::::\\    \\      /::::\\   \\:::\\    \\      /::::\\   \\:::\\    \\      /::::\\    \\
  /::::::\\   \\:::\\    \\    /:::/    /      _____        /::::::\\    \\    /::::::\\   \\:::\\    \\    /::::::\\   \\:::\\    \\    /::::::\\____\\________
 /:::/\\:::\\   \\:::\\    \\  /:::/____/      /\\    \\      /:::/\\:::\\    \\  /:::/\\:::\\   \\:::\\    \\  /:::/\\:::\\   \\:::\\____\\  /:::/\\:::::::::::\\    \\
/:::/  \\:::\\   \\:::\\____\\|:::|    /      /::\\____\\    /:::/  \\:::\\____\\/:::/  \\:::\\   \\:::\\____\\/:::/  \\:::\\   \\:::|    |/:::/  |:::::::::::\\____\\
\\::/    \\:::\\  /:::/    /|:::|____\\     /:::/    /   /:::/    \\::/    /\\::/    \\:::\\  /:::/    /\\::/   |::::\\  /:::|____|\\::/   |::|~~~|~~~~~
 \\/____/ \\:::\\/:::/    /  \\:::\\    \\   /:::/    /   /:::/    / \\/____/  \\/____/ \\:::\\/:::/    /  \\/____|::::::\\/:::/    /  \\/____|::|   |
          \\::::::/    /    \\:::\\    \\ /:::/    /   /:::/    /                    \\::::::/    /         |:::::::::/    /         |::|   |
           \\::::/    /      \\:::\\    /:::/    /   /:::/    /                      \\::::/    /          |::|\\::::/    /          |::|   |
           /:::/    /        \\:::\\__/:::/    /    \\::/    /                       /:::/    /           |::| \\::/____/           |::|   |
          /:::/    /          \\::::::::/    /      \\/____/                       /:::/    /            |::|  ~|                 |::|   |
         /:::/    /            \\::::::/    /                                    /:::/    /             |::|   |                 |::|   |
        /:::/    /              \\::::/    /                                    /:::/    /              \\::|   |                 \\::|   |
        \\::/    /                \\::/____/                                     \\::/    /                \\:|   |                  \\:|   |
         \\/____/                  ~~                                            \\/____/                  \\|___|                   \\|___|

Decentralized • Immutable • Trustless                                                                         v0.1.0
`

export class Logger {
  private quiet: boolean
  private debug: boolean
  private autarkColor = chalk.hex('#4AE2ED') // Autark brand color

  constructor(options: { quiet?: boolean; debug?: boolean } = {}) {
    this.quiet = options.quiet || false
    this.debug = options.debug || false
  }

  info(message: string): void {
    if (!this.quiet) {
      console.log(this.autarkColor('[i]'), message)
    }
  }

  success(message: string): void {
    if (!this.quiet) {
      console.log(this.autarkColor('[+]'), message)
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
      console.log(this.autarkColor(AUTARK_LOGO))
    }
  }

  section(title: string): void {
    if (!this.quiet) {
      console.log()
      const width = 70
      const titleLen = title.length
      const rightPadding = width - titleLen - 4 // 4 = "├─ " + " "
      const line = '─'.repeat(Math.max(0, rightPadding))
      console.log(this.autarkColor(`├─ ${title} ${line}┤`))
    }
  }

  successBanner(message: string): void {
    if (!this.quiet) {
      console.log()
      const width = 70
      const padding = Math.floor((width - message.length - 2) / 2)
      const leftPad = ' '.repeat(padding)
      const rightPad = ' '.repeat(width - message.length - 2 - padding)
      console.log(this.autarkColor('╔' + '═'.repeat(width - 2) + '╗'))
      console.log(this.autarkColor('║') + leftPad + this.autarkColor.bold(message) + rightPad + this.autarkColor('║'))
      console.log(this.autarkColor('╚' + '═'.repeat(width - 2) + '╝'))
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
      color: 'cyan',
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
