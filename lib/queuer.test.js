import { describe, expect, it } from '@jest/globals'
import { Queuer } from './queuer.js'

describe('Queuer', () => {
  it('can be instantiated', () => {
    const queuer = new Queuer()

    expect(queuer).toBeTruthy()
  })

  it('creates a new queue corresponding to its given type', async () => {
    let queue = new Queuer('memory').create()
    expect(queue.constructor.name).toEqual('MemoryQueue')

    queue = new Queuer('json').create({})
    expect(queue.constructor.name).toEqual('JsonQueue')

    queue = new Queuer('sql').create({})
    expect(queue.constructor.name).toEqual('SqlQueue')
  })
})
