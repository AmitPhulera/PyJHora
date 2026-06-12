/**
 * Mudda (Varsha Vimsottari) Annual Dhasa System
 * Ported from PyJHora mudda.py
 *
 * Calculates Varsha Vimsottari Dasha-Bhukti for annual charts.
 * Total cycle = 360 days, proportioned like Vimsottari but for annual use.
 */

import {
  HUMAN_LIFE_SPAN_VARSHA_VIMSOTTARI,
  PLANET_NAMES_EN,
  TROPICAL_YEAR,
  VARSHA_VIMSOTTARI_ADHIPATI_LIST,
  VARSHA_VIMSOTTARI_DAYS,
} from '../../constants';
import type { PlanetPosition } from '../../horoscope/charts';
import { getVimsottariAdhipati } from '../graha/vimsottari';
import { julianDayToGregorian } from '../../utils/julian';

// ============================================================================
// TYPES
// ============================================================================

export interface MuddaDashaPeriod {
  lord: number;
  lordName: string;
  startJd: number;
  startDate: string;
  durationDays: number;
}

export interface MuddaBhuktiPeriod {
  dashaLord: number;
  bhuktiLord: number;
  bhuktiLordName: string;
  startJd: number;
  startDate: string;
  durationDays: number;
}

export interface MuddaAntaraPeriod {
  dashaLord: number;
  bhuktiLord: number;
  antaraLord: number;
  antaraLordName: string;
  startJd: number;
  startDate: string;
  durationDays: number;
}

export interface MuddaResult {
  mahadashas: MuddaDashaPeriod[];
  bhuktis: MuddaBhuktiPeriod[];
}

// ============================================================================
// HELPERS
// ============================================================================

const CYCLE = HUMAN_LIFE_SPAN_VARSHA_VIMSOTTARI; // 360

/**
 * Python-compatible round(x, 2): round-half-to-even on exact .005 ties.
 * Python's varsha_vimsottari_bhukti/antara round the reported duration
 * (but not the accumulated start date) to 2 decimals.
 */
function round2(x: number): number {
  if (!Number.isFinite(x)) return x;
  const neg = x < 0;
  const a = Math.abs(x);
  // Use the decimal expansion of the double itself (not a*100, which can
  // introduce a spurious exact .5) to decide the rounding direction.
  const [intPart, fracPart = ''] = a.toFixed(20).split('.');
  const base = Number(intPart) * 100 + Number((fracPart + '00').slice(0, 2));
  const rest = fracPart.slice(2).replace(/0+$/, '');
  let r: number;
  if (rest === '') r = base;
  else if (rest === '5') r = base % 2 === 0 ? base : base + 1; // exact tie -> half-even
  else if (rest.charCodeAt(0) >= 53 /* '5' */) r = base + 1;
  else r = base;
  return (neg ? -r : r) / 100;
}

function formatJdAsDate(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
  return `${date.year}-${pad(date.month)}-${pad(date.day)} ${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`;
}

/** Get next adhipati in Varsha Vimsottari sequence */
function getNextVarshaAdhipati(lord: number): number {
  const idx = VARSHA_VIMSOTTARI_ADHIPATI_LIST.indexOf(lord);
  return VARSHA_VIMSOTTARI_ADHIPATI_LIST[(idx + 1) % VARSHA_VIMSOTTARI_ADHIPATI_LIST.length]!;
}

// ============================================================================
// DASHA START DATE
// ============================================================================

/**
 * Calculate the starting dasha lord and start date for Varsha Vimsottari.
 * @param jd - Julian Day of birth
 * @param d1Positions - Planet positions
 * @param years - Number of years from birth
 * @returns [lord, startDateJd]
 */
function varshaVimsottariDashaStartDate(
  jd: number,
  d1Positions: PlanetPosition[],
  years: number,
): [number, number] {
  const oneStar = 360 / 27;
  const moonPos = d1Positions[2]!;
  const moonLong = moonPos.rasi * 30 + moonPos.longitude;

  const nak = Math.floor(moonLong / oneStar);
  const rem = moonLong - nak * oneStar;

  // Get vimsottari lord index, then offset by years
  let lord = getVimsottariAdhipati(nak);
  const lordIdx = VARSHA_VIMSOTTARI_ADHIPATI_LIST.indexOf(lord);
  lord = VARSHA_VIMSOTTARI_ADHIPATI_LIST[((lordIdx + years) % 9 + 9) % 9]!;

  const period = VARSHA_VIMSOTTARI_DAYS[lord]!;
  const periodElapsed = (rem / oneStar) * period;
  const startDate = jd + years * TROPICAL_YEAR - periodElapsed;

  return [lord, startDate];
}

// ============================================================================
// MAHADASHA
// ============================================================================

function varshaVimsottariMahadasha(
  jd: number,
  d1Positions: PlanetPosition[],
  years: number,
): Array<[number, number, number]> {
  let [lord, startDate] = varshaVimsottariDashaStartDate(jd, d1Positions, years);

  const result: Array<[number, number, number]> = [];
  for (let i = 0; i < 9; i++) {
    const duration = (VARSHA_VIMSOTTARI_DAYS[lord]! * TROPICAL_YEAR) / CYCLE;
    result.push([lord, startDate, duration]);
    startDate += duration;
    lord = getNextVarshaAdhipati(lord);
  }
  return result;
}

// ============================================================================
// BHUKTI
// ============================================================================

