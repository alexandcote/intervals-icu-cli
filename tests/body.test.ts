import { describe, expect, it, vi } from 'vitest'
import { buildBody } from '../src/lib/body.js'
import { CliError } from '../src/lib/errors.js'

describe('buildBody', () => {
  it('coerces scalar --set values', () => {
    expect(buildBody(['name=Long ride', 'indoor=true', 'ftp=285', 'gear=null', 'code=007x'], undefined)).toEqual({
      name: 'Long ride',
      indoor: true,
      ftp: 285,
      gear: null,
      code: '007x',
    })
  })

  it('parses key:=json values', () => {
    expect(buildBody(['tags:=["z2","base"]', 'meta:={"a":1}', 'label:="2024"'], undefined)).toEqual({
      tags: ['z2', 'base'],
      meta: { a: 1 },
      label: '2024',
    })
  })

  it('nests dotted keys', () => {
    expect(buildBody(['a.b.c=1'], undefined)).toEqual({ a: { b: { c: 1 } } })
  })

  it('merges --data with --set winning', () => {
    expect(buildBody(['name=Override'], '{"name":"Original","type":"Ride"}')).toEqual({
      name: 'Override',
      type: 'Ride',
    })
  })

  it('applies base under both', () => {
    expect(buildBody(['b=2'], '{"c":3}', { base: { a: 1, b: 0, c: 0 } })).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('rejects invalid JSON in --data', () => {
    expect(() => buildBody(undefined, '{nope')).toThrowError(CliError)
  })

  it('rejects non-object --data', () => {
    expect(() => buildBody(undefined, '[1,2]')).toThrowError(CliError)
  })

  it('rejects --set without =', () => {
    expect(() => buildBody(['justakey'], undefined)).toThrowError(CliError)
  })

  it('warns with a typo suggestion for unknown fields', () => {
    const warn = vi.fn()
    buildBody(['restingHr=51'], undefined, { knownFields: ['restingHR', 'hrv'], warn })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('restingHR'))
  })

  it('does not warn for known fields', () => {
    const warn = vi.fn()
    buildBody(['hrv=90'], undefined, { knownFields: ['restingHR', 'hrv'], warn })
    expect(warn).not.toHaveBeenCalled()
  })
})
