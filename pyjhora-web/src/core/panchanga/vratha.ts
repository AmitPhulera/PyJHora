/**
 * Vratha (observance) date calculations
 * Ported from PyJHora vratha.py
 *
 * Calculates dates for pradosham, sankranti, amavasya, pournami,
 * ekadashi, shivarathri, and other Hindu observances.
 */

import type { Place, JhoraDate } from '../types';
import { gregorianToJulianDay, julianDayToGregorian, addDays } from '../utils/julian';
import {
  sunrise as drikSunrise,
  sunset as drikSunset,
} from '../ephemeris/swe-adapter';
import {
  vaara,
  calculateTithi,
  calculateNakshatra,
  calculateYoga,
} from './drik';
import {
  lookupFestivals,
  type FestivalEntry,
  type FestivalLanguage,
} from '../data/festivals';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUKLA_ASHTAMI = 8;
const KRISHNA_ASHTAMI = 23;
const PURATTAASI = 6;
const CHANDRA_DARSHAN_TITHI = [1];
const THIRD_CRESCENT_TITHI = [3];
const AMAVASYA_TITHI = [30];
const POURNAMI_TITHI = [15];
const SASHTI_TITHI = [6];
const SANKATAHARA_CHATHURTHI_TITHI = [19];
const SHIVARATHRI_TITHI = [29];
const PRADOSHAM_TITHI = [13, 28];
const EKADHASHI_TITHI = [11, 26];
const SRARTHA_YOGAS = [17, 27];
const SANKRANTHI_INCREMENT_DAYS = 28;
const MAHALAYA_PAKSHA_DAYS = 17;

/** Pradosham window offset from sunset in hours */
export const PRADOSHAM_SUNSET_OFFSET: [number, number] = [-1.5, 1.5];

/** Ekadashi names */
export const EKADHASHI_LIST = [
  'varuthini', 'mohini', 'apara', 'nirjala', 'yogini', 'devshayani', 'kamika',
  'shravan_puthraada', 'parivarthini', 'aja', 'indhra', 'paapankusha', 'raama',
  'devathuna', 'uthapanna', 'mokshadha', 'saphala', 'pausha_puthraada',
  'sathilla', 'jaya', 'vijaya', 'kaamadha', 'paapamochani',
];

/** Manvaadhi tithis: key -> [tithi, tamilMonth] */
export const MANVAADHI_TITHIS: Record<string, [number, number]> = {
  swayambhuva_manvadhi: [3, 1], swarochisha_manvadhi: [15, 1], uttama_manvadhi: [15, 8],
  tamasa_manvadhi: [12, 8], raivata_manvadhi: [10, 4], chakshusha_manvadhi: [15, 4],
  vaivaswata_manvadhi: [15, 3], savarni_manvadhi: [15, 12], daksha_savarni_manvadhi: [9, 7],
  brahma_savarni_manvadhi: [7, 11], dharma_savarni_manvadhi: [11, 10],
  rudra_savarni_manvadhi: [3, 6], daiva_savarni_manvadhi: [30, 5],
  indra_savarni_manvadhi: [23, 5],
};

/** Ashtaka tithis: key -> array of [tithi, tamilMonth] */
export const ASHTAKA_TITHIS: Record<string, Array<[number, number]>> = {
  purvedyu: [[22, 6], [22, 9], [22, 10], [22, 11], [22, 12]],
  ashtaka: [[23, 6], [23, 9], [23, 10], [23, 11], [23, 12]],
  anuvashtaka: [[24, 6], [24, 9], [24, 10], [24, 11], [24, 12]],
};

/** Yugadhi tithis: key -> [tithi, tamilMonth] */
export const YUGADHI_TITHIS: Record<string, [number, number]> = {
  dwapara_yuga: [30, 11], tretha_yuga: [3, 2], kali_yuga: [28, 6], sathya_yuga: [9, 8],
};

/** Vinayaka Chathurthi tithis */
export const VINAYAKA_CHATHURTHI_TITHIS: Record<string, [number, number]> = {
  vinayaka_chathurthi: [4, 5],
};

/** Special vratha type mapping */
export const SPECIAL_VRATHA_MAP: Record<string, string> = {
  pradosham: 'pradosham',
  sankranti: 'sankranti',
  amavasya: 'amavasya',
  pournami: 'pournami',
  ekadhashi: 'ekadhashi',
  sashti: 'sashti',
  sankatahara_chathurthi: 'sankatahara_chathurthi',
  vinayaka_chathurthi: 'vinayaka_chathurthi',
  shivarathri: 'shivarathri',
  chandra_dharshan: 'chandra_dharshan',
  moondraam_pirai: 'moondraam_pirai',
  srartha: 'srartha',
  ashtaka: 'ashtaka',
  manvaadhi: 'manvaadhi',
  yugadhi: 'yugadhi',
  mahalaya_paksha: 'mahalaya_paksha',
  sathyanarayana_puja: 'sathyanarayana_puja',
  durgashtami: 'durgashtami',
  kaalashtami: 'kaalashtami',
};

