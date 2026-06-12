/**
 * Yoga Vimsottari Dasha System
 * Ported from PyJHora yoga_vimsottari.py
 *
 * This is like Vimsottari dasha but based on Yoga instead of Nakshatra.
 * Yoga = Sun longitude + Moon longitude (normalized), divided into 27 parts.
 * Total span: 120 years, same as Vimsottari.
 */

import {
  PLANET_NAMES_EN,
  SIDEREAL_YEAR,
  VIMSOTTARI_TOTAL_YEARS,
  VIMSOTTARI_LORDS,
  VIMSOTTARI_YEARS
} from '../../constants';
import { lunarLongitude, solarLongitude } from '../../ephemeris/swe-adapter';
import type { Place } from '../../types';
import { normalizeDegrees } from '../../utils/angle';
import { julianDayToGregorian, toUtc } from '../../utils/julian';

// ============================================================================
// TYPES
// ============================================================================

export interface YogaVimsottariDashaPeriod {
  lord: number;
  lordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface YogaVimsottariBhuktiPeriod {
  dashaLord: number;
  dashaLordName: string;
  bhuktiLord: number;
  bhuktiLordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface YogaVimsottariAntaraPeriod {
  dashaLord: number;
  dashaLordName: string;
  bhuktiLord: number;
  bhuktiLordName: string;
  antaraLord: number;
  antaraLordName: string;
  startJd: number;
  startDate: string;
  durationYears: number;
}

export interface YogaVimsottariResult {
  yogaNumber: number;
  yogaName: string;
  yogaFraction: number;
  dashaBalance: number;
  mahadashas: YogaVimsottariDashaPeriod[];
  bhuktis?: YogaVimsottariBhuktiPeriod[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const YEAR_DURATION = SIDEREAL_YEAR;

// Yoga to dasha lord mapping: yoga_index (1-27) -> [planet, duration]
// Yoga groups: 3 yogas per planet (similar to nakshatra)
// Yogas 3,12,21 -> Ketu (7 years)
// Yogas 4,13,22 -> Venus (20 years)
// Yogas 5,14,23 -> Sun (6 years)
// Yogas 6,15,24 -> Moon (10 years)
// Yogas 7,16,25 -> Mars (7 years)
// Yogas 8,17,26 -> Rahu (18 years)
// Yogas 9,18,27 -> Jupiter (16 years)
// Yogas 1,10,19 -> Saturn (19 years)
// Yogas 2,11,20 -> Mercury (17 years)

const YOGA_TO_LORD: Record<number, [number, number]> = {
  // Yoga index -> [planet, years]
  3: [8, 7], 12: [8, 7], 21: [8, 7],     // Ketu
  4: [5, 20], 13: [5, 20], 22: [5, 20],   // Venus
  5: [0, 6], 14: [0, 6], 23: [0, 6],      // Sun
  6: [1, 10], 15: [1, 10], 24: [1, 10],   // Moon
  7: [2, 7], 16: [2, 7], 25: [2, 7],      // Mars
  8: [7, 18], 17: [7, 18], 26: [7, 18],   // Rahu
  9: [4, 16], 18: [4, 16], 27: [4, 16],   // Jupiter
  1: [6, 19], 10: [6, 19], 19: [6, 19],   // Saturn
  2: [3, 17], 11: [3, 17], 20: [3, 17],   // Mercury
};

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarman', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatJdAsDate(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? 'AM' : 'PM';
  const yearStr = date.year < 0 ? `${Math.abs(date.year)} BC` : date.year.toString();
  return `${yearStr}-${pad(date.month)}-${pad(date.day)} ${pad(hour12)}:${pad(time.minute)}:${pad(time.second)} ${ampm}`;
}

/**
 * Get yoga lord and duration from yoga index
 */
function getYogaLord(yogaIndex: number): [number, number] {
  return YOGA_TO_LORD[yogaIndex] ?? [6, 19]; // Default to Saturn
}

/**
 * Calculate yoga phase (Sun + Moon longitude)
 */
function getYogaPhase(jdUtc: number): number {
  const moonLong = lunarLongitude(jdUtc);
  const sunLong = solarLongitude(jdUtc);
  return normalizeDegrees(moonLong + sunLong);
}

/**
 * Calculate yoga number and fraction from JD.
 *
 * Python yoga_vimsottari.py uses time-based interpolation via
 * utils.get_fraction(yoga_start, yoga_end, birth_time_hrs), which computes
 * (end - birth) / (end - start) = fraction remaining. The degree-based
 * approach here is algebraically equivalent because in the Python yogam()
 * new-path, start_time is derived from degrees_left/one_yoga, so the time
 * fraction equals degrees_left / one_yoga = our fractionLeft.
 */
function calculateYogaAndFraction(jd: number, place: Place): {
  yogaNumber: number;
  yogaFraction: number;
} {
  const jdUtc = toUtc(jd, place.timezone);

  const oneYoga = 360 / 27;
  const total = getYogaPhase(jdUtc);
  const yogaNumber = Math.ceil(total / oneYoga) || 27;

  // Calculate fraction left in current yoga (degree-based)
  const degreesLeft = yogaNumber * oneYoga - total;
  const fractionLeft = degreesLeft / oneYoga;

  // The yoga fraction is how much has elapsed (1 - fraction left)
  // Equivalent to Python's (1 - get_fraction(start, end, birth_time_hrs))
  return {
    yogaNumber,
    yogaFraction: 1 - fractionLeft
  };
}

/**
 * Get next lord in Vimsottari sequence
 */
function getNextLord(lord: number, direction: number = 1): number {
  const index = VIMSOTTARI_LORDS.indexOf(lord);
  if (index === -1) return VIMSOTTARI_LORDS[0]!;
  const nextIndex = (index + direction + VIMSOTTARI_LORDS.length) % VIMSOTTARI_LORDS.length;
  return VIMSOTTARI_LORDS[nextIndex]!;
}

/**
 * Calculate dasha start date based on yoga
 */
function getDashaStartDate(jd: number, place: Place): {
  lord: number;
  startJd: number;
} {
  const { yogaNumber, yogaFraction } = calculateYogaAndFraction(jd, place);
  const [lord, durationYears] = getYogaLord(yogaNumber);

  // Period elapsed = fraction already passed * duration
  const periodElapsed = yogaFraction * durationYears * YEAR_DURATION;
  const startJd = jd - periodElapsed;

  return { lord, startJd };
}

// ============================================================================
// ANTARA CALCULATION (Level 3)
// ============================================================================

/**
 * Compute all antaradasas from a given bhukti's start date.
 * Ported from Python yoga_vimsottari._vimsottari_antara().
 *
 * Note: The Python source has a bug where it accesses vimsottari_dict[lord]
 * which returns [yoga_list, duration] instead of just the duration. The
 * correct semantics (matching standard vimsottari antara) use the duration
 * value (index [1]), which is what this port implements.
 *
 * Formula: factor = (maha_years * bhukti_years * antara_years) / total^2
 *
 * @param mahaLord - Mahadasha lord
 * @param bhuktiLord - Bhukti lord
 * @param startDate - Start JD of the bhukti
 * @returns Map of antara lord to start JD
 */
// @parity: py=_vimsottari_antara
export function vimsottariAntara(
  mahaLord: number,
  bhuktiLord: number,
  startDate: number
): Map<number, number> {
  let lord = bhuktiLord;
  const antaras = new Map<number, number>();

  for (let i = 0; i < 9; i++) {
    antaras.set(lord, startDate);

    const mahaYears = VIMSOTTARI_YEARS[mahaLord] ?? 0;
    const bhuktiYears = VIMSOTTARI_YEARS[bhuktiLord] ?? 0;
    const antaraYears = VIMSOTTARI_YEARS[lord] ?? 0;

    // factor = (maha * bhukti * antara) / total^2
    const factor = (mahaYears * bhuktiYears * antaraYears) /
      (VIMSOTTARI_TOTAL_YEARS * VIMSOTTARI_TOTAL_YEARS);

    startDate += factor * YEAR_DURATION;
    lord = getNextLord(lord);
  }

  return antaras;
}

/**
 * Find the key in a sorted map such that map[key] < jd, returning the
 * last (largest) such key. Ported from Python _where_occurs().
 *
 * @param jd - Julian day to locate
 * @param dict - Ordered map of lord -> start JD (ascending order)
 * @returns The lord key, or undefined if not found
 */
function whereOccurs(jd: number, dict: Map<number, number>): number | undefined {
  const keys = Array.from(dict.keys());
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i]!;
    const val = dict.get(key)!;
    if (val < jd) return key;
  }
  return undefined;
}

/**
 * Compute the bhukti sub-periods for a given mahadasha lord and start date.
 * Internal helper matching Python _vimsottari_bhukti() with default antardhasaOption=1.
 *
 * @param mahaLord - Mahadasha lord
 * @param startDate - Start JD of the mahadasha
 * @returns Map of bhukti lord to start JD
 */
function vimsottariBhuktiMap(
  mahaLord: number,
  startDate: number
): Map<number, number> {
  let lord = mahaLord;
  const bhuktis = new Map<number, number>();

  for (let i = 0; i < 9; i++) {
    bhuktis.set(lord, startDate);

    const bhuktiYears = VIMSOTTARI_YEARS[lord] ?? 0;
    const mahaYears = VIMSOTTARI_YEARS[mahaLord] ?? 0;
    const factor = (bhuktiYears * mahaYears) / VIMSOTTARI_TOTAL_YEARS;

    startDate += factor * YEAR_DURATION;
    lord = getNextLord(lord);
  }

  return bhuktis;
}

/**
 * Returns the antaradasha within which the given JD falls.
 * Ported from Python compute_vimsottari_antara_from().
 *
 * @param jd - Julian day to locate
 * @param mahadashas - Map of mahadasha lord to start JD (from vimsottariMahadasa)
 * @returns Tuple of [mahaLord, bhuktiLord, antaraMap] or undefined if not found
 */
// @parity: py=compute_vimsottari_antara_from
export function computeVimsottariAntaraFrom(
  jd: number,
  mahadashas: Map<number, number>
): { mahaLord: number; bhuktiLord: number; antaras: Map<number, number> } | undefined {
  // Find mahadasha where this JD falls
  const mahaLord = whereOccurs(jd, mahadashas);
  if (mahaLord === undefined) return undefined;

  // Compute all bhuktis of that mahadasha
  const bhuktis = vimsottariBhuktiMap(mahaLord, mahadashas.get(mahaLord)!);

  // Find bhukti where this JD falls
  const bhuktiLord = whereOccurs(jd, bhuktis);
  if (bhuktiLord === undefined) return undefined;

  // Compute all antaras of that bhukti
  const antaras = vimsottariAntara(mahaLord, bhuktiLord, bhuktis.get(bhuktiLord)!);

  return { mahaLord, bhuktiLord, antaras };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Get Yoga Vimsottari Dasha data
 * @param jd - Julian Day Number (birth time)
 * @param place - Place data
 * @param options - Calculation options
 * @returns Yoga Vimsottari dasha result with mahadashas and optional bhuktis
 */
// @parity: py=get_dhasa_bhukthi
export function getYogaVimsottariDashaBhukti(
  jd: number,
  place: Place,
  options: {
    includeBhuktis?: boolean;
    antardhasaOption?: 1 | 2 | 3 | 4 | 5 | 6;
    useTribhagiVariation?: boolean;
  } = {}
): YogaVimsottariResult {
  const {
    includeBhuktis = true,
    antardhasaOption = 1,
    useTribhagiVariation = false
  } = options;

  const { yogaNumber, yogaFraction } = calculateYogaAndFraction(jd, place);
  const yogaName = YOGA_NAMES[yogaNumber - 1] ?? `Yoga ${yogaNumber}`;

  // Get starting lord and date
  let { lord, startJd } = getDashaStartDate(jd, place);

  // Calculate dasha balance
  const [, firstLordDuration] = getYogaLord(yogaNumber);
  const dashaBalance = (1 - yogaFraction) * firstLordDuration;

  // Tribhagi variation divides each dasha into 3 parts
  const tribhagiFactor = useTribhagiVariation ? 1 / 3 : 1;
  const cycles = useTribhagiVariation ? 3 : 1;

  const mahadashas: YogaVimsottariDashaPeriod[] = [];
  const bhuktis: YogaVimsottariBhuktiPeriod[] = [];

  for (let cycle = 0; cycle < cycles; cycle++) {
    let currentLord = lord;

    for (let i = 0; i < 9; i++) {
      const durationYears = VIMSOTTARI_YEARS[currentLord]! * tribhagiFactor;

      if (includeBhuktis) {
        // Determine bhukti starting lord and direction based on option
        let bhuktiLord = currentLord;
        let direction = 1;

        if (antardhasaOption === 2) {
          direction = -1;
        } else if (antardhasaOption === 3) {
          bhuktiLord = getNextLord(currentLord, 1);
          direction = 1;
        } else if (antardhasaOption === 4) {
          bhuktiLord = getNextLord(currentLord, 1);
          direction = -1;
        } else if (antardhasaOption === 5) {
          bhuktiLord = getNextLord(currentLord, -1);
          direction = 1;
        } else if (antardhasaOption === 6) {
          bhuktiLord = getNextLord(currentLord, -1);
          direction = -1;
        }

        let bhuktiStart = startJd;
        for (let j = 0; j < 9; j++) {
          const bhuktiDuration = (VIMSOTTARI_YEARS[bhuktiLord]! * durationYears) / VIMSOTTARI_TOTAL_YEARS;

          bhuktis.push({
            dashaLord: currentLord,
            dashaLordName: PLANET_NAMES_EN[currentLord] ?? `Planet ${currentLord}`,
            bhuktiLord,
            bhuktiLordName: PLANET_NAMES_EN[bhuktiLord] ?? `Planet ${bhuktiLord}`,
            startJd: bhuktiStart,
            startDate: formatJdAsDate(bhuktiStart),
            durationYears: bhuktiDuration
          });

          bhuktiStart += bhuktiDuration * YEAR_DURATION;
          bhuktiLord = getNextLord(bhuktiLord, direction);
        }
      }

      mahadashas.push({
        lord: currentLord,
        lordName: PLANET_NAMES_EN[currentLord] ?? `Planet ${currentLord}`,
        startJd,
        startDate: formatJdAsDate(startJd),
        durationYears
      });

      startJd += durationYears * YEAR_DURATION;
      currentLord = getNextLord(currentLord, 1);
    }
  }

  return {
    yogaNumber,
    yogaName,
    yogaFraction,
    dashaBalance,
    mahadashas,
    bhuktis: includeBhuktis ? bhuktis : undefined
  };
}
