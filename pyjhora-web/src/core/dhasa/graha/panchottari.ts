/**
 * Panchottari Dasha System
 * Ported from PyJHora panchottari.py
 * 
 * 105-year dasha cycle with 7 lords
 * Applicability: Lagna in Cancer dwadasamsa
 */

import {
    JUPITER,
    MARS, MERCURY,
    MOON,
    PLANET_NAMES_EN,
    SATURN,
    SIDEREAL_YEAR,
    SUN,
    VENUS
} from '../../constants';
import type { Place } from '../../types';
import { julianDayToGregorian } from '../../utils/julian';
import {
    resolveStartingPlanetLongitude,
    resolveStartingPlanetLongitudeSync
} from './special-planet-helper';

// ============================================================================
// TYPES
// ============================================================================

export interface PanchottariDashaPeriod {
  lord: number;
  lordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface PanchottariBhuktiPeriod {
  dashaLord: number;
  bhuktiLord: number;
  bhuktiLordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface PanchottariResult {
  mahadashas: PanchottariDashaPeriod[];
  bhuktis?: PanchottariBhuktiPeriod[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Year duration in days */
const YEAR_DURATION = SIDEREAL_YEAR;

/** 
 * Panchottari lords and their durations
 * Order: Sun(12), Mercury(13), Saturn(14), Mars(15), Venus(16), Moon(17), Jupiter(18)
 * Total: 105 years
 */
const PANCHOTTARI_LORDS = [SUN, MERCURY, SATURN, MARS, VENUS, MOON, JUPITER];

/** Dasha period for each lord in years */
const PANCHOTTARI_YEARS: Record<number, number> = {
  [SUN]: 12,
  [MERCURY]: 13,
  [SATURN]: 14,
  [MARS]: 15,
  [VENUS]: 16,
  [MOON]: 17,
  [JUPITER]: 18
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build nakshatra to lord mapping based on seed star
 */
function buildNakshatraDict(seedStar = 17): Map<number, number> {
  const nakToLord = new Map<number, number>();
  let nak = seedStar;
  let lordIndex = 0;
  
  for (let i = 0; i < 27; i++) {
    nakToLord.set(nak, PANCHOTTARI_LORDS[lordIndex]!);
    nak = ((nak) % 27) + 1;
    lordIndex = (lordIndex + 1) % 7;
  }
  
  return nakToLord;
}

/**
 * Get the Panchottari lord for a nakshatra
 */
export function getPanchottariDhasaLord(nakshatra: number, seedStar = 17): [number, number] {
  const nakToLord = buildNakshatraDict(seedStar);
  const lord = nakToLord.get(nakshatra) ?? SUN;
  const duration = PANCHOTTARI_YEARS[lord] ?? 12;
  
  return [lord, duration];
}

/**
 * Get the next lord in the Panchottari sequence
 */
export function getNextPanchottariLord(lord: number, direction = 1): number {
  const currentIndex = PANCHOTTARI_LORDS.indexOf(lord);
  if (currentIndex === -1) {
    return PANCHOTTARI_LORDS[0]!;
  }
  const nextIndex = ((currentIndex + direction) % 7 + 7) % 7;
  return PANCHOTTARI_LORDS[nextIndex]!;
}

/**
 * Format Julian Day as date string
 */
function formatJdAsDate(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? 'AM' : 'PM';
  const yearStr = date.year < 0 ? `${Math.abs(date.year)} BC` : date.year.toString();
  return `${yearStr}-${pad(date.month)}-${pad(date.day)} ${pad(hour12)}:${pad(time.minute)}:${pad(time.second)} ${ampm}`;
}

// ============================================================================
// DASHA START DATE CALCULATION
// ============================================================================

/**
 * Calculate the start date of the Panchottari mahadasha at birth
 * @param startingPlanet - 0-8 for planets, 'L' for Lagna. For M/G/B/I/P/T use async version.
 */
export function panchottariDashaStart(
  jd: number,
  place: Place,
  starPositionFromMoon = 1,
  seedStar = 17,
  startingPlanet: number | string = MOON,
  divisionalChartFactor = 1
): [number, number, number] {
  const oneStar = 360 / 27;

  const planetLong = resolveStartingPlanetLongitudeSync(
    startingPlanet, jd, place, divisionalChartFactor, 1, starPositionFromMoon
  );

  const nakIndex = Math.floor(planetLong / oneStar);
  const nakNumber = nakIndex + 1;
  const remainder = planetLong % oneStar;

  const [lord, duration] = getPanchottariDhasaLord(nakNumber, seedStar);

  const periodElapsedFraction = remainder / oneStar;
  const periodElapsedDays = periodElapsedFraction * duration * YEAR_DURATION;
  const startDate = jd - periodElapsedDays;

  return [lord, startDate, duration];
}

/**
 * Async version: supports special starting planets (M/G/B/I/P/T)
 */
export async function panchottariDashaStartAsync(
  jd: number,
  place: Place,
  starPositionFromMoon = 1,
  seedStar = 17,
  startingPlanet: number | string = MOON,
  divisionalChartFactor = 1,
  chartMethod = 1
): Promise<[number, number, number]> {
  const oneStar = 360 / 27;

  const planetLong = await resolveStartingPlanetLongitude(
    startingPlanet, jd, place, divisionalChartFactor, chartMethod, starPositionFromMoon
  );

  const nakIndex = Math.floor(planetLong / oneStar);
  const nakNumber = nakIndex + 1;
  const remainder = planetLong % oneStar;

  const [lord, duration] = getPanchottariDhasaLord(nakNumber, seedStar);

  const periodElapsedFraction = remainder / oneStar;
  const periodElapsedDays = periodElapsedFraction * duration * YEAR_DURATION;
  const startDate = jd - periodElapsedDays;

  return [lord, startDate, duration];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Get complete Panchottari dasha-bhukti data
 */
export function getPanchottariDashaBhukti(
  jd: number,
  place: Place,
  options: {
    starPositionFromMoon?: number;
    seedStar?: number;
    startingPlanet?: number | string;
    includeBhuktis?: boolean;
    antardashaOption?: number;
    divisionalChartFactor?: number;
    useTribhagiVariation?: boolean;
    dhasaStartingPlanet?: number | string;
  } = {}
): PanchottariResult {
  const {
    starPositionFromMoon = 1,
    seedStar = 17,
    includeBhuktis = true,
    antardashaOption = 1,
    divisionalChartFactor = 1,
    useTribhagiVariation = false
  } = options;
  const startingPlanet: number | string = options.dhasaStartingPlanet ?? options.startingPlanet ?? MOON;

  // Tribhagi variation: divide each dasha by 3, run 3 cycles
  const tribhagiFactor = useTribhagiVariation ? 1 / 3 : 1;
  const dhasaCycles = useTribhagiVariation ? 3 : 1;

  const [initialLord, initialStartJd] = panchottariDashaStart(
    jd, place, starPositionFromMoon, seedStar, startingPlanet, divisionalChartFactor
  );

  let currentLord = initialLord;
  let startJd = initialStartJd;

  const mahadashas: PanchottariDashaPeriod[] = [];
  const bhuktis: PanchottariBhuktiPeriod[] = [];

  for (let cycle = 0; cycle < dhasaCycles; cycle++) {
    if (cycle > 0) {
      currentLord = initialLord;
    }
    for (let i = 0; i < 7; i++) {
      const durationYears = Math.round((PANCHOTTARI_YEARS[currentLord] ?? 12) * tribhagiFactor * 100) / 100;
      const lordName = PLANET_NAMES_EN[currentLord] ?? `Planet ${currentLord}`;

      mahadashas.push({
        lord: currentLord,
        lordName,
        startJd,
        startDate: formatJdAsDate(startJd),
        durationYears
      });

      if (includeBhuktis) {
        let bhuktiLord = currentLord;

        if (antardashaOption === 3 || antardashaOption === 4) {
          bhuktiLord = getNextPanchottariLord(bhuktiLord, 1);
        } else if (antardashaOption === 5 || antardashaOption === 6) {
          bhuktiLord = getNextPanchottariLord(bhuktiLord, -1);
        }

        const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;
        const bhuktiDuration = durationYears / 7;
        let bhuktiStartJd = startJd;

        for (let j = 0; j < 7; j++) {
          const bhuktiLordName = PLANET_NAMES_EN[bhuktiLord] ?? `Planet ${bhuktiLord}`;

          bhuktis.push({
            dashaLord: currentLord,
            bhuktiLord,
            bhuktiLordName,
            startJd: bhuktiStartJd,
            startDate: formatJdAsDate(bhuktiStartJd),
            durationYears: bhuktiDuration
          });

          bhuktiStartJd += bhuktiDuration * YEAR_DURATION;
          bhuktiLord = getNextPanchottariLord(bhuktiLord, direction);
        }
      }

      startJd += durationYears * YEAR_DURATION;
      currentLord = getNextPanchottariLord(currentLord);
    }
  }

  if (!includeBhuktis) {
    return { mahadashas };
  }

  return {
    mahadashas,
    bhuktis
  };
}

/**
 * Async version: supports special starting planets (M/G/B/I/P/T)
 */
export async function getPanchottariDashaBhuktiAsync(
  jd: number,
  place: Place,
  options: {
    starPositionFromMoon?: number;
    seedStar?: number;
    startingPlanet?: number | string;
    includeBhuktis?: boolean;
    antardashaOption?: number;
    divisionalChartFactor?: number;
    useTribhagiVariation?: boolean;
    dhasaStartingPlanet?: number | string;
    chartMethod?: number;
  } = {}
): Promise<PanchottariResult> {
  const {
    starPositionFromMoon = 1,
    seedStar = 17,
    divisionalChartFactor = 1,
    chartMethod = 1
  } = options;
  const startingPlanet: number | string = options.dhasaStartingPlanet ?? options.startingPlanet ?? MOON;

  const [initialLord, initialStartJd] = await panchottariDashaStartAsync(
    jd, place, starPositionFromMoon, seedStar, startingPlanet, divisionalChartFactor, chartMethod
  );

  // Delegate to sync logic with resolved start data
  return _buildPanchottariResult(jd, initialLord, initialStartJd, options);
}

function _buildPanchottariResult(
  _jd: number,
  initialLord: number,
  initialStartJd: number,
  options: {
    includeBhuktis?: boolean;
    antardashaOption?: number;
    useTribhagiVariation?: boolean;
  }
): PanchottariResult {
  const {
    includeBhuktis = true,
    antardashaOption = 1,
    useTribhagiVariation = false
  } = options;

  const tribhagiFactor = useTribhagiVariation ? 1 / 3 : 1;
  const dhasaCycles = useTribhagiVariation ? 3 : 1;

  let currentLord = initialLord;
  let startJd = initialStartJd;

  const mahadashas: PanchottariDashaPeriod[] = [];
  const bhuktis: PanchottariBhuktiPeriod[] = [];

  for (let cycle = 0; cycle < dhasaCycles; cycle++) {
    if (cycle > 0) currentLord = initialLord;
    for (let i = 0; i < 7; i++) {
      const durationYears = Math.round((PANCHOTTARI_YEARS[currentLord] ?? 12) * tribhagiFactor * 100) / 100;
      mahadashas.push({
        lord: currentLord,
        lordName: PLANET_NAMES_EN[currentLord] ?? `Planet ${currentLord}`,
        startJd,
        startDate: formatJdAsDate(startJd),
        durationYears
      });

      if (includeBhuktis) {
        let bhuktiLord = currentLord;
        if (antardashaOption === 3 || antardashaOption === 4) bhuktiLord = getNextPanchottariLord(bhuktiLord, 1);
        else if (antardashaOption === 5 || antardashaOption === 6) bhuktiLord = getNextPanchottariLord(bhuktiLord, -1);
        const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;
        const bhuktiDuration = durationYears / 7;
        let bhuktiStartJd = startJd;
        for (let j = 0; j < 7; j++) {
          bhuktis.push({
            dashaLord: currentLord,
            bhuktiLord,
            bhuktiLordName: PLANET_NAMES_EN[bhuktiLord] ?? `Planet ${bhuktiLord}`,
            startJd: bhuktiStartJd,
            startDate: formatJdAsDate(bhuktiStartJd),
            durationYears: bhuktiDuration
          });
          bhuktiStartJd += bhuktiDuration * YEAR_DURATION;
          bhuktiLord = getNextPanchottariLord(bhuktiLord, direction);
        }
      }
      startJd += durationYears * YEAR_DURATION;
      currentLord = getNextPanchottariLord(currentLord);
    }
  }

  return includeBhuktis ? { mahadashas, bhuktis } : { mahadashas };
}
