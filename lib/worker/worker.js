import cluster from 'node:cluster'
import { Logger } from '../base/logger.js'

export class Worker {
  constructor ({ registry, queue, logger } = {}) {
    this.registry = registry
    this.queue = queue
    this.logger = logger || new Logger()
    this.now = () => Date.now()
    this.iterations = 0
    this.rest = 1_000
    this.sleep = 5_000
    this.clean = 600_000
  }

  async start () {
    let cleaned = this.now()
    this.iterations += 1
    while (this.iterations) {
      const id = cluster?.worker?.id || ''
      this.logger.debug(`Worker ${id} iteration ${this.iterations}...`)
      const task = await this.queue.pick()
      await this._process(task)
      this.iterations += 1
      cleaned = await this._prune(cleaned)
    }
  }

  stop () {
    this.iterations = 0
  }

  async _process (task) {
    const now = this.now()

    if (!task) {
      const target = new Date(now + this.sleep)
      target.setMilliseconds(0)
      return await this._pause(target.getTime() - now)
    }

    const job = this.registry[task.job]

    try {
      await this._timeout(job.run(task), task.timeout)
      await this.queue.remove(task.id)
    } catch (error) {
      this.logger.error(`${task.job}. Task processing failed.`)
      task.scheduledAt = new Date(
        task.scheduledAt.getTime() + (job.backoff * (2 ** task.attempts)))
      task.pickedAt = new Date(0)
      task.failedAt = new Date(now)
      task.attempts += 1

      if (task.attempts <= job.retries) {
        await this.queue.put(task)
      } else {
        await this.queue.remove(task.id)
        this.logger.error(`${task.job}. Maximum number of retries ` +
          `reached: ${job.retries}. Task removed.`)
      }
    }

    await this._pause(this.rest)
  }

  async _pause (time) {
    return new Promise((resolve) => setTimeout(resolve, time))
  }

  async _timeout (promise, time) {
    const timeout = new Promise((_resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id)
        reject(new Error(`Timed out after ${time}ms.`))
      }, time)
    })
    return await Promise.race([promise, timeout])
  }

  async _prune (cleaned) {
    const now = this.now()
    if ((now - cleaned) < this.clean) return cleaned
    cleaned = now
    await this.queue.remove('prune')
    return cleaned
  }
}
