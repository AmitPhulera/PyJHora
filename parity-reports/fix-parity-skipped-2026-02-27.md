# Parity Fix Skipped Tasks — 2026-02-27

## yoga.ts — Missing Core Functions

### Task 1: `_vipareeta_yoga_calculation` (Python L3424)
**Status**: SKIPPED — Logic already inlined in TS.

The shared calculation for vipareetha (harsha/sarala/vimala) yogas is already inlined
in the individual TS functions `harshaYoga` (L1200), `saralaYoga` (L1211),
`vimalaYoga` (L1222). Each one independently computes the house lord and checks
placement, exactly matching the Python `_vipareeta_yoga_calculation` logic:
- Get ascendant house
- Calculate target house index (6th/8th/12th)
- Get lord of that house
- Check if lord is placed in that house

No refactoring to extract a shared function was done as the existing pattern is
consistent and tested.

### Task 2: `_malika_yoga_calculation` (Python L3816)
**Status**: SKIPPED — Logic already exists as `malikaYogaBase` in TS.

The TS already has `malikaYogaBase` (L1266) which is the exact equivalent of
Python's `_malika_yoga_calculation`. All 12 malika yoga variants call it with
different starting house indices. The logic matches:
- Define 7 target houses from start
- Check all Sun-to-Saturn planets are within the 7-house span
- Check all 7 houses are occupied

### Task 3: `_sankhya_yoga_calculation` (Python L4544)
**Status**: SKIPPED — Logic already inlined in TS.

The sankhya yoga functions (vallakiYoga, damaYoga, kedaraYoga, sulaYoga, plus
veenaaYoga, daamaYoga, paasaYoga, kedaaraYoga, soolaYoga, yugaYoga, golaYoga)
each inline the same pattern: count distinct signs occupied by Sun-to-Saturn
planets and compare to required count. This matches Python's
`_sankhya_yoga_calculation(required_count=N)`.

### Task 4: `_dhana_yogas_123_128_calculation` + `dhana_yoga_123_128` (Python L5114, L5172)
**Status**: SKIPPED — Already fully implemented in TS.

`dhanaYoga123_128` (L4557) and `dhanaYoga123_128FromPlanetPositions` (L4598)
already exist in TS with the complete logic for all 6 sub-conditions (yogas 123-128).

### Task 5: `_yukthi_samanwithavagmi_yoga_154_calculation` (Python L6126)
**Status**: SKIPPED — Already fully implemented in TS.

`yukthiSamanwithavagmiYoga` (L4196) and
`yukthiSamanwithavagmiYogaFromPlanetPositions` (L4222) already exist with both
condition A (L2 joins benefic in kendra/trikona) and condition B (L2 exalted
with Jupiter).

### Task 6: `_bhratruvriddhi_yoga_calculation` (Python L7089)
**Status**: SKIPPED — Already fully implemented in TS.

`bhratruvridddhiYoga` (L4308) and `bhratruvridddhiYogaFromPlanetPositions` (L4344)
already exist with the complete logic for 3rd lord, Mars, and house-3 benefic checks.

### Legacy Functions (Skip per instructions)
- `_kalpadruma_yoga_from_planet_positions_old` — Legacy variant, superseded by `kalpadrumaYoga`
- `_gaja_yoga_calculation_old` — Legacy variant, superseded by `gajaYoga`
- `get_yoga_resources` — I/O function for loading yoga JSON from filesystem; handled by UI layer in browser

### Task 7: `get_yoga_details` + `get_yoga_details_for_all_charts` (Python L87, L54)
**Status**: IMPLEMENTED — New functions added to TS.

Implemented as:
- `getYogaDetails(planetPositions, divisionalChartFactor, yogaMessages?)` — Evaluates all yoga functions against given positions
- `getYogaDetailsForAllCharts(getPositionsForChart, divisionalChartFactor?, yogaMessages?)` — Iterates over all/specified charts
- `YOGA_FUNCTION_REGISTRY` — Maps Python snake_case function names to TS FromPlanetPositions functions (92 entries matching yoga_msgs_en.json)
