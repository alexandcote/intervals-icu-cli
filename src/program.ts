import { Command } from 'commander'
import { activitiesCommand } from './commands/activities.js'
import { athleteCommand } from './commands/athlete.js'
import { configCommand } from './commands/config.js'
import { eventsCommand } from './commands/events.js'
import { foldersCommand } from './commands/folders.js'
import { llmsCommand } from './commands/llms.js'
import { sportSettingsCommand } from './commands/sport-settings.js'
import { wellnessCommand } from './commands/wellness.js'
import { workoutsCommand } from './commands/workouts.js'

export const VERSION = '0.1.0'

export function buildProgram(): Command {
  const program = new Command('icu')
    .description(
      'CLI for the intervals.icu training platform, designed for LLM agents.\n' +
        'Compact JSON on stdout; JSON errors with hints on stderr.\n' +
        'Start with: icu config verify. Full reference: icu llms',
    )
    .version(VERSION)
    .exitOverride()
    .configureOutput({
      // Parse errors become structured JSON in the entry point; keep stderr clean here.
      writeErr: () => {},
    })

  program.addCommand(configCommand())
  program.addCommand(athleteCommand())
  program.addCommand(activitiesCommand())
  program.addCommand(wellnessCommand())
  program.addCommand(eventsCommand())
  program.addCommand(sportSettingsCommand())
  program.addCommand(foldersCommand())
  program.addCommand(workoutsCommand())
  program.addCommand(llmsCommand(program))

  for (const group of program.commands) {
    group.exitOverride()
    group.configureOutput({ writeErr: () => {} })
    for (const sub of group.commands) {
      sub.exitOverride()
      sub.configureOutput({ writeErr: () => {} })
    }
  }

  return program
}
