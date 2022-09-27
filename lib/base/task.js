import { uuid } from './common.js'

export class Task {
  constructor (attributes = {}) {
    this.id = attributes.id || uuid()
    this.job = attributes.job || ''
    this.lane = attributes.lane || ''
    this.createdAt = new Date(attributes.createdAt || new Date())
    this.scheduledAt = new Date(attributes.scheduledAt || this.createdAt)
    this.pickedAt = new Date(attributes.pickedAt || 0)
    this.failedAt = new Date(attributes.failedAt || 0)
    this.timeout = attributes.timeout ?? 300_000
    this.attempts = attributes.attempts || 0
    this.payload = attributes.payload || {}
  }
}
