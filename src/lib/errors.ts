export type ErrorCode =
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'USAGE_ERROR'
  | 'INVALID_INPUT'
  | 'AUTH_FAILED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'

export const EXIT_CODES: Record<ErrorCode, number> = {
  API_ERROR: 1,
  NETWORK_ERROR: 1,
  TIMEOUT: 1,
  USAGE_ERROR: 2,
  INVALID_INPUT: 2,
  AUTH_FAILED: 3,
  FORBIDDEN: 3,
  NOT_FOUND: 4,
  RATE_LIMITED: 5,
}

export class CliError extends Error {
  readonly code: ErrorCode
  readonly hint: string
  readonly status?: number
  readonly exitCode: number

  constructor(code: ErrorCode, message: string, hint: string, status?: number) {
    super(message)
    this.name = 'CliError'
    this.code = code
    this.hint = hint
    this.status = status
    this.exitCode = EXIT_CODES[code]
  }
}

/** Serialize any thrown value to the stderr JSON error contract. */
export function formatError(err: unknown): { json: string; exitCode: number } {
  if (err instanceof CliError) {
    const body: Record<string, unknown> = {
      code: err.code,
      message: err.message,
      hint: err.hint,
    }
    if (err.status !== undefined) body.status = err.status
    return { json: JSON.stringify({ error: body }), exitCode: err.exitCode }
  }
  const message = err instanceof Error ? err.message : String(err)
  return {
    json: JSON.stringify({
      error: { code: 'API_ERROR', message, hint: 'Unexpected failure. Re-run with --pretty for readable output; report if it persists.' },
    }),
    exitCode: 1,
  }
}
