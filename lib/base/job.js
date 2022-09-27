export class Job {
  constructor (attributes = {}) {
    this.name = attributes.name || ''
    this.lane = attributes.lane || ''
    this.timeout = attributes.timeout || 300_000
    this.backoff = attributes.backoff || 3_000
    this.retries = attributes.retries || 3
    this.frequency = attributes.frequency || '* * * * *'
    this.payload = attributes.payload || {}
  }

  async run (task) {
    throw new Error('Not implemented.')
  }
}
