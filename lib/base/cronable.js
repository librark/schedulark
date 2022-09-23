export function cronable (pattern, moment = null) {
  if (!pattern) {
    return false
  }

  const validCharacters = '0123456789 */!'

  for (const char of pattern) {
    if (!validCharacters.includes(char)) {
      throw new Error(`Invalid cron pattern. Use "${validCharacters}" only.`)
    }
  }

  moment = moment || new Date()

  let second = '*'
  let [minute, hour, monthDay, month, weekDay] = pattern.split(' ')
  if (minute.includes('!')) {
    const [symbol, value] = minute.split('!')
    ;[second, minute] = [symbol ? `*/${value}` : value, '*']
  }

  const result = [
    checkField(second, moment.getUTCSeconds()),
    checkField(minute, moment.getUTCMinutes()),
    checkField(hour, moment.getUTCHours()),
    checkField(monthDay, moment.getUTCDate()),
    checkField(month, moment.getUTCMonth() + 1),
    checkField(weekDay, moment.getUTCDay())]

  return result.every(Boolean)
}

function checkField (field, value) {
  if (field === '*') {
    return true
  }

  if (field.includes('/')) {
    const [, interval] = field.split('/')
    return (value % parseInt(interval)) === 0
  }

  return parseInt(field) === value
}
