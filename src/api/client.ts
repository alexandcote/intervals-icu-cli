import { CliError } from '../lib/errors.js'
import { requireApiKey, type ResolvedConfig } from '../lib/config.js'

export type QueryValue = string | number | boolean | string[] | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, QueryValue>
  body?: unknown
  timeoutMs?: number
}

const MAX_RATE_LIMIT_RETRIES = 2
const RETRY_AFTER_CAP_SECS = 60

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(baseUrl + path)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue
    // The API expects comma-separated lists, not repeated params.
    url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  return url.toString()
}

interface ApiErrorBody {
  status?: number
  error?: string
  message?: string
}

function apiMessage(status: number, bodyText: string): string {
  try {
    const body = JSON.parse(bodyText) as ApiErrorBody
    const parts = [body.error, body.message].filter((p): p is string => typeof p === 'string' && p.length > 0)
    if (parts.length > 0) return parts.join(': ')
  } catch {
    // non-JSON body; fall through
  }
  return bodyText.slice(0, 300) || `HTTP ${status}`
}

function toCliError(status: number, bodyText: string, url: string): CliError {
  const message = apiMessage(status, bodyText)
  if (status === 401) {
    return new CliError(
      'AUTH_FAILED',
      `intervals.icu rejected the API key: ${message}`,
      'Check INTERVALS_API_KEY or run: intervals config set api_key <key>. Keys: https://intervals.icu/settings',
      status,
    )
  }
  if (status === 403) {
    return new CliError(
      'FORBIDDEN',
      `Access denied: ${message}`,
      'Your key may not have access to this athlete. Check --athlete / INTERVALS_ATHLETE_ID.',
      status,
    )
  }
  if (status === 404) {
    return new CliError('NOT_FOUND', `Not found: ${message}`, `Check the id in ${url}.`, status)
  }
  if (status === 422 || status === 400) {
    return new CliError('INVALID_INPUT', `intervals.icu rejected the request: ${message}`, 'Check the flag values; see --help for accepted formats.', status)
  }
  return new CliError('API_ERROR', `intervals.icu returned HTTP ${status}: ${message}`, 'Retry later; if it persists check https://status.intervals.icu or the forum.', status)
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export class ApiClient {
  constructor(
    private readonly config: ResolvedConfig,
    private readonly defaultTimeoutMs = 30_000,
  ) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET'
    const url = buildUrl(this.config.baseUrl, path, options.query)
    const apiKey = requireApiKey(this.config)
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs
    const headers: Record<string, string> = {
      Authorization: 'Basic ' + Buffer.from(`API_KEY:${apiKey}`).toString('base64'),
      Accept: 'application/json',
    }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'

    let rateLimitRetries = 0
    let transientRetried = false

    for (;;) {
      let response: Response
      try {
        response = await fetch(url, {
          method,
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'TimeoutError') {
          throw new CliError('TIMEOUT', `Request timed out after ${timeoutMs}ms: ${method} ${url}`, 'Increase --timeout or retry.')
        }
        if (method === 'GET' && !transientRetried) {
          transientRetried = true
          await sleep(500)
          continue
        }
        const message = err instanceof Error ? err.message : String(err)
        throw new CliError('NETWORK_ERROR', `Network error calling intervals.icu: ${message}`, 'Check connectivity and retry.')
      }

      if (response.status === 429) {
        const raw = response.headers.get('Retry-After')
        const parsed = raw === null ? NaN : Number(raw)
        const retryAfter = Math.min(Number.isNaN(parsed) ? 5 : Math.max(parsed, 0), RETRY_AFTER_CAP_SECS)
        if (rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
          rateLimitRetries += 1
          await sleep(retryAfter * 1000)
          continue
        }
        throw new CliError(
          'RATE_LIMITED',
          'intervals.icu rate limit exceeded (HTTP 429)',
          `Wait ${retryAfter}s before retrying.`,
          429,
        )
      }

      if (response.status >= 500 && method === 'GET' && !transientRetried) {
        transientRetried = true
        await sleep(500)
        continue
      }

      const text = await response.text()
      if (!response.ok) throw toCliError(response.status, text, url)
      if (text === '') return undefined as T
      try {
        return JSON.parse(text) as T
      } catch {
        // A few endpoints return plain text/CSV.
        return text as T
      }
    }
  }
}
