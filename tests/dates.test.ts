import { describe, expect, it } from 'vitest'
import { parseDistance, parseDuration, resolveDate } from '../src/lib/dates.js'
import { CliError } from '../src/lib/errors.js'

const NOW = new Date(2026, 6, 6, 14, 30, 45) // 2026-07-06 local

describe('resolveDate', () => {
  it('passes through ISO dates and datetimes', () => {
    expect(resolveDate('2026-01-15', NOW)).toBe('2026-01-15')
    expect(resolveDate('2026-01-15T06:30:00', NOW)).toBe('2026-01-15T06:30:00')
    expect(resolveDate('2026-01-15T06:30', NOW)).toBe('2026-01-15T06:30')
  })

  it('resolves keywords', () => {
    expect(resolveDate('today', NOW)).toBe('2026-07-06')
    expect(resolveDate('yesterday', NOW)).toBe('2026-07-05')
    expect(resolveDate('tomorrow', NOW)).toBe('2026-07-07')
    expect(resolveDate('now', NOW)).toBe('2026-07-06T14:30:45')
    expect(resolveDate('TODAY', NOW)).toBe('2026-07-06')
  })

  it('resolves signed offsets', () => {
    expect(resolveDate('-7d', NOW)).toBe('2026-06-29')
    expect(resolveDate('+2d', NOW)).toBe('2026-07-08')
    expect(resolveDate('-4w', NOW)).toBe('2026-06-08')
    expect(resolveDate('-3m', NOW)).toBe('2026-04-06')
    expect(resolveDate('-1y', NOW)).toBe('2025-07-06')
  })

  it('handles month-end rollover', () => {
    expect(resolveDate('-1m', new Date(2026, 2, 31))).toBe('2026-03-03') // JS Date semantics: Feb 31 -> Mar 3
  })

  it('rejects garbage with a hint', () => {
    expect(() => resolveDate('last tuesday', NOW)).toThrowError(CliError)
    try {
      resolveDate('nope', NOW)
    } catch (err) {
      expect((err as CliError).code).toBe('INVALID_INPUT')
      expect((err as CliError).hint).toContain('-7d')
    }
  })
})

describe('parseDuration', () => {
  it('parses seconds and h/m/s forms', () => {
    expect(parseDuration('3600')).toBe(3600)
    expect(parseDuration('1h30m')).toBe(5400)
    expect(parseDuration('90m')).toBe(5400)
    expect(parseDuration('45s')).toBe(45)
    expect(parseDuration('2h')).toBe(7200)
    expect(parseDuration('1h30m15s')).toBe(5415)
  })

  it('rejects garbage', () => {
    expect(() => parseDuration('ninety')).toThrowError(CliError)
    expect(() => parseDuration('')).toThrowError(CliError)
  })
})

describe('parseDistance', () => {
  it('parses meters and km', () => {
    expect(parseDistance('10000')).toBe(10000)
    expect(parseDistance('42.2km')).toBe(42200)
    expect(parseDistance('5km')).toBe(5000)
  })

  it('rejects garbage', () => {
    expect(() => parseDistance('far')).toThrowError(CliError)
  })
})
