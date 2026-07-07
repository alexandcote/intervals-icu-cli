# Evidence base: endurance training (2019–2026)

Quantitative thresholds, formulas, and citations behind the `training-analysis` skill. Each item carries a **confidence tier**:

- **[VERIFIED]** — survived 3-vote adversarial fact-checking against primary sources (systematic reviews / meta-analyses / canonical physiology).
- **[SUPPORTING]** — extracted from a primary source but not independently multi-vote verified; treat as good evidence, not settled fact.

Always attach the tier when you state a number to the user, and prefer the athlete's own longitudinal trend over any population value (inter-individual variability is large throughout).

---

## 1. Training intensity distribution (TID)

**No single TID model is universally superior. [VERIFIED]** Polarized (POL) beats pyramidal/threshold for VO2peak by only **SMD 0.24** (95% CI 0.01–0.48, I²=0%), and *only* for interventions **<12 weeks** (SMD 0.40) and *only* in **highly trained/national-level** athletes (SMD 0.46); no advantage at ≥12 weeks (SMD 0.04) or in developmental athletes (SMD 0.08). POL shows **no** advantage for time-trial (SMD −0.01), time-to-exhaustion (0.30, ns), or power/velocity at LT2 (0.04).
Source: Sports Medicine 2024 meta-analysis, https://link.springer.com/article/10.1007/s40279-024-02034-z

**Seiler 3-zone model definitions. [VERIFIED]**
- **Pyramidal**: ~80% Z1, ~15% Z2, ~5% Z3 (Z2 should not exceed ~10%).
- **Polarized**: ~75–80% Z1, ~5% or less Z2, 15–20% Z3.
- **Threshold**: ~30–50% Z1, **40–60% Z2**, ~10% Z3 — defined by **>35% of volume in Z2**.
Zones: Z1 = below LT1/VT1, Z2 = between LT1/VT1 and LT2/VT2, Z3 = above LT2/VT2.
Source: IJSPP 2022 (Casado et al.), https://journals.humankinetics.com/view/journals/ijspp/17/6/article-p820.xml; Frontiers Physiol 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC12568352/

**Real-world elite practice is pyramidal in base, polarized near competition. [VERIFIED]** World-class marathoners ~**75.9% Z1 / 16.0% Z2 / 8.2% Z3** (~195 km/wk); 1500 m runners ~**86.8/6.7/6.4** (~155 km/wk). Elite rowers/cyclists/skiers spend **78–91% of prep-phase in Z1**. They accumulate high volume (often >100 km/wk) with an obligatory ~20% above Z1 on a hard-day/easy-day pattern, cutting Z2 and adding Z3 race-pace work toward competition.
Source: same as above.

**Operational rule:** audit the athlete's 3-zone % (sum `icu_zone_times`/`icu_hr_zone_times` over the block). In base, **>35% Z2 is the red flag** (grey-zone/threshold drift — the classic amateur error). Shift toward more Z3 and race-specificity as competition nears.

---

## 4/8. Physiological determinants: CP, W′, FTP, phenotype

**Critical Power (CP) is the physiologically grounded determinant. [VERIFIED]** CP = power at maximal metabolic steady state, the boundary between heavy and severe domains, the asymptote of the power–time hyperbola. Occurs at **~70–80% VO2max (80–90% in trained)**. CP ≠ FTP ≠ LT/MLSS.
Model (2-parameter): **P(t) = W′/t + CP**, equivalently **W_lim = W′ + CP·t**. W′ = fixed finite work capacity above CP, in **kilojoules**.
Source: EJAP 2021, https://pmc.ncbi.nlm.nih.gov/articles/PMC8783871/; https://pmc.ncbi.nlm.nih.gov/articles/PMC9265641/; https://pmc.ncbi.nlm.nih.gov/articles/PMC7552657/

**FTP is a convenience proxy, not a determinant. [VERIFIED]** FTP ≈ 95% of 20-min power or 90% of 8-min power. Correlates strongly with CP (**r=0.969** in moderately trained cyclists; CP 256±50 W vs FTP 249±44 W) but is **not interchangeable** — a single point on the curve, CP typically slightly > FTP.
Source: EJAP 2021 (above); Sitko et al. 2020, https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.613151/full

**Estimating CP/W′. [VERIFIED]** Use **≥3 maximal efforts of 2–15 min** (shortest 2–5 min, longest 12–15 min) → ~2–5% SE for CP, <10% for W′. The **3-parameter hyperbolic** model best estimates the asymptote; linear, exponential, and the **3-min all-out test overestimate CP and underestimate W′**. In the 3MT, W′ = 150×(P150 − CP) with CP = mean power of the last 30 s.
Source: EJAP 2021 (above); https://pmc.ncbi.nlm.nih.gov/articles/PMC9265641/

