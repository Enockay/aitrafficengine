// weekday: 0=Sunday..6=Saturday (matches Date.getDay()), hour: 0-23, local time.
export function nextOccurrence(weekday: number, hour: number, from: Date = new Date()): Date {
  const result = new Date(from)
  result.setHours(hour, 0, 0, 0)
  let daysUntil = (weekday - result.getDay() + 7) % 7
  if (daysUntil === 0 && result <= from) daysUntil = 7
  result.setDate(result.getDate() + daysUntil)
  return result
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
