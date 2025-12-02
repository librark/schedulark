import { Task } from '../../base/task.js'

export class SqlQueue {
  constructor (attributes = {}) {
    this.connector = attributes.connector
    this.schema = attributes.schema || 'public'
    this.table = attributes.table || 'Task'
    this.initialized = false
  }

  async put (task) {
    const tasks = [task].flat().filter(Boolean)
    if (!tasks.length) return
    await this._init()
    const placeholders = tasks.map((_, index) => {
      const offset = index * TASK_COLUMNS.length
      const columnPlaceholders = TASK_COLUMNS.map(
        (__, columnIndex) => `$${offset + columnIndex + 1}`)
      return `(${columnPlaceholders.join(', ')})`
    })

    const statement = `
    INSERT INTO "${this.schema}"."${this.table}" (${TASK_COLUMNS.map(
      column => `"${column}"`).join(', ')})
    VALUES
      ${placeholders.join(',\n')}
    ON CONFLICT (id)
    DO UPDATE SET ${TASK_COLUMNS
      .filter(column => column !== 'id')
      .map(column => `"${column}" = EXCLUDED."${column}"`)
      .join(', ')}
    RETURNING *
    `.trim()

    const connection = await this.connector.get()

    const parameters = tasks.flatMap(task => {
      const serialized = this._serialize(task)
      return TASK_COLUMNS.map(column => serialized[column])
    })
    await connection.query(statement, { parameters })
  }

  async pick () {
    await this._init()
    const statement = `
      UPDATE "${this.schema}"."${this.table}"
      SET "pickedAt" = NOW()
      WHERE id = (
          SELECT id FROM "${this.schema}"."${this.table}"
          WHERE "deletedAt" IS NULL
          AND "scheduledAt" <= NOW()::timestamptz
          AND ("pickedAt" IS NULL OR (
          "pickedAt" +
          interval '1 milliseconds' * (
          "timeout")::integer <= NOW()::timestamptz))
          ORDER BY "scheduledAt"
          FOR UPDATE SKIP LOCKED
          LIMIT 1
      )
      RETURNING *;
      `.trim()

    const connection = await this.connector.get()

    const result = await connection.query(statement)

    if (!result.length) {
      return null
    }

    const attributes = result.pop()
    return this._deserialize(attributes)
  }

  async remove (reference) {
    await this._init()

    let statement = `
    UPDATE "${this.schema}"."${this.table}"
    SET "deletedAt" = NOW()
    WHERE id = $1
    `.trim()
    let parameters = [reference]

    if (reference?.toLowerCase() === 'prune') {
      statement = `
      DELETE FROM "${this.schema}"."${this.table}"
      WHERE "deletedAt" IS NOT NULL
      `.trim()
      parameters = []
    }

    const connection = await this.connector.get()

    await connection.query(statement, { parameters })
  }

  async _init () {
    if (this.initialized) return

    const target = `"${this.schema}"."${this.table}"`
    const clause = 'CREATE INDEX IF NOT EXISTS'
    const statement = `
    CREATE TABLE IF NOT EXISTS ${target} (
    "id" UUID PRIMARY KEY,
    "job" TEXT,
    "lane" TEXT,
    "createdAt" TIMESTAMPTZ,
    "scheduledAt" TIMESTAMPTZ,
    "pickedAt" TIMESTAMPTZ,
    "failedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "timeout" INTEGER,
    "attempts" INTEGER,
    "payload" JSONB);
    ${clause} "Task_job_idx" ON ${target} ("job");
    ${clause} "Task_lane_idx" ON ${target} ("lane");
    ${clause} "Task_scheduledAt_idx" ON ${target} ("scheduledAt");
    ${clause} "Task_pickedAt_idx" ON ${target} ("pickedAt");
    ${clause} "Task_deletedAt_idx" ON ${target} ("deletedAt");
    `.trim()

    const connection = await this.connector.get()
    await connection.query(statement)
    this.initialized = true
  }

  _serialize (task = {}) {
    return {
      id: task.id,
      job: task.job,
      lane: task.lane,
      createdAt: task.createdAt,
      scheduledAt: task.scheduledAt,
      pickedAt: task.pickedAt,
      failedAt: task.failedAt,
      deletedAt: task.deletedAt,
      timeout: task.timeout,
      attempts: task.attempts,
      payload: task.payload
    }
  }

  _deserialize (attributes = {}) {
    return new Task({
      id: attributes.id,
      job: attributes.job,
      lane: attributes.lane,
      createdAt: attributes.createdAt,
      scheduledAt: attributes.scheduledAt,
      pickedAt: attributes.pickedAt,
      failedAt: attributes.failedAt,
      deletedAt: attributes.deletedAt,
      timeout: attributes.timeout,
      attempts: attributes.attempts,
      payload: attributes.payload
    })
  }
}

const TASK_COLUMNS = [
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
