import { describe, expect, it } from '@jest/globals'
import { Task } from '../../base/task.js'
import { MemoryQueue } from './memory.queue.js'

describe('MemoryQueue', () => {
  it('can be instantiated', () => {
    const queue = new MemoryQueue()
    expect(queue).toBeTruthy()
  })

  it('implements the put method', async () => {
    const queue = new MemoryQueue()

    const task1 = new Task({ id: 'T001' })
    const task2 = new Task({ id: 'T002' })
    const task3 = new Task({ id: 'T003' })

    await queue.put(task1)
    await queue.put(task2)
    await queue.put(task3)

    expect(task1.id in queue.content).toBeTruthy()
    expect(task2.id in queue.content).toBeTruthy()
    expect(task3.id in queue.content).toBeTruthy()
  })

  it('implements the pick method', async () => {
    const queue = new MemoryQueue()
    queue.time = () => 1_625_075_900_000
    queue.content = {
      T001: new Task({ id: 'T001', scheduledAt: 1_625_075_800_000 }),
      T002: new Task({ id: 'T002', scheduledAt: 1_625_075_400_000 }),
      T003: new Task({ id: 'T003', scheduledAt: 1_625_075_700_000 })
    }

    let task = await queue.pick()
    expect(task.id).toEqual('T002')

    task = await queue.pick()
    expect(task.id).toEqual('T003')

    task = await queue.pick()
    expect(task.id).toEqual('T001')

    task = await queue.pick()
    expect(task).toBeNull()
  })

  it('returns null if nothing to pick', async () => {
    const queue = new MemoryQueue()

    const task = await queue.pick()

    expect(task).toBeNull()
  })

  it('remove tasks through soft deletion by default', async () => {
    const task1 = new Task({ id: 'T001' })
    const queue = new MemoryQueue()
    queue.content = {
      T001: task1
    }

    await queue.remove(task1)
    await queue.remove(task1)

    expect(queue.content[task1.id].deletedAt).toBeTruthy()
  })

  it('implements the remove method', async () => {
    const task1 = new Task({ id: 'T001' })
    const queue = new MemoryQueue()
    queue.content = {
      T001: task1
    }

    await queue.remove(task1, { hard: true })
    await queue.remove(task1, { hard: true })

    expect(queue.content).toEqual({})
  })
})
