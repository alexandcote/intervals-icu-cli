import { Command, InvalidArgumentError, Option } from 'commander'

export function collect(value: string, previous: string[]): string[] {
  return [...previous, value]
}

export function positiveInt(value: string): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw new InvalidArgumentError('expects a positive integer')
  }
  return n
}

export function numeric(value: string): number {
  const n = Number(value)
  if (Number.isNaN(n)) {
    throw new InvalidArgumentError('expects a number')
  }
  return n
}

/**
 * Register the flags shared by every leaf command. Registered per-leaf (not
 * only on the root) so `intervals activities list --pretty` works — LLMs append
 * flags at the end of the line.
 */
export function addCommonOptions(cmd: Command): Command {
  return cmd
    .option('--athlete <id>', 'athlete id (default "0" = owner of the API key)')
    .option('--pretty', 'pretty-print the JSON output')
    .option('--nulls', 'keep null fields in the output (stripped by default)')
    .option('--timeout <ms>', 'HTTP timeout in milliseconds (default 30000)', positiveInt)
    .addOption(new Option('--api-key <key>', 'intervals.icu API key (prefer INTERVALS_API_KEY)').hideHelp())
    .addOption(new Option('--base-url <url>', 'API base URL override').hideHelp())
}

/** Register --set/--data body-building flags for write commands. */
export function addBodyOptions(cmd: Command): Command {
  return cmd
    .option(
      '--set <key=value>',
      'set a body field (repeatable); key=value auto-coerces numbers/booleans/null, key:=json for arrays/objects, dots nest',
      collect,
      [] as string[],
    )
    .option('--data <json>', "full JSON body: inline ('{...}'), @file, or @- for stdin; --set overrides --data keys")
}

export interface BodyFlags {
  set: string[]
  data?: string
}

const EXAMPLES = Symbol.for('intervals.examples')

/** Attach examples to --help and stash them for the `llms` reference command. */
export function addExamples(cmd: Command, examples: string[]): Command {
  ;(cmd as unknown as Record<symbol, string[]>)[EXAMPLES] = examples
  return cmd.addHelpText('after', '\nExamples:\n' + examples.map((e) => '  $ ' + e).join('\n'))
}

export function getExamples(cmd: Command): string[] {
  return (cmd as unknown as Record<symbol, string[] | undefined>)[EXAMPLES] ?? []
}
