/**
 * Panchangam resource/info gathering
 * Ported from PyJHora info.py
 *
 * Provides functions that assemble human-readable panchangam information
 * for a given Julian day and place, including tithi, nakshatra, yoga,
 * karana, raahu kaalam, gulikai, etc.
 */

import type { Place } from '../types';
import { julianDayToGregorian } from '../utils/julian';
import {
  vaara,
  calculateTithi,
  calculateNakshatra,
  calculateYoga,
  calculateKarana,
  dayLength,
  nightLength,
  trikalam,
  abhijitMuhurta,
  durmuhurtam,
  getPlanetLongitude,
} from './drik';
import {
  sunrise,
  sunset,
  solarLongitude,
  lunarLongitude,
} from '../ephemeris/swe-adapter';
import {
  NAKSHATRA_NAMES_EN,
  RASI_NAMES_EN,
  TITHI_NAMES_EN,
  YOGA_NAMES_EN,
  MOON,
} from '../constants';
import { normalizeDegrees, rasiFromLongitude } from '../utils/angle';
import { getFestivalsOfTheDay } from './vratha';
import type { FestivalLanguage } from '../data/festivals';

// ============================================================================
// TYPES
// ============================================================================

export interface PanchangamInfo {
  [key: string]: string;
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

const DAYS_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAKSHA_LIST = ['Sukla Paksha', 'Krishna Paksha'];

/**
 * Format decimal hours as HH:MM:SS string.
 */
export function formatDms(hours: number): string {
  const sign = hours < 0 ? '-' : '';
  const h = Math.abs(hours);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ss = Math.round(((h - hh) * 60 - mm) * 60);
  return `${sign}${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// ============================================================================
// BASIC PANCHANGAM
// ============================================================================

/**
 * Get basic panchangam information for a given Julian Day and place.
 * Returns a dictionary of key-value pairs suitable for display.
 */
// @parity: py=get_panchangam_resources_basic
export function getPanchangamBasic(jd: number, place: Place): PanchangamInfo {
  const results: PanchangamInfo = {};
  const { date, time } = julianDayToGregorian(jd);
  const birthTimeHrs = time.hour + time.minute / 60 + time.second / 3600;

  // Place
  results['Place'] = `${place.name} (${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}, ${place.timezone})`;

  // Vaara (weekday)
  const v = vaara(jd);
  results['Vaara'] = DAYS_LIST[v];

  // Date
  const dateStr = `${date.day}-${MONTH_SHORT_LIST[date.month - 1]}-${date.year}`;
  results['Date'] = dateStr;

  // Time
  results['Time'] = formatDms(birthTimeHrs);

  // Sunrise/sunset
  const sr = sunrise(jd, place);
  const ss = sunset(jd, place);
  results['Sunrise'] = formatDms(sr.localTime);
  results['Sunset'] = formatDms(ss.localTime);

  // Tithi
  const t = calculateTithi(jd, place);
  const pakshaIdx = t.number > 15 ? 1 : 0;
  results['Tithi'] = `${PAKSHA_LIST[pakshaIdx]} ${TITHI_NAMES_EN[t.number - 1]} ends at ${formatDms(t.endTime)}`;

  // Nakshatra
  const nak = calculateNakshatra(jd, place);
  results['Nakshatra'] = `${NAKSHATRA_NAMES_EN[nak.number - 1]} Pada ${nak.pada} ends at ${formatDms(nak.endTime)}`;

  // Rasi (moon sign from longitude)
  const moonLong = getPlanetLongitude(jd, place, MOON);
  const rasiIdx = rasiFromLongitude(moonLong);
  results['Rasi'] = RASI_NAMES_EN[rasiIdx];

  // Yoga
  const yoga = calculateYoga(jd, place);
  results['Yoga'] = `${YOGA_NAMES_EN[yoga.number - 1]} ends at ${formatDms(yoga.endTime)}`;

  // Karana
  const kar = calculateKarana(jd, place);
  results['Karana'] = `Karana ${kar.number} ends at ${formatDms(kar.endTime)}`;

  // Day/Night length
  const dl = dayLength(jd, place);
  const nl = nightLength(jd, place);
  results['Day Length'] = formatDms(dl);
  results['Night Length'] = formatDms(nl);

  // Raahu Kaalam
  const rk = trikalam(jd, place, 'raahu kaalam');
  results['Raahu Kaalam'] = `${formatDms(rk[0])} - ${formatDms(rk[1])}`;

  // Gulikai Kaalam
  const gk = trikalam(jd, place, 'gulikai');
  results['Gulikai Kaalam'] = `${formatDms(gk[0])} - ${formatDms(gk[1])}`;

  // Yamaganda Kaalam
  const yk = trikalam(jd, place, 'yamagandam');
  results['Yamaganda Kaalam'] = `${formatDms(yk[0])} - ${formatDms(yk[1])}`;

  // Abhijit Muhurta
  const am = abhijitMuhurta(jd, place);
  results['Abhijit Muhurta'] = `${formatDms(am[0])} - ${formatDms(am[1])}`;

  // Durmuhurtam
  const dm = durmuhurtam(jd, place);
  results['Durmuhurtam'] = `${formatDms(dm[0])} - ${formatDms(dm[1])}`;

  // Festivals
  const festivals = getFestivalsOfTheDay(jd, place);
  if (festivals.length > 0) {
    results['Festivals'] = festivals.map((f) => f.en).join(', ');
  }

  return results;
}

/**
 * Get panchangam information with a specified resource type.
 * @param resourceType - null for all, 1=basic, 2=special tithis, 3=gowri, 4=muhurtham, 5=horai, 6=misc
 */
// @parity: py=get_panchangam_resources
export function getPanchangamResources(
  jd: number,
  place: Place,
  resourceType: number | number[] | null = null
): PanchangamInfo {
  const types: number[] = resourceType === null
    ? [1]
    : Array.isArray(resourceType)
      ? resourceType
      : [resourceType];

  let results: PanchangamInfo = {};

  for (const t of types) {
    switch (t) {
      case 0:
      case 1:
        results = { ...results, ...getPanchangamBasic(jd, place) };
        break;
      // Additional resource types (special tithis, gowri, muhurtham, horai, misc)
      // can be added here following the same pattern as the Python code.
      default:
        results = { ...results, ...getPanchangamBasic(jd, place) };
        break;
    }
  }

  return results;
}
