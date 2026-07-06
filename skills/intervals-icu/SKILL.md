---
name: intervals-icu
description: Query and manage intervals.icu training data via the `intervals` CLI — activities, wellness (HRV, sleep, weight), calendar events, planned workouts, FTP/zones. Use when the user asks about their training, fitness/fatigue (CTL/ATL/form), rides/runs/swims, recovery metrics, or wants workouts planned on their intervals.icu calendar.
---

# intervals.icu CLI (`intervals`)

Talk to the intervals.icu API with the `intervals` CLI (`npx intervals-icu-cli` if the binary is not on PATH). Every command prints compact JSON to stdout. Null fields are stripped; add `--nulls` to see them, `--pretty` for indented output.

## First call of a session

```sh
intervals config verify   # → {"ok":true,"athlete_id":"i256245","name":"..."}
```

If it fails (exit 3), the key is missing: tell the user to set `INTERVALS_API_KEY` (from https://intervals.icu/settings) or run `intervals config set api_key <key>`. Don't guess — the error's `hint` field says what to do.

For anything not covered here, `intervals llms` prints the full 40-command reference (`intervals <group> <cmd> --help` also has examples).

## Errors

Errors are JSON on stderr: `{"error":{"code","message","hint"}}`. Exit codes: 1 API/network, 2 bad input, 3 auth, 4 not found, 5 rate limited. Read the `hint` — it states the fix.

## Input formats (used everywhere)

- **Dates**: `2026-07-06`, `today`, `yesterday`, `tomorrow`, `now`, offsets `-7d -4w -3m -1y +2d`
- **Durations**: seconds or `1h30m`, `20m`, `90s`
- **Distances**: meters or `42.2km`
- **Body fields** on write commands: `--set key=value` (repeatable; numbers/booleans/null auto-coerce; `key:=json` for arrays/objects) or `--data '{...}'`

## Token economy — read this before fetching data

Responses are pre-trimmed to useful summaries. Escalate only as needed:

1. Lists default to compact field sets and `--limit 30`. Narrow further with `--fields id,name,icu_training_load`.
2. `--full` returns everything (~174 fields per activity) — only when you truly need an obscure field.
3. **Never dump raw streams.** `intervals activities streams <id> --types watts --stats` gives min/max/avg per stream. If you need the shape, downsample: `--every 60` (one point per minute) or `--points 200`.

## Reading training data

```sh
intervals activities list --oldest -7d                          # last week, newest first
intervals activities list --oldest -42d --fields id,start_date_local,type,icu_training_load
intervals activities get i81960531                              # summary incl. zone times
intervals activities get i81960531 --intervals                  # with interval breakdown
intervals activities search "#race"                             # by name or exact #tag
intervals activities best-efforts i81960531 --stream watts --duration 20m
intervals activities power-curve i81960531                      # best power vs duration
```

Fitness state (CTL = fitness, ATL = fatigue, form = CTL−ATL) lives on **wellness** records, not activities:

```sh
intervals wellness get today --fields id,ctl,atl,rampRate,restingHR,hrv,sleepSecs
intervals wellness list --oldest -30d --fields id,ctl,atl,restingHR,hrv   # trend analysis
```

## Logging wellness

Scales are **1 = best/none … 4 = worst** (fatigue, soreness, stress, mood, motivation, sleepQuality):

```sh
intervals wellness update today --weight 71.5 --resting-hr 48 --hrv 92 --sleep-secs 27000 --sleep-quality 2
intervals wellness update today --set spO2=97 --set comments="legs heavy"
```

## Planning workouts on the calendar

Events default to `--category WORKOUT`. Structured steps go in `--description` using intervals.icu workout syntax — the server parses it into a structured workout (percentages are of FTP for rides; runs can use pace zones like `Z2` or min/km):

```sh
intervals events create --start tomorrow --name "VO2 max" --type Ride --description '- 15m 60%
- 5x 3m 118% / 3m 50%
- 10m 55%'

intervals events create --start 2026-07-12 --category RACE_B --name "Club TT"
intervals events create --start +2d --category NOTE --name "Travel day"
intervals events list --oldest today --newest +14d --category WORKOUT
intervals events update 123456 --start +1d          # move a workout
intervals events delete 123456
```

Weekly-plan pattern: one `events create` per day, `--tags` to group, then `events list` to confirm. Use `--external-id` + `--upsert-on-uid` if you may need to re-run idempotently.

## Settings and library

```sh
intervals sport-settings get Ride                          # FTP, zones, thresholds
intervals sport-settings update Ride --ftp 285             # after an FTP test
intervals sport-settings update Run --lthr 168 --recalc-hr-zones
intervals athlete get                                      # profile + all sport settings
intervals workouts list                                    # reusable workout library
intervals workouts create --folder-id 4321 --name "2x20 SS" --description '- 2x 20m 90% / 5m 50%'
```

## Cautions

- `events delete-range` and `folders delete` are bulk-destructive (`folders delete` removes all workouts inside). Confirm scope with the user before running them, and prefer listing first.
- Athlete defaults to the API-key owner. Only pass `--athlete i12345` when the user (a coach) explicitly targets someone else.
- Writes are partial updates — send only the fields you mean to change.
