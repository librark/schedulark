import { Task } from '../../base/task.js'

export class SqlQueue {
  constructor (attributes = {}) {
    this.connector = attributes.connector
    this.schema = attributes.schema || 'public'
    this.table = attributes.table || 'Task'
  }

  async put (task) {
    const statement = `
    INSERT INTO "${this.schema}"."${this.table}" (id, data)
    VALUES ($1, $2)
    ON CONFLICT (id)
    DO UPDATE SET (data) = (EXCLUDED.data)
    RETURNING *
    `.trim()

    const parameters = [task.id, task]

    const connection = await this.connector.get()

    await connection.query(statement, parameters)
  }

  async pick () {
    const statement = `
      UPDATE "${this.schema}"."${this.table}"
      SET data->>'pickedAt' = to_json(NOW())::text
      WHERE id = (
          SELECT id FROM "${this.schema}"."${this.table}"
          WHERE data->>'scheduledAt'::timestamptz <= NOW()::timestamptz
          AND (data->>'pickedAt'::timestamptz = 'epoch' OR (
          data->>'pickedAt'::timestamptz +
          interval '1 second' * timeout) <= NOW()::timestamptz)
          ORDER BY data->>'scheduledAt'::timestamptz
          FOR UPDATE SKIP LOCKED
          LIMIT 1
      )
      RETURNING *
      `.trim()

    const connection = await this.connector.get()

    const result = await connection.query(statement)

    if (!result.length) {
      return null
    }

    return new Task(result.pop())
  }

  async remove (task) {
    const statement = `
    DELETE FROM "${this.schema}"."${this.table}"
    WHERE id = $1
    `.trim()
    const parameters = [task.id]

    const connection = await this.connector.get()

    await connection.query(statement, parameters)
  }
}
