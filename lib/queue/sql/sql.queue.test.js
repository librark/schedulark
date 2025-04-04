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

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(dedent(statement)).toEqual(
      dedent('INSERT INTO "public"."Task" (id, data)\n' +
        'VALUES\n' +
        '($1, $2)\n' +
        'ON CONFLICT (id)\n' +
        'DO UPDATE SET data = EXCLUDED.data\n' +
        'RETURNING *'
      ).trim())
    expect(parameter).toEqual({ parameters: [task.id, task] })
  })

  it('allows putting multiple tasks simultaneously', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

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
      dedent('INSERT INTO "public"."Task" (id, data)\n' +
        'VALUES\n' +
        '($1, $2),\n' +
        '($3, $4)\n' +
        'ON CONFLICT (id)\n' +
        'DO UPDATE SET data = EXCLUDED.data\n' +
        'RETURNING *'
      ).trim())
    expect(parameter).toEqual({
      parameters: [task1.id, task1, task2.id, task2]
    })
  })

  it('implements the pick method', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

    queue.connector.connection.query_results = [
      [],
      [{
        id: 'b9d278d7-11f5-4817-ad12-69989a988457',
        data: {
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

    await queue.pick()
    const task = await queue.pick()

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(queue.connector.connection.query_parameters.length).toEqual(3)
    expect(dedent(statement)).toEqual(
      dedent('UPDATE "public"."Task"\n' +
        "SET data = jsonb_set(data, '{pickedAt}', to_jsonb(NOW()))\n" +
        'WHERE id = (\n' +
        'SELECT id FROM "public"."Task"\n' +
        "WHERE data->>'deletedAt' IS NULL\n" +
        "AND (data->>'scheduledAt')::timestamptz <= NOW()::timestamptz\n" +
        "AND (data->>'pickedAt' IS NULL OR (\n" +
        "(data->>'pickedAt')::timestamptz +\n" +
        "interval '1 milliseconds' * (\n" +
        "data->>'timeout')::integer <= NOW()::timestamptz))\n" +
        "ORDER BY (data->>'scheduledAt')::timestamptz\n" +
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

    await queue.remove(task1.id)

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(dedent(statement)).toEqual(
      dedent('UPDATE "public"."Task"\n' +
        "SET data = jsonb_set(data, '{deletedAt}', to_jsonb(NOW()))\n" +
        'WHERE id = $1'
      ).trim())
    expect(parameter).toEqual({ parameters: [task1.id] })
  })

  it('fully removes soft deleted tasks when prune is used', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

    await queue.remove('prune')

    const statement = queue.connector.connection.query_statements[1]
    const parameter = queue.connector.connection.query_parameters[1]
    expect(dedent(statement)).toEqual(
      dedent('DELETE FROM "public"."Task"\n' +
        "WHERE data->>'deletedAt' IS NOT NULL"
      ).trim())
    expect(parameter).toEqual({ parameters: [] })
  })

  it('initializes the schema on first access', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })
    const task1 = new Task({ id: 'T001' })

    await queue.put(task1)

    const statement = queue.connector.connection.query_statements[0]
    const parameter = queue.connector.connection.query_parameters[0]
    const schema = '"public"."Task"'
    const clause = 'CREATE INDEX IF NOT EXISTS'
    expect(dedent(statement)).toEqual(dedent(
  `CREATE TABLE IF NOT EXISTS ${schema} (\n` +
  '"id" UUID PRIMARY KEY,\n' +
  '"data" JSONB);\n' +
  `${clause} "Task_job_idx" ON ${schema} ((data->>'job'));\n` +
  `${clause} "Task_lane_idx" ON ${schema} ((data->>'lane'));\n` +
  `${clause} "Task_scheduledAt_idx" ON ${schema} ((data->>'scheduledAt'));\n` +
  `${clause} "Task_pickedAt_idx" ON ${schema} ((data->>'pickedAt'));\n` +
  `${clause} "Task_deletedAt_idx" ON ${schema} ((data->>'deletedAt'));\n`
    ).trim())
    expect(parameter).toEqual(undefined)
  })

  it('does nothing when an empty task list is provided', async () => {
    const connector = new MockConnector()
    const queue = new SqlQueue({ connector })

    await queue.put([])

    expect(queue.connector.connection.query_statements).toHaveLength(0)
    expect(queue.connector.connection.query_parameters).toHaveLength(0)
  })
})
