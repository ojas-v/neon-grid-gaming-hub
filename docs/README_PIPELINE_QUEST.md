# Pipeline Quest: Kestrel-9 (Part B submission)

A story-driven game that teaches the 9-stage data science pipeline by making the learner run it on randomly generated RF data. Playable at `https://neon-grid-gaming-hub.vercel.app/` (launch Pipeline Quest from the hub).

## Learning objectives
After playing, a learner can:
1. Explain why accuracy misleads under class imbalance and judge a detector by Pd and Pfa.
2. Match libraries to tasks (arrays/FFT, filters/PSD, models, plots).
3. Apply the Nyquist criterion and predict the alias frequency |f − k·fs|.
4. Identify dropout, clipping and DC offset in a waveform.
5. Order filters correctly and trade noise removal against signal distortion.
6. Validate cleaned data against quantitative gates on several properties, not one.
7. Read a spectrogram: carrier, pulsed beacon, swept chirp.
8. Set a threshold from an ROC curve for a target Pd and Pfa, and under asymmetric miss/false-alarm costs.
9. Diagnose overfitting and underfitting from training vs validation error, and use a held-out test set.

## Concept map
| Sector | Pipeline stage | What the player does | What they discover |
|---|---|---|---|
| 1 | Problem framing | Ship one of 4 detectors, ranked by accuracy; opens confusion matrices | Top-accuracy detector never catches the jammer |
| 2 | Toolkit | Fill a 4-slot cargo bay from 8 libraries | Missing tools cost fuel later (gates sectors 5, 7, 9) |
| 3 | Acquisition | Pick fs; game computes a 256-point DFT of the capture | Spectrum peak jumps to an alias below 2×f0 |
| 4 | Pre-profiling | Click dropout, clipping, DC shift (positions random) | Each fault has a distinct visual signature |
| 5 | Preprocessing | Build a filter chain (random noise, DC, spike count) | Order matters; heavy smoothing deletes the tone |
| 6 | Post-profiling | Four pipelines measured on the player's own capture | Low noise alone passes a pipeline that destroys the tone |
| 7 | EDA | Tag carrier, beacon, jammer in a spectrogram in 25 s | Structure (steady, on/off, diagonal) identifies emitters |
| 8 | Modeling (threshold) | Move threshold on live PDFs and ROC; separation d' is random | Pd/Pfa tradeoff, target region on the ROC |
| 9 | Modeling (generalisation) | Choose polynomial degree on 20 points; train vs validation RMSE | U-shaped validation error; more data shifts the optimum |
| 10 | Deployment | Live 20 s stream, cost 1 per false alarm, 3 per miss | Cost-weighted threshold sits below the equal-error point |

Sectors 8 and 9 are both pipeline stage 8 (model building and tuning), so 10 sectors cover the 9 stages.

## Why this is discovery, not a quiz
Decisions change outcomes (cargo choices gate later sectors and cost fuel; sector 6 audits the player's own sector 5 output). Failure messages state measured consequences (e.g. "spectrum puts the jammer at X Hz, logs say Y Hz") instead of the rule. Every run is randomised, so answers cannot be memorised.

## What is computed (no hard-coded answers)
DFT with Hann window (sector 3), median and moving-average filters with RMSE scoring (5), measured DC/HF-noise/spike/tone-power metrics via a DFT bin (6), synthetic spectrogram (7), Gaussian Q-function for Pd/Pfa (8), least-squares polynomial fit in a Chebyshev basis solved by Gaussian elimination, with validation and test sets (9), simulated confusion matrices (1), stochastic cost stream (10).

## How to play
Open the hub, enter a player tag, launch Pipeline Quest. Click Continue to advance NOVA's briefing. Act with click, drag or slider. Mistakes burn fuel; 0% ends the mission. Sector 10 also accepts arrow keys. The in-game "How to play" button repeats this.

## Run locally
Folder `games/pipeline-quest/` is static: open `index.html` via Live Server or `python -m http.server`.

## Playtest evidence
See `PLAYTEST_KIT.md` for protocol and instruments. Fill the table below with measured numbers only.

| Metric | Value |
|---|---|
| Participants (n) | [fill] |
| Mean pre-test score (/9) | [fill] |
| Mean post-test score (/9) | [fill] |
| Mean normalised gain | [fill] |
| Hardest sector (lowest first-try clear %) | [fill from telemetry query 1] |
| Top 3 feedback themes and what we changed | [fill] |

## Limitations
Small, non-random peer sample; no control group; same questions pre and post (practice effect); scores are client-reported and forgeable; synthetic data stands in for real SDR captures.

## Team
[Name, role] x3
