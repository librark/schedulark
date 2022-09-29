import { Logger } from './base/logger.js'
import { MemoryQueue } from './queue/memory/memory.queue.js'
import { Timer } from './timer/timer.js'
import { Worker } from './worker/worker.js'

export class Scheduler {
  constructor ({ queue, logger } = {}) {
    this.logger = logger || new Logger()
    this.queue = queue || new MemoryQueue()
    this.registry = {}
    this.timer = new Timer({
      registry: this.registry, queue: this.queue
    })
    this.worker = new Worker({
      registry: this.registry, queue: this.queue
    })
  }

  register (jobs) {
    jobs = [jobs].flat()
    for (const job of jobs) {
      const name = job.name || job.constructor.name
      this.registry[name] = job
    }
  }

  async work () {
    await this.worker.start()
  }

  async time () {
    await this.timer.time()
  }
}
