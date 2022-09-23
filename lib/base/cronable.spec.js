import { describe, expect, it } from '@jest/globals'
import { cronable } from './cronable.js'

describe('Cronable', () => {
  it('evaluates an every minute pattern', () => {
    const pattern = '* * * * *'

    for (const index of Array(60).keys()) {
      const minute = index.toLocaleString(
        undefined, { minimumIntegerDigits: 2 })
      const result = cronable(
        pattern, new Date(`2020-04-21T00:${minute}:00Z`))
      expect(result).toBeTruthy()
    }
  })

  it('evaluates every-five-minutes patterns', () => {
    const pattern = '*/5 * * * *'

    for (let index = 0; index < 60; index += 5) {
      const minute = index.toLocaleString(
        undefined, { minimumIntegerDigits: 2 })
      expect(cronable(
        pattern, new Date(`2020-04-21T00:${minute}:00Z`))).toBeTruthy()
    }
  })

  it('evaluates every-five-seconds patterns', () => {
    const pattern = '*!5 * * * *'

    for (let index = 0; index < 60; index += 5) {
      const second = index.toLocaleString(
        undefined, { minimumIntegerDigits: 2 })
      expect(cronable(
        pattern, new Date(`2020-04-21T00:00:${second}Z`))).toBeTruthy()
    }
  })

  it('evaluates at exact second patterns', () => {
    const pattern = '!17 * * * *'

    expect(cronable(pattern, new Date(
      '2020-04-21T00:00:17Z'))).toBeTruthy()
    expect(cronable(pattern, new Date(
      '2020-04-21T00:00:34:00Z'))).toBeFalsy()
    expect(cronable(pattern, new Date(
      '2020-04-21T00:00:51Z'))).toBeFalsy()
  })

  it('evaluates every six hours patterns', () => {
    const pattern = '* */6 * * *'

    for (let index = 0; index < 24; index += 6) {
      const hour = index.toLocaleString(
        undefined, { minimumIntegerDigits: 2 })
      expect(cronable(
        pattern, new Date(`2020-04-21T${hour}:00:00Z`))).toBeTruthy()
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
