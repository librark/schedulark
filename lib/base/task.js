import { uuid } from './common.js'

export class Task {
  constructor (attributes = {}) {
    this.id = attributes.id || uuid()
    this.job = attributes.job || ''
    this.lane = attributes.lane || ''
    this.createdAt = attributes.createdAt || new Date()
    this.scheduledAt = attributes.scheduledAt || this.createdAt
    this.pickedAt = attributes.pickedAt || null
    this.timeout = attributes.timeout || 300
    this.failedAt = attributes.failedAt || null
    this.attempts = attributes.timeout || 0
    this.payload = attributes.payload || {}
  }
}
