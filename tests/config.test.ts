import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Command } from 'commander'
import { configCommand } from '../src/commands/config.js'
import { setStdoutWriter } from '../src/lib/output.js'

describe('config set', () => {
  let configHome: string
  let stdout: string[]

  beforeEach(async () => {
    configHome = await mkdtemp(join(tmpdir(), 'intervals-config-'))
    vi.stubEnv('XDG_CONFIG_HOME', configHome)
    stdout = []
    setStdoutWriter((line) => stdout.push(line))
  })

  afterEach(async () => {
    setStdoutWriter(null)
    vi.unstubAllEnvs()
    await rm(configHome, { recursive: true, force: true })
  })

  async function run(prompt: (message: string) => Promise<string>, ...args: string[]): Promise<void> {
    const program = new Command().exitOverride().addCommand(configCommand(prompt))
    await program.parseAsync(['node', 'test', 'config', 'set', ...args])
  }

  it('prompts for the API key and stores it with restricted permissions', async () => {
    const prompt = vi.fn().mockResolvedValue('  secret123  ')

    await run(prompt, 'api_key')

    expect(prompt).toHaveBeenCalledWith('Intervals.icu API key: ')
    const path = join(configHome, 'intervals-cli', 'config.json')
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ api_key: 'secret123' })
    expect((await stat(path)).mode & 0o777).toBe(0o600)
    expect(JSON.parse(stdout[0]!)).toEqual({ ok: true, api_key: '****t123' })
  })

  it('rejects an API key passed on the command line', async () => {
    const prompt = vi.fn()

    await expect(run(prompt, 'api_key', 'leaked-secret')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: expect.stringContaining('terminal history'),
    })
    expect(prompt).not.toHaveBeenCalled()
  })

  it('still requires positional values for non-secret settings', async () => {
    await expect(run(vi.fn(), 'athlete_id')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'No value provided for "athlete_id"',
    })
  })
})
