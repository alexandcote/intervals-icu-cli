import { Command, Option } from 'commander'
import { getContext } from '../lib/context.js'
import { emit } from '../lib/output.js'
import { DATE_HELP, parseDistance, parseDuration, resolveDate } from '../lib/dates.js'
import { buildBody } from '../lib/body.js'
import { addBodyOptions, addCommonOptions, addExamples, positiveInt, numeric, type BodyFlags } from '../lib/flags.js'

export const EVENT_CATEGORIES = [
  'WORKOUT', 'RACE_A', 'RACE_B', 'RACE_C', 'NOTE', 'PLAN', 'HOLIDAY', 'SICK', 'INJURED',
  'SET_EFTP', 'FITNESS_DAYS', 'SEASON_START', 'TARGET', 'SET_FITNESS',
] as const

const EVENT_FIELDS = [
  'name', 'description', 'category', 'start_date_local', 'end_date_local', 'type', 'sub_type', 'indoor',
  'color', 'load_target', 'time_target', 'distance_target', 'tags', 'external_id', 'calendar_id',
  'for_week', 'moving_time', 'icu_training_load', 'atl_days', 'ctl_days', 'show_as_note',
  'hide_from_athlete', 'carbs_per_hour', 'target', 'not_on_fitness_chart', 'show_on_ctl_line',
] as const

const WORKOUT_SYNTAX_HELP = `
Planned workout steps go in --description using intervals.icu workout syntax, e.g.:

  - 10m 60%
  - 4x 4m 105% / 3m 55%
  - 10m 55%

Percentages are of FTP for --type Ride; pace/HR workouts can use zones (Z2), bpm or pace.
The server parses the description into a structured workout automatically.`

function eventDateTime(input: string): string {
  const resolved = resolveDate(input)
  return resolved.includes('T') ? resolved : resolved + 'T00:00:00'
}

interface EventFlags extends BodyFlags {
  start?: string
  end?: string
  category?: string
  name?: string
  type?: string
  description?: string
  loadTarget?: number
  timeTarget?: string
  distanceTarget?: string
  tags?: string
  externalId?: string
}

function eventBase(opts: EventFlags): Record<string, unknown> {
  const base: Record<string, unknown> = {}
  if (opts.start !== undefined) base.start_date_local = eventDateTime(opts.start)
  if (opts.end !== undefined) base.end_date_local = eventDateTime(opts.end)
  if (opts.category !== undefined) base.category = opts.category
  if (opts.name !== undefined) base.name = opts.name
  if (opts.type !== undefined) base.type = opts.type
  if (opts.description !== undefined) base.description = opts.description
  if (opts.loadTarget !== undefined) base.load_target = opts.loadTarget
  if (opts.timeTarget !== undefined) base.time_target = parseDuration(opts.timeTarget)
  if (opts.distanceTarget !== undefined) base.distance_target = parseDistance(opts.distanceTarget)
  if (opts.tags !== undefined) base.tags = opts.tags.split(',').map((t) => t.trim())
  if (opts.externalId !== undefined) base.external_id = opts.externalId
  return base
}

function addEventFlags(cmd: Command): Command {
  return cmd
    .option('--name <text>', 'event name')
    .option('--type <type>', 'activity type: Ride, Run, Swim, WeightTraining, ...')
    .option('--description <text>', 'description; for WORKOUT events this holds the workout steps (see --help)')
    .option('--end <date>', 'end date (multi-day events)')
    .option('--load-target <n>', 'training load target', numeric)
    .option('--time-target <d>', 'time target: seconds or 1h30m form')
    .option('--distance-target <d>', 'distance target: meters or km form (80km)')
    .option('--tags <a,b>', 'comma-separated tags')
    .option('--external-id <id>', 'your identifier for upserts and later bulk deletes')
}

