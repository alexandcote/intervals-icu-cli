import { afterEach, describe, expect, it } from 'vitest'
import { emit, setKeepNulls, setStdoutWriter, stripNulls } from '../src/lib/output.js'

describe('stripNulls', () => {
  it('drops null and undefined object fields recursively', () => {
    expect(stripNulls({ a: 1, b: null, c: { d: null, e: 2 }, f: undefined })).toEqual({ a: 1, c: { e: 2 } })
  })

  it('keeps null elements inside arrays (positional stream data)', () => {
    expect(stripNulls({ data: [1, null, 3], items: [{ a: null, b: 1 }] })).toEqual({
      data: [1, null, 3],
      items: [{ b: 1 }],
    })
  })

  it('passes through primitives', () => {
    expect(stripNulls(42)).toBe(42)
    expect(stripNulls(null)).toBeNull()
  })
})

describe('emit null handling', () => {
  let lines: string[] = []

  afterEach(() => {
    setStdoutWriter(null)
    setKeepNulls(false)
  })

  function capture(): void {
    lines = []
    setStdoutWriter((line) => lines.push(line))
  }

  it('strips nulls by default', () => {
    capture()
    emit({ a: 1, b: null })
    expect(lines[0]).toBe('{"a":1}')
  })

  it('keeps nulls with the per-call option', () => {
    capture()
    emit({ a: 1, b: null }, { keepNulls: true })
    expect(lines[0]).toBe('{"a":1,"b":null}')
  })

  it('keeps nulls when the session default is set via --nulls', () => {
    capture()
    setKeepNulls(true)
    emit({ a: 1, b: null })
    expect(lines[0]).toBe('{"a":1,"b":null}')
  })

  it('strips nulls after field selection', () => {
    capture()
    emit({ a: 1, b: null, c: 2 }, { fields: 'a,b' })
    expect(lines[0]).toBe('{"a":1}')
  })
})