**W′ reconstitution (recovery of the anaerobic battery). [VERIFIED]** Skiba integral model: **τ_W′ = 546·e^(−0.01·DCP) + 316**, where DCP = CP − recovery power. Recovers ~**37% by 2 min, 65% by 6 min, 86% by 15 min** (half-time ~234 s). **Caveat:** derived largely in untrained subjects; elite cyclists reconstitute faster — individualize τ.
Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC7552657/; https://pmc.ncbi.nlm.nih.gov/articles/PMC9265641/

**Phenotype from the mean-maximal power curve (W/kg by duration):**
- **Sprinter / anaerobic**: high 5–60s W/kg, large W′, curve drops steeply into the 5–20min range.
- **Time-triallist / diesel**: high CP, small W′, flat curve, strong 20–60min, modest sprint.
- **All-rounder**: balanced across durations.
Diagnose the **limiter** as the duration where the athlete is furthest below event demand or below their own profile shape (e.g. weak 1–5min = VO2 limiter; small W′ = anaerobic limiter). Use `intervals activities power-profile` fresh vs `--fatigue kj1`.

---

## 5. Durability / fatigue resistance (emerging 4th determinant)

**Durability = resilience of physiological variables and performance during/after prolonged exercise; proposed as a 4th determinant alongside VO2max, economy, thresholds. [SUPPORTING]**

- **CP drops ~10% (group) after ~2h heavy cycling, but 1–31% individually** — a measurable, highly personal durability index. [SUPPORTING]
- **VO2peak fell ~6% after a 90-min run at LT** (56.7→53.4 mL/kg/min); LT speed dropped 12.8→12.1 km/h, and the size of that decline **correlated with marathon performance (r=0.68)** independent of baseline fitness. Fractional utilization was durable (76.6→76.0%, ns). [SUPPORTING]
- After ~4h work, TT performance changed −8.5% to +1.1%, peak power −31% to +1% across individuals. [SUPPORTING]
- **Field marker: decoupling** — internal:external ratio (HR:power or HR:pace) drifting upward over a long effort. Directly available as `decoupling` per activity in the CLI. Rising values / routinely >~5% on long rides signal a durability limiter. [SUPPORTING]
- **Trainable via:** high accumulated volume, long sessions >90 min, some intensity late in long rides, heavy strength/plyometrics, and **in-ride carbohydrate ~60 g/h** (reduced the CP fall). [SUPPORTING]
- Standardize confounders when tracking longitudinally: pre/in-exercise carbs, hydration, environment, duration/distance.
Sources: durability reviews & studies, https://pmc.ncbi.nlm.nih.gov/articles/PMC11872681/, https://pmc.ncbi.nlm.nih.gov/articles/PMC12576026/, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11235883/

---

## 2. Training load monitoring — and the ACWR caveat

intervals.icu provides CTL (fitness, ~42-day load EMA), ATL (fatigue, ~7-day), form/TSB = CTL−ATL, and rampRate (CTL change per week). Use these plus absolute weekly load.

**The acute:chronic workload ratio (ACWR) is heavily contested. [VERIFIED criticism]**
- Acute load appears in both numerator and denominator → **mathematical coupling / spurious correlation**.
- **No rationale** for the 7-day/28-day windows.
- An acute-to-**random** chronic load is "**as associated with injury**" as the real ratio → the association is largely a statistical artifact. Authors recommend **dismissing ACWR** as an injury model.
Sources: Impellizzeri et al. 2020, https://link.springer.com/article/10.1007/s40279-020-01280-1; "acute-to-random" study, https://pmc.ncbi.nlm.nih.gov/articles/PMC7534938/ (see also researchgate mirror).

**Counter-evidence exists but is weak. [SUPPORTING]** A 2025 meta-analysis (22 cohorts, 921 participants) found a positive ACWR–injury association (ES 0.72) with the 0.8–1.3 "sweet spot" showing the lowest incidence and ACWR >2.0 an OR ~4.0 — but with wide CIs and the authors urging caution.
**Rule:** do not present 0.8–1.3 as established. Prefer absolute load, rampRate (e.g. sustained >5–7 CTL/wk is aggressive), form trend, and HRV. If ACWR is raised, label it disputed.

---

## 6. Recovery & overreaching markers

