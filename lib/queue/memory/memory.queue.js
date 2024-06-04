export class MemoryQueue {
  constructor () {
    this.content = {}
    this.time = () => Date.now()
  }

  async put (task) {
    const tasks = [task].flat()
    tasks.forEach(task => { this.content[task.id] = task })
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

  async remove (reference) {
    if (reference?.toLowerCase() === 'prune') {
      const tasks = Object.values(this.content).filter(task => !task.deletedAt)
      this.content = Object.fromEntries(tasks.map(task => [task.id, task]))
    } else if (reference in this.content) {
      const now = this.time()
      this.content[reference].deletedAt = new Date(now)
    }
  }
}
