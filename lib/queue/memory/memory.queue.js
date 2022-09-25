import { Task } from '../../base/task.js'

export class MemoryQueue {
  constructor () {
    this.content = {}
    this.time = () => Math.floor(Date.now() / 1000)
  }

  async put (task) {
    this.content[task.id] = task
  }

  async pick () {
    const now = this.time()
    const tasks = Object.values(this.content).filter(
      task => task.scheduledAt <= now && (
        !task.pickedAt || (task.pickedAt + task.timeout <= now)))

    if (!tasks.length) {
      return null
    }

    tasks.sort((a, b) => b.scheduledAt - a.scheduledAt)

    const task = tasks.pop()
    task.pickedAt = now
    return new Task(task)
  }

  async remove (task) {
    if (task.id in this.content) {
      delete this.content[task.id]
    }
  }
}
