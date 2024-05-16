import { Task } from '../../base/task.js'

export class SqlQueue {
  constructor (attributes = {}) {
    this.connector = attributes.connector
    this.schema = attributes.schema || 'public'
    this.table = attributes.table || 'Task'
    this.initialized = false
  }

  async put (task) {
    await this._init()
    const statement = `
    INSERT INTO "${this.schema}"."${this.table}" (id, data)
    VALUES ($1, $2)
    ON CONFLICT (id)
    DO UPDATE SET data = EXCLUDED.data
    RETURNING *
    `.trim()

    const parameters = [task.id, task]

    const connection = await this.connector.get()

    await connection.query(statement, { parameters })
  }

  async pick () {
    await this._init()
    const statement = `
      UPDATE "${this.schema}"."${this.table}"
      SET data = jsonb_set(data, '{pickedAt}', to_jsonb(NOW()))
      WHERE id = (
          SELECT id FROM "${this.schema}"."${this.table}"
          WHERE data->'deletedAt' IS NULL
          AND (data->>'scheduledAt')::timestamptz <= NOW()::timestamptz
          AND (data->'pickedAt' IS NULL OR (
          (data->>'pickedAt')::timestamptz +
          interval '1 milliseconds' * (
          data->>'timeout')::integer <= NOW()::timestamptz))
          ORDER BY (data->>'scheduledAt')::timestamptz
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

    const attributes = result.pop().data
    return new Task(attributes)
  }

  async remove (reference) {
    await this._init()

    let statement = `
    UPDATE "${this.schema}"."${this.table}"
    SET data = jsonb_set(data, '{deletedAt}', to_jsonb(NOW()))
    WHERE id = $1
    `.trim()

    if (reference?.toLowerCase() === 'prune') {
      statement = `
      DELETE FROM "${this.schema}"."${this.table}"
      WHERE data->'deletedAt' IS NOT NULL
      `.trim()
    }

    const parameters = [reference]

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
    "data" JSONB);
    ${clause} "Task_job_idx" ON ${target} ((data->>'job'));
    ${clause} "Task_lane_idx" ON ${target} ((data->>'lane'));
    ${clause} "Task_scheduledAt_idx" ON ${target} ((data->>'scheduledAt'));
    ${clause} "Task_pickedAt_idx" ON ${target} ((data->>'pickedAt'));
    ${clause} "Task_deletedAt_idx" ON ${target} ((data->>'deletedAt'));
    `.trim()

    const connection = await this.connector.get()
    await connection.query(statement)
    this.initialized = true
  }
}
