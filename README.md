# intervals-icu-cli

An LLM-friendly command-line interface for the [intervals.icu](https://intervals.icu) training platform API — a lightweight alternative to running an MCP server. Every command prints compact JSON to stdout; errors are structured JSON on stderr with actionable hints and distinct exit codes.

```sh
npx intervals-icu-cli config verify
# or install globally and use the short binary name:
npm install -g intervals-icu-cli
icu activities list --oldest -7d
```

## Setup

1. Get your API key from [intervals.icu/settings](https://intervals.icu/settings) (Developer Settings).
2. Provide it via environment variable or the config file:

```sh
export INTERVALS_API_KEY=your-key        # env var, or:
icu config set api_key your-key          # stored in ~/.config/intervals-cli/config.json (0600)
icu config verify                        # confirms everything works
```

The athlete defaults to the owner of the API key. Coaches can target another athlete with `--athlete i12345` or `INTERVALS_ATHLETE_ID`. The `API_KEY` / `ATHLETE_ID` env vars used by intervals-mcp-server also work.

## Using it from an LLM agent

Point the agent at the CLI and let it discover the surface itself:

```sh
icu llms          # full command reference as one markdown document
icu llms --json   # same, structured
```

Design choices that matter for agents:

- **Compact JSON by default** — pipe-friendly, token-cheap; `--pretty` for humans.
- **Token economy** — list/detail responses are trimmed to a curated field set by default; `--fields a,b,c` (dot paths supported) selects exactly what you need, `--full` returns everything. Stream commands require `--types` and support `--every 60`, `--points 200`, or `--stats` so a 50,000-point ride never floods the context window.
- **Structured errors** — stderr gets `{"error":{"code","message","hint",...}}`; exit codes: `1` API/network, `2` usage/invalid input, `3` auth, `4` not found, `5` rate limited. The hint always says what to do next.
- **Forgiving inputs** — dates accept `today`, `yesterday`, `-7d`, `-4w`; durations accept `1h30m`; distances accept `42.2km`. Write commands accept `--set key=value` (auto-coerced, dots nest, `key:=json` for arrays) and `--data '{...}' | @file | @-`, with typo suggestions for unknown fields.
- **Retries built in** — 429s are retried honoring `Retry-After`; GETs retry once on transient failures.

## Command groups

| Group | Commands |
|---|---|
| `config` | `set` `get` `list` `unset` `path` `verify` |
| `athlete` | `get` `profile` `update` |
| `activities` | `list` `get` `search` `intervals` `streams` `power-curve` `pace-curve` `hr-curve` `best-efforts` `update` |
| `wellness` | `list` `get` `update` |
| `events` | `list` `get` `create` `update` `delete` `delete-range` |
| `sport-settings` | `list` `get` `update` |
| `folders` | `list` `create` `update` `delete` |
| `workouts` | `list` `get` `create` `update` `delete` |
| `llms` | print the full reference |

Every command has `--help` with realistic examples.

## Examples

```sh
# Last week's training, compact summaries
icu activities list --oldest -7d

# One activity with zone times only
icu activities get i81960531 --fields id,name,icu_zone_times,icu_hr_zone_times

# Power stream summarized instead of 20k raw points
icu activities streams i81960531 --types watts,heartrate --stats

# Log this morning's wellness
icu wellness update today --weight 71.5 --resting-hr 48 --hrv 92 --sleep-secs 27000

# Plan a structured workout on the calendar
icu events create --start tomorrow --name "VO2 intervals" --type Ride \
  --description '- 15m 60%
- 5x 3m 118% / 3m 50%
- 10m 55%'

# Update FTP after a test
icu sport-settings update Ride --ftp 285
```

## Development

```sh
pnpm install
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm build        # tsup -> dist/index.js (single ESM bundle)
node dist/index.js --help
```

## License

MIT
