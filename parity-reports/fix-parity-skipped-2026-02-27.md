# Fix Parity — Skipped Issues (2026-02-27)

## Skipped: yoga-1 — `dhana_yoga_129` through `dhana_yoga_293`
**Reason**: ~165 specialized wealth yoga wrapper functions. Each is a small function checking specific planetary combinations for financial prosperity. Porting all 165 is a dedicated epic (estimated 2000+ lines of new TS code).
**Options**:
- Create a separate epic ticket for "Port remaining yoga.py functions"
- Use a code generation approach (many follow a similar pattern)
- Port only the most commonly used dhana yogas first
**Impact**: No impact on currently ported yoga functions (all 145 core yogas match 100%). These are supplementary wealth analysis functions used for detailed financial horoscope reports.

## Skipped: yoga-2 — `parivraja_yoga`, `arishta_yoga`, etc.
**Reason**: ~90 specialized yogas covering renunciation (parivraja), affliction (arishta), raja sambandha, and other advanced categories. Each requires careful porting of astrological logic.
**Options**:
- Port in batches grouped by category (parivraja: ~15, arishta: ~20, raja sambandha: ~25, etc.)
- Combine with yoga-1 into a single "yoga.py complete port" epic
**Impact**: Advanced yoga analysis unavailable in TS. Basic horoscope yoga analysis (145 ported functions) is unaffected.

## Skipped: charts-1 — Individual chart entry functions (`rasi_chart`, `hora_chart`, etc.)
**Reason**: 24 individual chart functions (e.g., `rasi_chart()`, `hora_chart()`, `drekkana_chart()`) are not exported as named functions in TS. All are accessible via `getDivisionalChart(jd, place, factor, method)` which is the TS architectural improvement over Python's per-chart functions.
**Options**:
- Add thin wrapper exports: `export function rasiChart(...) { return getDivisionalChart(..., 1, 0); }`
- Document the mapping from Python function names to getDivisionalChart parameters
**Impact**: Zero functional impact. All chart calculations work correctly via getDivisionalChart(). This is purely an API discoverability improvement.

## Skipped: house-1 — JD/place convenience wrappers
**Reason**: 7 functions that take `(jd, place)` and compute planet positions internally before calling the core logic. All have position-based equivalents already ported. The JD/place variants are convenience functions for callers who haven't pre-computed positions.
**Options**:
- Add wrappers that call `planetPositions(jd, place)` then delegate to the existing position-based functions
- Could be auto-generated since the pattern is identical for all 7
**Impact**: Zero functional impact. All core stronger_planet/rasi logic is fully ported and tested. Only missing the convenience of passing JD/place directly.

## Skipped: shattrimsa-1 — nakshatra mod base
**Reason**: The parity report incorrectly stated that Python uses `(nak + 1) % 28` (28-star cycle). After reading the Python source `shattrimsa_sama.py`, it actually uses `(nak+1*count_direction)%27` — a 27-star cycle. The `%28` pattern belongs to `shastihayani.py`, not `shattrimsa_sama.py`. The TS implementation is already correct.
**Impact**: None — no bug exists.

## Skipped: varnada-1 — varnada lagna calculation
**Reason**: The TS `getVarnadaLagna()` is functionally equivalent to Python's `_varnada_lagna_bv_raman()` (BV Raman method, `varnada_method=1`). Both implement the same algorithm: count from Aries/Pisces based on odd/even, sum/diff based on same/different parity, final count with lagna-based direction.
**Impact**: None — TS produces correct results matching Python's BV Raman method.
