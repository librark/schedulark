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
  const requiredColumns = [
    'id',
    'job',
    'lane',
    'createdAt',
    'scheduledAt',
    'pickedAt',
    'failedAt',
    'deletedAt',
    'timeout',
    'attempts',
    'payload'
  ]

  function columnDefinitionRows () {
    return requiredColumns.map(column => ({ column_name: column }))
  }

  it('can be instantiated', () => {
    const queue = new SqlQueue()
    expect(queue).toBeTruthy()
  })

  it('implements the put method', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    queue.connector.connection.query_results = [columnDefinitionRows()]

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

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(dedent(statement)).toEqual(
      dedent('INSERT INTO "public"."Task" ("id", "job", "lane", "createdAt", ' +
        '"scheduledAt", "pickedAt", "failedAt", "deletedAt", "timeout", ' +
        '"attempts", "payload")\n' +
        'VALUES\n' +
        '($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)\n' +
        'ON CONFLICT (id)\n' +
        'DO UPDATE SET "job" = EXCLUDED."job", "lane" = EXCLUDED."lane", ' +
        '"createdAt" = EXCLUDED."createdAt", "scheduledAt" = ' +
        'EXCLUDED."scheduledAt", "pickedAt" = EXCLUDED."pickedAt", ' +
        '"failedAt" = EXCLUDED."failedAt", "deletedAt" = ' +
        'EXCLUDED."deletedAt", "timeout" = EXCLUDED."timeout", ' +
        '"attempts" = EXCLUDED."attempts", "payload" = EXCLUDED."payload"\n' +
        'RETURNING *'
      ).trim())
    expect(parameter).toEqual({
      parameters: [
        task.id,
        task.job,
        task.lane,
        task.createdAt,
        task.scheduledAt,
        task.pickedAt,
        task.failedAt,
        task.deletedAt,
        task.timeout,
        task.attempts,
        task.payload
      ]
    })
  })

  it('allows putting multiple tasks simultaneously', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    queue.connector.connection.query_results = [columnDefinitionRows()]

    const task1 = new Task({
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
    const task2 = new Task({
      id: 'c3e304f3-84be-4074-91a1-e2e54f86094c',
      createdAt: new Date(1625160082000),
      scheduledAt: new Date(1625160082000),
      pickedAt: new Date(0),
      lane: 'send',
      job: 'EmailSendingJob',
      attempts: 0,
      payload: {
        tenant: 'knowark',
        tid: '7da5b9fc-7ca0-4156-8443-aa5caef5db1d'
      }
    })

    await queue.put([task1, task2])

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(dedent(statement)).toEqual(
      dedent('INSERT INTO "public"."Task" ("id", "job", "lane", ' +
        '"createdAt", "scheduledAt", "pickedAt", "failedAt", ' +
        '"deletedAt", "timeout", "attempts", "payload")\n' +
        'VALUES\n' +
        '($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),\n' +
        '($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)\n' +
        'ON CONFLICT (id)\n' +
        'DO UPDATE SET "job" = EXCLUDED."job", "lane" = EXCLUDED."lane", ' +
        '"createdAt" = EXCLUDED."createdAt", "scheduledAt" = ' +
        'EXCLUDED."scheduledAt", "pickedAt" = EXCLUDED."pickedAt", ' +
        '"failedAt" = EXCLUDED."failedAt", "deletedAt" = ' +
        'EXCLUDED."deletedAt", "timeout" = EXCLUDED."timeout", ' +
        '"attempts" = EXCLUDED."attempts", "payload" = EXCLUDED."payload"\n' +
        'RETURNING *'
      ).trim())
    expect(parameter).toEqual({
      parameters: [
        task1.id,
        task1.job,
        task1.lane,
        task1.createdAt,
        task1.scheduledAt,
        task1.pickedAt,
        task1.failedAt,
        task1.deletedAt,
        task1.timeout,
        task1.attempts,
        task1.payload,
        task2.id,
        task2.job,
        task2.lane,
        task2.createdAt,
        task2.scheduledAt,
        task2.pickedAt,
        task2.failedAt,
        task2.deletedAt,
        task2.timeout,
        task2.attempts,
        task2.payload
      ]
    })
  })

  it('implements the pick method', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

    queue.connector.connection.query_results = [
      columnDefinitionRows(),
      [{
        id: 'b9d278d7-11f5-4817-ad12-69989a988457',
        job: 'WebsiteCompilationJob',
        lane: 'build',
        createdAt: '2021-07-01T17:21:22Z',
        scheduledAt: '2021-07-01T17:21:22Z',
        pickedAt: '1970-01-01T00:00:00Z',
        failedAt: '1970-01-01T00:00:00Z',
        deletedAt: null,
        timeout: 300,
        attempts: 0,
        payload: {
          tenant: 'knowark',
          tid: '7da5b9fc-7ca0-4156-8443-aa5caef5db1d'
        }
      }]
    ]

    const task = await queue.pick()

    expect(task instanceof Task).toBeTruthy()

    expect(task.id).toEqual('b9d278d7-11f5-4817-ad12-69989a988457')
  })

  it('implements the pick method when the task list is empty', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    queue.connector.connection.query_results = [columnDefinitionRows()]

    await queue.pick()
    const task = await queue.pick()

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(queue.connector.connection.query_parameters.length).toEqual(3)
    expect(dedent(statement)).toEqual(
      dedent('UPDATE "public"."Task"\n' +
        'SET "pickedAt" = NOW()\n' +
        'WHERE id = (\n' +
        'SELECT id FROM "public"."Task"\n' +
        'WHERE "deletedAt" IS NULL\n' +
        'AND "scheduledAt" <= NOW()::timestamptz\n' +
        'AND ("pickedAt" IS NULL OR (\n' +
        '"pickedAt" +\n' +
        "interval '1 milliseconds' * (\n" +
        '"timeout")::integer <= NOW()::timestamptz))\n' +
        'ORDER BY "scheduledAt"\n' +
        'FOR UPDATE SKIP LOCKED\n' +
        'LIMIT 1\n' +
        ')\n' +
        'RETURNING *;'
      ).trim())
    expect(task).toBeNull()
    expect(parameter).toEqual(undefined)
  })

  it('remove tasks through soft deletion by default', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    const task1 = new Task({ id: 'T001' })
    queue.connector.connection.query_results = [columnDefinitionRows()]

    await queue.remove(task1.id)

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(dedent(statement)).toEqual(
      dedent('UPDATE "public"."Task"\n' +
        'SET "deletedAt" = NOW()\n' +
        'WHERE id = $1'
      ).trim())
    expect(parameter).toEqual({ parameters: [task1.id] })
  })

  it('fully removes soft deleted tasks when prune is used', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    queue.connector.connection.query_results = [columnDefinitionRows()]

    await queue.remove('prune')

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(dedent(statement)).toEqual(
      dedent('DELETE FROM "public"."Task"\n' +
        'WHERE "deletedAt" IS NOT NULL'
      ).trim())
    expect(parameter).toEqual({ parameters: [] })
  })

  it('checks the schema on first access', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    const task1 = new Task({ id: 'T001' })

    queue.connector.connection.query_results = [columnDefinitionRows()]

    await queue.put(task1)

    const statement = queue.connector.connection.query_statements[0]
    const parameter = queue.connector.connection.query_parameters[0]
    expect(dedent(statement)).toEqual(dedent(
      'SELECT column_name\n' +
      'FROM information_schema.columns\n' +
      'WHERE table_schema = $1\n' +
      'AND table_name = $2'
    ).trim())
    expect(parameter).toEqual({
      parameters: ['public', 'Task']
    })
  })

  it('raises an error when the schema is missing columns', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    const task1 = new Task({ id: 'T001' })

    queue.connector.connection.query_results = [[]]

    await expect(queue.put(task1)).rejects.toThrow('missing columns')
  })

  it('does nothing when an empty task list is provided', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

    await queue.put([])

    expect(queue.connector.connection.query_statements).toHaveLength(0)
    expect(queue.connector.connection.query_parameters).toHaveLength(0)
  })
})