// ============================================================================
// TYPES
// ============================================================================

export interface VrathaDate {
  date: [number, number, number]; // [year, month, day]
  startTime: number;
  endTime: number;
  tag: string;
}

// ============================================================================
// HELPER: advance/retreat date
// ============================================================================

function nextDay(date: JhoraDate, days: number): JhoraDate {
  const d = new Date(date.year, date.month - 1, date.day + days);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function dateToTuple(d: JhoraDate): [number, number, number] {
  return [d.year, d.month, d.day];
}

function tupleToDate(t: [number, number, number]): JhoraDate {
  return { year: t[0], month: t[1], day: t[2] };
}

// ============================================================================
// TITHI DATES
// ============================================================================

/**
 * Find dates when given tithis occur between start and end dates.
 * If endDate is null, finds the next occurrence only.
 */
// @parity: py=tithi_dates
export function tithiDates(
  place: Place,
  startDate: JhoraDate,
  endDate: JhoraDate | null,
  tithiIndexList: number[],
  tagT: string = ''
): VrathaDate[] {
  const jdStart = gregorianToJulianDay(startDate, { hour: 6, minute: 30, second: 0 });
  const sr = drikSunrise(jdStart, place);
  const sunriseHours = sr.localTime + 0.5;

  const effectiveEnd = endDate ?? nextDay(startDate, 365);
  let curJd = gregorianToJulianDay(startDate, { hour: Math.floor(sunriseHours), minute: 0, second: 0 });
  const endJd = gregorianToJulianDay(effectiveEnd, { hour: Math.floor(sunriseHours), minute: 0, second: 0 });

  const results: VrathaDate[] = [];
  const skipDays = tithiIndexList.length > 1 ? 1 : 14;

  while (curJd < endJd) {
    const curTithi = calculateTithi(curJd, place);
    const { date: curDate } = julianDayToGregorian(curJd);

    if (tithiIndexList.includes(curTithi.number)) {
      const paksha = curTithi.number <= 15 ? 'Sukla' : 'Krishna';
      const tag = `${paksha} / Tithi ${curTithi.number}${tagT ? ' / ' + tagT : ''}`;
      results.push({
        date: dateToTuple(curDate),
        startTime: curTithi.startTime,
        endTime: curTithi.endTime,
        tag,
      });
      if (endDate === null) return results;
      curJd += skipDays;
    }
    curJd += 1;
  }

  return results;
}

// ============================================================================
// NAKSHATRA DATES
// ============================================================================

/**
 * Find dates when given nakshatras occur between start and end dates.
 */
// @parity: py=nakshathra_dates
export function nakshatraDates(
  place: Place,
  startDate: JhoraDate,
  endDate: JhoraDate | null,
  nakshatraIndexList: number[]
): VrathaDate[] {
  const effectiveEnd = endDate ?? nextDay(startDate, 365);
  let curJd = gregorianToJulianDay(startDate, { hour: 0, minute: 0, second: 0 });
  const endJd = gregorianToJulianDay(effectiveEnd, { hour: 0, minute: 0, second: 0 });

  const results: VrathaDate[] = [];
  const skipDays = nakshatraIndexList.length > 1 ? 1 : 26;

  while (curJd < endJd) {
    const curNak = calculateNakshatra(curJd, place);
    const { date: curDate } = julianDayToGregorian(curJd);

    if (nakshatraIndexList.includes(curNak.number)) {
      const tag = `Nakshatra ${curNak.number}`;
      results.push({
        date: dateToTuple(curDate),
        startTime: curNak.startTime,
        endTime: curNak.endTime,
        tag,
      });
      if (endDate === null) return results;
      curJd += skipDays;
    }
    curJd += 1;
  }

  return results;
}

// ============================================================================
// YOGA DATES
// ============================================================================

/**
 * Find dates when given yogas occur between start and end dates.
 */
// @parity: py=yoga_dates
export function yogaDates(
  place: Place,
  startDate: JhoraDate,
  endDate: JhoraDate | null,
  yogaIndexList: number[],
  tagY: string = ''
): VrathaDate[] {
  const effectiveEnd = endDate ?? nextDay(startDate, 365);
  let curJd = gregorianToJulianDay(startDate, { hour: 0, minute: 0, second: 0 });
  const endJd = gregorianToJulianDay(effectiveEnd, { hour: 0, minute: 0, second: 0 });

  const results: VrathaDate[] = [];
  const skipDays = yogaIndexList.length > 0 ? 1 : 26;

  while (curJd < endJd) {
    const curYoga = calculateYoga(curJd, place);
    const { date: curDate } = julianDayToGregorian(curJd);

    if (yogaIndexList.includes(curYoga.number)) {
      const tag = `Yoga ${curYoga.number}${tagY ? ' / ' + tagY : ''}`;
      results.push({
        date: dateToTuple(curDate),
        startTime: 0,
        endTime: curYoga.endTime,
        tag,
      });
      if (endDate === null) return results;
      curJd += skipDays;
    }
    curJd += 1;
  }

  return results;
}

// ============================================================================
// SPECIAL VRATHA DATE FUNCTIONS
// ============================================================================

/** Amavasya dates */
export function amavasyaDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, AMAVASYA_TITHI, 'Amavasya');
}

