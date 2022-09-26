import { describe, expect, it } from '@jest/globals'
import { Task } from '../../base/task.js'
import { SqlQueue } from './sql.queue.js'

class MockConnection {
  constructor () {
    this.query_statements = []
    this.query_parameters = []
    this.query_results = []
  }

  async query (statement, parameters) {
    this.query_statements.push(statement)
    this.query_parameters.push(parameters)
    return this.query_results.shift() || []
  }
}

class MockConnector {
  constructor (connection = new MockConnection()) {
    this.connection = connection
  }

  async get () {
    return this.connection
  }
}

function dedent (input) {
  return input.split('\n').map(line => line.trim()).join('\n')
}

describe('SqlQueue', () => {
  it('can be instantiated', () => {
    const queue = new SqlQueue()
    expect(queue).toBeTruthy()
  })

  it('implements the put method', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

    const task = new Task({
      id: 'b9d278d7-11f5-4817-ad12-69989a988457',
      createdAt: new Date(1625160082000),
      scheduledAt: new Date(1625160082000),
      pickedAt: new Date(0),
      lane: 'build',
      job: 'WebsiteCompilationJob',
      attempts: 0,
      payload: {
        tenant: 'knowark',
        tid: '7da5b9fc-7ca0-4156-8443-aa5caef5db1d'
      }
    })

    await queue.put(task)

    const statement = queue.connector.connection.query_statements.shift()
    const parameter = queue.connector.connection.query_parameters.shift()
    expect(dedent(statement)).toEqual(
      dedent('INSERT INTO "public"."Task" (id, data)\n' +
        'VALUES ($1, $2)\n' +
        'ON CONFLICT (id)\n' +
        'DO UPDATE SET (data) = (EXCLUDED.data)\n' +
        'RETURNING *'
      ).trim())
    expect(parameter).toEqual([task.id, task])
  })

  it('implements the pick method', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

    queue.connector.connection.query_results = [[{
      id: 'b9d278d7-11f5-4817-ad12-69989a988457',
      createdAt: '2021-07-01T17:21:22Z',
      scheduledAt: '2021-07-01T17:21:22Z',
      pickedAt: '1970-01-01T00:00:00Z',
      failedAt: '1970-01-01T00:00:00Z',
      timeout: 300,
      lane: 'build',
      job: 'WebsiteCompilationJob',
      attempts: 0,
      payload: {
        tenant: 'knowark',
        tid: '7da5b9fc-7ca0-4156-8443-aa5caef5db1d'
      }
    }]]

    const task = await queue.pick()

    expect(task instanceof Task).toBeTruthy()

    expect(task.id).toEqual('b9d278d7-11f5-4817-ad12-69989a988457')
  })

  it('implements the pick method when the task list is empty', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

    const task = await queue.pick()

    const statement = queue.connector.connection.query_statements.shift()
    const parameter = queue.connector.connection.query_parameters.shift()
    expect(dedent(statement)).toEqual(
      dedent('UPDATE "public"."Task"\n' +
        "SET data->>'pickedAt' = to_json(NOW())::text\n" +
        'WHERE id = (\n' +
        'SELECT id FROM "public"."Task"\n' +
        "WHERE data->>'scheduledAt'::timestamptz <= NOW()::timestamptz\n" +
        "AND (data->>'pickedAt'::timestamptz = 'epoch' OR (\n" +
        "data->>'pickedAt'::timestamptz +\n" +
        "interval '1 second' * timeout) <= NOW()::timestamptz)\n" +
        "ORDER BY data->>'scheduledAt'::timestamptz\n" +
        'FOR UPDATE SKIP LOCKED\n' +
        'LIMIT 1\n' +
        ')\n' +
        'RETURNING *'
      ).trim())
    expect(task).toBeNull()
    expect(parameter).toEqual(undefined)
  })

  it('implements the remove method', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    const task1 = new Task({ id: 'T001' })

    await queue.remove(task1)

    const statement = queue.connector.connection.query_statements.shift()
    const parameter = queue.connector.connection.query_parameters.shift()
    expect(dedent(statement)).toEqual(
      dedent('DELETE FROM "public"."Task"\n' +
        'WHERE id = $1'
      ).trim())
    expect(parameter).toEqual([task1.id])
  })
})
