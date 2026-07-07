import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProgram } from '../src/program.js'
import { setStdoutWriter } from '../src/lib/output.js'

let stdout: string[]
let fetchMock: ReturnType<typeof vi.fn>

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

async function run(...argv: string[]): Promise<void> {
  const program = buildProgram()
  await program.parseAsync(['node', 'intervals', ...argv, '--api-key', 'k', '--athlete', 'i1'])
}

function calledUrl(index = 0): URL {
  return new URL(fetchMock.mock.calls[index]![0] as string)
}

beforeEach(() => {
  stdout = []
  setStdoutWriter((line) => stdout.push(line))
  fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  setStdoutWriter(null)
  vi.unstubAllGlobals()
})

describe('activities', () => {
  it('list resolves dates and sends default fields server-side', async () => {
    await run('activities', 'list', '--oldest', '2026-06-01', '--limit', '5')
    const url = calledUrl()
    expect(url.pathname).toBe('/api/v1/athlete/i1/activities')
    expect(url.searchParams.get('oldest')).toBe('2026-06-01')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(url.searchParams.get('fields')).toContain('icu_training_load')
  })

  it('list --full drops the fields param', async () => {
    await run('activities', 'list', '--full')
    expect(calledUrl().searchParams.get('fields')).toBeNull()
  })

  it('get trims the response client-side by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'i9', name: 'Ride', icu_sfuel: 123, average_watts: 200 }))
    await run('activities', 'get', 'i9')
    const emitted = JSON.parse(stdout[0]!) as Record<string, unknown>
    expect(emitted).toMatchObject({ id: 'i9', name: 'Ride', average_watts: 200 })
    expect(emitted).not.toHaveProperty('icu_sfuel')
  })

  it('streams requires --types', async () => {
    await expect(run('activities', 'streams', 'i9')).rejects.toThrowError()
  })

  it('streams --stats summarizes', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ type: 'watts', data: [100, 200] }]))
    await run('activities', 'streams', 'i9', '--types', 'watts', '--stats')
    expect(JSON.parse(stdout[0]!)).toEqual([{ type: 'watts', count: 2, min: 100, max: 200, avg: 150 }])
  })

  it('power-profile computes the mean-maximal envelope with sources', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        secs: [5, 300],
        curves: [
          { id: 'iA', start_date_local: '2026-06-01T10:00:00', weight: 80, watts: [900, 300] },
          { id: 'iB', start_date_local: '2026-06-10T10:00:00', weight: 80, watts: [1000, 280] },
        ],
      }),
    )
    await run('activities', 'power-profile', '--oldest', '2026-05-25', '--newest', '2026-07-06', '--secs', '5,300')
    const url = calledUrl()
    expect(url.pathname).toBe('/api/v1/athlete/i1/activity-power-curves')
    expect(url.searchParams.get('secs')).toBe('5,300')
    const out = JSON.parse(stdout[0]!) as { activities: number; profile: Array<Record<string, unknown>> }
    expect(out.activities).toBe(2)
    expect(out.profile[0]).toEqual({ secs: 5, watts: 1000, w_kg: 12.5, from: { id: 'iB', date: '2026-06-10T10:00:00' } })
    expect(out.profile[1]).toMatchObject({ secs: 300, watts: 300, from: { id: 'iA' } })
  })
})

describe('wellness', () => {
  it('update maps named flags to API field names', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: '2026-07-06' }))
    await run('wellness', 'update', '2026-07-06', '--weight', '71.5', '--resting-hr', '48', '--sleep-quality', '2')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/api/v1/athlete/i1/wellness/2026-07-06')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({ weight: 71.5, restingHR: 48, sleepQuality: 2 })
  })
})

describe('events', () => {
  it('create builds the body and always sends upsertOnUid', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))
    await run(
      'events', 'create',
      '--start', '2026-07-10',
      '--name', 'VO2',
      '--type', 'Ride',
      '--time-target', '1h30m',
      '--distance-target', '40km',
      '--tags', 'vo2,hard',
    )
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new URL(url).searchParams.get('upsertOnUid')).toBe('false')
    expect(JSON.parse(init.body as string)).toMatchObject({
      category: 'WORKOUT',
      start_date_local: '2026-07-10T00:00:00',
      name: 'VO2',
      type: 'Ride',
      time_target: 5400,
      distance_target: 40000,
      tags: ['vo2', 'hard'],
    })
  })

  it('delete-range requires --oldest and --category', async () => {
    await expect(run('events', 'delete-range', '--oldest', 'today')).rejects.toThrowError()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('list uppercases categories', async () => {
    await run('events', 'list', '--category', 'workout,note')
    expect(calledUrl().searchParams.get('category')).toBe('WORKOUT,NOTE')
  })
})

describe('sport-settings', () => {
  it('update sends recalcHrZones and snake_case body fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))
    await run('sport-settings', 'update', 'Ride', '--ftp', '285', '--max-hr', '188', '--recalc-hr-zones')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/api/v1/athlete/i1/sport-settings/Ride')
    expect(new URL(url).searchParams.get('recalcHrZones')).toBe('true')
    expect(JSON.parse(init.body as string)).toEqual({ ftp: 285, max_hr: 188 })
  })
})

describe('llms', () => {
  it('emits a full markdown reference', async () => {
    const program = buildProgram()
    let captured = ''
    const write = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string) => {
      captured += chunk
      return true
    }) as typeof process.stdout.write
    try {
      await program.parseAsync(['node', 'intervals', 'llms'])
    } finally {
      process.stdout.write = write
    }
    expect(captured).toContain('## intervals activities list')
    expect(captured).toContain('## intervals events create')
    expect(captured).toContain('intervals config verify')
  })
})
