import * as path from 'path'
import * as fs from 'fs/promises'
import { Task } from '../../base/task.js'

export class JsonQueue {
  constructor (attributes = {}) {
    this.file = attributes.file || 'Task.json'
    this.time = () => Date.now()
  }

  async put (task) {
    await fs.mkdir(path.parse(this.file).dir, { recursive: true })
    await lockFile(this.file)
    let content = {}
    try {
      content = JSON.parse(await fs.readFile(this.file))
    } catch { }
    content[task.id] = task
    await fs.writeFile(this.file, JSON.stringify(content, null, 2))
    await unlockFile(this.file)
  }

  async pick () {
    await fs.mkdir(path.parse(this.file).dir, { recursive: true })
    await lockFile(this.file)
    let content = {}
    try {
      content = JSON.parse(await fs.readFile(this.file))
    } catch { }

    const now = this.time()
    const tasks = Object.values(content).map(item => new Task(item)).filter(
      task => task.scheduledAt.getTime() <= now && (
        !task.pickedAt.getTime() || (
          task.pickedAt.getTime() + task.timeout <= now)))

    if (!tasks.length) {
      await unlockFile(this.file)
      return null
    }

    tasks.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())

    const task = tasks.pop()
    task.pickedAt = new Date(now)
    content = Object.fromEntries(tasks.map(task => [task.id, task]))

    await fs.writeFile(this.file, JSON.stringify(content, null, 2))

    await unlockFile(this.file)

    return new Task(task)
  }

  async remove (task) {
    await fs.mkdir(path.parse(this.file).dir, { recursive: true })
    await lockFile(this.file)
    try {
      const content = JSON.parse(await fs.readFile(this.file))
      if (task.id in content) {
        delete content[task.id]
        await fs.writeFile(this.file, JSON.stringify(content, null, 2))
      }
    } catch { }
    await unlockFile(this.file)
  }
}

const lockFile = file => {
  /* istanbul ignore next */
  return fs.open(`${file}.lock`, fs.constants.O_CREAT | fs.constants.O_EXCL |
    fs.constants.O_RDWR).catch(() => lockFile(file))
}

const unlockFile = file => {
  /* istanbul ignore next */
  return fs.unlink(`${file}.lock`).catch(() => unlockFile(file))
}
