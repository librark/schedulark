import { describe, expect, it } from '@jest/globals'
import { Task } from './task.js'

describe('Task', () => {
  it('can be instantiated', () => {
    const task = new Task()
    expect(task).toBeTruthy()
    expect(task.id).toBeTruthy()
    expect(task.job).toEqual('')
    expect(task.lane).toEqual('')
    expect(task.createdAt instanceof Date).toBeTruthy()
    expect(task.scheduledAt instanceof Date).toBeTruthy()
    expect(task.pickedAt).toBeNull()
    expect(task.failedAt).toBeNull()
    expect(task.deletedAt).toBeNull()
    expect(task.timeout).toEqual(300_000)
    expect(task.attempts).toEqual(0)
    expect(task.payload).toEqual({})
  })

  it('can be instantiated with attributes', () => {
    const task = new Task({
      job: 'backup',
      lane: 'maintenance',
      createdAt: '2024-05-01',
      scheduledAt: '2024-05-01',
      pickedAt: '2024-05-01',
      failedAt: '2024-05-01',
      deletedAt: '2024-05-01',
      attempts: 3
    })
    expect(task).toBeTruthy()
    expect(task.id).toBeTruthy()
    expect(task.job).toEqual('backup')
    expect(task.lane).toEqual('maintenance')
    expect(task.createdAt instanceof Date).toBeTruthy()
    expect(task.scheduledAt instanceof Date).toBeTruthy()
    expect(task.pickedAt instanceof Date).toBeTruthy()
    expect(task.failedAt instanceof Date).toBeTruthy()
    expect(task.deletedAt instanceof Date).toBeTruthy()
    expect(task.timeout).toEqual(300_000)
    expect(task.attempts).toEqual(3)
    expect(task.payload).toEqual({})
  })
})
