/**
 * Aayu (Longevity) Dhasa System
 * Ported from PyJHora aayu.py
 *
 * Implements Pindayu, Nisargayu, and Amsayu longevity dasha calculations
 * with harana (strength reduction) and bharana (strength increase) factors.
 *
 * Method = 1 => Santhanam (Ref: Santhanam, Brihat Parasara Hora Shastra)
 * Method = 2 => Varahamihira (Ref: https://medium.com/thoughts-on-jyotish/...)
 */

import {
  PINDAYU_FULL_LONGEVITY,
  NISARGAYU_FULL_LONGEVITY,
  PLANET_DEEP_EXALTATION_LONGITUDES,
  HOUSE_STRENGTHS_OF_PLANETS,
  STRENGTH_EXALTED,
  STRENGTH_DEBILITATED,
  STRENGTH_OWN_SIGN,
  SIDEREAL_YEAR,
  PLANET_NAMES_EN,
  ASCENDANT_SYMBOL,
  NATURAL_BENEFICS,
} from '../../constants';
import type { PlanetPosition } from '../../horoscope/charts';
import {
  planetsInCombustion,
  planetsInRetrograde,
  beneficsAndMalefics,
  getDivisionalChart,
  orderPlanetsFromKendrasOfRaasi,
} from '../../horoscope/charts';
import {
  getRelativeHouseOfPlanet,
  getHouseOwnerFromPlanetPositions,
  getPlanetToHouseDict,
  getHouseToPlanetList,
  getStrongerPlanetFromPositions,
  getStrongerRasi,
  getGrahaDrishtiPlanetsOfPlanet,
  buildHouseChart,
} from '../../horoscope/house';
import { julianDayToGregorian } from '../../utils/julian';
import { normalizeDegrees } from '../../utils/angle';

// ============================================================================
// CONSTANTS
// ============================================================================

const STRENGTH_OWNER = STRENGTH_OWN_SIGN; // Python: const._OWNER_RULER = 5
const STRENGTH_ENEMY = 1;
const TOTAL_PINDAYU = PINDAYU_FULL_LONGEVITY.reduce((a, b) => a + b, 0);  // 127
const TOTAL_NISARGAYU = NISARGAYU_FULL_LONGEVITY.reduce((a, b) => a + b, 0); // 120
const TOTAL_AMSAYU = 120;

// ============================================================================
// TYPES
// ============================================================================

