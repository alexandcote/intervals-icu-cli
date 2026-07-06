import { parseFieldList, pickFields } from './fields.js'

export interface OutputOptions {
  /** Pretty-print with 2-space indent (default: compact). */
  pretty?: boolean
  /** Comma-separated dot paths to keep (client-side trim). */
  fields?: string
  /** Truncate arrays to this many items (client-side). */
  limit?: number
  /** Keep null object fields (stripped by default to save tokens). */
  keepNulls?: boolean
}

let keepNullsDefault = false

/** Session-wide default for null stripping, set from the --nulls flag. */
export function setKeepNulls(value: boolean): void {
  keepNullsDefault = value
}

/**
 * Drop null/undefined object properties recursively. Array elements are kept
 * as-is (recursing into object items) — stream data arrays are positionally
 * aligned, so removing null entries would corrupt them.
 */
export function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value)) {
      if (v === null || v === undefined) continue
      out[key] = stripNulls(v)
    }
    return out
  }
  return value
}

export type StdoutWriter = (line: string) => void

let writer: StdoutWriter = (line) => {
  process.stdout.write(line + '\n')
}

/** Test seam: capture stdout without spawning a process. */
export function setStdoutWriter(w: StdoutWriter | null): void {
  writer = w ?? ((line) => process.stdout.write(line + '\n'))
}

export function emit(data: unknown, options: OutputOptions = {}): void {
  let out = data
  if (options.fields) {
    out = pickFields(out, parseFieldList(options.fields))
  }
  if (!(options.keepNulls ?? keepNullsDefault)) {
    out = stripNulls(out)
  }
  if (options.limit !== undefined && Array.isArray(out) && out.length > options.limit) {
    out = { _cli: { truncated: true, shown: options.limit, total: (data as unknown[]).length }, results: out.slice(0, options.limit) }
  }
  writer(JSON.stringify(out, null, options.pretty ? 2 : undefined))
}
