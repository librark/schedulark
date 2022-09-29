import { describe, expect, it } from '@jest/globals'
import { Job } from '../base/job.js'
import { Timer } from './timer.js'

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

describe('Timer', () => {
  it('can be instantiated', () => {
    const timer = new Timer()
    expect(timer).toBeTruthy()
  })

  it('evaluates jobs for execution', async () => {
    const registry = {
      AlphaJob: new AlphaJob({ frequency: '* * * * *' }),
      BetaJob: new BetaJob({ frequency: '' })
    }
    const timer = new Timer({ registry })

    let content = Object.values(timer.queue.content)
    expect(content.length).toEqual(0)

    await timer.evaluate()

    content = Object.values(timer.queue.content)
    expect(content.length).toEqual(1)
  })

  it('implements a timer for job execution', async () => {
    const registry = {
      AlphaJob: new AlphaJob({ frequency: '* * * * *' }),
      BetaJob: new BetaJob({ frequency: '' })
    }
    const timer = new Timer({ registry })
    timer.iterations = -3
    timer.tick = 1000

    let content = Object.values(timer.queue.content)
    expect(content.length).toEqual(0)

    await timer.time()

    await new Promise((resolve) => setTimeout(resolve, 3000))
    content = Object.values(timer.queue.content)
    expect(content.length).toEqual(2)
    expect(content[0].job).toEqual('AlphaJob')
    expect(content[1].job).toEqual('AlphaJob')
  })
})
