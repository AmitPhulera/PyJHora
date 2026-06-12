/**
 * Tara Dasha System
 * Ported from PyJHora tara.py
 *
 * Applicable if all four quadrants (kendras) are occupied.
 * Finds strongest planet in kendras to determine starting lord.
 * 120-year cycle.
 *
 * TODO (from Python): Implement sanjay rath method options:
 *   1. No dhasa sesham
 *   2. Dasa sesham from moon as per vimsottari
 *   3. Dhasa sesham from moon but in reverse for apasavya nakshatras
 */

import {
  KETU,
  MOON,
  PLANET_NAMES_EN,
  SIDEREAL_YEAR,
  SUN,
  VENUS,
  JUPITER,
  MARS,
  MERCURY,
  RAHU,
  SATURN
} from '../../constants';
import { getDivisionalChart, getHousePlanetListFromPositions, PlanetPosition } from '../../horoscope/charts';
import { getStrongerPlanetFromPositions } from '../../horoscope/house';
import { getPlanetLongitude } from '../../panchanga/drik';
import type { Place } from '../../types';
import { julianDayToGregorian } from '../../utils/julian';

// ============================================================================
// TYPES
// ============================================================================

/** Python-compatible tuple: (dhasa_lord, bhukthi_lord, start_date_str, duration) */
export type TaraDhasaTuple = [number, number, string, number];
/** Python-compatible tuple without antardasa: (dhasa_lord, start_date_str, duration) */
export type TaraDhasaTupleNoAntardasa = [number, string, number];

