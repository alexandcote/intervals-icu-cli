---
name: training-analysis
description: Extract, analyze, and diagnose endurance training from intervals.icu using the `intervals` CLI, grounded in 2019–2026 sports-science evidence. Use when the user wants to understand their fitness/fatigue/form, find strengths and weaknesses (rider/runner phenotype and physiological limiters), audit their training intensity distribution, assess durability/fatigue resistance, gauge readiness or overreaching, or build an evidence-based training plan. Triggers: "analyze my training", "what's my weakness", "am I overtraining", "build me a plan", "what should I train", "am I fit/fresh", "diagnose my power curve".
---

# Training analysis & planning (intervals.icu)

Turn intervals.icu data into an evidence-based diagnosis and plan. This skill pairs the `intervals` CLI (data extraction) with verified 2019–2026 endurance-science thresholds (interpretation). Read `references/evidence.md` for the cited numbers, formulas, and confidence tiers behind every rule below — **cite the confidence tier when you make a claim**, and never invent thresholds that aren't in that file.

Prerequisite: the `intervals` CLI must be set up (`intervals config verify` returns `{"ok":true,...}`). If not, load the `intervals-icu` skill first. All commands emit compact JSON; add `--fields` to keep payloads small.

## Method: extract → analyze → diagnose → plan

Work in that order. Don't jump to a plan before the diagnosis, and don't diagnose from a single ride — endurance signals are noisy and need multi-week windows.

### 1. Extract

Pull the minimum data each question needs. Core recipes (all verified against the live API):

```sh
# Fitness / fatigue / form trend (one row per day). CTL≈fitness, ATL≈fatigue, form=CTL−ATL, rampRate=CTL change/wk
intervals wellness list --oldest -90d --fields id,ctl,atl,rampRate,restingHR,hrv,sleepSecs

# Today's readiness snapshot
intervals wellness get today --fields id,ctl,atl,rampRate,restingHR,hrv,sleepSecs

# Per-activity diagnostics over a block (decoupling = durability, EF = aerobic efficiency, VI = smoothness)
intervals activities list --oldest -42d --fields id,start_date_local,type,icu_training_load,icu_intensity,decoupling,icu_efficiency_factor,icu_variability_index,icu_power_hr,icu_ctl,icu_atl

# Mean-maximal power curve across a block — THE phenotype/limiter tool
intervals activities power-profile --oldest -90d --type Ride

# Durability curve: best power AFTER heavy prior work (fatigued profile).
# Requires the athlete to have defined kj0/kj1 fatigued curves in intervals.icu settings;
# if not, it returns "Athlete has no kj1 defined" — fall back to the `decoupling` field, which is always present.
intervals activities power-profile --oldest -90d --type Ride --fatigue kj1

# One activity in depth (zone times, intervals, decoupling)
intervals activities get <id> --fields id,name,icu_zone_times,icu_hr_zone_times,decoupling,icu_efficiency_factor,icu_training_load,icu_intensity
intervals activities intervals <id>

# Current thresholds/zones (needed to interpret everything above)
intervals sport-settings get Ride   # ftp, w_prime, power_zones, lthr, max_hr, threshold_pace
```

For deep single-ride work (drift, pacing) pull streams **summarized or downsampled**, never raw: `intervals activities streams <id> --types time,watts,heartrate --stats` or `--every 30`.

### 2. Analyze

Compute the derived metrics the CLI doesn't give directly. Key ones (formulas and evidence in `references/evidence.md`):

- **Intensity distribution (TID)**: the single most important training audit. `intervals activities list` returns both zone-time fields (verified shapes):
  - `icu_hr_zone_times` — a plain 7-element array of seconds `[hz1..hz7]`.
  - `icu_zone_times` — a list of `{id, secs}` power-zone objects `Z1..Z7` plus a bonus `SS` (sweet-spot) bucket.
  Sum across the block and collapse the 7 zones into **3 Seiler zones**: **Z1 = zones 1–2** (below LT1/aerobic threshold), **Z2 = zones 3–4** (between thresholds; add the `SS` bucket for power), **Z3 = zones 5–7** (above LT2). Report % of total time in each. Prefer power zones for cyclists with a meter, HR zones otherwise (they diverge — power TID usually shows more Z2/Z3). Reference: a real 42-day pull came back HR 73/25/2 and power 65/29/6 — pyramidal-leaning but Z2-heavy.
- **Phenotype**: from `power-profile`, take W/kg at 5s, 1min, 5min, 20min (or 60min). Compare the *shape* to reference profiles, not just absolutes.
- **Critical Power & W′**: fit `P(t) = W'/t + CP` to the power-profile envelope (use 2–15 min points: e.g. 120s, 300s, 600s, 1200s). CP = aerobic ceiling, W′ = anaerobic battery (kJ). Cross-check against `icu_pm_ftp_watts` / `icu_w_prime` from the activity data.
- **Durability**: compare fresh vs `--fatigue kj1` power-profile (drop in CP-region power), and track `decoupling` — a rising HR:power ratio within long rides is physiological drift.
- **Ramp rate & load**: use `rampRate` (CTL/week) and absolute weekly load, NOT ACWR alone (see caveat below).

