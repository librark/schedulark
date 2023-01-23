export class Connection {
  /** @param {string} statement
   * @param {{ parameters: object}} options
   * @return {Array<object>} */
  async query (_statement, { _parameters } = {}) {
    return []
  }
}

export class Connector {
  /** @return {Connection} */
  async get () {
    throw new Error('Not implemented.')
  }
}
