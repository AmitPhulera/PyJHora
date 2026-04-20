# PyJHora ↔ PyJHora-Web Parity Harness — Design

**Status:** Draft
**Date:** 2026-04-20
**Owner:** Amit Phulera

## Goal

Ensure the TypeScript port (`pyjhora-web/`) produces numerically identical results to the Python implementation (`src/jhora/`) on every calculation module intended to be ported. Provide a re-runnable, CI-friendly tool that flags:

1. Functions present in Python but not ported to TS
2. Function pairs where outputs diverge on reference inputs
3. Function pairs with no test fixture yet (the continuous todo list)

Python is treated as ground truth. When outputs diverge, the TS side is presumed wrong unless a reviewer explicitly accepts the divergence.

## Non-Goals

- Behavioral equivalence for UI code (PyQt6 vs React) — explicitly excluded.
- Semantic equivalence of unported experimental modules (`prediction/`, `surya_sidhantha.py`, `khanda_khaadyaka.py`).
- Replacing the existing vitest / Python test suites. The harness is an additional layer that runs shared fixtures cross-language.

## Problem Context

- Python codebase: ~200 functions in `panchanga/drik.py`, ~551 in `horoscope/chart/yoga.py`, plus charts, dhasa, sphuta, dosha, raja_yoga, transit, match, prediction modules.
- TS port at `pyjhora-web/src/core/`: ~2062 tests across 74 files; Tier 1/Tier 2 porting and drik.py 8-phase port complete per prior work.
- Existing docs (`PARITY_ANALYSIS.md` from 2026-02-07, `Discrepancies.md`, `parity-reports/*.md`) are snapshots and have gone stale. Current parity status is unknown without running both sides.
- Memory contains known systemic issues (sync ascendant proxy, IEEE 754 boundaries, swisseph-wasm `calc_ut` bug, Moshier vs JPL ephemeris) that will surface as divergences the harness must categorize rather than treat as bugs.

## Architecture

```
pyjhora/
├── parity-tools/
│   ├── harness/
│   │   ├── discover.py          Enumerate Python fns via importlib+inspect, read @parity tags
│   │   ├── fixtures/            JSON cases, tree-mirrors src/jhora layout
│   │   ├── run_python.py        Load fixture, call Python fn, emit result JSON
│   │   ├── run_typescript.ts    Load fixture, call TS fn, emit result JSON (invoked via tsx)
│   │   ├── compare.py           Symmetric diff with per-type tolerances
│   │   ├── report.py            Generate report.md from discovery + diff outputs
│   │   └── results/             Per-run output (gitignored)
│   ├── exclusions.yaml          Python modules intentionally not ported
│   └── README.md                How to run, extend, backfill @parity tags
├── Makefile                     `make parity` entry point
└── docs/superpowers/specs/
    └── 2026-04-20-pyjhora-parity-harness-design.md   (this file)
```

The harness is **the audit**. Discovery produces the inventory; fixtures drive behavioral cross-validation; the report consolidates both.

## Data Model

### `@parity` tag (in source)

Python — docstring-embedded or comment preceding the `def`:

```python
# @parity: ts=calculateTithiAsync, notes="Python sync, TS async via WASM"
def tithi(jd, place, tithi_index=1):
    ...
```

TypeScript — comment preceding the `export`:

```typescript
// @parity: py=tithi
export async function calculateTithiAsync(...) { ... }
```

Tag format: `@parity: <lang>=<target>[, notes="..."]` where `<lang>` is `ts` (on Python) or `py` (on TS), and `<target>` is the partner function name in the other language's native casing. Tags live with the function they describe so renames surface immediately.

### Fixture file

One JSON file per function pair. Path mirrors the Python module tree:
```
fixtures/panchanga/drik/tithi.json
fixtures/horoscope/chart/charts/divisional_chart.json
```

Schema:

