export interface Stream {
  type?: string
  name?: string
  data?: unknown[]
  [key: string]: unknown
}

/** Keep points where the "time" stream crosses a multiple of everySec (fallback: every Nth index). */
export function downsampleEvery(streams: Stream[], everySec: number): Stream[] {
  const time = streams.find((s) => s.type === 'time')?.data as number[] | undefined
  const length = maxLength(streams)
  if (length === 0 || everySec <= 1) return streams

  const keep: number[] = []
  if (time && time.length > 0) {
    let nextMark = -Infinity
    for (let i = 0; i < time.length; i++) {
      const t = time[i]
      if (typeof t === 'number' && t >= nextMark) {
        keep.push(i)
        nextMark = Math.floor(t / everySec) * everySec + everySec
      }
    }
  } else {
    for (let i = 0; i < length; i += everySec) keep.push(i)
  }
  return pickIndexes(streams, keep)
}

/** Reduce every stream to at most n evenly spaced points. */
export function downsamplePoints(streams: Stream[], n: number): Stream[] {
  const length = maxLength(streams)
  if (length <= n || n <= 0) return streams
  const keep: number[] = []
  const step = (length - 1) / (n - 1)
  for (let i = 0; i < n; i++) keep.push(Math.round(i * step))
  return pickIndexes(streams, [...new Set(keep)])
}

/**
 * Reshape the API's stream list into one column per stream name, for code to index directly.
 * A stream's secondary array (`data2`) becomes `<name>_2`, except latlng, which splits into lat/lng.
 */
export function streamsToColumns(streams: Stream[]): Record<string, unknown[]> {
  const columns: Record<string, unknown[]> = {}
  for (const stream of streams) {
    const name = stream.type ?? stream.name
    if (typeof name !== 'string' || !Array.isArray(stream.data)) continue
    const data2 = Array.isArray(stream.data2) ? stream.data2 : undefined
    if (name === 'latlng' && data2) {
      columns.lat = stream.data
      columns.lng = data2
      continue
    }
    columns[name] = stream.data
    if (data2) columns[`${name}_2`] = data2
  }
  return columns
}

/** Count places where the time column skips ahead by more than one second (pauses, auto-stop). */
export function countTimeGaps(time: unknown[] | undefined): number {
  if (!time) return 0
  let gaps = 0
  for (let i = 1; i < time.length; i++) {
    const prev = time[i - 1]
    const cur = time[i]
    if (typeof prev === 'number' && typeof cur === 'number' && cur - prev > 1) gaps++
  }
  return gaps
}

/** Replace each stream's data with summary statistics. */
export function streamStats(streams: Stream[]): Array<Record<string, unknown>> {
  return streams.map((stream) => {
    const data = Array.isArray(stream.data) ? stream.data : []
    const numbers = data.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    const stats: Record<string, unknown> = {
      type: stream.type ?? stream.name,
      count: data.length,
    }
    if (numbers.length > 0) {
      let min = Infinity
      let max = -Infinity
      let sum = 0
      for (const v of numbers) {
        if (v < min) min = v
        if (v > max) max = v
        sum += v
      }
      stats.min = min
      stats.max = max
      stats.avg = Number((sum / numbers.length).toFixed(2))
    }
    return stats
  })
}

function maxLength(streams: Stream[]): number {
  return streams.reduce((acc, s) => Math.max(acc, Array.isArray(s.data) ? s.data.length : 0), 0)
}

function pickIndexes(streams: Stream[], indexes: number[]): Stream[] {
  return streams.map((stream) => {
    if (!Array.isArray(stream.data)) return stream
    return { ...stream, data: indexes.filter((i) => i < stream.data!.length).map((i) => stream.data![i]) }
  })
}
