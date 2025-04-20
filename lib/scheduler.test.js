import { describe, expect, it } from '@jest/globals'
import { Job } from './base/job.js'
import { Scheduler } from './scheduler.js'

class AlphaJob extends Job {
  constructor (attributes) {
    super(attributes)
    this.runTasks = []
  }

  async run (task) {
    this.runTasks.push(task)
    return { }
  }
}

class BetaJob extends Job {
  constructor (attributes) {
    super(attributes)
    this.runTasks = []
  }

  async run (task) {
    this.runTasks.push(task)
    return { }
  }
}

describe('Scheduler', () => {
  it('can be instantiated', () => {
    const scheduler = new Scheduler()
    expect(scheduler).toBeTruthy()
  })

  it('can be passed worker and timer options', () => {
    const options = {
      timer: { tick: 120_000 },
      worker: { clean: 3_600_000 }
    }
    const scheduler = new Scheduler({ options })
    expect(scheduler.timer.tick).toEqual(120_000)
    expect(scheduler.worker.clean).toEqual(3_600_000)
  })

  it('registers multiple jobs for execution', async () => {
    const scheduler = new Scheduler()

    scheduler.register(new AlphaJob())
    scheduler.register(new BetaJob())

    expect(scheduler.registry.AlphaJob instanceof AlphaJob).toBeTruthy()
    expect(scheduler.registry.BetaJob instanceof BetaJob).toBeTruthy()
  })

  it('runs its internal worker', async () => {
    class MockWorker {
      async start () {
        this.started = true
      }
    }
    const scheduler = new Scheduler()
    scheduler.worker = new MockWorker()

    await scheduler.work()

    expect(scheduler.worker.started).toBeTruthy()
  })

  it('runs its internal timer', async () => {
    class MockTimer {
      async time () {
        this.timed = true
      }
    }
    const scheduler = new Scheduler()
    scheduler.timer = new MockTimer()

    await scheduler.time()

    expect(scheduler.timer.timed).toBeTruthy()
  })
})