**HRV-guided training: small benefit, not a fitness game-changer. [SUPPORTING]** Meta-analysis (8 studies, 199 participants): **no significant** VO2max advantage over predefined training (SMD 0.13, ns) and only a small non-significant TT effect (SMD 0.20, ns); a real benefit for vagal HRV itself (SMD 0.50). Common protocol: **morning RMSSD after waking** (87.5% of studies), decision threshold at rolling **mean −1 SD** or **mean ±0.5 SD** — train hard when HRV is in-range, back off when suppressed.
Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/

**Functional overreaching (f-OR) markers. [SUPPORTING]** In overload studies:
- **Nocturnal/resting HR rises** in overreached athletes (+3.2%) but falls in responders (−2.8%); a 0.68% change discriminated groups (AUC 0.845).
- **Nocturnal HRV (LnRMSSD) falls** in overreached (−0.7%) vs rises in responders (+2.1%).
- Combining nocturnal HR + subjective readiness + HR:power index gave **PPV 92% / NPV 100%** for overreaching.
- **Subjective markers lag physiology** — readiness diverged only by ~day 11 of overload, soreness by day 14.
- In f-OR, incremental-test **peak HR drops** (182→176 bpm) and peak lactate falls (12.4→10.9 mmol/L) — blunted responses, not fitness.
Sources: intensified-training studies, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4619310/ and overreaching cohort, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12547624/

**Rule:** never act on one signal. Overreaching = HRV suppressed (below mean −1 SD) **and** resting/nocturnal HR rising **and** performance/readiness dropping, especially with high rampRate. Recommend recovery; flag medical red flags for professional input.

---

## 7. Interval prescriptions (dose–response)

**The driver of VO2max adaptation is time spent ≥90% VO2max. [SUPPORTING]**

- **4×4 min @ ~95% MAS (90–95% HRmax), 3 min recovery, 3×/wk, 8 wk → +6.5% VO2max**, beating sprint-interval formats; accrues ~7 min ≥90% VO2max per session. 3000 m improved +5.9%. [SUPPORTING]
  Source: https://link.springer.com/article/10.1007/s40279-013-0066-5 (and 2023 replication, https://cdnsciencepub.com/doi/10.1139/apnm-2023-0603)
- **30/15 short intervals** (3 sets × 13 × 30s work / 15s recovery): in elite cyclists beat effort-matched 4×5 min — peak aerobic power +3.7% vs −0.3%, 20-min power +4.7% vs −1.4%, more time ≥90% VO2max (844 vs 589 s) at equal RPE. In a 10-wk study, **+8.7% VO2max vs 2.6%** and **40-min power +12% vs 4%** vs work-matched 4×5 min. [SUPPORTING]
  Source: Rønnestad et al., https://pubmed.ncbi.nlm.nih.gov/31977120/
- **MAS is sustainable only ~4–7 min** → anchor VO2 work at **90–100% of MAS/pVO2max** (or ≥95% vVO2max for runners). Run long-interval menus for >10 min at VO2max: 6–10×2 min, 5–8×3 min, or 4–6×4 min at ≥95% vVO2max, relief ≤2 min. [SUPPORTING]
- **Very short vs long trade-off:** in runners, 4×3 min accrued more time >90% VO2max than 24×30 s; long intervals raise lactate more, short intervals raise HR-time-in-zone (HR-based zone time can diverge from true VO2-based time). [SUPPORTING]
- **Threshold/CP:** sweet-spot / threshold sets (2×20 min, 4×10 min, 3×15 min around FTP–CP) to raise CP; lower-fractional-utilization athletes gain more from the 30/15 format.
Sources: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10099854/, https://pmc.ncbi.nlm.nih.gov/articles/PMC11743937/

---

## 3. Periodization

No periodization claims (linear vs block vs reverse) survived adversarial verification in this research pass — the surviving TID evidence implies **sequencing** (pyramidal base → polarized/race-specific peak) rather than endorsing a specific block-vs-linear scheme. Treat periodization structure as **[UNVERIFIED here]**; if the user needs a rigorous comparison, run fresh research rather than asserting from memory.

---

## Refuted / do-not-repeat

- "Polarized training gives +11.7% VO2max vs a decline for threshold, and much better 40 km TT." **REFUTED (1-2 vote)** — an exaggerated POL benefit that circulates but did not survive verification. The real POL VO2peak edge is the small SMD 0.24 above.

## Coverage honesty

Strongly evidenced here: TID (1) and CP/W′/phenotype (4/8). Supporting-tier: durability (5), load/ACWR criticism (2), recovery/overreaching (6), interval dose-response (7). Thin: periodization (3). When the user leans on a thin area, say so and offer to research it further rather than over-claiming.
