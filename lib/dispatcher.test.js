import { describe, expect, it } from '@jest/globals'
import { Dispatcher } from './dispatcher.js'

describe('Dispatcher', () => {
  it('can be instantiated', () => {
    const dispatcher = new Dispatcher()
    expect(dispatcher).toBeTruthy()
  })

  it('dispatches jobs by enqueueing them in the future', async () => {
    const dispatcher = new Dispatcher()

    const job = 'AlphaJob'
    const payload = { hello: 'world' }

    await dispatcher.dispatch({ job, payload })

    const task = await dispatcher.queue.pick()
    expect(task.payload).toEqual(payload)
  })
})
