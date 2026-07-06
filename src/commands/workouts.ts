import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { Command } from 'commander'
import { getContext } from '../lib/context.js'
import { emit } from '../lib/output.js'
import { buildBody } from '../lib/body.js'
import { CliError } from '../lib/errors.js'
import { addBodyOptions, addCommonOptions, addExamples, positiveInt, type BodyFlags } from '../lib/flags.js'

const WORKOUT_LIST_FIELDS = 'id,name,type,folder_id,day,moving_time,icu_training_load,tags'

interface WorkoutFlags extends BodyFlags {
  name?: string
  type?: string
  description?: string
  folderId?: number
  day?: number
  file?: string
}

function workoutBase(opts: WorkoutFlags): Record<string, unknown> {
  const base: Record<string, unknown> = {}
  if (opts.name !== undefined) base.name = opts.name
  if (opts.type !== undefined) base.type = opts.type
  if (opts.description !== undefined) base.description = opts.description
  if (opts.folderId !== undefined) base.folder_id = opts.folderId
  if (opts.day !== undefined) base.day = opts.day
  if (opts.file !== undefined) {
    let contents: Buffer
    try {
      contents = readFileSync(opts.file)
    } catch {
      throw new CliError('INVALID_INPUT', `Cannot read workout file ${opts.file}`, 'Pass an existing .zwo, .mrc, .erg or .fit file.')
    }
    base.filename = basename(opts.file)
    base.file_contents_base64 = contents.toString('base64')
  }
  return base
}

export function workoutsCommand(): Command {
  const cmd = new Command('workouts').description('Workout library entries (reusable structured workouts)')

  addExamples(
    addCommonOptions(
      cmd
        .command('list')
        .description('List all workouts in the library (summaries; use get for full details)')
        .option('--fields <a,b,c>', 'fields to return (default: ' + WORKOUT_LIST_FIELDS + ')')
        .option('--limit <n>', 'max workouts to return', positiveInt)
        .option('--full', 'return complete workout objects')
        .action(async (opts: { fields?: string; limit?: number; full?: boolean }, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/workouts`)
          const fields = opts.full ? undefined : (opts.fields ?? WORKOUT_LIST_FIELDS)
          emit(data, { pretty: ctx.pretty, fields, limit: opts.limit })
        }),
    ),
    ['intervals workouts list', 'intervals workouts list --fields id,name --limit 50'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('get')
        .description('Get one workout including its structured steps')
        .argument('<workoutId>', 'numeric workout id')
        .action(async (workoutId: string, _opts: unknown, command: Command) => {
          const ctx = getContext(command)
          emit(await ctx.client.request(`/athlete/${ctx.athleteId}/workouts/${workoutId}`), { pretty: ctx.pretty })
        }),
    ),
    ['intervals workouts get 98765'],
  )

  addExamples(
    addBodyOptions(
      addCommonOptions(
        cmd
          .command('create')
          .description('Create a workout in a folder or plan. Steps go in --description (workout syntax) or --file (.zwo/.mrc/.erg/.fit)')
          .requiredOption('--folder-id <id>', 'destination folder or plan id (see: intervals folders list)', positiveInt)
          .requiredOption('--name <name>', 'workout name')
          .option('--type <type>', 'activity type: Ride, Run, Swim, ... (default Ride)', 'Ride')
          .option('--description <text>', 'workout steps in intervals.icu workout syntax')
          .option('--day <n>', 'for plans: day number the workout falls on', positiveInt)
          .option('--file <path>', 'import from a .zwo, .mrc, .erg or .fit file'),
      ),
    ).action(async (opts: WorkoutFlags & { folderId: number; name: string }, command: Command) => {
      const ctx = getContext(command)
      const body = buildBody(opts.set, opts.data, { base: workoutBase(opts) })
      emit(await ctx.client.request(`/athlete/${ctx.athleteId}/workouts`, { method: 'POST', body }), { pretty: ctx.pretty })
    }),
    [
      `intervals workouts create --folder-id 4321 --name "2x20 sweet spot" --type Ride --description '- 15m 55%\\n- 2x 20m 90% / 5m 50%\\n- 10m 50%'`,
      'intervals workouts create --folder-id 4321 --name "Zwift crit" --file crit.zwo',
    ],
  )

  addExamples(
    addBodyOptions(
      addCommonOptions(
        cmd
          .command('update')
          .description('Update a workout')
          .argument('<workoutId>', 'numeric workout id')
          .option('--name <name>', 'new name')
          .option('--type <type>', 'activity type')
          .option('--description <text>', 'new workout steps')
          .option('--folder-id <id>', 'move to another folder', positiveInt)
          .option('--day <n>', 'for plans: day number', positiveInt),
      ),
    ).action(async (workoutId: string, opts: WorkoutFlags, command: Command) => {
      const ctx = getContext(command)
      const body = buildBody(opts.set, opts.data, { base: workoutBase(opts) })
      emit(await ctx.client.request(`/athlete/${ctx.athleteId}/workouts/${workoutId}`, { method: 'PUT', body }), { pretty: ctx.pretty })
    }),
    ['intervals workouts update 98765 --name "2x25 sweet spot"'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('delete')
        .description('Delete a workout from the library')
        .argument('<workoutId>', 'numeric workout id')
        .option('--others', 'also delete workouts added at the same time')
        .action(async (workoutId: string, opts: { others?: boolean }, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/workouts/${workoutId}`, {
            method: 'DELETE',
            query: { others: opts.others },
          })
          emit(data ?? { ok: true, deleted: Number(workoutId) }, { pretty: ctx.pretty })
        }),
    ),
    ['intervals workouts delete 98765'],
  )

  return cmd
}
