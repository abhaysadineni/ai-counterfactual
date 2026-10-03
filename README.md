# The AI Counterfactual

What did AI add to a business, measured against the same business without it?

Live: https://www.abhaychakra.com/p/ai-counterfactual/

A browser-only system for valuing AI against an explicit no-AI comparator. Each case states its comparator, estimates the effect with a named causal design, carries the effect through a P&L bridge to value, and is then attacked by adversarial tests before it is allowed to report a number. Built in September 2026 by Abhay Chakra Sadineni.

## What is in it

- **Case galaxy (home).** Twelve cases drawn as stars on a canvas: size is value at stake, colour is the sign of the effect, a dashed halo is the stability range, orbiting motes are the evidence graded A to E. 71 sub-cases (alternative comparators, assumption worlds, subgroups) orbit their parents.
- **Per case.** Overview, with and without AI, P&L bridge, causal evidence by design, source-to-dollar lineage, alternative worlds, sensitivity, distribution and welfare (kept separate from profit), claim to value, adversarial tests, Monte Carlo, a standard report with a JSON reproduction file, and the release checklist.
- **Engine.** Nine estimators (randomised, difference in differences with a pre-trend check, matched, synthetic control, regression discontinuity, event study, survival, engineering bound, scenario range), the valuation identity (horizon, discounting, ramp, head start, AI-specific investment, expected loss), seeded Monte Carlo, six adversarial tests and a 12-item release checklist. Sixteen closed-form self-tests run every time `#/tests` opens; all 16 passed on 3 October 2026.
- **The AI build-out, as filed (`#/markets`).** Quarterly capital expenditure and related series for 29 US filers (hyperscalers, chips, equipment, infrastructure, software, power) from SEC EDGAR, eight FRED series, and capex measured against a pre-2023 trend.
- **Add a case (`#/add`).** Paste or load a JSON case record; it is valued, checklist-tested and joins the galaxy in that browser only.

## What is real and what is synthetic

The twelve cases are **synthetic**. They are constructed to exercise the method and calibrated to public ranges where a public source exists (sources listed in `cases.js`, accessed 12 September 2026). No case is a claim about a real company. The markets view is **real public data**: SEC EDGAR company facts and FRED. `data/markets.json` is a snapshot of the daily feed generated 2026-10-03T10:30:39Z. On abhaychakra.com the page reads the live feed instead.

## Run it

Any static file server works. From this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk will not load the data, because browsers block `fetch` on `file://` pages.

GitHub Pages: Settings, Pages, deploy from the `main` branch, root folder. All paths are relative, so it works at `https://<user>.github.io/<repo>/`.

## Files

| Path | Role |
|---|---|
| `index.html`, `app.css` | Page shell and styles |
| `app.js` | Interface: galaxy, case views, charts, router |
| `engine.js` | Estimators, valuation identity, Monte Carlo, tests, checklist |
| `cases.js` | The twelve synthetic cases and their calibration sources |
| `markets.js` | The AI build-out view |
| `data/markets.json` | Snapshot of the markets feed |
| `pipeline/markets_lambda.py` | The AWS Lambda that writes the feed daily at 10:30 UTC (the bucket name is set in the file) |
| `deploy.sh` | Deploy to S3 and CloudFront with content-hashed asset URLs (`SITE_BUCKET`, `CF_DISTRIBUTION`, optional `DRY_RUN=1`) |
| `fonts/` | Manrope, Fraunces, JetBrains Mono (SIL Open Font License 1.1, notices included) |

No build step and no dependencies.

## Licences

Code: no licence file is included, so default copyright applies (all rights reserved). Add a `LICENSE` file if others should be able to reuse it. Fonts: SIL Open Font License 1.1. Data: SEC EDGAR is a United States government work; the FRED series used originate with BEA, BLS and the Federal Reserve, which are public domain.
