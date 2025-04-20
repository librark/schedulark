import { cronable } from '../base/cronable.js'
import { Logger } from '../base/logger.js'
import { Task } from '../base/task.js'
import { MemoryQueue } from '../queue/memory/memory.queue.js'

export class Timer {
  constructor ({ registry, queue, logger, tick } = {}) {
    this.logger = logger || new Logger()
    this.queue = queue || new MemoryQueue()
    this.registry = registry
    this.tick = tick || 60_000
    this.now = () => Date.now()
    this.iterations = 0
  }

  async time () {
    this.iterations += 1
    while (this.iterations) {
      this.logger.debug(`Timer iteration ${this.iterations}...`)
      const now = this.now()
      const target = new Date(now + this.tick)
      target.setMilliseconds(0)
      await this.evaluate()
      await this._pause(target.getTime() - now)
      this.iterations += 1
    }
  }

  async evaluate () {
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
