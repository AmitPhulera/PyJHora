/**
 * Dwadasottari Dasha System
 * Ported from PyJHora dwadasottari.py
 * 
 * 112-year dasha cycle with 8 lords
 * Applicability: Lagna in Taurus/Libra navamsa
 */

import {
    JUPITER,
    KETU,
    MARS, MERCURY,
    MOON,
    PLANET_NAMES_EN,
    RAHU,
    SATURN,
    SIDEREAL_YEAR,
    SUN
} from '../../constants';
import { getDivisionalChart, PlanetPosition } from '../../horoscope/charts';
import { getPlanetLongitude } from '../../panchanga/drik';
import type { Place } from '../../types';
import { normalizeDegrees } from '../../utils/angle';
import { julianDayToGregorian } from '../../utils/julian';

// ============================================================================
// TYPES
// ============================================================================

export interface DwadasottariDashaPeriod {
  lord: number;
  lordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface DwadasottariBhuktiPeriod {
  dashaLord: number;
  bhuktiLord: number;
  bhuktiLordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface DwadasottariResult {
  mahadashas: DwadasottariDashaPeriod[];
  bhuktis?: DwadasottariBhuktiPeriod[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const YEAR_DURATION = SIDEREAL_YEAR;

/** 
 * Dwadasottari lords and their durations
 * Order: Sun(7), Jupiter(9), Ketu(11), Mercury(13), Rahu(15), Mars(17), Saturn(19), Moon(21)
 * Total: 112 years
 */
const DWADASOTTARI_LORDS = [SUN, JUPITER, KETU, MERCURY, RAHU, MARS, SATURN, MOON];

const DWADASOTTARI_YEARS: Record<number, number> = {
  [SUN]: 7,
  [JUPITER]: 9,
  [KETU]: 11,
  [MERCURY]: 13,
  [RAHU]: 15,
  [MARS]: 17,
  [SATURN]: 19,
  [MOON]: 21
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build nakshatra-to-lord mapping, matching Python's _get_dhasa_dict().
 * Uses 0-indexed nakshatra internally (nak = seed_star - 1),
 * stores 1-indexed keys in the map (nak + 1).
 * count_direction = -1 (anti-zodiac stepping).
 */
function buildNakshatraDict(seedStar = 27): Map<number, number> {
  const COUNT_DIRECTION = -1;
  const nakToLord = new Map<number, number>();
  let nak = seedStar - 1; // 0-indexed, matches Python: nak = seed_star - 1
  let lordIndex = 0;

  for (let i = 0; i < 27; i++) {
    nakToLord.set(nak + 1, DWADASOTTARI_LORDS[lordIndex]!); // store 1-indexed
    nak = ((nak + COUNT_DIRECTION) % 27 + 27) % 27; // Python: (nak + 1*count_direction) % 27
    lordIndex = (lordIndex + 1) % DWADASOTTARI_LORDS.length;
  }

  return nakToLord;
}

export function getDwadasottariDhasaLord(nakshatra: number, seedStar = 27): [number, number] {
  const nakToLord = buildNakshatraDict(seedStar);
  const lord = nakToLord.get(nakshatra) ?? SUN;
  const duration = DWADASOTTARI_YEARS[lord] ?? 7;
  return [lord, duration];
}

export function getNextDwadasottariLord(lord: number, direction = 1): number {
  const currentIndex = DWADASOTTARI_LORDS.indexOf(lord);
  if (currentIndex === -1) return DWADASOTTARI_LORDS[0]!;
  const nextIndex = ((currentIndex + direction) % 8 + 8) % 8;
  return DWADASOTTARI_LORDS[nextIndex]!;
}

function formatJdAsDate(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? 'AM' : 'PM';
  const yearStr = date.year < 0 ? `${Math.abs(date.year)} BC` : date.year.toString();
  return `${yearStr}-${pad(date.month)}-${pad(date.day)} ${pad(hour12)}:${pad(time.minute)}:${pad(time.second)} ${ampm}`;
}

export function dwadasottariDashaStart(
  jd: number,
  place: Place,
  starPositionFromMoon = 1,
  seedStar = 27,
  startingPlanet = MOON,
  divisionalChartFactor = 1
): [number, number, number] {
  const oneStar = 360 / 27;
  let planetLong = getPlanetLongitude(jd, place, startingPlanet);
  
  if (divisionalChartFactor > 1) {
    const d1Pos: PlanetPosition = { planet: startingPlanet, rasi: Math.floor(planetLong / 30), longitude: planetLong % 30 };
    const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor)[0];
    if (vargaPos) {
      planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
    }
  }

  if (startingPlanet === MOON) {
    planetLong += (starPositionFromMoon - 1) * oneStar;
    planetLong = normalizeDegrees(planetLong);
  }
  
  const nakIndex = Math.floor(planetLong / oneStar);
  const nakNumber = nakIndex + 1;
  const remainder = planetLong % oneStar;
  
  const [lord, duration] = getDwadasottariDhasaLord(nakNumber, seedStar);
  const periodElapsedDays = (remainder / oneStar) * duration * YEAR_DURATION;
  const startDate = jd - periodElapsedDays;
  
  return [lord, startDate, duration];
}

export function getDwadasottariDashaBhukti(
  jd: number,
  place: Place,
  options: {
    starPositionFromMoon?: number;
    seedStar?: number;
    startingPlanet?: number;
    includeBhuktis?: boolean;
    antardashaOption?: number;
    divisionalChartFactor?: number;
    useTribhagiVariation?: boolean;
  } = {}
): DwadasottariResult {
  const {
    starPositionFromMoon = 1,
    seedStar = 27,
    startingPlanet = MOON,
    includeBhuktis = true,
    antardashaOption = 1,
    divisionalChartFactor = 1,
    useTribhagiVariation = false
  } = options;

  // Tribhagi variation: divide each dasha by 3, run 3 cycles
  const tribhagiFactor = useTribhagiVariation ? 1 / 3 : 1;
  const dhasaCycles = useTribhagiVariation ? 3 : 1;

  const [initialLord, initialStartJd] = dwadasottariDashaStart(jd, place, starPositionFromMoon, seedStar, startingPlanet, divisionalChartFactor);

  let currentLord = initialLord;
  let startJd = initialStartJd;

  const mahadashas: DwadasottariDashaPeriod[] = [];
  const bhuktis: DwadasottariBhuktiPeriod[] = [];

  for (let cycle = 0; cycle < dhasaCycles; cycle++) {
    if (cycle > 0) {
      currentLord = initialLord;
    }
    for (let i = 0; i < 8; i++) {
      const durationYears = Math.round((DWADASOTTARI_YEARS[currentLord] ?? 7) * tribhagiFactor * 100) / 100;
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
          bhuktiLord = getNextDwadasottariLord(bhuktiLord, 1);
        } else if (antardashaOption === 5 || antardashaOption === 6) {
          bhuktiLord = getNextDwadasottariLord(bhuktiLord, -1);
        }

        const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;
        const bhuktiDuration = durationYears / 8;
        let bhuktiStartJd = startJd;

        for (let j = 0; j < 8; j++) {
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
          bhuktiLord = getNextDwadasottariLord(bhuktiLord, direction);
        }
      }

      startJd += durationYears * YEAR_DURATION;
      currentLord = getNextDwadasottariLord(currentLord);
    }
  }

  return includeBhuktis ? { mahadashas, bhuktis } : { mahadashas };
}
