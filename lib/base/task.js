import { uuid } from './common.js'

export class Task {
  constructor (attributes = {}) {
    this.id = attributes.id || uuid()
    this.job = attributes.job || ''
    this.lane = attributes.lane || ''
    this.createdAt = new Date(attributes.createdAt || new Date())
    this.scheduledAt = new Date(attributes.scheduledAt || this.createdAt)
    this.pickedAt = (
      attributes.pickedAt ? new Date(attributes.pickedAt) : null)
    this.failedAt = (
      attributes.failedAt ? new Date(attributes.failedAt) : null)
    this.deletedAt = (
      attributes.deletedAt ? new Date(attributes.deletedAt) : null)
    this.timeout = attributes.timeout ?? 300_000
    this.attempts = attributes.attempts || 0
    this.payload = attributes.payload || {}
  }
}
