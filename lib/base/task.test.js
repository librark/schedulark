import { describe, expect, it } from '@jest/globals'
import { Task } from './task.js'

describe('Task', () => {
  it('can be instantiated', () => {
    const task = new Task()
    expect(task).toBeTruthy()
    expect(task.id).toBeTruthy()
    expect(task.job).toEqual('')
    expect(task.lane).toEqual('')
    expect(task.pickedAt).toBeNull()
    expect(task.timeout).toEqual(300)
    expect(task.failedAt).toBeNull()
    expect(task.attempts).toEqual(0)
    expect(task.payload).toEqual({})
  })
})
