import { CommanderError } from 'commander'
import { buildProgram } from './program.js'
import { CliError, formatError } from './lib/errors.js'

const program = buildProgram()

try {
  await program.parseAsync(process.argv)
} catch (err) {
  if (err instanceof CommanderError) {
    // Help and --version exit cleanly; commander already wrote to stdout.
    if (err.exitCode === 0) {
      process.exitCode = 0
    } else {
      const usage = new CliError('USAGE_ERROR', err.message.replace(/^error:\s*/, '').trim(), 'Run the command with --help to see usage and examples.')
      const { json, exitCode } = formatError(usage)
      process.stderr.write(json + '\n')
      process.exitCode = exitCode
    }
  } else {
    const { json, exitCode } = formatError(err)
    process.stderr.write(json + '\n')
    process.exitCode = exitCode
  }
}
