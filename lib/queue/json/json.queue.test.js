import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs/promises'
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals'
import { Task } from '../../base/task.js'
import { JsonQueue } from './json.queue.js'

describe('JsonQueue', () => {
  let queue = null
  let directory = null

  beforeEach(async () => {
    const tmpdir = path.join(os.tmpdir(), 'schedulark', path.sep)
    try { await fs.mkdir(tmpdir, { recursive: true }) } catch {}
    directory = await fs.mkdtemp(tmpdir)
    const file = path.join(directory, 'Task.json')
    queue = new JsonQueue({ file })
  })

  afterEach(async () => {
    await fs.rmdir(directory, { recursive: true })
  })

  it('can be instantiated', () => {
    const queue = new JsonQueue()
    expect(queue).toBeTruthy()
  })

  it('implements the put method', async () => {
    const task1 = new Task({ id: 'T001' })
    const task2 = new Task({ id: 'T002' })
    const task3 = new Task({ id: 'T003' })

    await queue.put(task1)
    await queue.put(task2)
    await queue.put(task3)

    const content = JSON.parse(await fs.readFile(queue.file))

    expect(task1.id in content).toBeTruthy()
    expect(task2.id in content).toBeTruthy()
    expect(task3.id in content).toBeTruthy()
  })

  it('allows putting multiple tasks simultaneously', async () => {
    const task1 = new Task({ id: 'T001' })
    const task2 = new Task({ id: 'T002' })
    const task3 = new Task({ id: 'T003' })

    await queue.put([task1, task2, task3])

    const content = JSON.parse(await fs.readFile(queue.file))

    expect(task1.id in content).toBeTruthy()
    expect(task2.id in content).toBeTruthy()
    expect(task3.id in content).toBeTruthy()
  })

  it('implements the pick method', async () => {
    queue.time = () => 1_625_075_900_000
    const content = {
      T001: new Task({ id: 'T001', scheduledAt: 1_625_075_800_000 }),
      T002: new Task({ id: 'T002', scheduledAt: 1_625_075_400_000 }),
      T003: new Task({ id: 'T003', scheduledAt: 1_625_075_700_000 })
    }
    await fs.writeFile(queue.file, JSON.stringify(content))

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
    const task = await queue.pick()

    expect(task).toBeNull()
  })

  it('returns null if the tasks are in the future', async () => {
    queue.time = () => 1_625_075_500_000
    const content = {
      T001: new Task({ id: 'T001', scheduledAt: 1_625_075_800_000 })
    }
    await fs.writeFile(queue.file, JSON.stringify(content))

    const task = await queue.pick()

    expect(task).toBeNull()
  })

  it('returns null if already picked', async () => {
    queue.time = () => 1_625_075_900_000
    const content = {
      T001: new Task({
        id: 'T001',
        scheduledAt: 1_625_075_800_000,
        pickedAt: 1_625_075_900_000
      })
    }
    await fs.writeFile(queue.file, JSON.stringify(content))

    const task = await queue.pick()

    expect(task).toBeNull()
  })

  it('remove tasks through soft deletion by default', async () => {
    const task1 = new Task({ id: 'T001' })
    await fs.writeFile(queue.file, JSON.stringify({ [task1.id]: task1 }))

    await queue.remove(null)
    await queue.remove(task1.id)
    await queue.remove(task1.id)

    const content = JSON.parse(await fs.readFile(queue.file))
    expect(content[task1.id].deletedAt).toBeTruthy()
  })

  it('fully removes soft deleted tasks when prune is used', async () => {
    const task1 = new Task({ id: 'T001' })
    const task2 = new Task({ id: 'T002' })
    await fs.writeFile(queue.file, JSON.stringify({
      [task1.id]: task1,
      [task2.id]: task2
    }))

    await queue.remove(task1.id)
    await queue.remove('prune')

    const content = JSON.parse(await fs.readFile(queue.file))
    expect(content).toMatchObject({ T002: { id: 'T002' } })
  })
})