/** UI-compatible types (used by App.tsx) */
export interface TaraDashaPeriod {
  lord: number;
  lordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface TaraBhuktiPeriod {
  dashaLord: number;
  bhuktiLord: number;
  bhuktiLordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface TaraResult {
  mahadashas: TaraDashaPeriod[];
  bhuktis?: TaraBhuktiPeriod[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const YEAR_DURATION = SIDEREAL_YEAR;

/**
 * Sanjay Rath method (dhasa_method=1)
 * Python dict order: {5:20, 1:10, 8:7, 6:19, 4:16, 3:17, 7:18, 2:7, 0:6}
 */
const DHASA_ADHIPATHI_SANJAY_RATH: Record<number, number> = {
  [VENUS]: 20,
  [MOON]: 10,
  [KETU]: 7,
  [SATURN]: 19,
  [JUPITER]: 16,
  [MERCURY]: 17,
  [RAHU]: 18,
  [MARS]: 7,
  [SUN]: 6
};
const SANJAY_RATH_ORDER = [VENUS, MOON, KETU, SATURN, JUPITER, MERCURY, RAHU, MARS, SUN];

/**
 * Parasara method (dhasa_method=2)
 * Python dict order: {5:20, 0:6, 1:10, 2:7, 7:18, 4:16, 6:19, 3:17, 8:7}
 */
const DHASA_ADHIPATHI_PARASARA: Record<number, number> = {
  [VENUS]: 20,
  [SUN]: 6,
  [MOON]: 10,
  [MARS]: 7,
  [RAHU]: 18,
  [JUPITER]: 16,
  [SATURN]: 19,
  [MERCURY]: 17,
  [KETU]: 7
};
const PARASARA_ORDER = [VENUS, SUN, MOON, MARS, RAHU, JUPITER, SATURN, MERCURY, KETU];

const HUMAN_LIFE_SPAN = 120; // Sum of all periods

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format JD as date string matching Python output format.
 * Python: '%04d-%02d-%02d' %(y,m,d) + ' ' + utils.to_dms(h, as_string=True)
 * Python to_dms for time: 'HH:MM:SS AM/PM' (24-hour value with AM/PM appended)
 */
function formatJdAsDate(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
  const ampm = time.hour >= 12 ? 'PM' : 'AM';
  const yearStr = date.year.toString().padStart(4, '0');
  return `${yearStr}-${pad(date.month)}-${pad(date.day)} ${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)} ${ampm}`;
}

function getDhasaDict(dhasaMethod: number): Record<number, number> {
  return dhasaMethod === 1 ? DHASA_ADHIPATHI_SANJAY_RATH : DHASA_ADHIPATHI_PARASARA;
}

function getDhasaOrder(dhasaMethod: number): number[] {
  return dhasaMethod === 1 ? SANJAY_RATH_ORDER : PARASARA_ORDER;
}

/**
 * Returns next lord after `lord` in the adhipati list.
 * Matches Python's _next_adhipati(lord, dirn=1, dhasa_method=1)
 */
// @parity: py=_next_adhipati
export function getNextTaraLord(lord: number, dirn = 1, dhasaMethod = 1): number {
  const order = getDhasaOrder(dhasaMethod);
  const current = order.indexOf(lord);
  if (current === -1) return order[0]!;
  const nextIndex = ((current + dirn) % order.length + order.length) % order.length;
  return order[nextIndex]!;
}

/**
 * Returns antardhasa lords starting from the given lord.
 * Matches Python's _antardhasa(lord, dhasa_method=1)
 */
function getAntardhasa(lord: number, dhasaMethod = 1): number[] {
  const order = getDhasaOrder(dhasaMethod);
  const bhukthis: number[] = [];
  let currentLord = lord;
  for (let i = 0; i < order.length; i++) {
    bhukthis.push(currentLord);
    currentLord = getNextTaraLord(currentLord, 1, dhasaMethod);
  }
  return bhukthis;
}

/**
 * Calculate the dasha start date based on Moon's nakshatra position.
 * Matches Python's _dhasa_start(jd, place, period, star_position_from_moon=1,
 *                                divisional_chart_factor=1, chart_method=1)
 */
function calcDhasaStart(
  jd: number,
  place: Place,
  period: number,
  starPositionFromMoon = 1,
  divisionalChartFactor = 1
): number {
  const oneStar = 360 / 27;

  // Get Moon's position
  let moonLong = getPlanetLongitude(jd, place, MOON);
  const moonRasi = Math.floor(moonLong / 30);
  const moonLongInSign = moonLong % 30;

  // Apply divisional chart if needed
  if (divisionalChartFactor > 1) {
    const moonPos: PlanetPosition = { planet: MOON, rasi: moonRasi, longitude: moonLongInSign };
    const vargaPos = getDivisionalChart([moonPos], divisionalChartFactor)[0];
    if (vargaPos) {
      moonLong = vargaPos.rasi * 30 + vargaPos.longitude;
    }
  }

  // Adjust for star position from Moon
  moonLong = moonLong + (starPositionFromMoon - 1) * oneStar;

  const nak = Math.floor(moonLong / oneStar);
  const rem = moonLong - nak * oneStar;
  let periodElapsed = (rem / oneStar) * period; // years
  periodElapsed *= YEAR_DURATION;                // days
  const startDate = jd - periodElapsed;          // days before current day
  return startDate;
}

/**
 * Build planet positions array for planets Sun(0) through Ketu(8).
 * Uses Sun's rasi as ascendant proxy (known systemic limitation).
 */
function buildPlanetPositions(
  jd: number,
  place: Place,
  divisionalChartFactor = 1
): PlanetPosition[] {
  const d1Positions: PlanetPosition[] = [];

  // Build D-1 positions for all 9 planets (Sun=0 through Ketu=8)
  for (let planet = 0; planet <= 8; planet++) {
    const longitude = getPlanetLongitude(jd, place, planet);
    d1Positions.push({
      planet,
      rasi: Math.floor(longitude / 30),
      longitude: longitude % 30
    });
  }

  if (divisionalChartFactor > 1) {
    return getDivisionalChart(d1Positions, divisionalChartFactor);
  }
  return d1Positions;
}

/**
 * Find the starting dhasa lord by analyzing kendra planets.
 *
 * Algorithm (from Python):
 * 1. Get planet positions from the divisional chart
 * 2. Identify planets in kendra houses (1, 4, 7, 10 from Lagna/ascendant)
 * 3. Among those kendra planets, find the strongest using house strength comparison
 * 4. If no planets in kendras, returns undefined
 *
 * @param planetPositions - Array of planet positions (Sun=0 through Ketu=8)
 * @param ascHouse - Ascendant house (rasi index, 0-11)
 * @returns The strongest kendra planet index, or undefined if no planets in kendras
 */
function findKendraDhasaLord(
  planetPositions: PlanetPosition[],
  ascHouse: number
): number | undefined {
  // Build house-to-planet list including Lagna proxy
  const allPositions: PlanetPosition[] = [
    { planet: -1, rasi: ascHouse, longitude: 0 }, // Lagna proxy
    ...planetPositions
  ];
  const hToP = getHousePlanetListFromPositions(allPositions);

  // Find planets in kendra houses (houses 1, 4, 7, 10 from Lagna = offsets 0, 3, 6, 9)
  // Python: sorted([...split('/') for h in [0,3,6,9] if non-empty], key=len, reverse=True)
  const kendraEntries: string[][] = [];
  for (const h of [0, 3, 6, 9]) {
    const rasi = (h + ascHouse) % 12;
    const entry = hToP[rasi];
    if (entry !== undefined && entry !== '') {
      kendraEntries.push(entry.split('/'));
    }
  }
  // Sort by length descending (most planets first), then flatten
  kendraEntries.sort((a, b) => b.length - a.length);
  let ds: string[] = kendraEntries.flat();

  if (ds.length === 0) return undefined;

  // Remove Lagna symbol 'L'
  ds = ds.filter(x => x !== 'L');

  if (ds.length === 0) return undefined;

  // Find strongest planet among kendra planets
  if (ds.length >= 2) {
    let sp = parseInt(ds[0]!, 10);
    for (let p = 1; p < ds.length; p++) {
      sp = getStrongerPlanetFromPositions(planetPositions, parseInt(ds[p]!, 10), sp);
    }
    return sp;
  }
  return parseInt(ds[0]!, 10);
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get Tara dasha bhukthi periods (Python-compatible tuple output).
 *
 * Matches Python's get_dhasa_bhukthi(dob, tob, place, divisional_chart_factor=1,
 *   chart_method=1, years=1, months=1, sixty_hours=1,
 *   include_antardasa=True, dhasa_method=1)
 *
 * @param jd - Julian Day at birth (includes birth time)
 * @param place - Place data
 * @param options - Configuration options
 * @returns Array of dasha tuples matching Python output format
 */
export function getTaraDashaBhuktiTuples(
  jd: number,
  place: Place,
  options: {
    divisionalChartFactor?: number;
    includeAntardasa?: boolean;
    dhasaMethod?: number; // 1 = Sanjay Rath (default), 2 = Parasara
  } = {}
): (TaraDhasaTuple | TaraDhasaTupleNoAntardasa)[] {
  const {
    divisionalChartFactor = 1,
    includeAntardasa = true,
    dhasaMethod = 1
  } = options;

  const dhasaDict = getDhasaDict(dhasaMethod);

  // Get planet positions (Sun=0 through Ketu=8)
  const planetPositions = buildPlanetPositions(jd, place, divisionalChartFactor);

  // Use Sun's rasi as ascendant house (known systemic limitation: no sync ascendant in TS)
  const ascHouse = planetPositions[0]!.rasi;

  // Find the starting dhasa lord from kendra planets
  const dhasaLord = findKendraDhasaLord(planetPositions, ascHouse);
  if (dhasaLord === undefined) {
    // Python: 'tara dhasa ds list is empty, returning empty list'
    return [];
  }

  // Calculate dasha start date
  const initialDuration = dhasaDict[dhasaLord]!;
  let startJd = calcDhasaStart(jd, place, initialDuration, 1, divisionalChartFactor);

  // Generate dasha periods
  const dhasaInfo: (TaraDhasaTuple | TaraDhasaTupleNoAntardasa)[] = [];
  let currentLord = dhasaLord;

  for (let i = 0; i < 9; i++) {
    const lordDuration = dhasaDict[currentLord]!;
    const bhukthis = getAntardhasa(currentLord, dhasaMethod);

    if (includeAntardasa) {
      for (const bhuktiLord of bhukthis) {
        const bhuktiDuration = dhasaDict[bhuktiLord]!;
        const factor = (bhuktiDuration * lordDuration) / HUMAN_LIFE_SPAN;
        const startStr = formatJdAsDate(startJd);
        dhasaInfo.push([currentLord, bhuktiLord, startStr, lordDuration] as TaraDhasaTuple);
        startJd += factor * YEAR_DURATION;
      }
    } else {
      const startStr = formatJdAsDate(startJd);
      dhasaInfo.push([currentLord, startStr, lordDuration] as TaraDhasaTupleNoAntardasa);
      startJd += lordDuration * YEAR_DURATION;
    }

    currentLord = getNextTaraLord(currentLord, 1, dhasaMethod);
  }

  return dhasaInfo;
}

/**
 * Get Tara dasha data in structured format (for UI/App.tsx compatibility).
 *
 * This wraps the Python-compatible logic and returns the TaraResult interface
 * that the application UI expects.
 */
// @parity: py=get_dhasa_bhukthi
export function getTaraDashaBhukti(
  jd: number,
  place: Place,
  options: {
    includeBhuktis?: boolean;
    divisionalChartFactor?: number;
    dhasaMethod?: number;
  } = {}
): TaraResult {
  const {
    includeBhuktis = true,
    divisionalChartFactor = 1,
    dhasaMethod = 1
  } = options;

  const dhasaDict = getDhasaDict(dhasaMethod);

  // Get planet positions
  const planetPositions = buildPlanetPositions(jd, place, divisionalChartFactor);
  const ascHouse = planetPositions[0]!.rasi;

  // Find starting lord
  const startingLord = findKendraDhasaLord(planetPositions, ascHouse);
  if (startingLord === undefined) {
    return { mahadashas: [] };
  }

  // Calculate dasha start date
  const initialDuration = dhasaDict[startingLord]!;
  let startJd = calcDhasaStart(jd, place, initialDuration, 1, divisionalChartFactor);

  const mahadashas: TaraDashaPeriod[] = [];
  const bhuktis: TaraBhuktiPeriod[] = [];
  let currentLord = startingLord;

  for (let i = 0; i < 9; i++) {
    const durationYears = dhasaDict[currentLord]!;
    const lordName = PLANET_NAMES_EN[currentLord] ?? `Planet ${currentLord}`;

    mahadashas.push({
      lord: currentLord,
      lordName,
      startJd,
      startDate: formatJdAsDate(startJd),
      durationYears
    });

    if (includeBhuktis) {
      const bhukthiLords = getAntardhasa(currentLord, dhasaMethod);
      let bhuktiStartJd = startJd;

      for (const bhuktiLord of bhukthiLords) {
        const bhuktiYears = dhasaDict[bhuktiLord]!;
        const factor = (bhuktiYears * durationYears) / HUMAN_LIFE_SPAN;
        const bhuktiLordName = PLANET_NAMES_EN[bhuktiLord] ?? `Planet ${bhuktiLord}`;

        bhuktis.push({
          dashaLord: currentLord,
          bhuktiLord,
          bhuktiLordName,
          startJd: bhuktiStartJd,
          startDate: formatJdAsDate(bhuktiStartJd),
          durationYears: factor
        });
        bhuktiStartJd += factor * YEAR_DURATION;
      }
    }

    startJd += durationYears * YEAR_DURATION;
    currentLord = getNextTaraLord(currentLord, 1, dhasaMethod);
  }

  return includeBhuktis ? { mahadashas, bhuktis } : { mahadashas };
}
