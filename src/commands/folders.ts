import { Command, Option } from 'commander'
import { getContext } from '../lib/context.js'
import { emit } from '../lib/output.js'
import { DEFAULT_FIELDS } from '../lib/fields.js'
import { buildBody } from '../lib/body.js'
import { addBodyOptions, addCommonOptions, addExamples, type BodyFlags } from '../lib/flags.js'

export function foldersCommand(): Command {
  const cmd = new Command('folders').description('Workout library folders and training plans')

  addExamples(
    addCommonOptions(
      cmd
        .command('list')
        .description('List folders and plans (summaries; use `intervals workouts list` for the workouts inside)')
        .option('--fields <a,b,c>', 'fields to return')
        .option('--full', 'include everything, including nested workout children')
        .action(async (opts: { fields?: string; full?: boolean }, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/folders`)
          const fields = opts.full ? undefined : (opts.fields ?? DEFAULT_FIELDS.folderList.join(','))
          emit(data, { pretty: ctx.pretty, fields })
        }),
    ),
    ['intervals folders list', 'intervals folders list --full'],
  )

  addExamples(
    addBodyOptions(
      addCommonOptions(
        cmd
          .command('create')
          .description('Create a workout folder or a training plan')
          .requiredOption('--name <name>', 'folder or plan name')
          .addOption(new Option('--type <type>', 'FOLDER or PLAN').choices(['FOLDER', 'PLAN']).default('FOLDER'))
          .option('--description <text>', 'description'),
      ),
    ).action(async (opts: BodyFlags & { name: string; type: string; description?: string }, command: Command) => {
      const ctx = getContext(command)
      const base: Record<string, unknown> = { name: opts.name, type: opts.type }
      if (opts.description !== undefined) base.description = opts.description
      const body = buildBody(opts.set, opts.data, { base })
      emit(await ctx.client.request(`/athlete/${ctx.athleteId}/folders`, { method: 'POST', body }), { pretty: ctx.pretty })
    }),
    ['intervals folders create --name "Base season" --type PLAN', 'intervals folders create --name "VO2 workouts"'],
  )

  addExamples(
    addBodyOptions(
      addCommonOptions(
        cmd
          .command('update')
          .description('Update a folder or plan')
          .argument('<folderId>', 'numeric folder id')
          .option('--name <name>', 'new name')
          .option('--description <text>', 'new description'),
      ),
    ).action(async (folderId: string, opts: BodyFlags & { name?: string; description?: string }, command: Command) => {
      const ctx = getContext(command)
      const base: Record<string, unknown> = {}
      if (opts.name !== undefined) base.name = opts.name
      if (opts.description !== undefined) base.description = opts.description
      const body = buildBody(opts.set, opts.data, { base })
      emit(await ctx.client.request(`/athlete/${ctx.athleteId}/folders/${folderId}`, { method: 'PUT', body }), { pretty: ctx.pretty })
    }),
    ['intervals folders update 4321 --name "Build season"'],
  )

  addExamples(
    addCommonOptions(
      cmd
        .command('delete')
        .description('Delete a folder or plan — WARNING: also deletes all workouts inside it')
        .argument('<folderId>', 'numeric folder id')
        .action(async (folderId: string, _opts: unknown, command: Command) => {
          const ctx = getContext(command)
          const data = await ctx.client.request(`/athlete/${ctx.athleteId}/folders/${folderId}`, { method: 'DELETE' })
          emit(data ?? { ok: true, deleted: Number(folderId) }, { pretty: ctx.pretty })
        }),
    ),
    ['intervals folders delete 4321'],
  )

  return cmd
}