/** Pournami dates */
export function pournamiDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, POURNAMI_TITHI, 'Pournami');
}

/** Sashti dates */
export function sashtiDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, SASHTI_TITHI, 'Sashti');
}

/** Sankatahara Chathurthi dates */
export function sankataharaChathurthiDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, SANKATAHARA_CHATHURTHI_TITHI, 'Sankatahara Chathurthi');
}

/** Shivarathri dates */
export function shivarathriDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, SHIVARATHRI_TITHI, 'Shivarathri');
}

/** Ekadashi dates */
export function ekadhashiDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, EKADHASHI_TITHI, 'Ekadashi');
}

/** Srartha yoga dates */
export function srarthaYogaDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return yogaDates(place, start, end, SRARTHA_YOGAS, 'Srartha');
}

// ============================================================================
// PRADOSHAM
// ============================================================================

/**
 * Find pradosham dates between start and end dates.
 * Pradosham occurs on Trayodashi (13th tithi of each paksha).
 */
// @parity: py=pradosham_dates
export function pradoshamDates(
  place: Place,
  startDate: JhoraDate,
  endDate: JhoraDate | null
): VrathaDate[] {
  const pDates = tithiDates(place, startDate, endDate, PRADOSHAM_TITHI);
  const results: VrathaDate[] = [];
  const PRADOSHA_DAYS = ['Bhanu', 'Soma', 'Bhauma', 'Saumya', 'Guru', 'Bhrigu', 'Sthira'];

  for (const pdate of pDates) {
    const jd = gregorianToJulianDay(tupleToDate(pdate.date), { hour: 12, minute: 0, second: 0 });
    const ss = drikSunset(jd, place);
    const sunsetHours = ss.localTime;
    const pradoshamStart = sunsetHours + PRADOSHAM_SUNSET_OFFSET[0];
    const pradoshamEnd = sunsetHours + PRADOSHAM_SUNSET_OFFSET[1];
    const day = vaara(jd);
    const tag = `${PRADOSHA_DAYS[day]} Pradosham / ${pdate.tag}`;
    results.push({
      date: pdate.date,
      startTime: pradoshamStart,
      endTime: pradoshamEnd,
      tag,
    });
    if (endDate === null) return results;
  }

  return results;
}

// ============================================================================
// CONJUNCTION DETECTION
// ============================================================================

/**
 * Check if two planets are in conjunction (within given separation in degrees).
 * Excludes Lagna, Sun, Moon, Rahu, and Ketu (checks Mars through Saturn).
 */
export interface ConjunctionResult {
  date: [number, number, number];
  planets: Array<[number, number]>;
}

// ============================================================================
// DURGASHTAMI / KAALASHTAMI
// ============================================================================

// @parity: py=durgashtami_dates
export function durgashtamiDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, [SUKLA_ASHTAMI], 'Durgashtami');
}

// @parity: py=kaalashtami_dates
export function kaalashtamiDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, [KRISHNA_ASHTAMI], 'Kaalashtami');
}

// ============================================================================
// SATHYANARAYANA PUJA
// ============================================================================

// @parity: py=sathyanarayana_puja_dates
export function sathyanarayanaPujaDates(place: Place, start: JhoraDate, end: JhoraDate | null): VrathaDate[] {
  return tithiDates(place, start, end, POURNAMI_TITHI, 'Sathyanarayana Puja');
}

// ============================================================================
// SPECIAL VRATHA DISPATCHER
// ============================================================================

/**
 * Find special vratha dates by type.
 * @param vrathaType - One of the keys in SPECIAL_VRATHA_MAP
 */
