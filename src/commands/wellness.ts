import { Command } from 'commander'
import { getContext } from '../lib/context.js'
import { emit } from '../lib/output.js'
import { DATE_HELP, resolveDate } from '../lib/dates.js'
import { buildBody } from '../lib/body.js'
import { addBodyOptions, addCommonOptions, addExamples, numeric, positiveInt, type BodyFlags } from '../lib/flags.js'

const WELLNESS_FIELDS = [
  'weight', 'restingHR', 'hrv', 'hrvSDNN', 'sleepSecs', 'sleepQuality', 'sleepScore', 'avgSleepingHR',
  'fatigue', 'soreness', 'stress', 'mood', 'motivation', 'injury', 'readiness',
  'steps', 'kcalConsumed', 'hydration', 'hydrationVolume', 'spO2', 'respiration', 'bloodGlucose',
  'systolic', 'diastolic', 'bodyFat', 'abdomen', 'vo2max', 'lactate', 'menstrualPhase', 'comments',
  'carbohydrates', 'protein', 'fatTotal', 'atl', 'ctl',
] as const

interface WellnessUpdateFlags extends BodyFlags {
  weight?: number
  restingHr?: number
  hrv?: number
  sleepSecs?: number
  sleepQuality?: number
  fatigue?: number
  soreness?: number
  stress?: number
  mood?: number
  motivation?: number
  steps?: number
}

export function wellnessCommand(): Command {
  const cmd = new Command('wellness').description('Daily wellness records: weight, HRV, sleep, fatigue, mood, ...')

  addExamples(
    addCommonOptions(
      cmd
        .command('list')
        .description(`List wellness records for a date range. ${DATE_HELP}`)
        .option('--oldest <date>', 'start of range (default -30d)', '-30d')
        .option('--newest <date>', 'end of range, inclusive (default today)')
        .option('--fields <a,b,c>', 'fields to return, e.g. id,weight,restingHR,hrv (id is the date)')
        .option('--limit <n>', 'max records to return', positiveInt)
        .action(async (opts: { oldest: string; newest?: string; fields?: string; limit?: number }, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/wellness`, {
            query: {
              oldest: resolveDate(opts.oldest),
              newest: opts.newest ? resolveDate(opts.newest) : undefined,
              fields: opts.fields && !opts.fields.includes('.') ? opts.fields.split(',') : undefined,
            },
          })
          emit(data, { pretty: ctx.pretty, limit: opts.limit, fields: opts.fields?.includes('.') ? opts.fields : undefined })
        }),
    ),
    ['intervals wellness list --oldest -7d', 'intervals wellness list --oldest -90d --fields id,weight,restingHR,hrv,sleepSecs'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('get')
        .description('Get the wellness record for one day')
        .argument('<date>', 'ISO date or today/yesterday/-1d')
        .option('--fields <a,b,c>', 'fields to return, e.g. id,ctl,atl,restingHR,hrv')
        .action(async (date: string, opts: { fields?: string }, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/athlete/${ctx.athleteId}/wellness/${resolveDate(date)}`), {
            pretty: ctx.pretty,
            fields: opts.fields,
          })
        }),
    ),
    ['intervals wellness get today', 'intervals wellness get today --fields id,ctl,atl,restingHR,hrv'],
  )

  addExamples(
    addBodyOptions(
      addCommonOptions(
        cmd
          .command('update')
          .description('Update the wellness record for a day. Scales: sleepQuality/fatigue/soreness/stress/mood/motivation are 1 (best/none) to 4 (worst)')
          .argument('<date>', 'ISO date or today/yesterday/-1d')
          .option('--weight <kg>', 'weight in kg', numeric)
          .option('--resting-hr <bpm>', 'resting heart rate', numeric)
          .option('--hrv <ms>', 'HRV (rMSSD)', numeric)
          .option('--sleep-secs <s>', 'sleep duration in seconds', numeric)
          .option('--sleep-quality <1-4>', 'sleep quality (1 great .. 4 terrible)', numeric)
          .option('--fatigue <1-4>', 'fatigue (1 none .. 4 severe)', numeric)
          .option('--soreness <1-4>', 'soreness (1 none .. 4 severe)', numeric)
          .option('--stress <1-4>', 'stress (1 none .. 4 severe)', numeric)
          .option('--mood <1-4>', 'mood (1 great .. 4 terrible)', numeric)
          .option('--motivation <1-4>', 'motivation (1 high .. 4 none)', numeric)
          .option('--steps <n>', 'step count', numeric)
          .action(async (date: string, opts: WellnessUpdateFlags, command: Command) => {
            const ctx = getContext(command)
            const base: Record<string, unknown> = {}
            const map: Array<[keyof WellnessUpdateFlags, string]> = [
              ['weight', 'weight'],
              ['restingHr', 'restingHR'],
              ['hrv', 'hrv'],
              ['sleepSecs', 'sleepSecs'],
              ['sleepQuality', 'sleepQuality'],
              ['fatigue', 'fatigue'],
              ['soreness', 'soreness'],
              ['stress', 'stress'],
              ['mood', 'mood'],
              ['motivation', 'motivation'],
              ['steps', 'steps'],
            ]
            for (const [flag, field] of map) {
              if (opts[flag] !== undefined) base[field] = opts[flag]
            }
            const body = buildBody(opts.set, opts.data, { base, knownFields: WELLNESS_FIELDS })
            emit(await ctx.client.request(`/athlete/${ctx.athleteId}/wellness/${resolveDate(date)}`, { method: 'PUT', body }), {
              pretty: ctx.pretty,
            })
          }),
      ),
    ),
    [
      'intervals wellness update today --weight 71.5 --resting-hr 48 --hrv 92',
      'intervals wellness update yesterday --sleep-secs 27000 --sleep-quality 2',
      'intervals wellness update today --set spO2=97 --set comments="felt strong"',
    ],
  )

  return cmd
}
