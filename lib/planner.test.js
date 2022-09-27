import { describe, expect, it } from '@jest/globals'
import { Planner } from './planner.js'

describe('Planner', () => {
  it('can be instantiated', () => {
    const planner = new Planner()
    expect(planner).toBeTruthy()
  })

  it('defers jobs by enqueueing them in the future', async () => {
    const planner = new Planner()

    const job = 'AlphaJob'
    const payload = { hello: 'world' }

    await planner.defer({ job, payload })

    const task = await planner.queue.pick()
    expect(task.payload).toEqual(payload)
  })
})
