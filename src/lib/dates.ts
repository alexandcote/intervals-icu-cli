import { CliError } from './errors.js'

const RELATIVE_RE = /^([+-])(\d+)([dwmy])$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toLocalDateTime(d: Date): string {
  return `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * Resolve a user-supplied date to a local ISO-8601 date string as expected by
 * the intervals.icu API. Accepts ISO dates/datetimes (passed through),
 * `today`, `yesterday`, `tomorrow`, `now`, and signed offsets from today
 * like `-7d`, `-4w`, `-3m`, `-1y`, `+2d`.
 */
export function resolveDate(input: string, now: Date = new Date()): string {
  const value = input.trim()
  if (ISO_DATE_RE.test(value) || ISO_DATETIME_RE.test(value)) return value

  switch (value.toLowerCase()) {
    case 'today':
      return toLocalDate(now)
    case 'yesterday':
      return toLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
    case 'tomorrow':
      return toLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
    case 'now':
      return toLocalDateTime(now)
  }

  const m = RELATIVE_RE.exec(value)
  if (m) {
    const sign = m[1] === '-' ? -1 : 1
    const amount = sign * Number(m[2])
    const unit = m[3]
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (unit === 'd') d.setDate(d.getDate() + amount)
    else if (unit === 'w') d.setDate(d.getDate() + amount * 7)
    else if (unit === 'm') d.setMonth(d.getMonth() + amount)
    else d.setFullYear(d.getFullYear() + amount)
    return toLocalDate(d)
  }

  throw new CliError(
    'INVALID_INPUT',
    `Cannot parse date "${input}"`,
    'Use an ISO date (2026-07-06), ISO datetime (2026-07-06T06:30:00), today/yesterday/tomorrow/now, or an offset like -7d, -4w, -3m, -1y, +2d.',
  )
}

export const DATE_HELP = 'Dates accept ISO (2026-07-06), today, yesterday, tomorrow, now, or offsets like -7d, -4w, -3m, -1y, +2d.'

const DURATION_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/

/** Parse a duration to seconds: plain seconds ("3600") or h/m/s form ("1h30m", "90m", "45s"). */
export function parseDuration(input: string): number {
  const value = input.trim()
  if (/^\d+$/.test(value)) return Number(value)
  const m = DURATION_RE.exec(value)
  if (m && (m[1] || m[2] || m[3])) {
    return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  }
  throw new CliError(
    'INVALID_INPUT',
    `Cannot parse duration "${input}"`,
    'Use seconds (3600) or h/m/s form (1h30m, 90m, 45s).',
  )
}

/** Parse a distance to meters: plain meters ("10000") or km suffix ("42.2km"). */
export function parseDistance(input: string): number {
  const value = input.trim()
  const km = /^(\d+(?:\.\d+)?)km$/i.exec(value)
  if (km) return Number(km[1]) * 1000
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value)
  throw new CliError('INVALID_INPUT', `Cannot parse distance "${input}"`, 'Use meters (10000) or km (42.2km).')
}
