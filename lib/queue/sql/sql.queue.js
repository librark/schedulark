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
          WHERE (data->>'scheduledAt')::timestamptz <= NOW()::timestamptz
          AND ((data->>'pickedAt')::timestamptz = 'epoch' OR (
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

  async remove (task) {
    await this._init()
    const statement = `
    DELETE FROM "${this.schema}"."${this.table}"
    WHERE id = $1
    `.trim()
    const parameters = [task.id]

    const connection = await this.connector.get()

    await connection.query(statement, { parameters })
  }

  async _init () {
    if (this.initialized) return

    const statement = `
    CREATE TABLE IF NOT EXISTS "${this.schema}"."${this.table}" (
    "id" UUID PRIMARY KEY,
    "data" JSONB);
    `.trim()

    const connection = await this.connector.get()
    await connection.query(statement)
    this.initialized = true
  }
}
