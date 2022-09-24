export class Queue {
  /** Optional setup procedures. */
  async setup () { }

  /** Put method to be implemented. */
  async put (task) {
    throw new Error('Not implemented.')
  }

  /** Pick method to be implemented. */
  async pick () {
    throw new Error('Not implemented.')
  }

  /** Remove method to be implemented. */
  async remove (task) {
    throw new Error('Not implemented.')
  }
}
