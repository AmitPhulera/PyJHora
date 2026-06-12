# PyJhora Parity Harness

Cross-validation harness: runs the Python implementation (`src/jhora/`) and the
TypeScript port (`pyjhora-web/src/core/`) against shared JSON fixtures and
flags divergences.

## Running

```bash
make parity          # Run full pipeline: discover → run Python + TS → compare → report
make parity-test     # Run the harness's own unit tests
```

Output: `parity-tools/harness/report.md` with four sections:

1. **Diverges** — function pairs whose outputs don't match within tolerance
2. **Missing TS partner** — Python functions with no `@parity` tag or a tag pointing at a non-existent TS export
3. **No fixture yet** — tagged pairs that need a fixture written
4. **Runtime errors** — per-case exceptions

## Adding a new parity pair

1. **Tag the Python function.** Add above the `def`:

   ```python
   # @parity: ts=@/core/path/to/module::tsExportName
   def some_function(...):
       ...
   ```

2. **Tag the TypeScript function.** Add above the `export`:

   ```typescript
   // @parity: py=some_function
   export function tsExportName(...) { ... }
   ```

3. **Write a fixture.** Create
   `parity-tools/harness/fixtures/<python-module-path>/<function>.json`:

   ```json
   {
     "python_target": "jhora.path.to.module.some_function",
     "typescript_target": "@/core/path/to/module::tsExportName",
     "setup": {"ayanamsa": "LAHIRI"},
     "cases": [
       {
         "id": "case_1",
         "description": "What this case tests",
         "inputs": {
           "jd": 2441469.67778,
           "place": {
             "__type": "Place",
             "value": {"name": "Machilipatnam", "latitude": 16.18, "longitude": 81.13, "timezone": 5.5}
           }
         }
       }
     ]
   }
   ```

4. **Run `make parity`.** The new pair should appear under "Diverges" (if they
   differ) or nowhere (if they agree).

## Tagged input types

- `{"__type": "Place", "value": {name, latitude, longitude, timezone}}`
- `{"__type": "Date", "value": {year, month, day}}`

Add new tagged types by extending `parity-tools/harness/coercion.py` and
`pyjhora-web/src/parity/coercion.ts` in lockstep.

## Tolerance

Defaults (in `compare.py`): `float_abs=1e-6`, `float_rel=1e-9`.

To override per fixture, add a `tolerance` block + `tolerance_rationale`:

```json
{
  "tolerance": {"float_abs": 1e-3},
  "tolerance_rationale": "Sunrise time differs ~1 min between Moshier and JPL ephemeris."
}
```

Rationale is required when overriding — prevents silent tolerance creep.

Known systemic source of drift: Python uses `FLG_SWIEPH` (JPL ephemeris files),
the TS WASM build uses `FLG_MOSEPH` (Moshier theory) — arcsecond-level position
differences that translate to sub-second end-time differences, amplified where
results feed back into evaluation points.

## Known missing TS counterparts (post Phase B)

After the Phase B tag backfill (~970 tagged pairs), the remaining `missing_ts`
entries fall into these categories:

- **Private helpers folded into TS internals** — Python `_*` helpers (yoga
  `_*_yoga_calculation`, dhasa `_antardhasa`/`_get_dhasa_dict`, drishti
  movable/fixed/dual helpers) whose logic exists in TS but as non-exported
  module-private functions.
- **I/O and environment functions in `utils.py`** — geolocation (geopy,
  Nominatim, IP lookup), city-database writers, language-resource loaders
  (`set_language`, `get_resource_messages`). Browser TS handles these
  differently or not at all.
- **Per-D chart dispatchers in `charts.py`** — `hora_chart`, `navamsa_chart`,
  etc. TS dispatches inside `getDivisionalChart`; no per-chart exports.
- **Tajaka annual chart casting** — `varsha_pravesh`, `annual_chart`,
  `maasa_pravesh`, lord-of-year/month. Not yet ported.
- **Vratha festival search** — sankranti dates, festival-database lookups,
  conjunction searches. Partially ported via `../data/festivals`.
- **Old/deprecated variants** — `*_old` functions kept in Python for reference.
- **Python module-level lambdas** — counted by discovery but not taggable
  (e.g. `kendras`, `amavasya_dates`); TS equivalents often exist.

## Exclusions

`parity-tools/exclusions.yaml` lists Python paths not checked for parity
(UI, experimental modules, tests). Edit to exclude new paths, with a `reason`.

## Architecture

See `docs/superpowers/specs/2026-04-20-pyjhora-parity-harness-design.md`.
