export class Job {
  constructor (attributes = {}) {
    this.name = attributes.name || ''
    this.lane = attributes.lane || ''
    this.timeout = attributes.timeout || 300
    this.backoff = attributes.timeout || 3
    this.retries = attributes.timeout || 3
    this.frequency = attributes.timeout || '* * * * *'
    this.payload = attributes.payload || {}
  }

  run (task) {
    throw new Error('Not implemented.')
  }
}
