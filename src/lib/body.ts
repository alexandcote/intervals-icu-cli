import { readFileSync } from 'node:fs'
import { CliError } from './errors.js'

/**
 * Build a JSON request body from --data (JSON string, @file, or @- for stdin)
 * plus repeated --set key=value flags. --set wins over --data.
 *
 * --set coercion: `key=value` auto-coerces numbers, true/false/null;
 * `key:=value` forces JSON.parse (arrays, objects, quoted strings);
 * dots in the key create nested objects.
 */
export function buildBody(
  sets: string[] | undefined,
  data: string | undefined,
  options: { base?: Record<string, unknown>; knownFields?: readonly string[]; warn?: (msg: string) => void } = {},
): Record<string, unknown> {
  const warn = options.warn ?? ((msg) => process.stderr.write(JSON.stringify({ warning: msg }) + '\n'))
  const body: Record<string, unknown> = { ...options.base }

  if (data !== undefined) {
    Object.assign(body, parseData(data))
  }

  for (const entry of sets ?? []) {
    const { path, value } = parseSet(entry)
    setPath(body, path, value)
  }

  if (options.knownFields) {
    for (const key of Object.keys(body)) {
      if (!options.knownFields.includes(key)) {
        const suggestion = closest(key, options.knownFields)
        warn(
          suggestion
            ? `Unknown field "${key}" (did you mean "${suggestion}"?) — sent to the API anyway`
            : `Unknown field "${key}" — sent to the API anyway`,
        )
      }
    }
  }

  return body
}

function parseData(data: string): Record<string, unknown> {
  let text = data
  if (data === '@-') {
    text = readFileSync(0, 'utf8')
  } else if (data.startsWith('@')) {
    try {
      text = readFileSync(data.slice(1), 'utf8')
    } catch {
      throw new CliError('INVALID_INPUT', `Cannot read file ${data.slice(1)}`, 'Pass --data @<path> with an existing file, or inline JSON.')
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new CliError('INVALID_INPUT', `--data is not valid JSON: ${text.slice(0, 120)}`, 'Pass a JSON object, e.g. --data \'{"name":"Ride"}\', or @file / @- for stdin.')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CliError('INVALID_INPUT', '--data must be a JSON object', 'Wrap values in an object, e.g. --data \'{"weight":71.5}\'.')
  }
  return parsed as Record<string, unknown>
}

function parseSet(entry: string): { path: string[]; value: unknown } {
  const jsonMatch = /^([^=]+):=([\s\S]*)$/.exec(entry)
  if (jsonMatch) {
    const key = jsonMatch[1]!.trim()
    try {
      return { path: key.split('.'), value: JSON.parse(jsonMatch[2]!) }
    } catch {
      throw new CliError('INVALID_INPUT', `--set ${key}:=... is not valid JSON`, `Use key:='[1,2]' / key:='"text"' for JSON values, or key=value for scalars.`)
    }
  }
  const eq = entry.indexOf('=')
  if (eq <= 0) {
    throw new CliError('INVALID_INPUT', `--set expects key=value, got "${entry}"`, 'Example: --set name="Long ride" --set indoor=true --set tags:=\'["z2"]\'')
  }
  const key = entry.slice(0, eq).trim()
  return { path: key.split('.'), value: coerce(entry.slice(eq + 1)) }
}

function coerce(raw: string): unknown {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  if (raw !== '' && !Number.isNaN(Number(raw))) return Number(raw)
  return raw
}

function setPath(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let target = obj
  for (const segment of path.slice(0, -1)) {
    const existing = target[segment]
    if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
      target[segment] = {}
    }
    target = target[segment] as Record<string, unknown>
  }
  target[path[path.length - 1]!] = value
}

/** Nearest known field within edit distance 2, for typo hints. */
function closest(key: string, known: readonly string[]): string | undefined {
  let best: string | undefined
  let bestDist = 3
  for (const candidate of known) {
    const dist = editDistance(key.toLowerCase(), candidate.toLowerCase())
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  return best
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  const prev = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]!
}