```json
{
  "python_target": "jhora.panchanga.drik.tithi",
  "typescript_target": "@/core/panchanga/drik::calculateTithiAsync",
  "setup": {
    "ayanamsa": "LAHIRI"
  },
  "tolerance": {
    "float_abs": 1e-6,
    "float_rel": 1e-9,
    "time_seconds": 1
  },
  "tolerance_rationale": "Default tolerance; no override needed.",
  "cases": [
    {
      "id": "bangalore_2024_01_15",
      "description": "Reference case from pvr_tests — validated against Jagannatha Hora output",
      "inputs": {
        "jd": 2460325.208333,
        "place": {"__type": "Place", "value": {"latitude": 12.97, "longitude": 77.58, "timezone": 5.5}},
        "tithi_index": 1
      },
      "expected_source": "jagannatha_hora",
      "expected": [7, 10.4167, 10.8333, 12.25]
    }
  ]
}
```

Notes:
- `expected` is optional. If absent, harness diffs Python vs TS results directly. If present, both sides must match `expected` (ground truth from Jagannatha Hora / published tables) within tolerance.
- Inputs requiring native structures use tagged JSON: `{"__type": "Place", "value": {...}}`. Coercion tables on each runner handle `Place`, `Date`, and future tagged types.
- `tolerance_rationale` is required whenever any `tolerance` key differs from the default value. If the fixture omits `tolerance` entirely, defaults apply and no rationale is required. Prevents silent tolerance creep.

### Discovery output (`discovery.json`)

```json
{
  "generated_at": "2026-04-20T...",
  "python_modules_scanned": 42,
  "functions": [
    {
      "python_target": "jhora.panchanga.drik.tithi",
      "typescript_target": "@/core/panchanga/drik::calculateTithiAsync",
      "tag_source": "python",
      "fixture_path": "fixtures/panchanga/drik/tithi.json",
      "status": "ready"
    },
    {
      "python_target": "jhora.panchanga.drik.gauri_choghadiya",
      "typescript_target": null,
      "tag_source": null,
      "fixture_path": null,
      "status": "missing_ts"
    }
  ],
  "excluded_paths": [...]
}
```

Status values: `ready` (tagged + fixture), `no_fixture` (tagged, no fixture), `missing_ts` (no tag or broken tag), `broken_tag` (tag points to non-existent TS export).

## Components

### `discover.py`

1. Walk `src/jhora/`, filter out paths matching `exclusions.yaml`.
2. For each module, `importlib.import_module` + `inspect.getmembers(module, inspect.isfunction)` for a runtime enumeration (handles dynamically-registered yogas in `yoga.py` that AST alone would miss).
3. For each function, parse its docstring + preceding source lines for `@parity` tag.
4. Cross-validate TS side: resolve `typescript_target` against the TS source tree (static scan of `pyjhora-web/src/core/**/*.ts` for named exports). Flag `broken_tag` if the target doesn't exist.
5. Check for fixture at the expected path.
6. Emit `discovery.json`.

### `run_python.py`

- CLI: `python run_python.py <fixture_path> [<fixture_path> ...]` → writes one `results/python/<path>.json` per fixture. Accepts multiple fixtures in one invocation so the harness can batch.
- Resolves `python_target` via `importlib.import_module` + `getattr`.
- Sets ayanamsa per `fixture.setup.ayanamsa` (default LAHIRI) **before each case**, via `swe.set_sid_mode(...)`. `pyswisseph` holds module-level state; resetting per case isolates cases from each other.
- Coerces `__type`-tagged inputs using a shared coercion table (`Place`, `Date`, etc.).
- Runs each case in isolation; catches exceptions per-case.
- Output schema:

```json
{
  "fixture": "fixtures/panchanga/drik/tithi.json",
  "runtime": "python",
  "runtime_version": "3.11.6",
  "ayanamsa": "LAHIRI",
  "cases": [
    {"id": "...", "ok": true,  "result": [...], "error": null},
    {"id": "...", "ok": false, "result": null,  "error": "TypeError: ..."}
  ]
}
```

### `run_typescript.ts`

