import { describe, expect, it } from '@jest/globals'
import { Job } from './job.js'

describe('Job', () => {
  it('can be instantiated', () => {
    const job = new Job()
    expect(job).toBeTruthy()
    expect(job.name).toEqual('')
    expect(job.lane).toEqual('')
    expect(job.timeout).toEqual(300)
    expect(job.backoff).toEqual(3)
    expect(job.retries).toEqual(3)
    expect(job.frequency).toEqual('* * * * *')
    expect(job.payload).toEqual({})
  })

  it('defines a run method that executes a task', () => {
    const job = new Job({ name: 'Daily Backup' })
    const mockTask = {}
    expect(() => job.run(mockTask)).toThrow('Not implemented.')
  })
})