// @parity: py=special_vratha_dates
export function specialVrathaDates(
  place: Place,
  startDate: JhoraDate,
  endDate: JhoraDate | null,
  vrathaType: string
): VrathaDate[] | null {
  const key = vrathaType.toLowerCase();
  if (!(key in SPECIAL_VRATHA_MAP)) return null;

  switch (key) {
    case 'pradosham': return pradoshamDates(place, startDate, endDate);
    case 'amavasya': return amavasyaDates(place, startDate, endDate);
    case 'pournami': return pournamiDates(place, startDate, endDate);
    case 'ekadhashi': return ekadhashiDates(place, startDate, endDate);
    case 'sashti': return sashtiDates(place, startDate, endDate);
    case 'sankatahara_chathurthi': return sankataharaChathurthiDates(place, startDate, endDate);
    case 'shivarathri': return shivarathriDates(place, startDate, endDate);
    case 'durgashtami': return durgashtamiDates(place, startDate, endDate);
    case 'kaalashtami': return kaalashtamiDates(place, startDate, endDate);
    case 'sathyanarayana_puja': return sathyanarayanaPujaDates(place, startDate, endDate);
    case 'srartha': return srarthaYogaDates(place, startDate, endDate);
    default: return null;
  }
}

// ============================================================================
// FESTIVAL DATABASE LOOKUP
// ============================================================================

export { type FestivalEntry, type FestivalLanguage } from '../data/festivals';
export { lookupFestivals, searchFestivals, getFestivalName, FESTIVAL_DATA } from '../data/festivals';

/**
 * Get festivals occurring on a given Julian day and place.
 *
 * Replicates the Python `get_festivals_of_the_day` from vratha.py.
 * It checks the festival database against the day's tithi, nakshatra,
 * tamil month/day, and vaara for each calendar type (solar=0, amanta=1, purnimanta=2).
 *
 * For calendar_type 0 (solar), it uses tithi + nakshatra + tamil solar month/day.
 * For calendar_type 1 and 2 (lunar), in a full port the vedic_date function would
 * be used. Here we check against the solar criteria since the lunar date functions
 * are not yet ported. Festivals with calendarType 1 or 2 are matched by tithi
 * and nakshatra alone (month matching uses tamilMonth from the solar calendar as
 * an approximation until lunar month calculation is ported).
 *
 * @param festivalNameContains - Optional substring filter on English festival name
 */
// @parity: py=get_festivals_of_the_day
export function getFestivalsOfTheDay(
  jd: number,
  place: Place,
  festivalNameContains?: string,
): FestivalEntry[] {
  const { date } = julianDayToGregorian(jd);

  // Get tithi(s) for the day
  const tithiResult = calculateTithi(jd, place);
  const tithis: number[] = [tithiResult.number];
  // If tithi ends before end of day, the next tithi is also active
  if (tithiResult.endTime < 24) {
    const nextTithi = (tithiResult.number % 30) + 1;
    tithis.push(nextTithi);
  }

  // Get nakshatra(s)
  const nakResult = calculateNakshatra(jd, place);
  const nakshatras: number[] = [nakResult.number];
  if (nakResult.endTime < 24) {
    const nextNak = (nakResult.number % 27) + 1;
    nakshatras.push(nextNak);
  }

  // Vaara (Python uses 1-based with Sun=1; our vaara() returns 0-based with Sun=0)
  const dayOfWeek = vaara(jd) + 1;

  // Tamil solar month approximation: use Gregorian month mapped to Tamil month.
  // In the full Python code, tamil_solar_month_and_date is used. For now, we use
  // a rough mapping where Tamil month 1 (Chithirai) starts mid-April.
  // This is a simplification; exact solar month requires sankranti calculations.
  // We use the month from the Gregorian date offset by 3 months:
  // Tamil month 1 ~ April(4), month 2 ~ May(5), ..., month 9 ~ Dec(12),
  // month 10 ~ Jan(1), month 11 ~ Feb(2), month 12 ~ Mar(3)
  const gregorianMonth = date.month;
  const tamilMonth = ((gregorianMonth + 8) % 12) + 1;
  const tamilDay = date.day;

  // Look up festivals for each calendar type
  const results: FestivalEntry[] = [];
  const seen = new Set<string>();

  for (const calType of [0, 1, 2]) {
    const matches = lookupFestivals({
      tithi: tithis,
      nakshatra: nakshatras,
      tamilMonth,
      tamilDay,
      vaara: dayOfWeek,
      calendarType: calType,
    });

    for (const m of matches) {
      // Deduplicate by English name + tithi + month combination
      const key = `${m.en}|${m.tithi}|${m.tamilMonth}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (festivalNameContains) {
        if (!m.en.toLowerCase().includes(festivalNameContains.toLowerCase())) {
          continue;
        }
      }
      results.push(m);
    }
  }

  return results;
}
