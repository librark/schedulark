import * as fs from 'fs/promises'
import { Task } from '../../base/task.js'

export class JsonQueue {
  constructor (attributes = {}) {
    this.file = attributes.file || 'Task.json'
    this.time = () => Math.floor(Date.now() / 1000)
  }

  async put (task) {
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
    await lockFile(this.file)
    const now = this.time()
    let content = {}
    try {
      content = JSON.parse(await fs.readFile(this.file))
    } catch { }

    const tasks = Object.values(content).filter(
      task => task.scheduledAt <= now && (
        !task.pickedAt || (task.pickedAt + task.timeout <= now)))

    if (!tasks.length) {
      return null
    }

    tasks.sort((a, b) => b.scheduledAt - a.scheduledAt)

    const task = tasks.pop()
    task.pickedAt = now

    await fs.writeFile(this.file, JSON.stringify(content, null, 2))

    await unlockFile(this.file)

    return new Task(task)
  }

  async remove (task) {
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

const lockFile = path => {
  /* istanbul ignore next */
  return fs.open(`${path}.lock`, fs.constants.O_CREAT | fs.constants.O_EXCL |
    fs.constants.O_RDWR).catch(() => lockFile(path))
}

const unlockFile = path => {
  /* istanbul ignore next */
  return fs.unlink(`${path}.lock`).catch(() => unlockFile(path))
}
