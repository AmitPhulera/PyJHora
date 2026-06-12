/**
 * Pancha Paksha Sastra module
 * Ported from PyJHora pancha_paksha.py
 *
 * Determines the ruling bird (pakshi) for a person based on birth nakshatra
 * and paksha, then provides activity timings for each period of the day/night.
 */

import { PANCHA_PAKSHI_DB } from '../data/pancha-paksha-data';
import type { Place } from '../types';
import {
  calculateTithi,
  dayLength,
  nightLength,
  nakshatraNew,
  vaara,
} from './drik';
import { sunrise } from '../ephemeris/swe-adapter';
import { julianDayNumber, julianDayToGregorian } from '../utils/julian';
import type { JhoraDate, JhoraTime } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Column indices in the DB rows */
const COL_WEEK_DAY = 0;
const COL_PAKSHA = 1;
const COL_DAYNIGHT = 2;
const COL_NAK_BIRD = 3;
const COL_NAK_ACTIVITY = 4;
const COL_SUB_BIRD = 5;
const COL_SUB_ACTIVITY = 6;
const COL_DURATION_FACTOR = 7;
const COL_RELATION = 8;
const COL_POWER_FACTOR = 9;
const COL_EFFECT = 10;
const COL_RATING = 11;
const COL_PADU_PAKSHI = 12;
const COL_BHARANA_PAKSHI = 13;

/** Bird names (0-indexed) */
export const PANCHA_PAKSHI_BIRDS = ['vulture', 'owl', 'crow', 'cock', 'peacock'] as const;

/** Activity names (0-indexed) */
export const PANCHA_PAKSHI_ACTIVITIES = ['ruling', 'eating', 'walking', 'sleeping', 'dying'] as const;

/** Relation types */
export const PP_RELATIONS = ['enemy', 'same', 'friend'] as const;

/** Effect levels */
export const PP_EFFECTS = ['very_bad', 'bad', 'average', 'good', 'very_good'] as const;

/** Activity background colors for display */
export const PP_ACTIVITY_COLORS = ['dark green', 'yellow', 'light green', 'orange', 'red'] as const;

/** Relation colors for display */
export const PP_RELATION_COLORS = ['orange', 'yellow', 'light green'] as const;

/** Effect colors for display */
export const PP_EFFECT_COLORS = ['red', 'orange', 'yellow', 'light green', 'dark green'] as const;

/**
 * Birth bird mapping: for each of the 27 nakshatras,
 * (bird if shukla paksha, bird if krishna paksha).
 * Birds are 1-indexed: 1=Vulture, 2=Owl, 3=Crow, 4=Cock, 5=Peacock
 */
export const PANCHA_PAKSHI_STARS_BIRDS_PAKSHA: [number, number][] = [
  [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],   // Ashwini..Mrigashirsha
  [2, 4], [2, 4], [2, 4], [2, 4], [2, 4], [2, 4], // Ardra..Purva Phalguni
  [3, 3], [3, 3], [3, 3], [3, 3], [3, 3],   // Uttara Phalguni..Anuradha
  [4, 2], [4, 2], [4, 2], [4, 2], [4, 2],   // Jyeshtha..Purva Ashadha
  [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], // Uttara Ashadha..Revati
];

/**
 * Duration factors for activities during day [0] and night [1].
 * Order: Rule, Eat, Walk, Sleep, Death
 * Raw values out of 144; normalised by dividing by 144.
 */
const _PANCHA_PAKSHI_DURATION_RAW = [
  [48, 30, 36, 18, 12],
  [24, 30, 30, 24, 36],
];
export const PANCHA_PAKSHI_DURATION_LIST = _PANCHA_PAKSHI_DURATION_RAW.map(
  (row) => row.map((v) => v / 144),
);

// ============================================================================
// TYPES
// ============================================================================

export interface PanchaPakshiSubEntry {
  /** Start time as formatted string */
  startTime: string;
  /** Whether this is daytime (true) or nighttime (false) */
  isDaytime: boolean;
  /** End time as formatted string */
  endTime: string;
  /** Duration description */
  duration: string;
  /** Main bird index (0-based) */
  mainBirdIndex: number;
  /** Main bird name */
  mainBird: string;
  /** Main activity index (0-based) */
  mainActivityIndex: number;
  /** Main activity name */
  mainActivity: string;
  /** Sub bird index (0-based) */
  subBirdIndex: number;
  /** Sub bird name */
  subBird: string;
  /** Sub activity index (0-based) */
  subActivityIndex: number;
  /** Sub activity name */
  subActivity: string;
  /** Relation index (0=enemy, 1=same, 2=friend) */
  relationIndex: number;
  /** Relation name */
  relation: string;
  /** Power factor (0-1) */
  powerFactor: number;
  /** Effect index (0-4) */
  effectIndex: number;
  /** Effect name */
  effect: string;
  /** Rating (1-10) */
  rating: number;
}

