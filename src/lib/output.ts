import { parseFieldList, pickFields } from './fields.js'

export interface OutputOptions {
  /** Pretty-print with 2-space indent (default: compact). */
  pretty?: boolean
  /** Comma-separated dot paths to keep (client-side trim). */
  fields?: string
  /** Truncate arrays to this many items (client-side). */
  limit?: number
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
  if (options.limit !== undefined && Array.isArray(out) && out.length > options.limit) {
    out = { _cli: { truncated: true, shown: options.limit, total: (data as unknown[]).length }, results: out.slice(0, options.limit) }
  }
  writer(JSON.stringify(out, null, options.pretty ? 2 : undefined))
}
