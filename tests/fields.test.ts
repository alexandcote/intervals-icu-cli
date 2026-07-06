import { describe, expect, it } from 'vitest'
import { parseFieldList, pickFields } from '../src/lib/fields.js'

describe('pickFields', () => {
  const activity = {
    id: 'i1',
    name: 'Ride',
    icu_zones: { hr: [1, 2], power: [3, 4] },
    laps: [
      { n: 1, watts: 200, hr: 140 },
      { n: 2, watts: 250, hr: 150 },
    ],
    ignored: 'x',
  }

  it('picks top-level fields', () => {
    expect(pickFields(activity, ['id', 'name'])).toEqual({ id: 'i1', name: 'Ride' })
  })

  it('picks nested dot paths', () => {
    expect(pickFields(activity, ['icu_zones.hr'])).toEqual({ icu_zones: { hr: [1, 2] } })
  })

  it('merges multiple paths under the same parent', () => {
    expect(pickFields(activity, ['icu_zones.hr', 'icu_zones.power'])).toEqual({
      icu_zones: { hr: [1, 2], power: [3, 4] },
    })
  })

  it('descends into arrays of objects', () => {
    expect(pickFields(activity, ['laps.watts', 'laps.n'])).toEqual({
      laps: [
        { watts: 200, n: 1 },
        { watts: 250, n: 2 },
      ],
    })
  })

  it('maps over top-level arrays', () => {
    expect(pickFields([activity, activity], ['id'])).toEqual([{ id: 'i1' }, { id: 'i1' }])
  })

  it('skips missing paths silently', () => {
    expect(pickFields(activity, ['id', 'nope', 'icu_zones.nope'])).toEqual({ id: 'i1', icu_zones: {} })
  })

  it('passes through primitives and null', () => {
    expect(pickFields(null, ['a'])).toBeNull()
    expect(pickFields(42, ['a'])).toBe(42)
  })
})

describe('parseFieldList', () => {
  it('splits and trims', () => {
    expect(parseFieldList(' id , name ,,type ')).toEqual(['id', 'name', 'type'])
  })
})