- CLI: `tsx run_typescript.ts <fixture_path> [<fixture_path> ...]` → writes one `results/typescript/<path>.json` per fixture. Accepts multiple fixtures so WASM init (expensive) happens once per invocation, not once per fixture.
- Runs inside `pyjhora-web/` so path aliases (`@/core/...`) resolve (per memory: vitest path aliases break if run from root).
- Dynamic `import()` of the TS module, lookup of the named export via `typescript_target`.
- Initializes Swiss Ephemeris WASM once at startup (`await initSwissEph()`). Calls `setAyanamsaMode(fixture.setup.ayanamsa)` before each case for parity with Python runner.
- Same per-case loop and output schema as Python runner.

### `compare.py`

- Reads Python and TS result files for a given fixture.
- Structural walk of both result trees; per-leaf comparison:
  - `int` — exact
  - `float` — `abs(a-b) <= float_abs` OR `rel_error <= float_rel`
  - `str` — exact (after strip)
  - Julian day (`__type: "jd"`) — `abs(a-b) * 86400 <= time_seconds`
  - Longitude (`__type: "longitude"`) — wrap-aware: `min(diff, 360-diff) <= float_abs`
  - Chart array (`['', '2', '1/5', ...]`) — per-slot set comparison (`'1/5'` == `'5/1'`)
  - `None` / `null` / `undefined` — all three treated as equal
  - `NaN` — both NaN → equal (bridges JS/Python behavior)
- Tolerance resolution: per-case override > per-fixture > per-type default in `compare.py`.
- Output: `results/diff/<path>.json` with per-case pass/fail + path to first diverging leaf.

### `report.py`

Consolidates `discovery.json` + all `results/diff/*.json` into `report.md`:

1. **Diverges** (top) — function pairs that ran but produced differing outputs. Sorted by max numerical diff.
2. **Missing TS partner** — `status=missing_ts` or `broken_tag` from discovery.
3. **No fixture yet** — `status=no_fixture`; the backlog.
4. **Runtime errors** — per-case exceptions, separated from "ran but wrong".
5. **Excluded** (footer) — summary of `exclusions.yaml` entries with reasons.

Report is deterministic (stable sort) so diffs between runs are meaningful.

### `exclusions.yaml`

```yaml
- path: jhora/ui/**
  reason: PyQt6 UI, replaced by React UI in pyjhora-web/src/components
- path: jhora/horoscope/prediction/**
  reason: Marked experimental in CLAUDE.md; not ported
- path: jhora/panchanga/surya_sidhantha.py
  reason: Experimental alternative ephemeris
- path: jhora/panchanga/khanda_khaadyaka.py
  reason: Experimental alternative ephemeris
- path: jhora/tests/**
  reason: Python test harness itself, not a calculation module
```

Glob matching; discovery skips any module matching. Exclusions render in the report footer for auditability.

## CLI / Makefile

```makefile
FIXTURES := $(shell find parity-tools/harness/fixtures -name '*.json')

parity-discover:
	python parity-tools/harness/discover.py

parity-run-python: parity-discover
	python parity-tools/harness/run_python.py $(FIXTURES)

parity-run-typescript: parity-discover
	cd pyjhora-web && tsx ../parity-tools/harness/run_typescript.ts $(addprefix ../,$(FIXTURES))

parity-compare: parity-run-python parity-run-typescript
	python parity-tools/harness/compare.py $(FIXTURES)

parity-report: parity-compare
	python parity-tools/harness/report.py

parity: parity-report
```

Each runner is invoked once with all fixtures — amortizes Python import cost and WASM init. Python and TS runs are independent and could parallelize; kept sequential in the Makefile for simplicity.

## Rollout Plan

### Phase A — Scaffolding (MVP)

