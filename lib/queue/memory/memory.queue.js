export class MemoryQueue {
  constructor () {
    this.content = {}
    this.time = () => Date.now()
  }

  async put (task) {
    this.content[task.id] = task
  }

  async pick () {
    const now = this.time()
    const tasks = Object.values(this.content).filter(
      task => !task.deletedAt && task.scheduledAt.getTime() <= now && (
        !task.pickedAt?.getTime() || (
          task.pickedAt?.getTime() + task.timeout <= now)
      ))

    if (!tasks.length) {
      return null
    }

    tasks.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())

    const task = tasks.pop()
    task.pickedAt = new Date(now)

    return task
  }

  async remove (task, { hard = false } = {}) {
    if (task.id in this.content) {
      const now = this.time()
      this.content[task.id].deletedAt = new Date(now)
      if (hard) delete this.content[task.id]
    }
  }
}
