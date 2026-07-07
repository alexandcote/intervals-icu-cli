import type { Command } from 'commander'
import { ApiClient } from '../api/client.js'
import { resolveConfig, type ResolvedConfig } from './config.js'
import { setKeepNulls } from './output.js'

export interface GlobalOptions {
  athlete?: string
  pretty?: boolean
  nulls?: boolean
  timeout?: number
  apiKey?: string
  baseUrl?: string
}

export interface CommandContext {
  client: ApiClient
  config: ResolvedConfig
  athleteId: string
  pretty: boolean
  /**
   * Resolve the athlete id to a concrete `i…` id. Most endpoints accept the
   * `0` self-alias, but a few (e.g. activity-power-curves) reject it, so this
   * swaps `0` for the real id via the profile endpoint, cached per context.
   */
  resolveAthleteId(): Promise<string>
}

/** Resolve global flags + env + config file into a ready-to-use API client. */
export function getContext(command: Command): CommandContext {
  const opts = command.optsWithGlobals<GlobalOptions>()
  setKeepNulls(opts.nulls ?? false)
  const config = resolveConfig({
    apiKey: opts.apiKey,
    athleteId: opts.athlete,
    baseUrl: opts.baseUrl,
  })
  const client = new ApiClient(config, opts.timeout)
  let resolvedId: string | undefined
  return {
    client,
    config,
    athleteId: config.athleteId,
    pretty: opts.pretty ?? false,
    async resolveAthleteId(): Promise<string> {
      if (config.athleteId !== '0') return config.athleteId
      if (resolvedId) return resolvedId
      const profile = await client.request<Record<string, unknown>>(`/athlete/${config.athleteId}/profile`)
      const athlete = (profile.athlete ?? profile) as Record<string, unknown>
      resolvedId = typeof athlete.id === 'string' ? athlete.id : String(athlete.id)
      return resolvedId
    },
  }
}
