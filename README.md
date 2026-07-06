# intervals-icu-cli

[![npm](https://img.shields.io/npm/v/intervals-icu-cli)](https://www.npmjs.com/package/intervals-icu-cli)
[![CI](https://github.com/alexandcote/intervals-icu-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/alexandcote/intervals-icu-cli/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**LLM-first CLI for the [intervals.icu](https://intervals.icu) API** — training data, wellness and workout planning as compact, token-thrifty JSON.

Built as a lightweight alternative to running an MCP server: no server process, no transport config — any agent that can run a shell command (Claude Code, Codex, a cron script, you) gets the full intervals.icu API through 40 predictable commands.

```sh
npx intervals-icu-cli config verify
```

## Why a CLI instead of an MCP server?

- **Zero infrastructure** — `npx` and an API key. Nothing to keep running, nothing to reconnect.
- **Token economy by design** — activity objects have ~174 fields; the CLI trims responses to curated summaries, strips nulls, and pushes field selection to the server. A 20,000-point power stream becomes `--stats` (min/max/avg) or a downsampled curve, never a context-window flood.
- **Self-describing** — `intervals llms` prints the entire command reference as one markdown document; every command has `--help` with real examples. An agent learns the whole surface in one call.
- **Structured failures** — errors are JSON on stderr with a `hint` that says what to do next, plus distinct exit codes. Agents recover instead of guessing.

## Setup

1. Get your API key from [intervals.icu → Settings → Developer Settings](https://intervals.icu/settings).
2. Provide it either way:

```sh
export INTERVALS_API_KEY=your-key        # environment variable, or:
intervals config set api_key your-key          # ~/.config/intervals-cli/config.json (chmod 600)
intervals config verify                        # → {"ok":true,"athlete_id":"i12345","name":"..."}
```

The athlete defaults to the key's owner. Coaches can target someone else with `--athlete i67890` or `INTERVALS_ATHLETE_ID`. Precedence: flag > env > config file. The `API_KEY`/`ATHLETE_ID` env vars used by intervals-mcp-server also work, so migration is a rename away.

Install globally for the short binary name, or keep using `npx intervals-icu-cli`:

```sh
npm install -g intervals-icu-cli
intervals activities list --oldest -7d
```

## Using it from an LLM agent

```sh
intervals llms          # full command reference, one markdown document
intervals llms --json   # same, structured
```

For **Claude Code**, a ready-made skill ships in [`skills/intervals-icu/`](skills/intervals-icu/SKILL.md). It teaches the agent the core workflows — reading training data, logging wellness, planning structured workouts — plus the token-economy rules and destructive-command cautions:

```sh
cp -r skills/intervals-icu ~/.claude/skills/        # personal, all projects
cp -r skills/intervals-icu .claude/skills/          # or per-project
```

## Commands

| Group | Commands |
|---|---|
| `config` | `set` · `get` · `list` · `unset` · `path` · `verify` |
| `athlete` | `get` · `profile` · `update` |
| `activities` | `list` · `get` · `search` · `intervals` · `streams` · `power-curve` · `pace-curve` · `hr-curve` · `best-efforts` · `update` |
| `wellness` | `list` · `get` · `update` |
| `events` | `list` · `get` · `create` · `update` · `delete` · `delete-range` |
| `sport-settings` | `list` · `get` · `update` |
| `folders` | `list` · `create` · `update` · `delete` |
| `workouts` | `list` · `get` · `create` · `update` · `delete` |
| `llms` | print the full reference |

## Examples

```sh
# Last week's training as compact summaries
intervals activities list --oldest -7d

# Fitness trend: CTL (fitness), ATL (fatigue), HRV over 30 days
intervals wellness list --oldest -30d --fields id,ctl,atl,restingHR,hrv

# One activity, zone times only
intervals activities get i81960531 --fields id,name,icu_zone_times,icu_hr_zone_times

# Power + HR summarized instead of 20k raw points
intervals activities streams i81960531 --types watts,heartrate --stats

# Best 20-minute power in a ride
intervals activities best-efforts i81960531 --stream watts --duration 20m

# Log this morning's wellness (scales: 1 = best/none … 4 = worst)
intervals wellness update today --weight 71.5 --resting-hr 48 --hrv 92 --sleep-secs 27000

# Plan a structured workout — the server parses the step syntax
intervals events create --start tomorrow --name "VO2 intervals" --type Ride \
  --description '- 15m 60%
- 5x 3m 118% / 3m 50%
- 10m 55%'

# New FTP after a test
intervals sport-settings update Ride --ftp 285
```

## Input & output conventions

**Forgiving inputs**

- Dates: `2026-07-06`, `today`, `yesterday`, `tomorrow`, `now`, offsets `-7d` `-4w` `-3m` `-1y` `+2d`
- Durations: seconds or `1h30m` / `20m` / `90s` — distances: meters or `42.2km`
- Write bodies: `--set key=value` (repeatable, auto-coerced, dots nest, `key:=json` for arrays/objects) or `--data '{...}' | @file | @-`, with "did you mean `restingHR`?" typo hints

**Predictable output**

- Compact JSON on stdout; `--pretty` for humans
- Null fields stripped (`--nulls` keeps them); array elements never removed, so stream data stays positionally aligned
- `--fields a,b,c` selects exactly what you need (dot paths supported); `--full` returns everything
- 429s retried honoring `Retry-After`; GETs retried once on transient failures

**Errors** land on stderr as `{"error":{"code","message","hint"}}`:

| Exit | Meaning |
|---|---|
| 0 | success |
| 1 | API / network / timeout |
| 2 | usage or invalid input |
| 3 | auth failed or forbidden |
| 4 | not found |
| 5 | rate limited after retries |

## Development

```sh
pnpm install
pnpm test         # vitest (62 tests)
pnpm typecheck    # tsc --noEmit
pnpm build        # tsup → dist/index.js, single ESM bundle
node dist/index.js --help
```

Releases: tag `v*` and CI publishes to npm with provenance.

## License

MIT

*Not affiliated with intervals.icu. Be kind to the API — it's a one-person labor of love.*