export interface PanchaPakshiPeriod {
  /** Parent-level summary for this period */
  pakshaIndex: number;
  weekdayIndex: number;
  isDaytime: boolean;
  /** Nakshatra bird index (0-based) */
  nakBirdIndex: number;
  /** Nakshatra bird name */
  nakBird: string;
  /** Padu pakshi index (0-based) */
  paduPakshiIndex: number;
  /** Padu pakshi name */
  paduPakshi: string;
  /** Bharana pakshi index (0-based) */
  bharanaPakshiIndex: number;
  /** Bharana pakshi name */
  bharanaPakshi: string;
  /** Top-level entry (summary for the period) */
  summary: PanchaPakshiSubEntry;
  /** Sub-entries (5 sub-periods within this period) */
  subPeriods: PanchaPakshiSubEntry[];
}

export interface PanchaPakshiResult {
  headers: string[];
  periods: PanchaPakshiPeriod[];
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get the birth nakshatra number (1-based) for a given julian day and place.
 */
// @parity: py=_get_birth_nakshathra
export function getBirthNakshatra(jd: number, place: Place): number {
  return nakshatraNew(jd, place)[0];
}

/**
 * Get the paksha (1 = shukla, 2 = krishna) for a given julian day and place.
 */
// @parity: py=_get_paksha
export function getPaksha(jd: number, place: Place): number {
  const tithi = calculateTithi(jd, place).number;
  return tithi <= 15 ? 1 : 2;
}

/**
 * Get the birth bird (1-indexed) from the birth nakshatra and paksha.
 * @param birthStar - Nakshatra number (1-based, 1-27)
 * @param paksha - 1 for shukla, 2 for krishna
 * @returns Bird number (1-indexed: 1=Vulture, 2=Owl, 3=Crow, 4=Cock, 5=Peacock)
 */
// @parity: py=_get_birth_bird_from_nakshathra
export function getBirthBirdFromNakshatra(birthStar: number, paksha: number): number {
  return PANCHA_PAKSHI_STARS_BIRDS_PAKSHA[birthStar - 1][paksha - 1];
}

/**
 * Query the Pancha Pakshi database for matching rows.
 * All indices here are 0-based in the DB but the function accepts 1-based
 * bird/weekday/paksha to match the Python API.
 *
 * @param birdIndex - Bird number (1-indexed)
 * @param weekdayIndex - Weekday (1-indexed, 1=Sunday)
 * @param pakshaIndex - Paksha (1-indexed, 1=shukla, 2=krishna)
 * @returns Matching rows from the database
 */
// @parity: py=get_matching_pancha_pakshi_data_from_db
export function getMatchingPanchaPakshiData(
  birdIndex: number,
  weekdayIndex: number,
  pakshaIndex: number,
): number[][] {
  return PANCHA_PAKSHI_DB.filter(
    (row) =>
      row[COL_NAK_BIRD] === birdIndex - 1 &&
      row[COL_WEEK_DAY] === weekdayIndex - 1 &&
      row[COL_PAKSHA] === pakshaIndex - 1,
  );
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatJdToDateTime(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const { year: y, month: m, day: d } = date;
  const { hour: h, minute: min, second: sec } = time;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ============================================================================
// MAIN CONSTRUCTION
// ============================================================================

/**
 * Construct full Pancha Pakshi information for a given date/time/place and bird.
 *
 * This mirrors the Python construct_pancha_pakshi_information function.
 *
 * @param dob - Date of birth / date of interest
 * @param tob - Time of birth / time of interest
 * @param place - Place
 * @param nakshatraBirdIndex - The nakshatra bird index (1-indexed)
 * @returns Full pancha pakshi analysis with periods and sub-periods
 */
// @parity: py=construct_pancha_pakshi_information
export function constructPanchaPakshiInformation(
  dob: JhoraDate,
  tob: JhoraTime,
  place: Place,
  nakshatraBirdIndex: number,
): PanchaPakshiResult {
  let jd = julianDayNumber(dob, tob);

  // If before sunrise, use previous day
  let sunriseData = sunrise(jd, place);
  if (jd < sunriseData.jd) {
    jd -= 1;
    sunriseData = sunrise(jd, place);
  }

  const weekdayIndex = vaara(jd) + 1; // 1-indexed
  const pakshaIndex = getPaksha(jd, place);
  const dayLen = dayLength(jd, place);
  const nightLen = nightLength(jd, place);
  const dayInc = dayLen / 5.0;
  const nightInc = nightLen / 5.0;

  const resultList = getMatchingPanchaPakshiData(
    nakshatraBirdIndex,
    weekdayIndex,
    pakshaIndex,
  );

  const headers = [
    'starts_at', 'ends_at', 'duration', 'main_bird', 'main_activity',
    'sub_bird', 'sub_activity', 'relation', 'power', 'effect', 'rating',
  ];

  const periods: PanchaPakshiPeriod[] = [];
  let timeFromJd = sunriseData.jd;

  for (let row = 0; row < resultList.length; row += 5) {
    const [wdi, pi, dni, mbi, mai, _sbi, _sai, _df, _reli, _pf, _efi, _rtng, ppi, bpi] =
      resultList[row];
    const timeInc = (dni === 0 ? dayInc : nightInc) / 24;
    const timeToJd = timeFromJd + timeInc;

    const isDaytime = dni === 0;

    // Build summary entry
    const summary: PanchaPakshiSubEntry = {
      startTime: formatJdToDateTime(timeFromJd),
      isDaytime,
      endTime: formatJdToDateTime(timeToJd),
      duration: `${(timeInc * 24).toFixed(2)} hours`,
      mainBirdIndex: mbi,
      mainBird: PANCHA_PAKSHI_BIRDS[mbi],
      mainActivityIndex: mai,
      mainActivity: PANCHA_PAKSHI_ACTIVITIES[mai],
      subBirdIndex: -1,
      subBird: '',
      subActivityIndex: -1,
      subActivity: '',
      relationIndex: -1,
      relation: '',
      powerFactor: 0,
      effectIndex: -1,
      effect: '',
      rating: 0,
    };

    // Build sub-periods
    const subPeriods: PanchaPakshiSubEntry[] = [];
    let subFromJd = timeFromJd;

    for (let irow = row; irow < row + 5; irow++) {
      const [, , subDni, subMbi, subMai, subSbi, subSai, subDf, subReli, subPf, subEfi, subRtng] =
        resultList[irow];
      const subTimeInc = (subDni === 0 ? dayInc : nightInc) / 24;
      const subTimeToJd = subFromJd + subTimeInc * subDf;

      subPeriods.push({
        startTime: formatJdToDateTime(subFromJd),
        isDaytime: subDni === 0,
        endTime: formatJdToDateTime(subTimeToJd),
        duration: `${Math.round(subDf * subTimeInc * 24 * 60)} minutes`,
        mainBirdIndex: subMbi,
        mainBird: PANCHA_PAKSHI_BIRDS[subMbi],
        mainActivityIndex: subMai,
        mainActivity: PANCHA_PAKSHI_ACTIVITIES[subMai],
        subBirdIndex: subSbi,
        subBird: PANCHA_PAKSHI_BIRDS[subSbi],
        subActivityIndex: subSai,
        subActivity: PANCHA_PAKSHI_ACTIVITIES[subSai],
        relationIndex: subReli,
        relation: PP_RELATIONS[subReli],
        powerFactor: subPf,
        effectIndex: subEfi,
        effect: PP_EFFECTS[subEfi],
        rating: subRtng,
      });

      subFromJd = subTimeToJd;
    }

    periods.push({
      pakshaIndex: pi,
      weekdayIndex: wdi,
      isDaytime,
      nakBirdIndex: mbi,
      nakBird: PANCHA_PAKSHI_BIRDS[mbi],
      paduPakshiIndex: ppi,
      paduPakshi: PANCHA_PAKSHI_BIRDS[ppi],
      bharanaPakshiIndex: bpi,
      bharanaPakshi: PANCHA_PAKSHI_BIRDS[bpi],
      summary,
      subPeriods,
    });

    timeFromJd = subFromJd;
  }

  return { headers, periods };
}
