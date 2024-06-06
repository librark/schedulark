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

  it('dispatches multiple jobs simultaneously', async () => {
    const dispatcher = new Dispatcher()

    const job = 'AlphaJob'
    const first = { name: 'Hugo' }
    const second = { name: 'Paco' }
    const third = { name: 'Luis' }

    await dispatcher.dispatch([
      { job, payload: first, delay: -1000 },
      { job, payload: second, delay: -2000 },
      { job, payload: third, delay: -3000 }
    ])

    const task1 = await dispatcher.queue.pick()
    const task2 = await dispatcher.queue.pick()
    const task3 = await dispatcher.queue.pick()

    expect(task1.payload).toEqual(third)
    expect(task2.payload).toEqual(second)
    expect(task3.payload).toEqual(first)
  })
})
