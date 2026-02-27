/**
 * Saptharishi Nakshatra Dasha System
 * Ported from PyJHora saptharishi_nakshathra.py
 * 
 * 100-year dasha cycle based on 10 nakshatras (10 years each)
 * Lords are nakshatras, not planets
 */

import {
  MOON,
  NAKSHATRA_NAMES_EN,
  SIDEREAL_YEAR
} from '../../constants';
import { getDivisionalChart, PlanetPosition } from '../../horoscope/charts';
import { getPlanetLongitude } from '../../panchanga/drik';
import type { Place } from '../../types';
import { julianDayToGregorian } from '../../utils/julian';

// ============================================================================
// TYPES
// ============================================================================

export interface SaptharishiDashaPeriod {
  lord: number;  // Nakshatra index (0-26)
  lordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface SaptharishiBhuktiPeriod {
  dashaLord: number;
  bhuktiLord: number;
  bhuktiLordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface SaptharishiResult {
  mahadashas: SaptharishiDashaPeriod[];
  bhuktis?: SaptharishiBhuktiPeriod[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const YEAR_DURATION = SIDEREAL_YEAR;
const DASHA_DURATION = 10; // Each nakshatra lord has 10 years
const DASHA_COUNT = 10;    // 10 lords

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the nakshatra progression starting from moon's nakshatra
 */
function getDashaProgression(jd: number, place: Place, startingPlanet = MOON, divisionalChartFactor = 1): number[] {
  const oneStar = 360 / 27;
  let planetLong = getPlanetLongitude(jd, place, startingPlanet);

  if (divisionalChartFactor > 1) {
    const d1Pos: PlanetPosition = { planet: startingPlanet, rasi: Math.floor(planetLong / 30), longitude: planetLong % 30 };
    const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor)[0];
    if (vargaPos) {
      planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
    }
  }

  const nak = Math.floor(planetLong / oneStar);
  
  // Build progression going backwards from birth nakshatra
  const progression: number[] = [];
  for (let i = 0; i < DASHA_COUNT; i++) {
    progression.push(((nak - i) % 27 + 27) % 27);
  }
  return progression;
}

function formatJdAsDate(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? 'AM' : 'PM';
  const yearStr = date.year < 0 ? `${Math.abs(date.year)} BC` : date.year.toString();
  return `${yearStr}-${pad(date.month)}-${pad(date.day)} ${pad(hour12)}:${pad(time.minute)}:${pad(time.second)} ${ampm}`;
}

/**
 * Get the next lord in the dhasa lords list
 */
function getNextAdhipati(lord: number, dashaLords: number[], direction = 1): number {
  const currentIndex = dashaLords.indexOf(lord);
  if (currentIndex === -1) return dashaLords[0]!;
  const nextIndex = ((currentIndex + direction) % dashaLords.length + dashaLords.length) % dashaLords.length;
  return dashaLords[nextIndex]!;
}

/**
 * Calculate antardhasa (bhukti) lord sequence based on option
 * Matches Python's _antardhasa function
 */
function getAntardhasa(dashaLord: number, antardashaOption: number): number[] {
  const dashaLords: number[] = [];
  for (let i = 0; i < DASHA_COUNT; i++) {
    dashaLords.push(((dashaLord - i) % 27 + 27) % 27);
  }

  let lord = dashaLord;
  if (antardashaOption === 3 || antardashaOption === 4) {
    lord = getNextAdhipati(dashaLord, dashaLords, 1);
  } else if (antardashaOption === 5 || antardashaOption === 6) {
    lord = getNextAdhipati(dashaLord, dashaLords, -1);
  }

  const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;
  const bhuktiLords: number[] = [];
  for (let i = 0; i < dashaLords.length; i++) {
    bhuktiLords.push(lord);
    lord = getNextAdhipati(lord, dashaLords, direction);
  }
  return bhuktiLords;
}

export function getSaptharishiDashaBhukti(
  jd: number,
  place: Place,
  options: {
    startingPlanet?: number;
    includeBhuktis?: boolean;
    antardashaOption?: number;
    divisionalChartFactor?: number;
    useTribhagiVariation?: boolean;
  } = {}
): SaptharishiResult {
  const {
    startingPlanet = MOON,
    includeBhuktis = true,
    antardashaOption = 1,
    divisionalChartFactor = 1,
    useTribhagiVariation = false
  } = options;

  // Tribhagi variation: divide each dasha by 3, run 3x cycles
  const tribhagiFactor = useTribhagiVariation ? 1 / 3 : 1;
  const dhasaCycles = useTribhagiVariation ? 3 : 1;

  const progression = getDashaProgression(jd, place, startingPlanet, divisionalChartFactor);

  let startJd = jd;
  const mahadashas: SaptharishiDashaPeriod[] = [];
  const bhuktis: SaptharishiBhuktiPeriod[] = [];

  for (let cycle = 0; cycle < dhasaCycles; cycle++) {
    for (const dashaLord of progression) {
      const durationYears = DASHA_DURATION * tribhagiFactor;
      const lordName = NAKSHATRA_NAMES_EN[dashaLord] ?? `Nakshatra ${dashaLord}`;

      mahadashas.push({
        lord: dashaLord,
        lordName,
        startJd,
        startDate: formatJdAsDate(startJd),
        durationYears
      });

      if (includeBhuktis) {
        // Build bhukti lords using Python-matching antardhasa logic
        const bhuktiLords = getAntardhasa(dashaLord, antardashaOption);
        const bhuktiDuration = DASHA_DURATION / bhuktiLords.length;
        let bhuktiStartJd = startJd;

        for (const bhuktiLord of bhuktiLords) {
          const bhuktiLordName = NAKSHATRA_NAMES_EN[bhuktiLord] ?? `Nakshatra ${bhuktiLord}`;

          bhuktis.push({
            dashaLord,
            bhuktiLord,
            bhuktiLordName,
            startJd: bhuktiStartJd,
            startDate: formatJdAsDate(bhuktiStartJd),
            durationYears: bhuktiDuration
          });
          bhuktiStartJd += bhuktiDuration * YEAR_DURATION;
        }
      }

      startJd += durationYears * YEAR_DURATION;
    }
  }

  return includeBhuktis ? { mahadashas, bhuktis } : { mahadashas };
}
