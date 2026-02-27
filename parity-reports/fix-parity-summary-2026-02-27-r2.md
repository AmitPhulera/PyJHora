# Fix Parity Results — Round 5

**Report used**: parity-reports/parity-report-2026-02-27.md
**Compared with**: parity-reports/parity-report-2026-02-26-r3.md
**Branch**: fix/parity-2026-02-27-r2
**PR**: https://github.com/AmitPhulera/PyJHora/pull/19

## Stats
| Metric | Count |
|--------|-------|
| Total issues in report | 15 |
| Issues fixed (dhasa) | 8 |
| Issues verified already correct | 3 |
| Issues skipped (deferred) | 4 |
| Yoga functions ported | 115 (2 orchestrators + 113 JD/place wrappers) |
| Persistent issues resolved | 0 (all new issues) |
| Commits created | 12 |
| Merge commits | 5 |
| Tests passing | 2125 / 2125 |
| Files changed | 12 |
| Lines added | ~1200 |
| Lines removed | ~140 |

## Work Packages
| WP | Module(s) | Issues | Fixed | Skipped | Branch |
|----|-----------|--------|-------|---------|--------|
| 1 | shastihayani + sataabdika + shodasottari + shattrimsa | 4 | 3 | 1 | worktree-agent-af22b0b2 |
| 2 | mandooka + narayana + shoola + chara + varnada | 5 | 4 | 1 | worktree-agent-af105662 |
| 3 | charts (vimsopaka) | 1 | 0 (already ported) | 0 | worktree-agent-ae1e0dc1 |
| 4 | drik/chakra (nextSolarDate) | 1 | 1 | 0 | worktree-agent-ab6feb88 |
| 5 | yoga.ts (orchestrators) | 9 | 2 ported, 6 verified, 1 legacy | 0 | worktree yoga-1 |
| 6 | yoga-jd-wrappers.ts (NEW) | 113 | 113 | 0 | worktree yoga-2 |

## Commits
| Hash | Message |
|------|---------|
| 1146b56 | fix(parity): change shastihayani dhasaCycles from 1 to 3 for 180-year span |
| 1201b17 | fix(parity): remove currentLord reset between cycles in sataabdika |
| 3f7b4e4 | fix(parity): remove currentLord reset between cycles in shodasottari |
| efe097e | fix(parity): use HOUSE_STRENGTHS matrix in mandooka duration strength check |
| 69c2526 | fix(parity): add varsha narayana dhasa bhukthi function |
| c27437a | fix(parity): use stored first-cycle durations for shoola second cycle |
| ba1e8aa | fix(parity): wire charaMethod parameter to use PVN Rao duration |
| a8297e6 | fix(parity): use accurate nextSolarDate in chakra.ts instead of approximation |
| 3aa0a75 | fix(parity): add getYogaDetails/getYogaDetailsForAllCharts orchestrators to yoga.ts |
| 9b69c5e | fix(parity): add 113 yoga JD/place wrapper functions |
| 8a01406 | fix(parity): re-export yoga JD/place wrappers from yoga.ts |

## Key Bug Fixes
- **shastihayani.ts dhasaCycles**: Was `1` (60-year span) instead of `3` (180-year span) — produced only 1/3 of expected dasha periods
- **sataabdika.ts cycle reset**: Incorrectly reset `currentLord` between tribhagi cycles — cycles 2+ started from wrong lord
- **shodasottari.ts cycle reset**: Same cycle reset bug as sataabdika, in tribhagi variant only
- **mandooka.ts strength check**: Used simplified `houseOfLord === sign` instead of `HOUSE_STRENGTHS_OF_PLANETS[lord][house] === STRENGTH_OWN_SIGN` matrix lookup
- **narayana.ts varsha variant**: Missing `getVarshaNarayanaDashaBhukti()` — ported with 3x duration, factor/360, 360 life span limit
- **shoola.ts second cycle**: Hardcoded `12 - 9 = 3` instead of using stored first-cycle duration values
- **chara.ts charaMethod**: `charaMethod=2` wasn't wired to use PVN Rao duration calculation with co-lordship handling
- **chakra.ts nextSolarDate**: Used local `nextSolarDateApprox` instead of accurate `nextSolarDate` from drik.ts

## Verified Already Correct
| Issue | Finding |
|-------|---------|
| shattrimsa-1 | Report error: Python uses `%27` not `%28`. TS is correct. |
| charts-2 (vimsopaka) | All 11 vimsopaka/vaiseshikamsa functions already ported. |
| drik-1 (nextSolarDate) | Sync function already exists in drik.ts. Applied to chakra.ts consumer. |

## Yoga Module Results
| Category | Count | Status |
|----------|-------|--------|
| Orchestrator functions | 2 | Ported (getYogaDetails, getYogaDetailsForAllCharts) |
| YOGA_FUNCTION_REGISTRY | 92 entries | Created (maps Python names → TS functions) |
| JD/place wrappers | 113 | Ported in yoga-jd-wrappers.ts (878 lines) |
| Calc functions (inlined) | 94 | Already exist — logic inlined in TS |
| Legacy functions | 3 | Skipped (_kalpadruma_old, _gaja_old, get_yoga_resources) |
| New tests | 5 | Added for orchestrators |

## Skipped Issues
| Task ID | Function(s) | Reason |
|---------|-------------|--------|
| charts-1 | 24 named chart wrappers | Cosmetic — all accessible via getDivisionalChart() |
| house-1 | 7 JD/place convenience wrappers | All have position-based equivalents |
| varnada-1 | getVarnadaLagna() | Already equivalent to Python's BV Raman method |
| yoga legacy | _kalpadruma_old, _gaja_old, get_yoga_resources | Legacy/IO functions |

## Combined Results (Round 1 + Round 2 + Round 3 + Round 4 + Round 5)
| Metric | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 | Total |
|--------|---------|---------|---------|---------|---------|-------|
| Issues fixed | 10 | 18 | 40+ | 13 | 8+115 | 204+ |
| Commits | 8 | 4 | 11 | 12 | 12 | 47 |
| Files changed | 14 | 8 | 13 | 8 | 12 | 55 |
| Lines added | 913 | 2147 | 2427 | 1479 | ~1200 | ~8166 |
| Tests passing | 2083 | 2083 | 2120 | 2120 | 2125 | 2125 |

## Next Steps
- [ ] Review the PR: https://github.com/AmitPhulera/PyJHora/pull/19
- [ ] Run `/parity-report` again to measure improvement (target: ~90%+ effective)
- [ ] Plan separate epic for remaining LOW priority items (charts-1, house-1)
