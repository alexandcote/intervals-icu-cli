import { Command, Option } from 'commander'
import { getContext } from '../lib/context.js'
import { emit } from '../lib/output.js'
import { DATE_HELP, parseDistance, parseDuration, resolveDate } from '../lib/dates.js'
import { DEFAULT_FIELDS } from '../lib/fields.js'
import { buildBody } from '../lib/body.js'
import { downsampleEvery, downsamplePoints, streamStats, type Stream } from '../lib/streams.js'
import { addBodyOptions, addCommonOptions, addExamples, positiveInt, numeric, type BodyFlags } from '../lib/flags.js'
import { CliError } from '../lib/errors.js'

/** Server-side `fields` only understands top-level names; dot paths trim client-side. */
function splitFieldSelection(fields: string | undefined): { server?: string[]; client?: string } {
  if (!fields) return {}
  if (fields.includes('.')) return { client: fields }
  return { server: fields.split(',').map((f) => f.trim()) }
}

export function activitiesCommand(): Command {
  const cmd = new Command('activities').description('Recorded activities: list, inspect, analyze curves and streams')

  addExamples(
    addCommonOptions(
      cmd
        .command('list')
        .description(`List activities for a date range, newest first. ${DATE_HELP}`)
        .option('--oldest <date>', 'start of range (default -30d)', '-30d')
        .option('--newest <date>', 'end of range (default now)')
        .option('--limit <n>', 'max activities to return (default 30)', positiveInt, 30)
        .option('--fields <a,b,c>', 'fields to return (default: a compact summary set; see --help)')
        .option('--route-id <n>', 'only activities on this route', positiveInt)
        .option('--full', 'return complete activity objects (~174 fields each — large)')
        .action(async (opts: { oldest: string; newest?: string; limit: number; fields?: string; routeId?: number; full?: boolean }, command: Command) => {
          const ctx = getContext(command)
          const selection = splitFieldSelection(opts.full ? undefined : (opts.fields ?? DEFAULT_FIELDS.activityList))
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/activities`, {
            query: {
              oldest: resolveDate(opts.oldest),
              newest: opts.newest ? resolveDate(opts.newest) : undefined,
              limit: opts.limit,
              fields: selection.server,
              route_id: opts.routeId,
            },
          })
          emit(data, { pretty: ctx.pretty, fields: selection.client })
        }),
    ),
    ['icu activities list', 'icu activities list --oldest -7d --limit 10', 'icu activities list --oldest 2026-06-01 --newest 2026-06-30 --fields id,name,type,distance'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('get')
        .description('Get one activity; trimmed to a summary by default, --full for all ~174 fields')
        .argument('<id>', 'activity id, e.g. i81960531')
        .option('--intervals', 'include interval data')
        .option('--fields <a,b,c>', 'fields to return (dot paths allowed)')
        .option('--full', 'return the complete activity object')
        .action(async (id: string, opts: { intervals?: boolean; fields?: string; full?: boolean }, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/activity/${id}`, { query: { intervals: opts.intervals } })
          const fields = opts.full ? undefined : (opts.fields ?? DEFAULT_FIELDS.activityDetail.join(','))
          emit(data, { pretty: ctx.pretty, fields })
        }),
    ),
    ['icu activities get i81960531', 'icu activities get i81960531 --intervals', 'icu activities get i81960531 --fields id,name,icu_zone_times'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('search')
        .description('Search activities by name (case-insensitive) or exact #tag')
        .argument('<query>', 'search text or #tag')
        .option('--limit <n>', 'max results', positiveInt, 20)
        .option('--full', 'return full activity objects instead of summaries')
        .action(async (query: string, opts: { limit: number; full?: boolean }, command: Command) => {
          const ctx = getContext(command)
          const path = opts.full ? `/athlete/${ctx.athleteId}/activities/search-full` : `/athlete/${ctx.athleteId}/activities/search`
          emit(await ctx.client.request(path, { query: { q: query, limit: opts.limit } }), { pretty: ctx.pretty })
        }),
    ),
    ['icu activities search "sweet spot"', 'icu activities search "#race" --limit 5'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('intervals')
        .description('Get the intervals (laps/work periods) detected or set in an activity')
        .argument('<id>', 'activity id')
        .action(async (id: string, _opts: unknown, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/activity/${id}/intervals`), { pretty: ctx.pretty })
        }),
    ),
    ['icu activities intervals i81960531'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('streams')
        .description('Get raw data streams. --types is required to keep output manageable; downsample with --every/--points or summarize with --stats')
        .argument('<id>', 'activity id')
        .requiredOption('--types <a,b,c>', 'streams to fetch: time, watts, heartrate, cadence, velocity_smooth, distance, altitude, temp, latlng, torque, ...')
        .option('--include-defaults', 'also include the default streams')
        .option('--every <sec>', 'keep one point per N seconds (needs the time stream for accuracy)', positiveInt)
        .option('--points <n>', 'keep at most N evenly spaced points per stream', positiveInt)
        .option('--stats', 'return only {type, count, min, max, avg} per stream — no raw points')
        .action(
          async (
            id: string,
            opts: { types: string; includeDefaults?: boolean; every?: number; points?: number; stats?: boolean },
            command: Command,
          ) => {
            const ctx = getContext(command)
            if (opts.every && opts.points) {
              throw new CliError('INVALID_INPUT', '--every and --points are mutually exclusive', 'Pick one downsampling strategy.')
            }
            let streams = await ctx.client.request<Stream[]>(`/activity/${id}/streams`, {
              query: { types: opts.types.split(','), includeDefaults: opts.includeDefaults },
            })
            if (opts.stats) {
              emit(streamStats(streams), { pretty: ctx.pretty })
              return
            }
            if (opts.every) streams = downsampleEvery(streams, opts.every)
            if (opts.points) streams = downsamplePoints(streams, opts.points)
            emit(streams, { pretty: ctx.pretty })
          },
        ),
    ),
    [
      'icu activities streams i81960531 --types watts,heartrate --stats',
      'icu activities streams i81960531 --types time,watts --every 60',
      'icu activities streams i81960531 --types time,heartrate --points 200',
    ],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('power-curve')
        .description("Get the activity's best-power-vs-duration curve")
        .argument('<id>', 'activity id')
        .addOption(new Option('--fatigue <kind>', 'use a fatigued power curve').choices(['kj0', 'kj1']))
        .action(async (id: string, opts: { fatigue?: string }, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/activity/${id}/power-curve`, { query: { fatigue: opts.fatigue } }), { pretty: ctx.pretty })
        }),
    ),
    ['icu activities power-curve i81960531'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('pace-curve')
        .description("Get the activity's best-pace-vs-distance curve")
        .argument('<id>', 'activity id')
        .option('--gap', 'use gradient adjusted pace')
        .action(async (id: string, opts: { gap?: boolean }, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/activity/${id}/pace-curve`, { query: { gap: opts.gap } }), { pretty: ctx.pretty })
        }),
    ),
    ['icu activities pace-curve i81960531 --gap'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('hr-curve')
        .description("Get the activity's best-heart-rate-vs-duration curve")
        .argument('<id>', 'activity id')
        .action(async (id: string, _opts: unknown, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/activity/${id}/hr-curve`), { pretty: ctx.pretty })
        }),
    ),
    ['icu activities hr-curve i81960531'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('best-efforts')
        .description('Find best efforts in an activity for a stream, by duration or distance')
        .argument('<id>', 'activity id')
        .requiredOption('--stream <name>', 'stream to search, e.g. watts, heartrate, velocity_smooth')
        .option('--duration <d>', 'effort duration: seconds or 1h30m/20m/90s form')
        .option('--distance <d>', 'effort distance: meters or km form (5km)')
        .option('--count <n>', 'number of efforts to return (default 8)', positiveInt)
        .option('--min-value <v>', 'minimum average value per effort', numeric)
        .option('--exclude-intervals', 'skip portions already inside work intervals')
        .action(
          async (
            id: string,
            opts: { stream: string; duration?: string; distance?: string; count?: number; minValue?: number; excludeIntervals?: boolean },
            command: Command,
          ) => {
            const ctx = getContext(command)
            emit(
              await ctx.client.request(`/activity/${id}/best-efforts`, {
                query: {
                  stream: opts.stream,
                  duration: opts.duration ? parseDuration(opts.duration) : undefined,
                  distance: opts.distance ? parseDistance(opts.distance) : undefined,
                  count: opts.count,
                  minValue: opts.minValue,
                  excludeIntervals: opts.excludeIntervals,
                },
              }),
              { pretty: ctx.pretty },
            )
          },
        ),
    ),
    ['icu activities best-efforts i81960531 --stream watts --duration 20m', 'icu activities best-efforts i81960531 --stream velocity_smooth --distance 5km --count 3'],
  )

  addExamples(
    addBodyOptions(
      addCommonOptions(
        cmd
          .command('update')
          .description('Update activity fields (name, description, type, feel, perceived_exertion, ...)')
          .argument('<id>', 'activity id')
          .option('--name <text>', 'activity name')
          .option('--description <text>', 'activity description')
          .option('--type <type>', 'activity type, e.g. Ride, Run, Swim')
          .action(async (id: string, opts: BodyFlags & { name?: string; description?: string; type?: string }, command: Command) => {
            const ctx = getContext(command)
            const base: Record<string, unknown> = {}
            if (opts.name !== undefined) base.name = opts.name
            if (opts.description !== undefined) base.description = opts.description
            if (opts.type !== undefined) base.type = opts.type
            const body = buildBody(opts.set, opts.data, { base })
            const data = await ctx.client.request(`/activity/${id}`, { method: 'PUT', body })
            emit(data, { pretty: ctx.pretty, fields: DEFAULT_FIELDS.activityDetail.join(',') })
          }),
      ),
    ),
    ['icu activities update i81960531 --name "Morning intervals"', 'icu activities update i81960531 --set feel=3 --set perceived_exertion=7'],
  )

  return cmd
}
