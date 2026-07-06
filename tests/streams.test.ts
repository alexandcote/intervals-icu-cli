import { describe, expect, it } from 'vitest'
import { downsampleEvery, downsamplePoints, streamStats, type Stream } from '../src/lib/streams.js'

const time = { type: 'time', data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
const watts = { type: 'watts', data: [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200] }

describe('downsampleEvery', () => {
  it('keeps one point per interval using the time stream', () => {
    const [t, w] = downsampleEvery([time, watts], 5) as [Stream, Stream]
    expect(t.data).toEqual([0, 5, 10])
    expect(w.data).toEqual([100, 150, 200])
  })

  it('handles gaps in time (pauses)', () => {
    const gappy = { type: 'time', data: [0, 1, 2, 100, 101, 102] }
    const [t] = downsampleEvery([gappy], 10) as [Stream]
    expect(t.data).toEqual([0, 100])
  })

  it('falls back to every-Nth without a time stream', () => {
    const [w] = downsampleEvery([watts], 5) as [Stream]
    expect(w.data).toEqual([100, 150, 200])
  })
})

describe('downsamplePoints', () => {
  it('keeps at most n evenly spaced points', () => {
    const [w] = downsamplePoints([watts], 3) as [Stream]
    expect(w.data).toEqual([100, 150, 200])
  })

  it('returns unchanged when already small enough', () => {
    const [w] = downsamplePoints([watts], 100) as [Stream]
    expect(w.data).toHaveLength(11)
  })
})

describe('streamStats', () => {
  it('summarizes numeric streams', () => {
    const [stats] = streamStats([watts])
    expect(stats).toEqual({ type: 'watts', count: 11, min: 100, max: 200, avg: 150 })
  })

  it('handles non-numeric and null values', () => {
    const latlng = { type: 'latlng', data: [[1, 2], [3, 4], null] }
    const [stats] = streamStats([latlng])
    expect(stats).toEqual({ type: 'latlng', count: 3 })
  })
})
