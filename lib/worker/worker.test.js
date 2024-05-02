import { describe, beforeEach, expect, it } from '@jest/globals'
import { Job, Task } from '../base/index.js'
import { MemoryQueue } from '../queue/memory/memory.queue.js'
import { Worker } from './worker.js'

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

class FailingBetaJob extends Job {
  constructor () {
    super()
    this.runTasks = []
    this.retries = 5
  }

  async run (task) {
    this.runTasks.push(task)
    throw new Error('Something went wrong with the job!')
  }
}

function baseQueue () {
  const queue = new MemoryQueue()
  queue.content = {
    T001: new Task({
      id: 'T001', job: 'AlphaJob', scheduledAt: 1_625_075_800_000, timeout: 10
    }),
    T002: new Task({
      id: 'T002', job: 'BetaJob', scheduledAt: 1_625_075_400_000, timeout: 10
    }),
    T003: new Task({
      id: 'T003', job: 'AlphaJob', scheduledAt: 1_625_075_700_000, timeout: 10
    })
  }
  return queue
}

function baseRegistry () {
  return {
    AlphaJob: new AlphaJob(),
    BetaJob: new BetaJob()
  }
}

describe('Worker', () => {
  let worker = null

  beforeEach(async () => {
    const registry = baseRegistry()
    const queue = baseQueue()
    worker = new Worker({ registry, queue })
  })

  it('can be instantiated', () => {
    const worker = new Worker()
    expect(worker).toBeTruthy()
  })

  it('can be started', async () => {
    worker.iterations = -5
    worker.sleep = 10
    worker.rest = 1

    await worker.start()

    const alphaTasks = worker.registry.AlphaJob.runTasks
    expect(alphaTasks.length).toEqual(2)
    expect(alphaTasks[0].id).toEqual('T003')
    expect(alphaTasks[0].pickedAt.getTime()).toBeGreaterThan(0)
    expect(alphaTasks[1].id).toEqual('T001')
    expect(alphaTasks[1].pickedAt.getTime()).toBeGreaterThan(0)
  })

  it('can be stopped', async () => {
    worker.iterations = 5

    worker.stop()

    expect(worker.iterations).toEqual(0)
  })

  it('can retry tasks with backoff', async () => {
    worker.registry.BetaJob = new FailingBetaJob()
    worker.iterations = -2
    worker.sleep = 10
    worker.rest = 1

    const content = worker.queue.content
    expect(Object.keys(content).length).toEqual(3)
    expect(content.T002.attempts).toEqual(0)
    expect(content.T002.failedAt?.getTime()).toBeFalsy()
    expect(content.T002.pickedAt?.getTime()).toBeFalsy()
    expect(content.T002.scheduledAt.getTime()).toEqual(1_625_075_400_000)

    await worker.start()

    expect(worker.registry.BetaJob.runTasks.length).toEqual(1)
    expect(Object.keys(content).length).toEqual(3)
    expect(content.T002.attempts).toEqual(1)
    expect(content.T002.failedAt?.getTime()).toBeGreaterThan(0)
    expect(content.T002.pickedAt?.getTime()).toEqual(0)
    expect(content.T002.scheduledAt.getTime()).toEqual(1_625_075_403_000)
  })

  it('can retry tasks with exponential backoff', async () => {
    worker.registry.BetaJob = new FailingBetaJob()
    worker.iterations = -6
    worker.sleep = 10
    worker.rest = 1

    await worker.start()

    const content = worker.queue.content
    expect(worker.iterations).toEqual(0)
    expect(worker.registry.BetaJob.runTasks.length).toEqual(5)
    expect(Object.keys(content).length).toEqual(3)
    expect(content.T002.attempts).toEqual(5)
    expect(content.T002.failedAt?.getTime()).toBeGreaterThan(0)
    expect(content.T002.pickedAt?.getTime()).toBeFalsy()
    expect(content.T002.scheduledAt.getTime()).toEqual(1_625_075_493_000)
  })

  it('runs until the maximum retries are reached', async () => {
    worker.registry.BetaJob = new FailingBetaJob()
    worker.iterations = -7
    worker.sleep = 10
    worker.rest = 1

    await worker.start()

    const content = worker.queue.content
    expect(worker.iterations).toEqual(0)
    expect(worker.registry.BetaJob.runTasks.length).toEqual(6)
    expect(Object.keys(content).length).toEqual(3)
    expect(content.T002.deletedAt).toBeTruthy()
  })

  it('runs until all the tasks are processed', async () => {
    worker.registry.BetaJob = new FailingBetaJob()
    worker.iterations = -9
    worker.sleep = 10
    worker.rest = 1

    await worker.start()

    const content = worker.queue.content
    expect(worker.iterations).toEqual(0)
    expect(worker.registry.BetaJob.runTasks.length).toEqual(6)
    expect(Object.keys(content).length).toEqual(3)
    expect(content.T001.deletedAt).toBeTruthy()
    expect(content.T002.deletedAt).toBeTruthy()
    expect(content.T003.deletedAt).toBeTruthy()
  })
})
