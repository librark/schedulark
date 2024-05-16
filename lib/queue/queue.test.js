import { describe, expect, it } from '@jest/globals'
import { Queue } from './queue.js'

describe('Queue', () => {
  it('can be instantiated', () => {
    const queue = new Queue()

    expect(queue).toBeTruthy()
  })

  it('defines an abstract interface', async () => {
    const queue = new Queue()
    const mockTask = {}

    await expect(queue.put(mockTask)).rejects.toThrow('Not implemented.')
    await expect(queue.pick()).rejects.toThrow('Not implemented.')
    await expect(queue.remove('mockId')).rejects.toThrow('Not implemented.')
  })
})