function varshaVimsottariBhukti(
  mahaLord: number,
  startDate: number,
): Array<[number, number, number]> {
  let lord = mahaLord;
  const result: Array<[number, number, number]> = [];

  for (let i = 0; i < 9; i++) {
    const factor = (VARSHA_VIMSOTTARI_DAYS[lord]! * VARSHA_VIMSOTTARI_DAYS[mahaLord]!) / CYCLE;
    const duration = (factor * TROPICAL_YEAR) / CYCLE;
    result.push([lord, startDate, round2(duration)]);
    startDate += duration;
    lord = getNextVarshaAdhipati(lord);
  }
  return result;
}

// ============================================================================
// ANTARA
// ============================================================================

/**
 * Compute all antaradasas within a given bhukti.
 * Python: varsha_vimsottari_antara(maha_lord, bhukti_lord, start_date)
 *
 * @param mahaLord - Mahadasha lord planet index
 * @param bhuktiLord - Bhukti lord planet index
 * @param startDate - Start date (JD) of the bhukti
 * @returns Array of [lord, startJd, durationDays] tuples
 */
// @parity: py=varsha_vimsottari_antara
export function varshaVimsottariAntara(
  mahaLord: number,
  bhuktiLord: number,
  startDate: number,
): Array<[number, number, number]> {
  let lord = bhuktiLord;
  const result: Array<[number, number, number]> = [];

  for (let i = 0; i < 9; i++) {
    const factor = VARSHA_VIMSOTTARI_DAYS[lord]! * (VARSHA_VIMSOTTARI_DAYS[mahaLord]! / CYCLE);
    const duration = factor * (VARSHA_VIMSOTTARI_DAYS[bhuktiLord]! / CYCLE);
    result.push([lord, startDate, round2(duration)]);
    startDate += duration;
    lord = getNextVarshaAdhipati(lord);
  }
  return result;
}

/**
 * Find which mahadasha/bhukti a given JD falls in, within a dict of {lord: startJd}.
 * Returns the lord whose startJd is less than jd (searching from the end).
 * Python: _where_occurs(jd, some_dict)
 */
function whereOccurs(jd: number, dict: Map<number, number>): number | undefined {
  const keys = Array.from(dict.keys());
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i]!;
    if (dict.get(key)! < jd) return key;
  }
  return undefined;
}

/**
 * Compute the antaradasha within which a given JD falls.
 * Python: compute_varsha_vimsottari_antara_from(jd, mahadashas)
 *
 * @param jd - Julian Day to locate
 * @param mahadashas - Map of lord -> start JD (ordered)
 * @returns Tuple of [mahaLord, bhuktiLord, antaraPeriods] or undefined if JD is before all periods
 */
// @parity: py=compute_varsha_vimsottari_antara_from
export function computeVarshaVimsottariAntaraFrom(
  jd: number,
  mahadashas: Map<number, number>,
): { mahaLord: number; bhuktiLord: number; antaras: Array<[number, number, number]> } | undefined {
  // Find mahadasha where this JD falls
  const mahaLord = whereOccurs(jd, mahadashas);
  if (mahaLord === undefined) return undefined;

  // Compute all bhuktis of that mahadasha
  const bhuktiTuples = varshaVimsottariBhukti(mahaLord, mahadashas.get(mahaLord)!);
  const bhuktiMap = new Map<number, number>();
  for (const [lord, start] of bhuktiTuples) {
    bhuktiMap.set(lord, start);
  }

  // Find bhukti where this JD falls
  const bhuktiLord = whereOccurs(jd, bhuktiMap);
  if (bhuktiLord === undefined) return undefined;

  // Compute all antaras of that bhukti
  const antaras = varshaVimsottariAntara(mahaLord, bhuktiLord, bhuktiMap.get(bhuktiLord)!);
  return { mahaLord, bhuktiLord, antaras };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute Mudda (Varsha Vimsottari) Dasha-Bhukti.
 * @param jd - Julian Day of birth
 * @param d1Positions - D1 planet positions
 * @param years - Number of years from birth for annual chart
 * @param includeBhuktis - Whether to include bhukti sub-periods
 * @returns MuddaResult
 */
// @parity: py=mudda_dhasa_bhukthi
export function getMuddaDhasa(
  jd: number,
  d1Positions: PlanetPosition[],
  years: number,
  includeBhuktis: boolean = true,
): MuddaResult {
  const dashas = varshaVimsottariMahadasha(jd, d1Positions, years);

  const mahadashas: MuddaDashaPeriod[] = [];
  const bhuktis: MuddaBhuktiPeriod[] = [];

  for (const [lord, dashaStart, durn] of dashas) {
    mahadashas.push({
      lord,
      lordName: PLANET_NAMES_EN[lord] ?? `Planet${lord}`,
      startJd: dashaStart,
      startDate: formatJdAsDate(dashaStart),
      durationDays: durn,
    });

    if (includeBhuktis) {
      const bhuktiList = varshaVimsottariBhukti(lord, dashaStart);
      for (const [bhuktiLord, bhuktiStart, bhuktiDurn] of bhuktiList) {
        bhuktis.push({
          dashaLord: lord,
          bhuktiLord,
          bhuktiLordName: PLANET_NAMES_EN[bhuktiLord] ?? `Planet${bhuktiLord}`,
          startJd: bhuktiStart,
          startDate: formatJdAsDate(bhuktiStart),
          durationDays: bhuktiDurn,
        });
      }
    }
  }

  return { mahadashas, bhuktis };
}
