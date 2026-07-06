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
  return {
    client: new ApiClient(config, opts.timeout),
    config,
    athleteId: config.athleteId,
    pretty: opts.pretty ?? false,
  }
}
