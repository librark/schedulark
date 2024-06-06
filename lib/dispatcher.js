import { Task } from './base/task.js'
import { MemoryQueue } from './queue/memory/memory.queue.js'
import { Logger } from './base/logger.js'

export class Dispatcher {
  constructor ({ queue, logger } = {}) {
    this.queue = queue || new MemoryQueue()
    this.logger = logger || new Logger()
    this.time = () => Date.now()
  }

  async dispatch (records) {
    const tasks = []
    for (const record of [records].flat()) {
      const { job, payload, delay, lane, timeout } = record
      const scheduledAt = new Date(this.time() + (delay || 0))
      tasks.push(new Task({ job, lane, scheduledAt, timeout, payload }))
      this.logger.debug(`Deferring job ${job}...`)
    }
    await this.queue.put(tasks)
  }
}
