import { Logger } from '../base/logger.js'

export class Worker {
  constructor ({ registry, queue, logger } = {}) {
    this.registry = registry
    this.queue = queue
    this.logger = logger || new Logger()
    this.time = () => Date.now()
    this.iterations = 0
    this.rest = 1_000
    this.sleep = 60_000
  }

  async start () {
    this.iterations += 1
    while (this.iterations) {
      this.logger.debug(`Work iteration ${this.iterations}...`)
      const task = await this.queue.pick()
      await this._process(task)
      this.iterations += 1
    }
  }

  stop () {
    this.iterations = 0
  }

  async _process (task) {
    if (!task) {
      return await this._pause(this.sleep)
    }

    const job = this.registry[task.job]

    try {
      await this._timeout(job.run(task), task.timeout)
      await this.queue.remove(task)
    } catch (error) {
      this.logger.error(`${task.job}. Task processing failed.`)
      task.scheduledAt = new Date(
        task.scheduledAt.getTime() + (job.backoff * (2 ** task.attempts)))
      task.pickedAt = new Date(0)
      task.failedAt = new Date(this.time())
      task.attempts += 1

      if (task.attempts <= job.retries) {
        await this.queue.put(task)
      } else {
        await this.queue.remove(task)
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
}
