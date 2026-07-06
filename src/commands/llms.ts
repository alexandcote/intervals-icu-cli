import { Command } from 'commander'
import { emit } from '../lib/output.js'
import { getExamples } from '../lib/flags.js'

interface OptionRef {
  flags: string
  description: string
  required: boolean
  default?: unknown
  choices?: string[]
}

interface CommandRef {
  command: string
  description: string
  arguments: Array<{ name: string; description: string; required: boolean }>
  options: OptionRef[]
  examples: string[]
}

function collectLeaves(cmd: Command, prefix: string, out: CommandRef[]): void {
  for (const sub of cmd.commands) {
    const path = `${prefix} ${sub.name()}`.trim()
    if (sub.commands.length > 0) {
      collectLeaves(sub, path, out)
      continue
    }
    if (sub.name() === 'llms') continue
    out.push({
      command: path,
      description: sub.description(),
      arguments: sub.registeredArguments.map((arg) => ({
        name: arg.name(),
        description: arg.description,
        required: arg.required,
      })),
      options: sub.options
        .filter((o) => !o.hidden)
        .map((o) => {
          const ref: OptionRef = {
            flags: o.flags,
            description: o.description,
            required: o.mandatory,
          }
          if (o.defaultValue !== undefined) ref.default = o.defaultValue
          if (o.argChoices) ref.choices = o.argChoices
          return ref
        }),
      examples: getExamples(sub),
    })
  }
}

function toMarkdown(refs: CommandRef[], version: string): string {
  const lines: string[] = [
    '# intervals — intervals.icu CLI reference',
    '',
    `Version ${version}. All commands print compact JSON to stdout (add --pretty for indented).`,
    'Null fields are stripped from output to save tokens; add --nulls to keep them.',
    'Errors are JSON on stderr: {"error":{"code","message","hint"}} with exit codes:',
    '1 API/network, 2 usage/invalid input, 3 auth, 4 not found, 5 rate limited.',
    '',
    'Auth: set INTERVALS_API_KEY (key from https://intervals.icu/settings) or run `intervals config set api_key <key>`.',
    'Athlete defaults to the key owner; override with --athlete or INTERVALS_ATHLETE_ID.',
    'Run `intervals config verify` first to confirm setup.',
    '',
    'Dates accept ISO (2026-07-06), today, yesterday, tomorrow, now, or offsets: -7d, -4w, -3m, -1y, +2d.',
    'Durations accept seconds or 1h30m form. Distances accept meters or km (42.2km).',
    '',
  ]
  for (const ref of refs) {
    lines.push(`## intervals ${ref.command}`)
    lines.push('')
    lines.push(ref.description)
    if (ref.arguments.length > 0) {
      lines.push('')
      for (const arg of ref.arguments) {
        lines.push(`- \`<${arg.name}>\`${arg.required ? '' : ' (optional)'} — ${arg.description}`)
      }
    }
    if (ref.options.length > 0) {
      lines.push('')
      lines.push('Options:')
      for (const opt of ref.options) {
        const extras: string[] = []
        if (opt.required) extras.push('required')
        if (opt.default !== undefined) extras.push(`default: ${JSON.stringify(opt.default)}`)
        if (opt.choices) extras.push(`choices: ${opt.choices.join('|')}`)
        lines.push(`- \`${opt.flags}\` — ${opt.description}${extras.length > 0 ? ` (${extras.join('; ')})` : ''}`)
      }
    }
    if (ref.examples.length > 0) {
      lines.push('')
      lines.push('Examples:')
      lines.push('```')
      for (const example of ref.examples) lines.push(example)
      lines.push('```')
    }
    lines.push('')
  }
  return lines.join('\n')
}

export function llmsCommand(program: Command): Command {
  return new Command('llms')
    .description('Print the complete command reference in one shot (markdown; --json for structured)')
    .option('--json', 'emit the reference as structured JSON instead of markdown')
    .action((opts: { json?: boolean }) => {
      const refs: CommandRef[] = []
      collectLeaves(program, '', refs)
      if (opts.json) {
        emit({ name: 'intervals', version: program.version() ?? '', commands: refs })
      } else {
        process.stdout.write(toMarkdown(refs, program.version() ?? '') + '\n')
      }
    })
}
