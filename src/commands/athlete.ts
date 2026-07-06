import { Command } from 'commander'
import { getContext } from '../lib/context.js'
import { emit } from '../lib/output.js'
import { DEFAULT_FIELDS } from '../lib/fields.js'
import { buildBody } from '../lib/body.js'
import { addBodyOptions, addCommonOptions, addExamples, type BodyFlags } from '../lib/flags.js'

export function athleteCommand(): Command {
  const cmd = new Command('athlete').description('Athlete profile and settings')

  addExamples(
    addCommonOptions(
      cmd
        .command('get')
        .description('Get the athlete (includes sport settings); trimmed by default, --full for everything')
        .option('--fields <a,b,c>', 'comma-separated fields to return (dot paths allowed)')
        .option('--full', 'return the complete athlete object')
        .action(async (opts: { fields?: string; full?: boolean }, command: Command) => {
          const ctx = getContext(command)
          const athlete = await ctx.client.request(`/athlete/${ctx.athleteId}`)
          const fields = opts.full ? undefined : (opts.fields ?? DEFAULT_FIELDS.athlete.join(','))
          emit(athlete, { pretty: ctx.pretty, fields })
        }),
    ),
    ['intervals athlete get', 'intervals athlete get --fields id,name,sportSettings.types,sportSettings.ftp', 'intervals athlete get --full'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('profile')
        .description('Get athlete profile info (name, plan, follower counts)')
        .action(async (_opts: unknown, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/athlete/${ctx.athleteId}/profile`), { pretty: ctx.pretty })
        }),
    ),
    ['intervals athlete profile'],
  )

  addExamples(
    addBodyOptions(
      addCommonOptions(
        cmd
          .command('update')
          .description('Update athlete fields (weight, icu_resting_hr, timezone, ...)')
          .action(async (opts: BodyFlags, command: Command) => {
            const ctx = getContext(command)
            const body = buildBody(opts.set, opts.data)
            emit(await ctx.client.request(`/athlete/${ctx.athleteId}`, { method: 'PUT', body }), {
              pretty: ctx.pretty,
              fields: 'id,name,weight,icu_resting_hr,timezone',
            })
          }),
      ),
    ),
    ['intervals athlete update --set weight=71.5', 'intervals athlete update --set icu_resting_hr=48 --set timezone=America/Toronto'],
  )

  return cmd
}
