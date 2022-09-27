export class Logger {
  constructor ({ global = globalThis } = {}) {
    const prefix = 'SCHEDULARK'
    const levels = ['error', 'warn', 'info', 'debug']
    const logvar = global[`${prefix}_LOGVAR`] || 'LOGLEVEL'
    const loglevel = String(global[logvar]).toLowerCase()
    this.global = global
    this.logindex = levels.indexOf(loglevel)
  }

  error (...args) {
    if (this.logindex >= 0) this.global.console.error('[ERROR]', ...args)
  }

  warn (...args) {
    if (this.logindex >= 1) this.global.console.warn('[WARN]', ...args)
  }

  info (...args) {
    if (this.logindex >= 2) this.global.console.info('[INFO]', ...args)
  }

  debug (...args) {
    if (this.logindex >= 3) this.global.console.debug('[DEBUG]', ...args)
  }
}
