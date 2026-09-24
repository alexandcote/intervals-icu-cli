import { Command } from 'commander'
import {
  CONFIG_KEYS,
  configPath,
  readFileConfig,
  writeFileConfig,
  type ConfigKey,
} from '../lib/config.js'
import { CliError } from '../lib/errors.js'
import { getContext } from '../lib/context.js'
import { emit } from '../lib/output.js'
import { addCommonOptions, addExamples } from '../lib/flags.js'

function assertKey(key: string): ConfigKey {
  if (!(CONFIG_KEYS as readonly string[]).includes(key)) {
    throw new CliError('INVALID_INPUT', `Unknown config key "${key}"`, `Valid keys: ${CONFIG_KEYS.join(', ')}`)
  }
  return key as ConfigKey
}

function redact(value: string | undefined): string | undefined {
  if (!value) return value
  return value.length <= 4 ? '****' : '****' + value.slice(-4)
}

export function configCommand(): Command {
  const cmd = new Command('config').description('Manage stored credentials and defaults (file: ' + configPath() + ')')

  addExamples(
    addCommonOptions(
      cmd
        .command('set')
        .description('Store a value in the config file (keys: api_key, athlete_id, base_url)')
        .argument('<key>', 'one of: ' + CONFIG_KEYS.join(', '))
        .argument('<value>', 'the value to store')
        .action((key: string, value: string) => {
          const k = assertKey(key)
          const config = readFileConfig()
          config[k] = value
          writeFileConfig(config)
          emit({ ok: true, [k]: k === 'api_key' ? redact(value) : value })
        }),
    ),
    ['intervals config set api_key abc123xyz', 'intervals config set athlete_id i12345'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('get')
        .description('Print one config value (api_key is redacted)')
        .argument('<key>', 'one of: ' + CONFIG_KEYS.join(', '))
        .action((key: string) => {
          const k = assertKey(key)
          const config = readFileConfig()
          emit({ [k]: k === 'api_key' ? redact(config[k]) : (config[k] ?? null) })
        }),
    ),
    ['intervals config get athlete_id'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('list')
        .description('Print all stored config values (api_key is redacted)')
        .action(() => {
          const config = readFileConfig()
          emit({ ...config, api_key: redact(config.api_key) ?? null, path: configPath() })
        }),
    ),
    ['intervals config list'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('unset')
        .description('Remove a value from the config file')
        .argument('<key>', 'one of: ' + CONFIG_KEYS.join(', '))
        .action((key: string) => {
          const k = assertKey(key)
          const config = readFileConfig()
          delete config[k]
          writeFileConfig(config)
          emit({ ok: true, removed: k })
        }),
    ),
    ['intervals config unset base_url'],
  )

  addExamples(
    addCommonOptions(cmd.command('path').description('Print the config file path').action(() => {
      emit({ path: configPath() })
    })),
    ['intervals config path'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('verify')
        .description('Verify credentials by fetching the athlete profile — run this first to confirm setup')
        .action(async (_opts: unknown, command: Command) => {
          const ctx = getContext(command)
          const profile = await ctx.client.request<Record<string, unknown>>(`/athlete/${ctx.athleteId}/profile`)
          const athlete = (profile.athlete ?? profile) as Record<string, unknown>
          emit(
            {
              ok: true,
              athlete_id: athlete.id ?? ctx.athleteId,
              name: athlete.name ?? null,
            },
            { pretty: ctx.pretty },
          )
        }),
    ),
    ['intervals config verify', 'INTERVALS_API_KEY=abc intervals config verify'],
  )

  return cmd
}
