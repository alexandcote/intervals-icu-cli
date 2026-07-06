import { Command } from 'commander'
import { getContext } from '../lib/context.js'
import { emit } from '../lib/output.js'
import { buildBody } from '../lib/body.js'
import { addBodyOptions, addCommonOptions, addExamples, numeric, type BodyFlags } from '../lib/flags.js'

const SPORT_SETTINGS_FIELDS = [
  'ftp', 'indoor_ftp', 'lthr', 'max_hr', 'threshold_pace', 'w_prime', 'p_max',
  'power_zones', 'power_zone_names', 'hr_zones', 'hr_zone_names', 'pace_zones', 'pace_zone_names',
  'sweet_spot_min', 'sweet_spot_max', 'warmup_time', 'cooldown_time', 'types', 'pace_units',
  'hr_load_type', 'pace_load_type', 'default_gear_id', 'gap_model', 'best_effort_distances',
] as const

interface SportSettingsUpdateFlags extends BodyFlags {
  ftp?: number
  indoorFtp?: number
  lthr?: number
  maxHr?: number
  thresholdPace?: number
  wPrime?: number
  recalcHrZones?: boolean
}

export function sportSettingsCommand(): Command {
  const cmd = new Command('sport-settings').description('Per-sport zones and thresholds (FTP, LTHR, threshold pace)')

  addExamples(
    addCommonOptions(
      cmd
        .command('list')
        .description('List sport settings for all sports')
        .option('--fields <a,b,c>', 'fields to return, e.g. id,types,ftp,lthr,threshold_pace')
        .action(async (opts: { fields?: string }, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/athlete/${ctx.athleteId}/sport-settings`), { pretty: ctx.pretty, fields: opts.fields })
        }),
    ),
    ['intervals sport-settings list', 'intervals sport-settings list --fields id,types,ftp,lthr'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('get')
        .description('Get sport settings by numeric id or activity type name')
        .argument('<idOrType>', 'settings id or a type like Ride, Run, Swim')
        .action(async (idOrType: string, _opts: unknown, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/athlete/${ctx.athleteId}/sport-settings/${idOrType}`), { pretty: ctx.pretty })
        }),
    ),
    ['intervals sport-settings get Ride', 'intervals sport-settings get Run'],
  )

  addExamples(
    addBodyOptions(
      addCommonOptions(
        cmd
          .command('update')
          .description('Update sport settings (new FTP, LTHR, zones, ...)')
          .argument('<idOrType>', 'settings id or a type like Ride, Run, Swim')
          .option('--ftp <watts>', 'functional threshold power', numeric)
          .option('--indoor-ftp <watts>', 'indoor FTP', numeric)
          .option('--lthr <bpm>', 'lactate threshold heart rate', numeric)
          .option('--max-hr <bpm>', 'maximum heart rate', numeric)
          .option('--threshold-pace <m/s>', 'threshold pace in meters per second', numeric)
          .option('--w-prime <joules>', "W' anaerobic capacity", numeric)
          .option('--recalc-hr-zones', 'recalculate HR zones from lthr/max_hr after the update'),
      ),
    ).action(async (idOrType: string, opts: SportSettingsUpdateFlags, command: Command) => {
      const ctx = getContext(command)
      const base: Record<string, unknown> = {}
      if (opts.ftp !== undefined) base.ftp = opts.ftp
      if (opts.indoorFtp !== undefined) base.indoor_ftp = opts.indoorFtp
      if (opts.lthr !== undefined) base.lthr = opts.lthr
      if (opts.maxHr !== undefined) base.max_hr = opts.maxHr
      if (opts.thresholdPace !== undefined) base.threshold_pace = opts.thresholdPace
      if (opts.wPrime !== undefined) base.w_prime = opts.wPrime
      const body = buildBody(opts.set, opts.data, { base, knownFields: SPORT_SETTINGS_FIELDS })
      emit(
        await ctx.client.request(`/athlete/${ctx.athleteId}/sport-settings/${idOrType}`, {
          method: 'PUT',
          query: { recalcHrZones: opts.recalcHrZones ?? false },
          body,
        }),
        { pretty: ctx.pretty },
      )
    }),
    ['intervals sport-settings update Ride --ftp 285', 'intervals sport-settings update Run --lthr 168 --recalc-hr-zones'],
  )

  return cmd
}