### 3. Diagnose

Run the relevant playbook. Each names the data, the rule, and the confidence tier.

**Phenotype (strengths).** From the fresh power-profile W/kg shape:
- High 5–60s, steep drop into 5–20min → **sprinter / anaerobic** (large W′, lower CP-to-peak ratio).
- Flat curve, strong 5–60min, modest sprint → **time-triallist / diesel** (high CP, small W′).
- Balanced → **all-rounder**. Report the W/kg at each duration and which activity set each peak (the `from` field).

**Limiter (weakness).** The weakness is the duration where the athlete sits furthest below their event demand or their own phenotype. Example: a TT-focused rider with a weak 1–5min (VO2 region) is VO2max-limited; a criterium racer with a small W′ is anaerobic-limited. Ground the target durations in the event.

**TID audit.** Compare the athlete's 3-zone % to their phase target (base = pyramidal ~80/15/5; peak = more polarized). **Red flag: >35% of time in Z2** ("threshold/grey-zone") during base — the most common amateur error. [verified]

**Durability.** If CP-region power drops materially in the `--fatigue kj1` profile vs fresh (group avg ~10% after 2h, but 1–31% individually), or decoupling routinely exceeds ~5% on long rides, durability is a limiter — increasingly decisive for long events. [supporting]

**Readiness / overreaching.** Cross-reference, don't act on one signal:
- Form (`atl` relative to `ctl`) deeply negative → fatigued; near/above zero → fresh.
- Morning HRV (RMSSD) trending below the athlete's rolling mean −1 SD, **plus** resting/nocturnal HR rising, **plus** subjective readiness dropping → likely functional overreaching. Note subjective markers lag physiology by ~1–2 weeks. [supporting]
- A rising rampRate (e.g. >5–7 CTL/wk sustained) with falling HRV is the classic dig-a-hole pattern.

### 4. Plan

Only after diagnosis. Prescribe to the limiter, respect readiness, use evidence-based interval doses (full table in `references/evidence.md`):

- **VO2max** (1–5min limiter): 4×4min @ ~90–95% HRmax/MAS, 3min recovery → strong VO2max gains; OR 30/15s (3×13×30/15s) which accumulates more time ≥90% VO2max at equal effort. The driver of adaptation is **time spent ≥90% VO2max**. [supporting, RCT-backed]
- **Threshold/CP**: sweet-spot and threshold intervals (e.g. 2×20min, 4×10min) to raise CP.
- **Durability**: long rides >90min, some with intensity late, in-ride carbs (~60g/h); heavy strength.
- **Base**: mostly Z1 (pyramidal), keep Z2 <10–15%.

Then write it to the calendar with the CLI (confirm dates/scope with the user first). **Repeats must be a labelled `Nx` header** — see the intervals-icu skill's workout-syntax section; a `/`-separated or bare-`Nx` form silently collapses to one rep:

```sh
intervals events create --start tomorrow --name "VO2 4x4" --type Ride \
  --description 'Warmup
- 15m 60%

Intervals 4x
- 4m 94%
- 3m 50%

Cooldown
- 10m 55%'
intervals events list --oldest today --newest +14d --category WORKOUT   # verify moving_time/load are non-zero
```

## Guardrails

- **ACWR is contested.** The acute:chronic workload ratio has serious published criticism (mathematical coupling, no rationale for its time windows, injury association reproducible with *random* chronic loads). Do NOT present the 0.8–1.3 "sweet spot" as established fact. Prefer absolute load, rampRate, form trend, and HRV. If you mention ACWR, flag it as disputed. [verified criticism]
- **Confidence tiers matter.** TID and CP/W′ findings are adversarially verified; durability, HRV-guided training, overreaching markers, and interval dose-response are supporting evidence (primary studies, smaller/less-verified). Say which you're leaning on.
- **Individual variability is large.** CP occurs anywhere from 70–90% VO2max; durability decline ranges 1–31%; HRV baselines are personal. Diagnose against the athlete's own trend, not population means.
- **You are not a doctor.** Flag genuine red flags (sustained HRV suppression, resting HR climb, performance decline, illness) and suggest rest / professional input; don't diagnose medical conditions.
- **Data honesty.** State the window and sample size behind each conclusion. "One ride" is an anecdote; a 6-week block is a trend. If HR/power data is missing or the athlete has no power meter, say so and fall back to what's available.

See `references/evidence.md` for every threshold, formula, citation, and confidence rating referenced above.
