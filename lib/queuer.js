import { MemoryQueue } from './queue/memory/memory.queue.js'
import { JsonQueue } from './queue/json/json.queue.js'
import { SqlQueue } from './queue/sql/sql.queue.js'

export class Queuer {
  constructor (type = 'memory') {
    this.type = type
  }

  create (attributes = {}) {
    const Queue = {
      memory: MemoryQueue,
      json: JsonQueue,
      sql: SqlQueue
    }[this.type]

    return new Queue(attributes)
  }
}
