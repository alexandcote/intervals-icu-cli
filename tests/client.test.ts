import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../src/api/client.js'
import { CliError } from '../src/lib/errors.js'
import type { ResolvedConfig } from '../src/lib/config.js'

const config: ResolvedConfig = {
  apiKey: 'secret123',
  athleteId: 'i12345',
  baseUrl: 'https://intervals.icu/api/v1',
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ApiClient', () => {
  it('sends Basic auth with API_KEY username and serializes query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient(config)
    await client.request('/athlete/i12345/activities', {
      query: { oldest: '2026-06-01', limit: 30, fields: ['id', 'name'], skip: undefined },
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://intervals.icu/api/v1/athlete/i12345/activities?oldest=2026-06-01&limit=30&fields=id%2Cname')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Basic ' + Buffer.from('API_KEY:secret123').toString('base64'))
    expect(init.method).toBe('GET')
  })

  it('throws AUTH_FAILED without an api key', async () => {
    const client = new ApiClient({ ...config, apiKey: undefined })
    await expect(client.request('/x')).rejects.toMatchObject({ code: 'AUTH_FAILED', exitCode: 3 })
  })

  it('maps 401/403/404/422 to typed errors', async () => {
    for (const [status, code, exitCode] of [
      [401, 'AUTH_FAILED', 3],
      [403, 'FORBIDDEN', 3],
      [404, 'NOT_FOUND', 4],
      [422, 'INVALID_INPUT', 2],
    ] as const) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status, error: 'boom' }, status)))
      const client = new ApiClient(config)
      const err = await client.request('/x').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(CliError)
      expect((err as CliError).code).toBe(code)
      expect((err as CliError).exitCode).toBe(exitCode)
      expect((err as CliError).message).toContain('boom')
    }
  })

  it('retries 429 honoring Retry-After then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'slow down' }, 429, { 'Retry-After': '0' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient(config)
    const result = await client.request<{ ok: boolean }>('/x')
    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives up on 429 after retries with RATE_LIMITED', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ error: 'slow down' }, 429, { 'Retry-After': '0' })))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient(config)
    await expect(client.request('/x')).rejects.toMatchObject({ code: 'RATE_LIMITED', exitCode: 5 })
    expect(fetchMock).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('retries GET once on 5xx then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('oops', { status: 502 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient(config)
    await expect(client.request('/x')).resolves.toEqual({ ok: true })
  })

  it('does not retry writes on 5xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('oops', { status: 502 }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient(config)
    await expect(client.request('/x', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'API_ERROR' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps timeouts to TIMEOUT', async () => {
    const timeoutError = new Error('The operation timed out')
    timeoutError.name = 'TimeoutError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError))

    const client = new ApiClient(config)
    await expect(client.request('/x', { method: 'POST' })).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  it('sends JSON bodies with content-type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient(config)
    await client.request('/x', { method: 'PUT', body: { weight: 71.5 } })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.body).toBe('{"weight":71.5}')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('returns undefined for empty responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })))
    const client = new ApiClient(config)
    await expect(client.request('/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
