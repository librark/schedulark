import * as path from 'path'
import * as fs from 'fs/promises'
import { Task } from '../../base/task.js'

export class JsonQueue {
  constructor (attributes = {}) {
    const directory = attributes.directory || ''
    this.file = path.join(directory, attributes.file || 'Task.json')
    this.time = () => Date.now()
  }

  async put (task) {
    const tasks = [task].flat().filter(Boolean)
    if (!tasks.length) return
    await fs.mkdir(path.parse(this.file).dir, { recursive: true })
    const handle = await lockFile(this.file)
    let content = {}
    try {
      content = JSON.parse(await fs.readFile(this.file))
    } catch { }
    tasks.forEach(task => { content[task.id] = task })
    await fs.writeFile(this.file, JSON.stringify(content, null, 2))
    await unlockFile(this.file, handle)
  }

  async pick () {
    await fs.mkdir(path.parse(this.file).dir, { recursive: true })
    const handle = await lockFile(this.file)
    let content = {}
    try {
      content = JSON.parse(await fs.readFile(this.file))
    } catch { }

    const now = this.time()
    const tasks = Object.values(content).map(item => new Task(item)).filter(
      task => !task.deletedAt && task.scheduledAt.getTime() <= now && (
        !task.pickedAt?.getTime() || (
          task.pickedAt?.getTime() + task.timeout <= now)))

    if (!tasks.length) {
      await unlockFile(this.file, handle)
      return null
    }

    tasks.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())

    const task = tasks.pop()
    task.pickedAt = new Date(now)
    content = Object.fromEntries(tasks.map(task => [task.id, task]))

    await fs.writeFile(this.file, JSON.stringify(content, null, 2))

    await unlockFile(this.file, handle)

    return new Task(task)
  }

  async remove (reference) {
    await fs.mkdir(path.parse(this.file).dir, { recursive: true })
    const handle = await lockFile(this.file)
    try {
      let content = JSON.parse(await fs.readFile(this.file))
      if (reference?.toLowerCase() === 'prune') {
        const tasks = Object.values(content).filter(task => !task.deletedAt)
        content = Object.fromEntries(tasks.map(task => [task.id, task]))
        await fs.writeFile(this.file, JSON.stringify(content, null, 2))
      } else if (reference in content) {
        const now = this.time()
        content[reference].deletedAt = new Date(now)
        await fs.writeFile(this.file, JSON.stringify(content, null, 2))
      }
    } catch { }
    await unlockFile(this.file, handle)
  }
}

/* istanbul ignore next */
const lockFile = file => {
  return fs.open(`${file}.lock`, fs.constants.O_CREAT | fs.constants.O_EXCL |
    fs.constants.O_RDWR).catch(() => lockFile(file))
}

/* istanbul ignore next */
const unlockFile = async (file, handle) => {
  await handle?.close()
  return fs.unlink(`${file}.lock`).catch(() => unlockFile(file, handle))
}
