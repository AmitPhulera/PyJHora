# Fix Parity — Skipped Issues (2026-02-27)

## Round 5 Skips

### Skipped: charts-1 — Individual chart entry functions (`rasi_chart`, `hora_chart`, etc.)
**Reason**: 24 individual chart functions are not exported as named functions in TS. All are accessible via `getDivisionalChart(jd, place, factor, method)`.
**Impact**: Zero functional impact. Purely an API discoverability improvement.

### Skipped: house-1 — JD/place convenience wrappers
**Reason**: 7 functions that take `(jd, place)` and compute planet positions internally. All have position-based equivalents already ported.
**Impact**: Zero functional impact.

### Skipped: shattrimsa-1 — nakshatra mod base
**Reason**: Parity report error. Python actually uses `%27`, not `%28`. TS is already correct.
**Impact**: None — no bug exists.

### Skipped: varnada-1 — varnada lagna calculation
**Reason**: TS `getVarnadaLagna()` is functionally equivalent to Python's BV Raman method.
**Impact**: None — TS produces correct results.

## Yoga Module Skips

### Skipped: `_vipareeta_yoga_calculation` (Python L3424)
**Status**: Logic already inlined in TS `harshaYoga`, `saralaYoga`, `vimalaYoga`.

### Skipped: `_malika_yoga_calculation` (Python L3816)
**Status**: Logic already exists as `malikaYogaBase` in TS.

### Skipped: `_sankhya_yoga_calculation` (Python L4544)
**Status**: Logic already inlined in individual sankhya yoga functions.

### Skipped: `_dhana_yogas_123_128_calculation` + `dhana_yoga_123_128` (Python L5114, L5172)
**Status**: Already fully implemented as `dhanaYoga123_128` in TS.

### Skipped: `_yukthi_samanwithavagmi_yoga_154_calculation` (Python L6126)
**Status**: Already fully implemented as `yukthiSamanwithavagmiYoga` in TS.

### Skipped: `_bhratruvriddhi_yoga_calculation` (Python L7089)
**Status**: Already fully implemented as `bhratruvridddhiYoga` in TS.

### Skipped: Legacy functions
- `_kalpadruma_yoga_from_planet_positions_old` — Legacy variant, superseded by `kalpadrumaYoga`
- `_gaja_yoga_calculation_old` — Legacy variant, superseded by `gajaYoga`
- `get_yoga_resources` — I/O function for loading yoga JSON; handled by UI layer in browser