export interface AayuDashaPeriod {
  lord: number | string;
  lordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface AayuBhuktiPeriod {
  dashaLord: number | string;
  bhuktiLord: number | string;
  bhuktiLordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface AayuResult {
  aayurType: number; // 0=Pindayu, 1=Nisargayu, 2=Amsayu
  aayurTypeName: string;
  totalLongevity: number;
  mahadashas: AayuDashaPeriod[];
  bhuktis: AayuBhuktiPeriod[];
}

type HaranaFactors = Record<number | string, number>;

/**
 * Computed global constants for harana calculations.
 * Passed as a parameter instead of using module-level globals (as Python does).
 */
interface HaranaGlobals {
  subhaGrahas: number[];
  asubhaGrahas: number[];
  /** Map from planet id to relative bhava house (1-12) */
  bhavaHouses: Record<number | string, number>;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatJdAsDate(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
  return `${date.year}-${pad(date.month)}-${pad(date.day)} ${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`;
}

function lordName(lord: number | string): string {
  if (lord === ASCENDANT_SYMBOL || lord === -1) return 'Lagna';
  return PLANET_NAMES_EN[lord as number] ?? `Planet${lord}`;
}

/**
 * Compute bhava houses: map each planet to its relative house (1-12) from ascendant.
 * Mirrors Python's charts.bhava_houses(jd, place).
 */
function computeBhavaHouses(positions: PlanetPosition[]): Record<number | string, number> {
  const ascHouse = positions[0]!.rasi;
  const result: Record<number | string, number> = {};
  for (const pos of positions) {
    const key = pos.planet === -1 ? ASCENDANT_SYMBOL : pos.planet;
    result[key] = getRelativeHouseOfPlanet(ascHouse, pos.rasi);
  }
  return result;
}

/**
 * Compute harana globals from positions.
 * Mirrors Python's _get_global_constants(jd, place).
 *
 * Note: beneficsAndMalefics requires tithi; we pass 15 as a reasonable default
 * (Sukla Purnima) when tithi is not available. The Python version computes this
 * from jd/place but TS aayu doesn't have jd/place in all contexts.
 */
function computeHaranaGlobals(
  positions: PlanetPosition[],
  subhaGrahas?: number[],
  asubhaGrahas?: number[],
): HaranaGlobals {
  const bhavaHouses = computeBhavaHouses(positions);
  if (subhaGrahas && asubhaGrahas) {
    return { subhaGrahas, asubhaGrahas, bhavaHouses };
  }
  // Fallback: use provided or default benefics/malefics
  return {
    subhaGrahas: subhaGrahas ?? [4, 5],
    asubhaGrahas: asubhaGrahas ?? [0, 2, 6],
    bhavaHouses,
  };
}

// ============================================================================
// HARANA (STRENGTH REDUCTION) FUNCTIONS
// ============================================================================

/**
 * Astangata Harana: Reduce by 1/2 for combusted or retrograde planets.
 * Does not apply to Venus (5) and Saturn (6).
 * This harana does not depend on the method (same for Santhanam and Varahamihira).
 */
export function astangataHarana(positions: PlanetPosition[]): HaranaFactors {
  const factors: HaranaFactors = { [ASCENDANT_SYMBOL]: 1.0 };
  for (let p = 0; p < 7; p++) factors[p] = 1.0;

  const combusted = planetsInCombustion(positions);
  const retrograde = planetsInRetrograde(positions);
  const ignore = [5, 6]; // Venus, Saturn

  for (const p of combusted) {
    if (!ignore.includes(p)) factors[p] = 0.5;
  }
  for (const p of retrograde) {
    if (!ignore.includes(p)) factors[p] = 0.5;
  }
  return factors;
}

/**
 * Shatru Kshetra Harana: Reduce by 1/3 for planets in enemy sign.
 * Does not apply to retrograde planets.
 *
 * @param treatMarsAsStrong - If true (Varahamihira/method=2), Mars is exempt.
 *                            If false (Santhanam/method=1), Mars loses in enemy sign too.
 * @param method - 1=Santhanam (Mars NOT exempt), 2=Varahamihira (Mars exempt)
 */
export function shatruKshetraHarana(
  positions: PlanetPosition[],
  treatMarsAsStrong: boolean = true,
  method: number = 2,
): HaranaFactors {
  // Method=1 forces treatMarsAsStrong=false per Python line 70
  if (method === 1) treatMarsAsStrong = false;

  const factors: HaranaFactors = { [ASCENDANT_SYMBOL]: 1.0 };
  for (let p = 0; p < 7; p++) factors[p] = 1.0;

  const retrograde = planetsInRetrograde(positions);

  for (let p = 0; p < 7; p++) {
    const pos = positions[p + 1];
    if (!pos) continue;
    const strength = HOUSE_STRENGTHS_OF_PLANETS[p]?.[pos.rasi] ?? 0;
    if (strength === STRENGTH_ENEMY) {
      if (treatMarsAsStrong && p === 2) continue; // Mars exempt
      if (retrograde.includes(p)) continue; // Retrograde exempt
      factors[p] = 2 / 3;
    }
  }
  return factors;
}

/**
 * Shatru Kshetra Harana (Santhanam variant):
 * Same as generic but Mars is NOT treated as strong in enemy sign.
 * "Mars also does lose in an enemy's sign" - per Santhanam.
 */
export function shatruKshetraHaranaSanthanam(
  positions: PlanetPosition[],
): HaranaFactors {
  return shatruKshetraHarana(positions, false, 1);
}

/**
 * Chakrapata Harana (Varahamihira/method=2): Reduce based on planet's position above horizon.
 * Houses 7-12 (relative to Asc) get progressive reduction.
 * Benefics get less reduction than malefics.
 */
export function chakrapataHarana(
  positions: PlanetPosition[],
  subhaGrahas: number[],
  asubhaGrahas: number[],
): HaranaFactors {
  const factors: HaranaFactors = { [ASCENDANT_SYMBOL]: 1.0 };
  for (let p = 0; p < 7; p++) factors[p] = 1.0;

  const ascHouse = positions[0]!.rasi;
  // Reduction factors for houses 7-12 (relative): [subha_factor, asubha_factor]
  const subhaAsubhaFactors: Record<number, [number, number]> = {
    12: [0, 0.5],
    11: [0.5, 0.75],
    10: [2 / 3, 5 / 6],
    9: [3 / 4, 7 / 8],
    8: [4 / 5, 9 / 10],
    7: [5 / 6, 11 / 12],
  };

  for (const pos of positions) {
    const p = pos.planet;
    if (p < 0 || p > 6) continue;
    const relHouse = getRelativeHouseOfPlanet(ascHouse, pos.rasi);
    if (relHouse <= 6) continue;

    const entry = subhaAsubhaFactors[relHouse];
    if (!entry) continue;

    if (subhaGrahas.includes(p)) {
      factors[p] = entry[0];
    } else if (asubhaGrahas.includes(p)) {
      factors[p] = entry[1];
    }
  }
  return factors;
}

/**
 * Chakrapata Harana (Santhanam variant / Vyayadi Harana):
 * Uses distance from bhava start instead of fixed factor table.
 *
 * Formula: For each planet in houses 7-12:
 *   dp = distance of planet from bhava start (within sign)
 *   loss = 1.0 - (1.0 / ((14 - bh) - (dp / bhava_length)))
 *   where bh = relative house number (7-12), bhava_length = 30 degrees
 *
 * @param positions - Planet positions
 * @param bhavaHouses - Map of planet id -> relative house (1-12)
 * @param bhavaStartsWithAscendant - If true, bhava starts at ascendant degree
 */
export function chakrapataHaranaSanthanam(
  positions: PlanetPosition[],
  bhavaHouses: Record<number | string, number>,
  bhavaStartsWithAscendant: boolean = false,
): HaranaFactors {
  const factors: HaranaFactors = { [ASCENDANT_SYMBOL]: 1.0 };
  for (let p = 0; p < 7; p++) factors[p] = 1.0;

  const ascLong = positions[0]!.longitude;
  const bhavaLength = 30.0;

  let bhavaStart: number;
  if (bhavaStartsWithAscendant) {
    bhavaStart = ascLong;
  } else {
    bhavaStart = ((ascLong - 15) % 30 + 30) % 30;
  }

  // Process first 8 entries in positions (Lagna + 7 planets)
  for (let i = 0; i < Math.min(8, positions.length); i++) {
    const pos = positions[i]!;
    const p = pos.planet;
    const key = p === -1 ? ASCENDANT_SYMBOL : p;
    const bh = bhavaHouses[key];
    if (bh === undefined || bh <= 6) continue;

    const pLong = pos.longitude;
    // Distance from bhava start within the sign
    let dp: number;
    if (pLong > bhavaStart) {
      dp = (pLong - bhavaStart) % 30;
    } else {
      dp = (30 - bhavaStart + pLong) % 30;
    }

    const divisor = (14 - bh) - (dp / bhavaLength);
    if (divisor !== 0) {
      factors[key] = 1.0 - (1.0 / divisor);
    }
  }

  return factors;
}

/**
 * Krurodaya Harana (Varahamihira/method=2):
 * Applied when a malefic rises in Lagna.
 * Reduction based on Lagna longitude fraction.
 *
 * Uses subha_grahas and asubha_grahas for benefic/malefic classification.
 */
export function krurodayaHarana(
  positions: PlanetPosition[],
  subhaGrahas: number[],
  asubhaGrahas: number[],
): HaranaFactors {
  const factors: HaranaFactors = { [ASCENDANT_SYMBOL]: 1.0 };
  for (let p = 0; p < 7; p++) factors[p] = 1.0;

  const ascLong = positions[0]!.rasi * 30 + positions[0]!.longitude;
  const khFraction = 1.0 - ascLong / 360.0;

  const ascHouse = positions[0]!.rasi;

  // Find malefics in lagna (using asubha_grahas, matching Python)
  const maleficsInLagna: Array<{ planet: number; longDiff: number }> = [];
  for (const p of asubhaGrahas) {
    const pos = positions.find(pp => pp.planet === p);
    if (pos && pos.rasi === ascHouse) {
      maleficsInLagna.push({
        planet: p,
        longDiff: pos.longitude - positions[0]!.longitude,
      });
    }
  }

  if (maleficsInLagna.length === 0) return factors;

  // Sort by ascending closeness to lagna (matching Python sort key: x[1] - lagna_long)
  maleficsInLagna.sort((a, b) => a.longDiff - b.longDiff);
  const closestMalefic = maleficsInLagna[0]!.planet;

  // Check if a benefic is in same house as closest malefic AND closer to lagna degree
  const pToH = getPlanetToHouseDict(positions);
  const maleficHouse = pToH[closestMalefic];
  for (const sp of subhaGrahas) {
    const spPos = positions.find(pp => pp.planet === sp);
    if (spPos && pToH[sp] === maleficHouse) {
      const closestMaleficPos = positions.find(pp => pp.planet === closestMalefic);
      if (closestMaleficPos && spPos.longitude < closestMaleficPos.longitude) {
        return factors; // Benefic closer, ignore harana entirely
      }
    }
  }

  // Set harana factors for all malefics in lagna
  const kh1: HaranaFactors = {};
  for (const m of asubhaGrahas) {
    if (pToH[m] === pToH[-1]) { // -1 is ascendant planet id
      kh1[m] = khFraction;
    }
  }

  // Check if any benefic aspects the closest malefic
  const chart = buildHouseChart(positions);
  const aspectedByMalefic = getGrahaDrishtiPlanetsOfPlanet(chart, closestMalefic);
  if (aspectedByMalefic.some(p => subhaGrahas.includes(p))) {
    kh1[closestMalefic] = 0.5 * khFraction;
  }

  // Apply factors
  for (const [k, v] of Object.entries(kh1)) {
    factors[Number(k)] = v;
  }
  return factors;
}

/**
 * Krurodaya Harana (Santhanam variant):
 * Only Saturn (6), Sun (0), Mars (2) are considered malefics (not Rahu/Ketu).
 * Mercury joining malefic is NOT liable to this reduction.
 * Find closest malefic to Lagna degree.
 * If benefic aspects malefic: halve the reduction.
 * If benefic is closer to Lagna than malefic: ignore harana entirely.
 *
 * @param positions - Planet positions
 * @param subhaGrahas - Benefic planets list
 * @param asubhaGrahas - Malefic planets list
 */
export function krurodayaHaranaSanthanam(
  positions: PlanetPosition[],
  subhaGrahas: number[],
  asubhaGrahas: number[],
): HaranaFactors {
  // Santhanam only considers Sun(0), Mars(2), Saturn(6) as malefics for this check
  const malefics = [0, 2, 6];
  const benefics = NATURAL_BENEFICS; // Jupiter(4), Venus(5)

  const factors: HaranaFactors = { [ASCENDANT_SYMBOL]: 1.0 };
  for (let p = 0; p < 7; p++) factors[p] = 1.0;

  const pToH = getPlanetToHouseDict(positions);
  const ascHouse = pToH[-1]; // Ascendant's rasi

  const ascLong = positions[0]!.rasi * 30 + positions[0]!.longitude;
  const khFraction = 1.0 - ascLong / 360.0;

  // Set kh1 for malefics in ascendant house
  const kh1: HaranaFactors = {};
  for (const m of malefics) {
    if (pToH[m] === ascHouse) {
      kh1[m] = khFraction;
    }
  }

  // Find asubha_grahas (from computed list) in ascendant, sorted by closeness to lagna
  const mps: Array<[number, number]> = [];
  for (const p of asubhaGrahas) {
    if (pToH[p] === ascHouse) {
      const pos = positions.find(pp => pp.planet === p);
      if (pos) {
        mps.push([p, pos.longitude]);
      }
    }
  }

  if (mps.length === 0) return factors;

  // Sort by ascending distance to lagna longitude
  const lagnaLong = positions[0]!.longitude;
  mps.sort((a, b) => (a[1] - lagnaLong) - (b[1] - lagnaLong));
  const mp = mps[0]![0]; // Closest malefic to lagna

  // Check if any benefic is in same house as malefic AND closer to lagna degree
  const mpPos = positions.find(pp => pp.planet === mp);
  if (mpPos) {
    const aps = subhaGrahas.filter(sp => {
      if (pToH[sp] !== pToH[mp]) return false;
      const spPos = positions.find(pp => pp.planet === sp);
      return spPos && spPos.longitude < mpPos.longitude;
    });
    if (aps.length > 0) return factors; // Benefic closer, ignore harana
  }

  // Check if any benefic aspects the closest malefic
  const chart = buildHouseChart(positions);
  const aspectedByMp = getGrahaDrishtiPlanetsOfPlanet(chart, mp);
  if (aspectedByMp.some(p => benefics.includes(p))) {
    kh1[mp] = 0.5 * khFraction;
  }

  // Apply factors
  for (const [k, v] of Object.entries(kh1)) {
    factors[Number(k)] = v;
  }
  return factors;
}

/**
 * Bharana (increase factors) -- only for Amsayu.
 * Multiply by 3 for retrograde/exalted/owner; by 2 for vargottama.
 */
export function bharana(positions: PlanetPosition[]): HaranaFactors {
  const factors: HaranaFactors = { [ASCENDANT_SYMBOL]: 1.0 };
  for (let p = 0; p < 7; p++) factors[p] = 1.0;

  const retrograde = planetsInRetrograde(positions);
  const pp9 = getDivisionalChart(positions, 9); // Navamsa
  const pp3 = getDivisionalChart(positions, 3); // Drekkana

  for (let p = 0; p < 7; p++) {
    const pos = positions[p + 1];
    if (!pos) continue;

    const strength = HOUSE_STRENGTHS_OF_PLANETS[p]?.[pos.rasi] ?? 0;
    const isRetro = retrograde.includes(p);
    const isExalted = strength === STRENGTH_EXALTED;
    const isOwner = strength === STRENGTH_OWNER;

    if (isRetro || isExalted || isOwner) {
      factors[p] = 3.0;
      continue; // 3 takes precedence
    }

    // Check vargottama (rasi == navamsa rasi)
    const navPos = pp9[p + 1];
    const drekPos = pp3[p + 1];
    const isVargottama = navPos && pos.rasi === navPos.rasi;
    const isSvaNavamsa = navPos && (HOUSE_STRENGTHS_OF_PLANETS[p]?.[navPos.rasi] ?? 0) === STRENGTH_OWNER;
    const isSvaDrekkana = drekPos && (HOUSE_STRENGTHS_OF_PLANETS[p]?.[drekPos.rasi] ?? 0) === STRENGTH_OWNER;

    if (isVargottama || isSvaNavamsa || isSvaDrekkana) {
      factors[p] = 2.0;
    }
  }
  return factors;
}

// ============================================================================
// BASE LONGEVITY CALCULATIONS
// ============================================================================

/**
 * Apply all harana factors to base longevity values.
 * Matches Python's _apply_harana: takes min of each harana pair, then multiplies base.
 *
 * @param dhasaMethod - 1=Santhanam haranas, 2=Varahamihira haranas (default)
 * @param globals - Precomputed harana globals (bhavaHouses, subha/asubha grahas)
 */
function applyHarana(
  positions: PlanetPosition[],
  baseLongevity: HaranaFactors,
  subhaGrahas: number[],
  asubhaGrahas: number[],
  isAmsayu: boolean = false,
  dhasaMethod: number = 2,
  globals?: HaranaGlobals,
): HaranaFactors {
  // Astangata Harana - does not depend on method
  const ah = astangataHarana(positions);

  // Shatru Kshetra Harana - method affects Mars treatment
  const skh = shatruKshetraHarana(positions, dhasaMethod !== 1, dhasaMethod);

  // Build final harana by taking min of ah and skh for each planet (Python pattern)
  const finalHarana: HaranaFactors = {};
  for (const key of Object.keys(ah)) {
    const k = key === String(ASCENDANT_SYMBOL) ? ASCENDANT_SYMBOL : Number(key);
    finalHarana[k] = Math.min(ah[k] ?? 1.0, skh[k] ?? 1.0);
  }

  // Chakrapata Harana - method selects variant
  let ch: HaranaFactors;
  if (dhasaMethod === 1 && globals) {
    ch = chakrapataHaranaSanthanam(positions, globals.bhavaHouses);
  } else {
    ch = chakrapataHarana(positions, subhaGrahas, asubhaGrahas);
  }
  for (const key of Object.keys(finalHarana)) {
    const k = key === String(ASCENDANT_SYMBOL) ? ASCENDANT_SYMBOL : Number(key);
    finalHarana[k] = Math.min(finalHarana[k] ?? 1.0, ch[k] ?? 1.0);
  }

  // Krurodaya Harana - not applied for Amsayu
  let kh: HaranaFactors = {};
  if (!isAmsayu) {
    if (dhasaMethod === 1) {
      kh = krurodayaHaranaSanthanam(positions, subhaGrahas, asubhaGrahas);
    } else {
      kh = krurodayaHarana(positions, subhaGrahas, asubhaGrahas);
    }
  } else {
    // Default: no reduction
    for (const key of Object.keys(finalHarana)) {
      const k = key === String(ASCENDANT_SYMBOL) ? ASCENDANT_SYMBOL : Number(key);
      kh[k] = 1.0;
    }
  }
  for (const key of Object.keys(finalHarana)) {
    const k = key === String(ASCENDANT_SYMBOL) ? ASCENDANT_SYMBOL : Number(key);
    finalHarana[k] = Math.min(finalHarana[k] ?? 1.0, kh[k] ?? 1.0);
  }

  // Graha Aayu = Base Aayu * min_harana_factor
  const result: HaranaFactors = {};
  for (const key of Object.keys(baseLongevity)) {
    const k = key === String(ASCENDANT_SYMBOL) ? ASCENDANT_SYMBOL : Number(key);
    result[k] = (baseLongevity[k] ?? 0) * (finalHarana[k] ?? 1.0);
  }
  return result;
}

/**
 * Calculate Pindayu/Nisargayu base longevity using Santhanam formula.
 * This is the formula Python actually executes for BOTH methods.
 *
 * When arc > 180: base = full * arc / 360
 * When arc <= 180: base = full - full * arc / 360 = full * (360 - arc) / 360
 */
function santhanamBaseLongevity(
  positions: PlanetPosition[],
  fullLongevity: readonly number[],
): HaranaFactors {
  const baseLongevity: HaranaFactors = {};
  for (let planet = 0; planet < 7; planet++) {
    const pos = positions[planet + 1];
    if (!pos) continue;
    const planetLong = pos.rasi * 30 + pos.longitude;
    const exaltLong = PLANET_DEEP_EXALTATION_LONGITUDES[planet]!;
    const arcOfLongevity = normalizeDegrees(planetLong - exaltLong);
    if (arcOfLongevity > 180.0) {
      baseLongevity[planet] = fullLongevity[planet]! * arcOfLongevity / 360.0;
    } else {
      baseLongevity[planet] = fullLongevity[planet]! - fullLongevity[planet]! * arcOfLongevity / 360.0;
    }
  }
  return baseLongevity;
}

/**
 * Calculate Pindayu base longevity for each planet.
 *
 * Python's _pindayu always delegates to _pindayu_santhanam for both methods.
 * The Santhanam formula is used for base longevity; dhasaMethod only affects haranas.
 *
 * @param dhasaMethod - 1=Santhanam haranas, 2=Varahamihira haranas (default)
 */
export function pindayu(
  positions: PlanetPosition[],
  applyHaranas: boolean = true,
  subhaGrahas: number[] = [4, 5],
  asubhaGrahas: number[] = [0, 2, 6],
  dhasaMethod: number = 2,
  globals?: HaranaGlobals,
): HaranaFactors {
  const baseLongevity = santhanamBaseLongevity(positions, PINDAYU_FULL_LONGEVITY);

  if (applyHaranas) {
    return applyHarana(positions, baseLongevity, subhaGrahas, asubhaGrahas, false, dhasaMethod, globals);
  }
  return baseLongevity;
}

/**
 * Calculate Nisargayu base longevity for each planet.
 *
 * Python's _nisargayu always delegates to _nisargayu_santhanam for both methods.
 * The Santhanam formula is used for base longevity; dhasaMethod only affects haranas.
 *
 * @param dhasaMethod - 1=Santhanam haranas, 2=Varahamihira haranas (default)
 */
export function nisargayu(
  positions: PlanetPosition[],
  applyHaranas: boolean = true,
  subhaGrahas: number[] = [4, 5],
  asubhaGrahas: number[] = [0, 2, 6],
  dhasaMethod: number = 2,
  globals?: HaranaGlobals,
): HaranaFactors {
  const baseLongevity = santhanamBaseLongevity(positions, NISARGAYU_FULL_LONGEVITY);

  if (applyHaranas) {
    return applyHarana(positions, baseLongevity, subhaGrahas, asubhaGrahas, false, dhasaMethod, globals);
  }
  return baseLongevity;
}

/**
 * Calculate Amsayu base longevity for each planet.
 * Includes bharana (strength increase) for Amsayu.
 *
 * @param method - 1=Santhanam formula (planetLong*108)%12, 2=Varahamihira (planetLong*60/200)%12
 * @param dhasaMethod - 1=Santhanam haranas, 2=Varahamihira haranas (default)
 */
export function amsayu(
  positions: PlanetPosition[],
  applyHaranas: boolean = true,
  method: number = 1,
  subhaGrahas: number[] = [4, 5],
  asubhaGrahas: number[] = [0, 2, 6],
  dhasaMethod: number = 2,
  globals?: HaranaGlobals,
): HaranaFactors {
  const baseLongevity: HaranaFactors = {};

  for (let planet = 0; planet < 7; planet++) {
    const pos = positions[planet + 1];
    if (!pos) continue;
    const planetLong = pos.rasi * 30 + pos.longitude;
    if (method === 2) {
      baseLongevity[planet] = ((planetLong * 60) / 200) % 12; // Varahamihira
    } else {
      baseLongevity[planet] = (planetLong * 108) % 12;
    }
  }

  if (applyHaranas) {
    const bh = bharana(positions);
    const ah = applyHarana(positions, baseLongevity, subhaGrahas, asubhaGrahas, true, dhasaMethod, globals);
    const result: HaranaFactors = {};
    for (const key of Object.keys(ah)) {
      const k = Number(key);
      result[k] = (ah[k] ?? 0) * (bh[k] ?? 1.0);
    }
    return result;
  }
  return baseLongevity;
}

// ============================================================================
// LAGNA LONGEVITY
// ============================================================================

/**
 * Calculate lagna longevity (Varahamihira / method=2):
 * Compares rasi lagna lord strength vs navamsa lagna lord strength.
 */
export function lagnaLongevity(
  d1Positions: PlanetPosition[],
  navamsaPositions?: PlanetPosition[],
): number {
  const ascRasi = d1Positions[0]!.rasi;
  const ascLord = getHouseOwnerFromPlanetPositions(d1Positions, ascRasi);
  const ascLong = ascRasi * 30 + d1Positions[0]!.longitude;

  const pp9 = navamsaPositions ?? getDivisionalChart(d1Positions, 9);
  const ascNav = pp9[0]!.rasi;
  const ascNavLord = getHouseOwnerFromPlanetPositions(pp9, ascNav);
  const ascNavLong = ascNav * 30 + pp9[0]!.longitude;

  let lagnaAayu = ascLong / 30.0;
  const rasiStrength = HOUSE_STRENGTHS_OF_PLANETS[ascLord]?.[ascRasi] ?? 0;
  const navStrength = HOUSE_STRENGTHS_OF_PLANETS[ascNavLord]?.[ascNav] ?? 0;

  if (navStrength > rasiStrength) {
    lagnaAayu = ascNavLong / 30.0;
  }
  return lagnaAayu;
}

/**
 * Calculate lagna longevity (Santhanam / method=1):
 * Uses rasi chart only. Computes ascendant navamsa as (asc_rasi + 8) % 12.
 * Compares strength of asc rasi lord vs asc navamsa lord using
 * stronger_planet_from_planet_positions.
 *
 * @param d1Positions - D1 (rasi chart) planet positions
 */
export function lagnaLongevitySanthanam(
  d1Positions: PlanetPosition[],
): number {
  const ascRasi = d1Positions[0]!.rasi;
  const ascRasiLord = getHouseOwnerFromPlanetPositions(d1Positions, ascRasi);
  const ascRasiLong = ascRasi * 30 + d1Positions[0]!.longitude;

  // Santhanam: navamsa = (asc_rasi + 8) % 12
  const ascNava = (ascRasi + 8) % 12;
  const ascNavamsaLord = getHouseOwnerFromPlanetPositions(d1Positions, ascNava);
  const ascNavaLong = ascNava * 30 + Math.floor(ascRasiLong / 30);

  // Compare strength of the two lords
  const sp = getStrongerPlanetFromPositions(d1Positions, ascRasiLord, ascNavamsaLord);

  let lagnaAayu = ascRasiLong / 30.0;
  if (sp === ascNavamsaLord) {
    lagnaAayu = ascNavaLong / 30.0;
  }
  return lagnaAayu;
}

// ============================================================================
// AAYUR TYPE DETERMINATION
// ============================================================================

/**
 * Determine strongest among Lagna, Sun, Moon for aayur type selection.
 * Mirrors Python's _stronger_of_lagna_sun_moon.
 *
 * Returns: 0 (Sun stronger), 1 (Moon stronger), or ASCENDANT_SYMBOL (Lagna stronger)
 */
export function strongerOfLagnaSunMoon(
  positions: PlanetPosition[],
): number | string {
  // First: compare Sun (0) vs Moon (1) using stronger_planet
  const sp = getStrongerPlanetFromPositions(positions, 0, 1);

  // Then compare the winner's rasi against Lagna's rasi
  const pToH = getPlanetToHouseDict(positions);
  const ascHouse = pToH[-1]; // Ascendant's rasi (planet id = -1)
  const spHouse = pToH[sp];

  if (ascHouse === undefined || spHouse === undefined) return sp;

  const sr = getStrongerRasi(positions, ascHouse, spHouse);
  if (sr === ascHouse) {
    return ASCENDANT_SYMBOL;
  } else {
    return sp;
  }
}

/**
 * Determine which Aayu type applies based on strongest of Lagna, Sun, Moon.
 * Returns 0 (Sun/Pindayu), 1 (Moon/Nisargayu), or -1 (Lagna/Amsayu).
 *
 * This is the simplified version that uses house strength comparison.
 * For Python parity, the main API now uses strongerOfLagnaSunMoon.
 */
export function getAayurType(positions: PlanetPosition[]): number {
  // Compare lagna lord strength, sun position strength, moon position strength
  const ascRasi = positions[0]!.rasi;
  const sunRasi = positions[1]!.rasi;
  const moonRasi = positions[2]!.rasi;

  const ascLord = getHouseOwnerFromPlanetPositions(positions, ascRasi);
  const ascStrength = HOUSE_STRENGTHS_OF_PLANETS[ascLord]?.[ascRasi] ?? 0;
  const sunStrength = HOUSE_STRENGTHS_OF_PLANETS[0]?.[sunRasi] ?? 0;
  const moonStrength = HOUSE_STRENGTHS_OF_PLANETS[1]?.[moonRasi] ?? 0;

  if (sunStrength >= moonStrength && sunStrength >= ascStrength) return 0; // Pindayu
  if (moonStrength >= sunStrength && moonStrength >= ascStrength) return 1; // Nisargayu
  return -1; // Amsayu (Lagna)
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Calculate Aayu (Longevity) Dhasa.
 * @param d1Positions - D1 planet positions (index 0 = Lagna)
 * @param jd - Julian Day for start date calculation
 * @param aayurType - Force type: 0=Pindayu, 1=Nisargayu, 2=Amsayu, undefined=auto
 * @param includeBhuktis - Include sub-periods
 * @param applyHaranas - Apply strength reductions
 * @param dhasaMethod - 1=Santhanam, 2=Varahamihira (default)
 * @returns AayuResult
 */
export function getAayuDhasa(
  d1Positions: PlanetPosition[],
  jd: number,
  aayurType?: number,
  includeBhuktis: boolean = true,
  applyHaranas: boolean = true,
  dhasaMethod: number = 2,
): AayuResult {
  // Compute benefics/malefics using BV Raman method (method=1) like Python
  // Note: beneficsAndMalefics requires tithi; using 15 as default (Purnima)
  const [subhaGrahas, asubhaGrahas] = beneficsAndMalefics(d1Positions, 15, 1);

  // Compute harana globals
  const globals = computeHaranaGlobals(d1Positions, subhaGrahas, asubhaGrahas);

  // Determine type
  const sp = aayurType ?? getAayurType(d1Positions);
  let aayurTypeName: string;
  let dhasaDuration: HaranaFactors;

  if (sp === 0) {
    aayurTypeName = 'Pindayu';
    dhasaDuration = pindayu(d1Positions, applyHaranas, subhaGrahas, asubhaGrahas, dhasaMethod, globals);
  } else if (sp === 1) {
    aayurTypeName = 'Nisargayu';
    dhasaDuration = nisargayu(d1Positions, applyHaranas, subhaGrahas, asubhaGrahas, dhasaMethod, globals);
  } else {
    aayurTypeName = 'Amsayu';
    dhasaDuration = amsayu(d1Positions, applyHaranas, dhasaMethod, subhaGrahas, asubhaGrahas, dhasaMethod, globals);
  }

  // Add lagna longevity
  if (dhasaMethod === 1) {
    dhasaDuration[ASCENDANT_SYMBOL] = lagnaLongevitySanthanam(d1Positions);
  } else {
    dhasaDuration[ASCENDANT_SYMBOL] = lagnaLongevity(d1Positions);
  }

  // Get dhasa progression: order planets by kendras from seed
  const seedPlanet = sp === 0 ? 0 : sp === 1 ? 1 : -1; // Sun, Moon, or Lagna
  const seedHouse = d1Positions.find(p => p.planet === seedPlanet)?.rasi ?? d1Positions[0]!.rasi;

  let progression = orderPlanetsFromKendrasOfRaasi(d1Positions.slice(0, 8), seedHouse, true);
  // Ensure seed is first
  if (sp === 0 || sp === 1 || sp === -1) {
    progression = [seedPlanet, ...progression.filter(p => p !== seedPlanet)];
  }

  const oneYearDays = SIDEREAL_YEAR;
  let startJd = jd;

  const mahadashas: AayuDashaPeriod[] = [];
  const bhuktis: AayuBhuktiPeriod[] = [];

  const totalLongevity = Object.values(dhasaDuration).reduce((a, b) => a + b, 0);

  for (const lord of progression) {
    const dd = dhasaDuration[lord] ?? 0;
    mahadashas.push({
      lord,
      lordName: lordName(lord),
      startJd,
      startDate: formatJdAsDate(startJd),
      durationYears: dd,
    });

    if (includeBhuktis) {
      const ddb = dd / progression.length;
      for (const bhukti of progression) {
        bhuktis.push({
          dashaLord: lord,
          bhuktiLord: bhukti,
          bhuktiLordName: lordName(bhukti),
          startJd,
          startDate: formatJdAsDate(startJd),
          durationYears: ddb,
        });
        startJd += ddb * oneYearDays;
      }
    } else {
      startJd += dd * oneYearDays;
    }
  }

  return {
    aayurType: sp === -1 ? 2 : sp,
    aayurTypeName,
    totalLongevity,
    mahadashas,
    bhuktis,
  };
}
