import { describe, expect, it } from '@jest/globals'
import { cronable } from './cronable.js'

describe('Cronable', () => {
  it('evaluates an every minute pattern', () => {
    const pattern = '* * * * *'

    for (const minute of Array(60).keys()) {
      const result = cronable(
        pattern, new Date(Date.UTC(2020, 3, 21, 0, minute)))
      expect(result).toBeTruthy()
    }
  })

  it('evaluates every-five-minutes patterns', () => {
    const pattern = '*/5 * * * *'

    for (let minute = 0; minute < 60; minute += 5) {
      expect(cronable(
        pattern, new Date(Date.UTC(2020, 3, 21, 0, minute)))).toBeTruthy()
    }
  })

  it('evaluates every-five-seconds patterns', () => {
    const pattern = '*!5 * * * *'

    for (let second = 0; second < 60; second += 5) {
      expect(cronable(
        pattern, new Date(Date.UTC(2020, 3, 21, 0, 0, second)))).toBeTruthy()
    }
  })

  it('evaluates at exact second patterns', () => {
    const pattern = '!17 * * * *'

    expect(cronable(pattern, new Date(
      Date.UTC(2020, 3, 21, 0, 0, 17)))).toBeTruthy()
    expect(cronable(pattern, new Date(
      Date.UTC(2020, 3, 21, 0, 0, 34)))).toBeFalsy()
    expect(cronable(pattern, new Date(
      Date.UTC(2020, 3, 21, 0, 0, 51)))).toBeFalsy()
  })

  it('evaluates every six hours patterns', () => {
    const pattern = '* */6 * * *'

    for (let hour = 0; hour < 24; hour += 6) {
      expect(cronable(
        pattern, new Date(Date.UTC(2020, 3, 21, hour)))).toBeTruthy()
    }
  })

  it('evaluates multiple truthy date patterns', () => {
    expect(cronable('* */6 21 * *',
      new Date('2020-04-21T06:00:00Z'))).toBeTruthy()
    expect(cronable('* * * * 1',
      new Date('2020-04-27'))).toBeTruthy() // monday
    expect(cronable('* * * * 0',
      new Date('2020-05-03'))).toBeTruthy() // sunday
    expect(cronable('* 12 * * 4',
      new Date('2020-05-07T12:00:00Z'))).toBeTruthy() // Thursday Noon
    expect(cronable('10 8 * * *',
      new Date('2020-01-01T08:10:00Z'))).toBeTruthy()
    expect(cronable('* * 15 * *',
      new Date('2020-01-15'))).toBeTruthy()
    expect(cronable('*/30 */4 * 4 2',
      new Date('2020-04-28T12:00:00Z'))).toBeTruthy()
  })

  it('evaluates multiple falsy date patterns', () => {
    expect(cronable('* */6 21 * *',
      new Date('2020-04-21T07:00:00Z'))).toBeFalsy()
    expect(cronable('* * * * 1',
      new Date('2020-04-30'))).toBeFalsy()
    expect(cronable('* * * * 0',
      new Date('2020-05-08'))).toBeFalsy()
    expect(cronable('* 12 * * 4',
      new Date('2020-05-07T03:00:00Z'))).toBeFalsy()
    expect(cronable('10 8 * * *',
      new Date('2020-01-01T05:10:00Z'))).toBeFalsy()
    expect(cronable('* * 15 * *',
      new Date('2020-01-14'))).toBeFalsy()
    expect(cronable('*/30 */4 * 4 2',
      new Date('2020-04-28T10:00:00Z'))).toBeFalsy()
  })

  it('evaluates the current date if no moment is provided', () => {
    const pattern = '* * * * *'
    expect(cronable(pattern)).toBeTruthy()
  })

  it('returns false on empty/falsy patterns', () => {
    const pattern = ''
    expect(cronable(pattern)).toBeFalsy()
  })

  it('raises an error on invalid patterns', () => {
    expect(() => cronable('* 8,9 * * *', new Date('2020-05-08'))).toThrow()
  })
})
