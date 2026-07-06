import { readFileSync, writeFileSync, mkdirSync, rmSync, chmodSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CliError } from './errors.js'

export interface FileConfig {
  api_key?: string
  athlete_id?: string
  base_url?: string
}

export const CONFIG_KEYS = ['api_key', 'athlete_id', 'base_url'] as const
export type ConfigKey = (typeof CONFIG_KEYS)[number]

export interface ResolvedConfig {
  apiKey: string | undefined
  athleteId: string
  baseUrl: string
}

export function configPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  const base = xdg && xdg.trim() !== '' ? xdg : join(homedir(), '.config')
  return join(base, 'intervals-cli', 'config.json')
}

export function readFileConfig(): FileConfig {
  const path = configPath()
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as FileConfig
  } catch {
    throw new CliError(
      'INVALID_INPUT',
      `Config file at ${path} is not valid JSON`,
      `Fix or remove it, then run: icu config set api_key <key>`,
    )
  }
}

export function writeFileConfig(config: FileConfig): void {
  const path = configPath()
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
  chmodSync(path, 0o600)
}

export function deleteFileConfig(): void {
  rmSync(configPath(), { force: true })
}

export interface ConfigOverrides {
  apiKey?: string
  athleteId?: string
  baseUrl?: string
}

/** Precedence: flag > env (INTERVALS_* then bare fallback) > config file > default. */
export function resolveConfig(overrides: ConfigOverrides = {}): ResolvedConfig {
  const file = readFileConfig()
  const env = process.env
  return {
    apiKey: overrides.apiKey ?? env.INTERVALS_API_KEY ?? env.API_KEY ?? file.api_key,
    athleteId: overrides.athleteId ?? env.INTERVALS_ATHLETE_ID ?? env.ATHLETE_ID ?? file.athlete_id ?? '0',
    baseUrl: (overrides.baseUrl ?? env.INTERVALS_BASE_URL ?? file.base_url ?? 'https://intervals.icu/api/v1').replace(/\/$/, ''),
  }
}

export function requireApiKey(config: ResolvedConfig): string {
  if (!config.apiKey) {
    throw new CliError(
      'AUTH_FAILED',
      'No API key configured',
      'Set INTERVALS_API_KEY or run: icu config set api_key <key>. Get a key at https://intervals.icu/settings (Developer Settings).',
    )
  }
  return config.apiKey
}