export function eventsCommand(): Command {
  const cmd = new Command('events').description('Calendar events: planned workouts, races, notes')

  addExamples(
    addCommonOptions(
      cmd
        .command('list')
        .description(`List calendar events. Server defaults: oldest=today, newest=oldest+6d. ${DATE_HELP}`)
        .option('--oldest <date>', 'start of range')
        .option('--newest <date>', 'end of range, inclusive')
        .option('--category <a,b>', `filter categories: ${EVENT_CATEGORIES.join(', ')}`)
        .option('--limit <n>', 'max events', positiveInt)
        .option('--resolve', 'resolve workout targets to absolute watts/bpm/pace')
        .option('--fields <a,b,c>', 'fields to return (dot paths allowed)')
        .action(async (opts: { oldest?: string; newest?: string; category?: string; limit?: number; resolve?: boolean; fields?: string }, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/events`, {
            query: {
              oldest: opts.oldest ? resolveDate(opts.oldest) : undefined,
              newest: opts.newest ? resolveDate(opts.newest) : undefined,
              category: opts.category ? opts.category.split(',').map((c) => c.trim().toUpperCase()) : undefined,
              limit: opts.limit,
              resolve: opts.resolve,
            },
          })
          emit(data, { pretty: ctx.pretty, fields: opts.fields })
        }),
    ),
    ['icu events list', 'icu events list --oldest today --newest +14d --category WORKOUT', 'icu events list --oldest -7d --newest today --fields id,start_date_local,category,name'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('get')
        .description('Get one calendar event')
        .argument('<eventId>', 'numeric event id')
        .action(async (eventId: string, _opts: unknown, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/athlete/${ctx.athleteId}/events/${eventId}`), { pretty: ctx.pretty })
        }),
    ),
    ['icu events get 123456'],
  )

  const create = addBodyOptions(
    addEventFlags(
      addCommonOptions(
        cmd
          .command('create')
          .description('Create a calendar event (planned workout, race, note). ' + DATE_HELP)
          .requiredOption('--start <date>', 'event date, e.g. tomorrow or 2026-07-10')
          .addOption(new Option('--category <cat>', 'event category').choices([...EVENT_CATEGORIES]).default('WORKOUT'))
          .option('--upsert-on-uid', 'update the event with a matching uid instead of creating a duplicate'),
      ),
    ),
  ).action(async (opts: EventFlags & { upsertOnUid?: boolean }, command: Command) => {
    const ctx = getContext(command)
    const body = buildBody(opts.set, opts.data, { base: eventBase(opts), knownFields: EVENT_FIELDS })
    emit(
      await ctx.client.request(`/athlete/${ctx.athleteId}/events`, {
        method: 'POST',
        query: { upsertOnUid: opts.upsertOnUid ?? false },
        body,
      }),
      { pretty: ctx.pretty },
    )
  })
  create.addHelpText('after', WORKOUT_SYNTAX_HELP)
  addExamples(create, [
    'icu events create --start tomorrow --name "Endurance ride" --type Ride --time-target 2h --load-target 120',
    `icu events create --start 2026-07-10 --name "VO2 intervals" --type Ride --description '- 15m 60%\\n- 5x 3m 118% / 3m 50%\\n- 10m 55%'`,
    'icu events create --start today --category NOTE --name "Travel day"',
  ])

  addExamples(
    addBodyOptions(
      addEventFlags(
        addCommonOptions(
          cmd
            .command('update')
            .description('Update a calendar event')
            .argument('<eventId>', 'numeric event id')
            .option('--start <date>', 'move the event to this date')
            .addOption(new Option('--category <cat>', 'event category').choices([...EVENT_CATEGORIES])),
        ),
      ),
    ).action(async (eventId: string, opts: EventFlags, command: Command) => {
      const ctx = getContext(command)
      const body = buildBody(opts.set, opts.data, { base: eventBase(opts), knownFields: EVENT_FIELDS })
      emit(await ctx.client.request(`/athlete/${ctx.athleteId}/events/${eventId}`, { method: 'PUT', body }), { pretty: ctx.pretty })
    }),
    ['icu events update 123456 --start +2d', 'icu events update 123456 --description "- 60m Z2"'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('delete')
        .description('Delete one calendar event')
        .argument('<eventId>', 'numeric event id')
        .option('--others', 'also delete events added at the same time (e.g. rest of an applied plan)')
        .option('--not-before <date>', 'with --others, keep events before this date')
        .action(async (eventId: string, opts: { others?: boolean; notBefore?: string }, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/events/${eventId}`, {
            method: 'DELETE',
            query: { others: opts.others, notBefore: opts.notBefore ? resolveDate(opts.notBefore) : undefined },
          })
          emit(data ?? { ok: true, deleted: Number(eventId) }, { pretty: ctx.pretty })
        }),
    ),
    ['icu events delete 123456'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('delete-range')
        .description('Bulk-delete events in a date range; --oldest and --category are required to make this deliberate')
        .requiredOption('--oldest <date>', 'oldest event date to delete')
        .option('--newest <date>', 'newest event date to delete, inclusive (default: oldest)')
        .requiredOption('--category <a,b>', `categories to delete: ${EVENT_CATEGORIES.join(', ')}`)
        .option('--created-by <athleteId>', 'only delete events created by this athlete')
        .action(async (opts: { oldest: string; newest?: string; category: string; createdBy?: string }, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/events`, {
            method: 'DELETE',
            query: {
              oldest: resolveDate(opts.oldest),
              newest: opts.newest ? resolveDate(opts.newest) : undefined,
              category: opts.category.split(',').map((c) => c.trim().toUpperCase()),
              createdById: opts.createdBy,
            },
          })
          emit(data ?? { ok: true }, { pretty: ctx.pretty })
        }),
    ),
    ['icu events delete-range --oldest today --newest +7d --category WORKOUT'],
  )

  return cmd
}
