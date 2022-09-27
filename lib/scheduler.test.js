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

  it('schedules jobs for execution', async () => {
    const scheduler = new Scheduler()

    scheduler.register(new AlphaJob({ frequency: '' }))
    scheduler.register(new BetaJob({ frequency: '* * * * *' }))

    let content = Object.values(scheduler.queue.content)
    expect(content.length).toEqual(0)

    await scheduler.schedule()

    content = Object.values(scheduler.queue.content)
    expect(content.length).toEqual(1)
  })

  it('implements a timer for job execution', async () => {
    const scheduler = new Scheduler()
    scheduler.iterations = -3
    scheduler.tick = 1000

    scheduler.register(new AlphaJob({ frequency: '* * * * *' }))
    scheduler.register(new BetaJob({ frequency: '' }))

    let content = Object.values(scheduler.queue.content)
    expect(content.length).toEqual(0)

    await scheduler.time()

    await new Promise((resolve) => setTimeout(resolve, 3000))
    content = Object.values(scheduler.queue.content)
    expect(content.length).toEqual(2)
    expect(content[0].job).toEqual('AlphaJob')
    expect(content[1].job).toEqual('AlphaJob')
  })
})
