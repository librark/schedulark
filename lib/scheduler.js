import { cronable } from './base/cronable.js'
import { Logger } from './base/logger.js'
import { Task } from './base/task.js'
import { MemoryQueue } from './queue/memory/memory.queue.js'
import { Worker } from './worker/worker.js'

export class Scheduler {
  constructor ({ queue, logger } = {}) {
    this.logger = logger || new Logger()
    this.queue = queue || new MemoryQueue()
    this.now = () => Date.now()
    this.registry = {}
    this.iterations = 0
    this.tick = 60_000
    this.worker = new Worker({
      registry: this.registry, queue: this.queue
    })
  }

  register (job) {
    const name = job.name || job.constructor.name
    this.registry[name] = job
  }

  async work () {
    await this.worker.start()
  }

  async time () {
    this.iterations += 1
    while (this.iterations) {
      this.logger.debug(`Scheduling iteration ${this.iterations}...`)
      const now = this.now()
      const target = new Date(now + this.tick)
      target.setMilliseconds(0)
      const delay = (target.getTime() - now)
      await this.schedule()
      await this._pause(delay)
      this.iterations += 1
    }
  }

  async schedule () {
    const now = this.now()
    for (const [name, job] of Object.entries(this.registry)) {
      const frequency = job.frequency

      if (!cronable(frequency, new Date(now))) {
        continue
      }

      const task = new Task({
        job: name, lane: job.lane, timeout: job.timeout, payload: job.payload
      })

      await this.queue.put(task)
    }
  }

  async _pause (time) {
    return new Promise((resolve) => setTimeout(resolve, time))
  }
}
