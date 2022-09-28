import { Task } from './base/task.js'
import { MemoryQueue } from './queue/memory/memory.queue.js'
import { Logger } from './base/logger.js'

export class Dispatcher {
  constructor ({ queue, logger } = {}) {
    this.queue = queue || new MemoryQueue()
    this.logger = logger || new Logger()
    this.time = () => Date.now()
  }

  async dispatch ({ job, payload, delay, lane, timeout }) {
    this.logger.debug(`Deferring job ${job}...`)
    const scheduledAt = new Date(this.time() + (delay || 0))
    const task = new Task({ job, lane, scheduledAt, timeout, payload })
    await this.queue.put(task)
  }
}