- Implement `discover.py`, `run_python.py`, `run_typescript.ts`, `compare.py`, `report.py`, `Makefile`.
- Ship `exclusions.yaml` prefilled from known experimental/UI modules.
- Backfill `@parity` tags for `panchanga/drik.py` only.
- Write 5 fixtures (tithi, nakshatra, yoga, karana, vara) using reference inputs from `pvr_tests.py`.
- **Exit criterion:** `make parity` runs end-to-end and produces a non-empty `report.md` for drik.

### Phase B — Tag backfill

- Add `@parity` tags across every non-excluded Python module.
- Resolve all `broken_tag` entries from discovery (either fix the tag or delete the claim).
- **Exit criterion:** `broken_tag` count = 0; `missing_ts` count is stable and documented as the known-unported backlog.

### Phase C — Fixture expansion (follow-up, out of scope for this project)

- Prioritize by chapter in `pvr_tests.py` (already has Jagannatha Hora–validated reference cases).
- Target coverage ≥ 80% of discoverable functions. Exact target set at the start of Phase C based on Phase B output.
- Driven continuously by the report — Phase C has no hard end date.

**This project delivers Phase A + Phase B.** Phase C is explicitly follow-up work.

## Design Decisions & Rationale

1. **Harness-first, no separate static audit.** The harness answers the only question that matters (do outputs agree?) and naturally produces the audit as a side effect (`missing_ts`, `no_fixture` buckets). A pure-AST audit adds a second tool that partially duplicates what discovery already does.
2. **`@parity` tags live with functions, not in a central YAML.** Tags surface naming drift immediately (rename a function, you see the tag, you fix it). A central map silently rots.
3. **Runtime Python introspection, not pure AST.** `yoga.py` and similar modules register items dynamically; AST would miss them. `importlib`+`inspect` is the only reliable enumeration.
4. **Structure-tagged fixture JSON (`__type: "Place"`).** Coercion happens in the runners, not per-fixture. Fixtures stay readable and self-describing.
5. **Per-fixture tolerance with required rationale.** Prevents silent tolerance creep. Every relaxed tolerance is justified in-file.
6. **Python is ground truth, but optional `expected` ground truth supported.** When Jagannatha Hora published values exist (as in `pvr_tests.py`), both sides can be validated against them — catches cases where Python itself drifted.

## Known Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `swe.calc_ut()` JS wrapper intermittently returns zeroed data (known bug) | Runner uses direct `SweModule.ccall('swe_calc_ut', ...)` per memory note; comparison flags NaN/zero mismatches loudly |
| Moshier vs JPL ephemeris gives ~1 min sunrise diff | Tolerance for time-of-day values set to 60s where appropriate, with `tolerance_rationale` explaining |
| TS sync path uses Sun as Lagna proxy (affects 17/22 raasi dhasas) | Fixtures for affected dhasas documented as "expected divergence until sync ascendant available"; categorized separately in the report |
| `tsx` import of TS module requires running inside `pyjhora-web/` for path aliases | Makefile `cd`s into `pyjhora-web/` before invoking the TS runner |
| Python `next_solar_eclipse` has `geopos=(lat, lon, 0)` swapped bug | Fixture marks the Python side as buggy; the case's `expected` pins TS correctness |

## Out of Scope

- UI parity (`jhora/ui/**` → `pyjhora-web/src/components`). Different frameworks, behavioral equivalence only meaningful at the page-functional-test level.
- Prediction modules (`horoscope/prediction/**`), flagged experimental in CLAUDE.md.
- Experimental ephemeris modules (`surya_sidhantha.py`, `khanda_khaadyaka.py`).
- CI integration. Harness runs locally; CI wiring can be added later once the report format is stable.
- Performance benchmarking. Harness measures correctness, not speed.

## Success Criteria

- `make parity` runs to completion and produces `report.md`.
- Every non-excluded Python module shows up in `discovery.json`.
- `broken_tag` count = 0 after Phase B.
- Drik module (Phase A seed) shows zero divergences on the 5 seed fixtures, or documented expected divergences with rationale.
- Any new Python function added without a `@parity` tag (or without resolving as excluded) fails the next `make parity` loudly enough that a reviewer notices.
