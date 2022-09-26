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
    expect(task.pickedAt instanceof Date).toBeTruthy()
    expect(task.failedAt instanceof Date).toBeTruthy()
    expect(task.timeout).toEqual(300_000)
    expect(task.attempts).toEqual(0)
    expect(task.payload).toEqual({})
  })
})
