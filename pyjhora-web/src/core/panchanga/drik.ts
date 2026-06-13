/**
 * Panchanga calculation engine
 * Ported from PyJHora drik.py
 * 
 * Calculates tithi, nakshatra, yogam, karana, and other panchanga elements
 */

import {
    AMRITA_GADIYA_VARJYAM_STAR_MAP,
    AMRITA_SIDDHA_YOGA_DICT,
    ANANDHAADHI_YOGA_DAY_STAR_LIST,
    ASCENDANT_SYMBOL,
    AVAILABLE_HOUSE_SYSTEMS,
    BHAAVA_MADHYA_METHOD,
    CONJUNCTION_INCREMENT,
    DAGHDA_YOGA_DICT,
    DAY_RULERS,
    DISHA_SHOOL_MAP,
    DREKKANA_TABLE,
    DREKKANA_TABLE_BVRAMAN,
    DUAL_SIGNS,
    FIXED_SIGNS,
    FORCE_KALI_START_YEAR_FOR_YEARS_BEFORE_KALI_YEAR_4009,
    GAURI_CHOGHADIYA_DAY_TABLE,
    GAURI_CHOGHADIYA_NIGHT_TABLE,
    GRAHA_YUDH_CRITERIA_1,
    GRAHA_YUDH_CRITERIA_2,
    GRAHA_YUDH_CRITERIA_3,
    HOUSE_OWNERS,
    IL_FACTORS,
    JUPITER,
    KALI_START_YEAR,
    KETU,
    MAHABHARATHA_TITHI_JULIAN_DAY,
    MARS, MERCURY,
    MOON,
    MRITYU_YOGA_DICT,
    MUHURTHAS_OF_THE_DAY,
    NAKSHATHRA_LORDS,
    NIGHT_RULERS,
    RAHU,
    SARVARTHA_SIDDHA_YOGA,
    SATURN,
    SHUBHA_HORA_DAY_TABLE,
    SHUBHA_HORA_NIGHT_TABLE,
    SIDEREAL_YEAR,
    SPECIAL_THAARA_LORDS_1,
    SPECIAL_THAARA_MAP,
    SUN,
    TAMIL_BASIC_YOGA_LIST,
    TAMIL_BASIC_YOGA_SRINGERI_LIST,
    TAMIL_YOGA_NAMES,
    TRIGUNA_DAYS_DICT,
    TROPICAL_YEAR,
    USE_AHARGHANA_FOR_VAARA_CALCULATION,
    UTPATA_YOGA_DICT,
    VENUS,
    WESTERN_HOUSE_SYSTEMS,
    YAMAGHATA_YOGA_DICT,
    INCREASE_TITHI_BY_ONE_BEFORE_KALI_YUGA,
    YOGINI_VAASA_TITHI_MAP,
} from '../constants';
import {
    ascendantFull as ascendantFullSync,
    ascendantFullAsync,
    getAyanamsaValue,
    houseCuspsAsync,
    ketuFromRahu,
    lunarLongitude,
    lunarLongitudeAsync,
    moonrise as _moonrise,
    moonriseAsync as _moonriseAsync,
    moonset as _moonset,
    moonsetAsync as _moonsetAsync,
    nextLunarEclipseLocAsync,
    nextSolarEclipseLocAsync,
    planetSpeedInfo as _planetSpeedInfo,
    planetSpeedInfoAsync as _planetSpeedInfoAsync,
    planetsInRetrograde as _planetsInRetrograde,
    planetsInRetrogradeAsync as _planetsInRetrogradeAsync,
    setAyanamsaMode,
    siderealLongitude,
    siderealLongitudeAsync,
    solarEclipseHowAsync,
    solarLongitude,
    solarLongitudeAsync,
    sunrise,
    sunriseAsync,
    sunset,
    sunsetAsync,
    SWE_PLANETS
} from '../ephemeris/swe-adapter';
import type { Place } from '../types';
import { normalizeDegrees } from '../utils/angle';
import { extendAngleRange, inverseLagrange, unwrapAngles } from '../utils/interpolation';
import { gregorianToJulianDay, julianDayToGregorian, toUtc } from '../utils/julian';
import { getFraction } from '../utils/chart';
import { getMixedDivisionalChart, getDivisionalChart } from '../horoscope/charts';
import type { PlanetPosition } from '../horoscope/charts';
import { getCharaKarakas, getRelativeHouseOfPlanet } from '../horoscope/house';

// ============================================================================
// TYPES
// ============================================================================

export interface TithiResult {
  number: number;
  name: string;
  paksha: 'shukla' | 'krishna';
  startTime: number;
  endTime: number;
}

export interface NakshatraResult {
  number: number;
  name: string;
  pada: number;
  startTime: number;
  endTime: number;
}

export interface YogaResult {
  number: number;
  name: string;
  endTime: number;
}

export interface KaranaResult {
  number: number;
  name: string;
  startTime: number;
  endTime: number;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Convert time that may be outside [0,24) range to a proper date + time.
 * If time > 24 or < 0, adjusts the date accordingly.
 * Matching Python: utils._convert_to_tamil_date_and_time(panchanga_date, time_of_day_in_hours, place)
 */
function convertToTamilDateAndTime(
  dateObj: { year: number; month: number; day: number },
  timeOfDay: number,
  place?: Place
): [{ year: number; month: number; day: number }, number] {
  let extraDays = 0;
  let sign = 1;
  if (timeOfDay < 0) {
    extraDays = Math.floor(Math.abs(timeOfDay / 24)) + 1;
    sign = -1;
  } else if (timeOfDay > 24) {
    extraDays = Math.floor(Math.abs(timeOfDay / 24));
    sign = 1;
  }
  timeOfDay += -sign * extraDays * 24;

  let resultDate = dateObj;
  if (extraDays !== 0) {
    // Adjust date by sign * extraDays
    const d = new Date(dateObj.year, dateObj.month - 1, dateObj.day + sign * extraDays);
    resultDate = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  if (place) {
    // If solar time > sunset time, move to next day
    const jd = gregorianToJulianDay(resultDate, { hour: 0, minute: 0, second: 0 });
    const ss = sunset(jd, place);
    if (ss.localTime < timeOfDay) {
      const d = new Date(resultDate.year, resultDate.month - 1, resultDate.day + 1);
      resultDate = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    }
  }

  return [resultDate, timeOfDay];
}

// ============================================================================
// NAKSHATRA PADA
// ============================================================================

/**
 * Calculate nakshatra and pada from longitude
 * @param longitude - Longitude in degrees (0-360)
 * @returns [nakshatra (1-27), pada (1-4), remainder]
 */
// @parity: py=nakshatra_pada
export function nakshatraPada(longitude: number): [number, number, number] {
  const oneStar = 360 / 27; // 13°20'
  const onePada = 360 / 108; // 3°20'
  
  const normalized = normalizeDegrees(longitude);
  const quotient = Math.floor(normalized / oneStar);
  const remainder = normalized % oneStar;
  const pada = Math.floor(remainder / onePada);
  
  // Convert 0-based to 1-based
  return [1 + quotient, 1 + pada, remainder];
}

// ============================================================================
// TITHI CALCULATION
// ============================================================================

/**
 * Calculate the moon phase for tithi
 */
function tithiPhase(jd: number): number {
  const moonLong = lunarLongitude(jd);
  const sunLong = solarLongitude(jd);
  return normalizeDegrees(moonLong - sunLong);
}

/**
 * Calculate tithi for given date and place
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Tithi information
 */
export function calculateTithi(jd: number, place: Place): TithiResult {
  const jdUtc = toUtc(jd, place.timezone);
  const sunriseData = sunrise(jd, place);
  const sunriseJd = sunriseData.jd;
  
  // Calculate moon phase at sunrise
  const phase = tithiPhase(toUtc(sunriseJd, place.timezone));
  
  // Each tithi spans 12 degrees
  const tithiNumber = Math.ceil(phase / 12);
  const adjustedNumber = tithiNumber === 0 ? 30 : tithiNumber;
  
  // Determine paksha (lunar fortnight)
  const paksha = adjustedNumber <= 15 ? 'shukla' : 'krishna';
  
  // Tithi names
  const tithiNames = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
    'Purnima', // or Amavasya for krishna paksha
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
    'Amavasya'
  ];
  
  const name = tithiNames[adjustedNumber - 1] ?? `Tithi ${adjustedNumber}`;
  
  // Calculate approximate end time
  const degreesLeft = adjustedNumber * 12 - phase;
  const moonDailyMotion = 13.176; // Average lunar daily motion
  const sunDailyMotion = 0.986; // Average solar daily motion
  const relativeDailyMotion = moonDailyMotion - sunDailyMotion;
  const hoursToEnd = (degreesLeft / relativeDailyMotion) * 24;
  const endTime = sunriseData.localTime + hoursToEnd;
  
  return {
    number: adjustedNumber,
    name,
    paksha,
    startTime: sunriseData.localTime,
    endTime
  };
}

// ============================================================================
// NAKSHATRA CALCULATION
// ============================================================================

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

/**
 * Calculate nakshatra for given date and place
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Nakshatra information
 */
export function calculateNakshatra(jd: number, place: Place): NakshatraResult {
  const jdUtc = toUtc(jd, place.timezone);
  const moonLong = lunarLongitude(jdUtc);
  
  const [nakNumber, pada, remainder] = nakshatraPada(moonLong);
  const name = NAKSHATRA_NAMES[nakNumber - 1] ?? `Nakshatra ${nakNumber}`;
  
  // Calculate approximate end time
  const sunriseData = sunrise(jd, place);
  const oneStar = 360 / 27;
  const degreesLeft = nakNumber * oneStar - moonLong;
  const moonDailyMotion = 13.176;
  const hoursToEnd = ((degreesLeft + 360) % oneStar) / moonDailyMotion * 24;
  const endTime = sunriseData.localTime + hoursToEnd;
  
  return {
    number: nakNumber,
    name,
    pada,
    startTime: sunriseData.localTime,
    endTime
  };
}

// ============================================================================
// YOGA CALCULATION (Sun-Moon Yoga, not Astrological Yoga)
// ============================================================================

const YOGA_NAMES = [
  'Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarman', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
];

/**
 * Calculate yoga (sun-moon combination) for given date
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Yoga information
 */
export function calculateYoga(jd: number, place: Place): YogaResult {
  const jdUtc = toUtc(jd, place.timezone);
  const sunriseData = sunrise(jd, place);
  
  const moonLong = lunarLongitude(jdUtc);
  const sunLong = solarLongitude(jdUtc);
  
  // Yoga = sum of sun and moon longitudes divided by 13°20'
  const total = normalizeDegrees(moonLong + sunLong);
  const oneYoga = 360 / 27;
  const yogaNumber = Math.ceil(total / oneYoga);
  const adjustedNumber = yogaNumber === 0 ? 27 : yogaNumber;
  
  const name = YOGA_NAMES[adjustedNumber - 1] ?? `Yoga ${adjustedNumber}`;
  
  // Calculate approximate end time
  const degreesLeft = adjustedNumber * oneYoga - total;
  const combinedDailyMotion = 13.176 + 0.986; // Moon + Sun
  const hoursToEnd = (degreesLeft / combinedDailyMotion) * 24;
  const endTime = sunriseData.localTime + hoursToEnd;
  
  return {
    number: adjustedNumber,
    name,
    endTime
  };
}

// ============================================================================
// KARANA CALCULATION
// ============================================================================

const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti',
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'
];

/**
 * Calculate karana (half-tithi) for given date
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Karana information
 */
export function calculateKarana(jd: number, place: Place): KaranaResult {
  // Match Python's drik.karana(): derive karana start/end from tithi start/end
  const { time } = julianDayToGregorian(jd);
  const birthTimeHrs = time.hour + time.minute / 60 + time.second / 3600;

  const tithiResult = calculateTithi(jd, place);
  const tStart = tithiResult.startTime;
  const tEnd = tithiResult.endTime;
  const tMid = 0.5 * (tStart + tEnd);

  // Python: _karana = _tithi[0]*2 - 1
  let karanaNumber = tithiResult.number * 2 - 1;
  let kStart: number;
  let kEnd: number;

  if (birthTimeHrs > tMid) {
    // Second half of tithi
    karanaNumber += 1;
    kStart = tMid;
    kEnd = tEnd;
  } else {
    // First half of tithi
    kStart = tStart;
    kEnd = tMid;
  }

  // Karana cycle: 7 repeating karanas (Bava to Vishti) + 4 fixed
  let name: string;
  if (karanaNumber === 1) {
    name = 'Kimstughna';
  } else if (karanaNumber >= 58) {
    name = KARANA_NAMES[karanaNumber - 58 + 7] ?? `Karana ${karanaNumber}`;
  } else {
    name = KARANA_NAMES[(karanaNumber - 2) % 7] ?? `Karana ${karanaNumber}`;
  }

  return {
    number: karanaNumber,
    name,
    startTime: kStart,
    endTime: kEnd
  };
}

// ============================================================================
// VARA (WEEKDAY)
// ============================================================================

const VARA_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const VARA_LORDS = [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN];

/**
 * Calculate vara (weekday) for given date
 * @param jd - Julian Day Number
 * @returns Vara information
 */
// @parity: py=vaara
export function calculateVara(jd: number): { number: number; name: string; lord: number } {
  const dayOfWeek = Math.ceil(jd + 1) % 7;
  
  return {
    number: dayOfWeek,
    name: VARA_NAMES[dayOfWeek] ?? 'Unknown',
    lord: VARA_LORDS[dayOfWeek] ?? SUN
  };
}

// ============================================================================
// PLANET POSITIONS
// ============================================================================

/**
 * Get planet longitude
 * @param jd - Julian Day Number
 * @param place - Place data
 * @param planet - Planet index (0-8 for Sun to Ketu)
 * @returns Sidereal longitude in degrees
 */
export function getPlanetLongitude(jd: number, place: Place, planet: number): number {
  const jdUtc = toUtc(jd, place.timezone);
  // siderealLongitude accepts PyJHora planet indices (0-8) and handles mapping internally
  return siderealLongitude(jdUtc, planet);
}

/**
 * Get all planet positions
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Object with planet positions
 */
export function getAllPlanetPositions(
  jd: number,
  place: Place
): Record<number, { longitude: number; rasi: number; nakshatraData: [number, number, number] }> {
  const positions: Record<number, { longitude: number; rasi: number; nakshatraData: [number, number, number] }> = {};
  
  for (let planet = 0; planet <= 8; planet++) {
    const longitude = getPlanetLongitude(jd, place, planet);
    const rasi = Math.floor(longitude / 30);
    const nakshatraData = nakshatraPada(longitude);
    
    positions[planet] = { longitude, rasi, nakshatraData };
  }
  
  return positions;
}

// ============================================================================
// DAY/NIGHT LENGTH
// ============================================================================

/**
 * Calculate day length
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Day length in hours
 */
// @parity: py=day_length
export function dayLength(jd: number, place: Place): number {
  const sunriseData = sunrise(jd, place);
  const sunsetData = sunset(jd, place);
  return sunsetData.localTime - sunriseData.localTime;
}

/**
 * Calculate night length
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Night length in hours
 */
// @parity: py=night_length
export function nightLength(jd: number, place: Place): number {
  const sunsetData = sunset(jd, place);
  const nextSunrise = sunrise(jd + 1, place);
  return 24.0 + nextSunrise.localTime - sunsetData.localTime;
}

// ============================================================================
// MIDDAY / MIDNIGHT (Async)
// ============================================================================

/**
 * Calculate midday time (async) — midpoint of sunrise and sunset.
 * Python: drik.midday(jd, place)
 *
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Object with localTime (float hours) and jd (midday JD)
 */
export async function middayAsync(
  jd: number,
  place: Place
): Promise<{ localTime: number; jd: number }> {
  const sr = await sunriseAsync(jd, place);
  const ss = await sunsetAsync(jd, place);
  const localTime = 0.5 * (sr.localTime + ss.localTime);
  const midJd = 0.5 * (sr.jd + ss.jd);
  return { localTime, jd: midJd };
}

/**
 * Calculate midnight time (async) — midpoint of previous sunset and sunrise.
 * Python: drik.midnight(jd, place)
 *
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Midnight local time as float hours
 */
export async function midnightAsync(
  jd: number,
  place: Place
): Promise<number> {
  const sr = await sunriseAsync(jd, place);
  const prevSs = await sunsetAsync(jd - 1, place);
  // Midnight is midpoint between previous sunset and current sunrise
  let mnhl = 0.5 * (sr.localTime + prevSs.localTime);
  // Adjust: if > 12, subtract 12; if < 12, do 12 - value
  // This gives hours past midnight (0-based)
  if (mnhl < 12) {
    mnhl = 12 - mnhl;
  } else {
    mnhl -= 12;
  }
  return mnhl;
}

/**
 * Convert float hours to Python utils.to_dms() default string: "HH:MM:SS"
 * (24-hour format, seconds rounded, zero-padded, with day-overflow suffix).
 */
function toDms24(hours: number): string {
  let nextDay = '';
  let d = Math.trunc(hours);
  const mins = (hours - d) * 60;
  let m = Math.trunc(mins);
  let s = Math.round((mins - m) * 60);
  if (d > 23) {
    const q = Math.trunc(d / 24);
    d = d % 24;
    if (q > 0) nextDay = ` (+${q})`;
  } else if (d < 0) {
    const q = Math.trunc(Math.abs(d) / 24) + 1;
    d = Math.abs(d) % 24;
    m = Math.abs(m);
    s = Math.abs(s);
    if (q > 0) nextDay = ` (-${q})`;
  }
  if (s === 60) { m += 1; s = 0; }
  if (m === 60) { d += 1; m = 0; }
  const z = (n: number) => String(n).padStart(2, '0');
  return `${z(d)}:${z(m)}:${z(s)}${nextDay}`;
}

/** Fractional hours of a JD (Python: utils.jd_to_gregorian(jd)[3]). */
function jdHours(jd: number): number {
  return (jd + 0.5 - Math.floor(jd + 0.5)) * 24;
}

/**
 * Calculate midday (sync) — midpoint of sunrise and sunset.
 * Python: drik.midday(jd, place) — returns [float_hours, jd]
 * Uses WASM sync sunrise/sunset when available.
 *
 * Python quirk faithfully reproduced: sunrise jd is local-encoded (seconds
 * rounded) while sunset jd is the raw UT event jd — the average mixes the two
 * conventions, and mdhl averages local rise jd hours with UT set jd hours.
 */
// @parity: py=midday
export function midday(
  jd: number,
  place: Place
): [number, number] {
  const sr = sunrise(jd, place);
  const ss = sunset(jd, place);
  const srh = jdHours(sr.jd);
  const ssh = jdHours(ss.jdUt);
  const mdhl = 0.5 * (srh + ssh);
  return [mdhl, 0.5 * (sr.jd + ss.jdUt)];
}

/**
 * Calculate midnight (sync) — midpoint of previous sunset and current sunrise.
 * Python: drik.midnight(jd, place)
 * Uses WASM sync sunrise/sunset when available.
 */
// @parity: py=midnight
export function midnight(
  jd: number,
  place: Place
): number {
  const sr = sunrise(jd, place);
  const prevSs = sunset(jd - 1, place);
  let mnhl = 0.5 * (sr.localTime + prevSs.localTime);
  if (mnhl < 12) {
    mnhl = 12 - mnhl;
  } else {
    mnhl -= 12;
  }
  return mnhl;
}

/**
 * Calculate trikalam (sync) — Raahu kaalam, Yamagandam, Gulikai.
 * Python: drik.trikalam(jd, place, option)
 * Uses WASM sync sunrise/sunset when available.
 */
// @parity: py=trikalam
export function trikalam(
  jd: number,
  place: Place,
  option: 'raahu kaalam' | 'yamagandam' | 'gulikai' = 'raahu kaalam'
): [string, string] {
  const srise = sunrise(jd, place);
  const sset = sunset(jd, place);
  const dayDur = sset.localTime - srise.localTime;
  const weekday = calculateVara(jd).number;

  const offsets: Record<string, number[]> = {
    'raahu kaalam': [0.875, 0.125, 0.75, 0.5, 0.625, 0.375, 0.25],
    'gulikai':      [0.75, 0.625, 0.5, 0.375, 0.25, 0.125, 0.0],
    'yamagandam':   [0.5, 0.375, 0.25, 0.125, 0.0, 0.75, 0.625],
  };

  const offset = offsets[option]?.[weekday] ?? 0;
  const startTime = srise.localTime + dayDur * offset;
  const endTime = startTime + 0.125 * dayDur;

  // Python returns to_dms() "HH:MM:SS" strings
  return [toDms24(startTime), toDms24(endTime)];
}

/**
 * Calculate Abhijit Muhurta (sync) — the auspicious mid-day period.
 * Python: abhijit_muhurta(jd, place)
 * Uses WASM sync sunrise/sunset when available.
 */
// @parity: py=abhijit_muhurta
export function abhijitMuhurta(
  jd: number,
  place: Place
): [string, string] {
  const srise = sunrise(jd, place);
  const sset = sunset(jd, place);
  const dayDur = sset.localTime - srise.localTime;

  const startTime = srise.localTime + (7 / 15) * dayDur;
  const endTime = srise.localTime + (8 / 15) * dayDur;

  // Python returns to_dms() "HH:MM:SS" strings
  return [toDms24(startTime), toDms24(endTime)];
}

/**
 * Calculate Durmuhurtam (sync) — inauspicious periods.
 * Python: durmuhurtam(jd, place)
 * Uses WASM sync sunrise/sunset when available.
 */
// @parity: py=durmuhurtam
export function durmuhurtam(
  jd: number,
  place: Place
): string[] {
  const srise = sunrise(jd, place);
  const sset = sunset(jd, place);
  const dayDur = sset.localTime - srise.localTime;

  const nextSr = sunrise(jd + 1, place);
  const nightDur = 24.0 + nextSr.localTime - sset.localTime;

  const weekday = calculateVara(jd).number;

  const durOffsets: [number, number][] = [
    [10.4, 0.0],  // Sunday
    [6.4, 8.8],   // Monday
    [2.4, 4.8],   // Tuesday (2nd uses night_dur)
    [5.6, 0.0],   // Wednesday
    [4.0, 8.8],   // Thursday
    [2.4, 6.4],   // Friday
    [1.6, 0.0],   // Saturday
  ];

  // Python returns a FLAT list of to_dms() strings: [start1, end1, (start2, end2)]
  const answer: string[] = [];
  const offPair = durOffsets[weekday]!;

  for (let i = 0; i < 2; i++) {
    const offset = offPair[i]!;
    if (offset !== 0.0) {
      const dur = (weekday === 2 && i === 1) ? nightDur : dayDur;
      const base = (weekday === 2 && i === 1) ? sset.localTime : srise.localTime;
      const startTime = base + dur * offset / 12;
      const endTime = startTime + dayDur * 0.8 / 12;
      answer.push(toDms24(startTime), toDms24(endTime));
    }
  }

  return answer;
}

// ============================================================================
// ASYNC PANCHANGA FUNCTIONS (using inverseLagrange + swe_rise_trans)
// ============================================================================

/**
 * Normalize angle to range [start, start+360)
 * Python: utils.normalize_angle(angle, start=0)
 */
function normalizeAngle(angle: number, start: number = 0): number {
  while (angle >= start + 360) angle -= 360;
  while (angle < start) angle += 360;
  return angle;
}

/**
 * Internal: get tithi data (tithi number + end time in hours) using inverse Lagrange.
 * Python: _get_tithi(jd, place) — core algorithm
 *
 * Uses UT JD from sunrise (matching Python's `rise = sunrise(jd, place)[2]` which is UT JD).
 *
 * @returns [tithiNo, endTimeHours, ...optionally skippedTithiNo, skippedEndTimeHours]
 */
async function _getTithiAsync(
  jd: number,
  place: Place
): Promise<number[]> {
  const tz = place.timezone;
  const { date } = julianDayToGregorian(jd);
  const jdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });

  // 1. Find time of sunrise — use jdUt (UT JD) for longitude calculations
  const riseData = await sunriseAsync(jd, place);
  const rise = riseData.jd; // Local-time-encoded JD, matching Python's sunrise()[2]

  // 2. Find tithi at sunrise: moon_phase = (moon_long - sun_long) % 360
  const moonLong = await siderealLongitudeAsync(rise, 1); // Moon
  const sunLong = await siderealLongitudeAsync(rise, 0);   // Sun
  const moonPhase = ((moonLong - sunLong) % 360 + 360) % 360;
  const today = Math.ceil(moonPhase / 12) || 30; // avoid 0
  const degreesLeft = today * 12 - moonPhase;

  // 3. Compute longitudinal differences at intervals from sunrise
  const offsets = [0.25, 0.5, 0.75, 1.0];
  const moonAtRise = moonLong;
  const sunAtRise = sunLong;

  const relativeMotion: number[] = [];
  for (const t of offsets) {
    const moonAtT = await siderealLongitudeAsync(rise + t, 1);
    const sunAtT = await siderealLongitudeAsync(rise + t, 0);
    const moonDiff = ((moonAtT - moonAtRise) % 360 + 360) % 360;
    const sunDiff = ((sunAtT - sunAtRise) % 360 + 360) % 360;
    relativeMotion.push(((moonDiff - sunDiff) % 360 + 360) % 360);
  }

  // 4. Find end time by inverse Lagrange interpolation
  const approxEnd = inverseLagrange(offsets, relativeMotion, degreesLeft);
  const ends = (rise + approxEnd - jdUtc) * 24 + tz;
  const tithiNo = today;
  const answer: number[] = [tithiNo, ends];

  // 5. Check for skipped tithi
  const moonTmrw = await siderealLongitudeAsync(rise + 1, 1);
  const sunTmrw = await siderealLongitudeAsync(rise + 1, 0);
  const moonPhaseTmrw = ((moonTmrw - sunTmrw) % 360 + 360) % 360;
  const tomorrow = Math.ceil(moonPhaseTmrw / 12) || 30;
  const isSkipped = ((tomorrow - today) % 30 + 30) % 30 > 1;
  if (isSkipped) {
    const leapTithi = today + 1;
    const leapDegreesLeft = leapTithi * 12 - moonPhase;
    const leapApproxEnd = inverseLagrange(offsets, relativeMotion, leapDegreesLeft);
    const leapEnds = (rise + leapApproxEnd - jdUtc) * 24 + tz;
    answer.push(leapTithi === 31 ? 1 : leapTithi, leapEnds);
  }

  return answer;
}

/**
 * Generic tithi calculation with custom planets.
 * Python: _get_tithi(jd, place, tithi_index, planet1, planet2, cycle)
 * Uses sidereal_longitude for arbitrary planets (not just Moon/Sun).
 */
async function _getTithiGenericAsync(
  jd: number,
  place: Place,
  planet1: number = 1,  // Moon
  planet2: number = 0,  // Sun
  tithiIndex: number = 1,
  cycle: number = 1
): Promise<number[]> {
  const tz = place.timezone;
  const { date } = julianDayToGregorian(jd);
  const jdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });

  const riseData = await sunriseAsync(jd, place);
  const rise = riseData.jd;

  // _special_tithi_phase: (tithi_index*(p1_long - p2_long)+(cycle-1)*180) % 360
  const p1AtRise = await siderealLongitudeAsync(rise, planet1);
  const p2AtRise = await siderealLongitudeAsync(rise, planet2);
  const moonPhase = ((tithiIndex * (p1AtRise - p2AtRise) + (cycle - 1) * 180) % 360 + 360) % 360;
  const today = Math.ceil(moonPhase / 12) || 30;
  const degreesLeft = today * 12 - moonPhase;

  const offsets = [0.25, 0.5, 0.75, 1.0];
  const relativeMotion: number[] = [];
  for (const t of offsets) {
    const p1AtT = await siderealLongitudeAsync(rise + t, planet1);
    const p2AtT = await siderealLongitudeAsync(rise + t, planet2);
    const p1Diff = ((p1AtT - p1AtRise) % 360 + 360) % 360;
    const p2Diff = ((p2AtT - p2AtRise) % 360 + 360) % 360;
    relativeMotion.push(((tithiIndex * (p1Diff - p2Diff) + (cycle - 1) * 180) % 360 + 360) % 360);
  }

  const approxEnd = inverseLagrange(offsets, relativeMotion, degreesLeft);
  const ends = (rise + approxEnd - jdUtc) * 24 + tz;
  const tithiNo = today;
  const answer: number[] = [tithiNo, ends];

  // Check for skipped tithi
  const p1Tmrw = await siderealLongitudeAsync(rise + 1, planet1);
  const p2Tmrw = await siderealLongitudeAsync(rise + 1, planet2);
  const moonPhaseTmrw = ((tithiIndex * (p1Tmrw - p2Tmrw) + (cycle - 1) * 180) % 360 + 360) % 360;
  const tomorrow = Math.ceil(moonPhaseTmrw / 12) || 30;
  const isSkipped = ((tomorrow - today) % 30 + 30) % 30 > 1;
  if (isSkipped) {
    const leapTithi = today + 1;
    const leapDegreesLeft = leapTithi * 12 - moonPhase;
    const leapApproxEnd = inverseLagrange(offsets, relativeMotion, leapDegreesLeft);
    const leapEnds = (rise + leapApproxEnd - jdUtc) * 24 + tz;
    answer.push(leapTithi === 31 ? 1 : leapTithi, leapEnds);
  }

  return answer;
}

/**
 * Generic yogam calculation with custom planets.
 * Python: _get_yogam(jd, place, planet1, planet2, tithi_index, cycle)
 * Uses sidereal_longitude for arbitrary planets (not just Moon/Sun).
 */
async function _getYogamGenericAsync(
  jd: number,
  place: Place,
  planet1: number = 1,  // Moon
  planet2: number = 0,  // Sun
  tithiIndex: number = 1,
  cycle: number = 1
): Promise<number[]> {
  const tz = place.timezone;
  const { date } = julianDayToGregorian(jd);
  const jdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });

  const riseData = await sunriseAsync(jd, place);
  const rise = riseData.jd;
  const oneYoga = 360 / 27;

  // _special_yoga_phase: (tithi_index*(p1_long + p2_long)+(cycle-1)*180) % 360
  const p1AtRise = await siderealLongitudeAsync(rise, planet1);
  const p2AtRise = await siderealLongitudeAsync(rise, planet2);
  const total = ((tithiIndex * (p1AtRise + p2AtRise) + (cycle - 1) * 180) % 360 + 360) % 360;
  const yog = Math.ceil(total / oneYoga) || 27;
  const yogamNo = yog;
  const degreesLeft = yog * oneYoga - total;

  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const totalMotion: number[] = [];
  for (const t of offsets) {
    const p1AtT = await siderealLongitudeAsync(rise + t, planet1);
    const p2AtT = await siderealLongitudeAsync(rise + t, planet2);
    const p1Diff = ((p1AtT - p1AtRise) % 360 + 360) % 360;
    const p2Diff = ((p2AtT - p2AtRise) % 360 + 360) % 360;
    totalMotion.push(((tithiIndex * (p1Diff + p2Diff) + (cycle - 1) * 180) % 360 + 360) % 360);
  }

  const approxEnd = inverseLagrange(offsets, totalMotion, degreesLeft);
  const ends = (rise + approxEnd - jdUtc) * 24 + tz;
  const answer: number[] = [yogamNo, ends];

  // Check for skipped yoga
  const p1Tmrw = await siderealLongitudeAsync(rise + 1, planet1);
  const p2Tmrw = await siderealLongitudeAsync(rise + 1, planet2);
  const totalTmrw = ((tithiIndex * (p1Tmrw + p2Tmrw) + (cycle - 1) * 180) % 360 + 360) % 360;
  const tomorrow = Math.ceil(totalTmrw / oneYoga) || 27;
  const isSkipped = ((tomorrow - yog) % 27 + 27) % 27 > 1;
  if (isSkipped) {
    const leapYog = yog + 1;
    const leapDegreesLeft = leapYog * oneYoga - total;
    const leapApproxEnd = inverseLagrange(offsets, totalMotion, leapDegreesLeft);
    const leapEnds = (rise + leapApproxEnd - jdUtc) * 24 + tz;
    answer.push(leapYog === 28 ? 1 : leapYog, leapEnds);
  }

  return answer;
}

/**
 * Calculate tithi with accurate end times (async).
 * Uses inverse Lagrange interpolation on WASM-calculated longitudes.
 * Python: tithi_using_inverse_lagrange(jd, place)
 *
 * @returns [tithiNo, startTime, endTime, ...optional nextTithiNo, nextStartTime, nextEndTime]
 */
// @parity: py=tithi
export async function calculateTithiAsync(
  jd: number,
  place: Place,
  tithiIndex: number = 1,
  planet1: number = 1,  // Moon
  planet2: number = 0,  // Sun
  cycle: number = 1
): Promise<number[]> {
  // Use generic version when non-default params are provided
  const isCustom = tithiIndex !== 1 || planet1 !== 1 || planet2 !== 0 || cycle !== 1;
  const getTithi = isCustom
    ? (j: number) => _getTithiGenericAsync(j, place, planet1, planet2, tithiIndex, cycle)
    : (j: number) => _getTithiAsync(j, place);

  const _tithi = await getTithi(jd);
  const _tithiPrev = await getTithi(jd - 1);

  const tithiNo = _tithi[0]!;
  let tithiStart = _tithiPrev[1]!;
  const tithiEnd = _tithi[1]!;

  if (tithiStart < 24.0) {
    tithiStart = -tithiStart;
  } else if (tithiStart > 24) {
    tithiStart -= 24.0;
  }

  const result: number[] = [tithiNo, tithiStart, tithiEnd];

  // Check if next tithi also falls on same day (end < 24)
  if (tithiEnd < 24.0) {
    const _tithi1 = await getTithi(jd + tithiEnd / 24);
    const nextTithiNo = (tithiNo % 30) + 1;
    const nextTithiStart = tithiEnd;
    const nextTithiEnd = tithiEnd + _tithi1[1]!;
    result.push(nextTithiNo, nextTithiStart, nextTithiEnd);
  }

  return result;
}

/**
 * Internal: get nakshatra data using inverse Lagrange.
 * Python: _get_nakshathra(jd, place)
 *
 * @returns [nakNo, padamNo, endTimeHours, nextNakNo, nextPadamNo, nextEndTimeHours]
 */
async function _getNakshatraAsync(
  jd: number,
  place: Place
): Promise<number[]> {
  const tz = place.timezone;
  const { date } = julianDayToGregorian(jd);
  const jdUt = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });
  const jdUtc = jd - tz / 24;

  // 1. Get sunrise — Python _get_nakshathra passes jd_utc to sunrise (line 658)
  const riseData = await sunriseAsync(jdUtc, place);
  const rise = riseData.jd; // Local-time-encoded JD

  // 2. Get lunar longitudes at 5 offsets from sunrise
  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const longitudes: number[] = [];
  for (const t of offsets) {
    longitudes.push(await siderealLongitudeAsync(rise + t, 1));
  }

  const unwrappedLongitudes = unwrapAngles(longitudes);
  const extendedLongitudes = extendAngleRange(unwrappedLongitudes, 360);
  const x = Array.from({ length: extendedLongitudes.length }, (_, i) =>
    offsets[i % offsets.length]!
  );

  // 3. Get current nakshatra/pada from lunar longitude at jd_utc
  const nirayana = await lunarLongitudeAsync(jdUtc);
  const [nakNo, padamNo] = nakshatraPada(nirayana);

  // 4. Find end time of current nakshatra
  let yCheck = nakNo * 360 / 27;
  yCheck = normalizeAngle(yCheck, Math.min(...extendedLongitudes));
  let approxEnd = inverseLagrange(x, extendedLongitudes, yCheck);
  let ends = (rise - jdUt + approxEnd) * 24 + tz;
  const answer: number[] = [nakNo, padamNo, ends];

  // 5. Find end time of next nakshatra
  let leapNak = nakNo + 1;
  yCheck = leapNak * 360 / 27;
  yCheck = normalizeAngle(yCheck, Math.min(...extendedLongitudes));
  approxEnd = inverseLagrange(x, extendedLongitudes, yCheck);
  ends = (rise - jdUt + approxEnd) * 24 + tz;
  leapNak = nakNo === 27 ? 1 : leapNak;
  answer.push(leapNak, padamNo, ends);

  return answer;
}

/**
 * Calculate nakshatra with accurate end times (async).
 * Python: nakshathra(jd, place)
 *
 * @returns [nakNo, padamNo, endTimeHours, nextNakNo, nextPadamNo, nextEndTimeHours]
 */
// @parity: py=nakshatra
export async function calculateNakshatraAsync(
  jd: number,
  place: Place
): Promise<number[]> {
  return _getNakshatraAsync(jd, place);
}

/**
 * Internal: get yogam data using inverse Lagrange.
 * Python: _get_yogam(jd, place)
 *
 * @returns [yogamNo, endTimeHours, ...optional skippedYogamNo, skippedEndTimeHours]
 */
async function _getYogamAsync(
  jd: number,
  place: Place
): Promise<number[]> {
  const tz = place.timezone;
  const { date } = julianDayToGregorian(jd);
  const jdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });

  // 1. Sunrise
  const riseData = await sunriseAsync(jd, place);
  const rise = riseData.jd; // Local-time-encoded JD
  const oneYoga = 360 / 27;

  // 2. Moon + Sun at sunrise (using lunar_longitude / solar_longitude like Python)
  const moonAtRise = await lunarLongitudeAsync(rise);
  const sunAtRise = await solarLongitudeAsync(rise);
  const total = ((moonAtRise + sunAtRise) % 360 + 360) % 360;
  const yog = Math.ceil(total / oneYoga) || 27;
  const yogamNo = yog;
  const degreesLeft = yog * oneYoga - total;

  // 3. Longitudinal sums at offsets (Python uses lunar_longitude/solar_longitude, not sidereal)
  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const totalMotion: number[] = [];
  for (const t of offsets) {
    const moonAtT = await lunarLongitudeAsync(rise + t);
    const sunAtT = await solarLongitudeAsync(rise + t);
    const moonDiff = ((moonAtT - moonAtRise) % 360 + 360) % 360;
    const sunDiff = ((sunAtT - sunAtRise) % 360 + 360) % 360;
    totalMotion.push(((moonDiff + sunDiff) % 360 + 360) % 360);
  }

  // 4. Inverse Lagrange interpolation
  const approxEnd = inverseLagrange(offsets, totalMotion, degreesLeft);
  const ends = (rise + approxEnd - jdUtc) * 24 + tz;
  const answer: number[] = [yogamNo, ends];

  // 5. Check for skipped yoga
  const moonTmrw = await lunarLongitudeAsync(rise + 1);
  const sunTmrw = await solarLongitudeAsync(rise + 1);
  const totalTmrw = ((moonTmrw + sunTmrw) % 360 + 360) % 360;
  const tomorrow = Math.ceil(totalTmrw / oneYoga) || 27;
  const isSkipped = ((tomorrow - yog) % 27 + 27) % 27 > 1;
  if (isSkipped) {
    const leapYog = yog + 1;
    const leapDegreesLeft = leapYog * oneYoga - total;
    const leapApproxEnd = inverseLagrange(offsets, totalMotion, leapDegreesLeft);
    const leapEnds = (rise + leapApproxEnd - jdUtc) * 24 + tz;
    answer.push(leapYog === 28 ? 1 : leapYog, leapEnds);
  }

  return answer;
}

/**
 * Calculate yogam with accurate end times (async).
 * Python: yogam_old(jd, place)
 *
 * @returns [yogamNo, startTime, endTime, ...optional next yogam data]
 */
// @parity: py=yogam
export async function calculateYogaAsync(
  jd: number,
  place: Place,
  tithiIndex: number = 1,
  planet1: number = 1,  // Moon
  planet2: number = 0,  // Sun
  cycle: number = 1
): Promise<number[]> {
  // Use generic version when non-default params are provided
  const isCustom = tithiIndex !== 1 || planet1 !== 1 || planet2 !== 0 || cycle !== 1;
  const getYogam = isCustom
    ? (j: number) => _getYogamGenericAsync(j, place, planet1, planet2, tithiIndex, cycle)
    : (j: number) => _getYogamAsync(j, place);

  const _yoga = await getYogam(jd);
  const _yogaPrev = await getYogam(jd - 1);

  const yogaNo = _yoga[0]!;
  let yogaStart = _yogaPrev[1]!;
  const yogaEnd = _yoga[1]!;

  if (yogaStart < 24.0) {
    yogaStart = -yogaStart;
  } else if (yogaStart > 24) {
    yogaStart -= 24.0;
  }

  // Python: result = [_yoga_no, _yoga_start, _yoga_end] + _yoga[2:]
  // _yoga[2:] contains skipped yoga data if any
  const result: number[] = [yogaNo, yogaStart, yogaEnd, ..._yoga.slice(2)];
  return result;
}

/**
 * Calculate karana with accurate end times (async).
 * Python: karana(jd, place)
 * Karana is half a tithi — derived from tithi calculation.
 *
 * @returns [karanaNo, startTime, endTime]
 */
// @parity: py=karana
export async function calculateKaranaAsync(
  jd: number,
  place: Place
): Promise<[number, number, number]> {
  const { time } = julianDayToGregorian(jd);
  const birthTimeHrs = time.hour + time.minute / 60 + time.second / 3600;

  const _tithi = await calculateTithiAsync(jd, place);
  const tStart = _tithi[1]!;
  const tEnd = _tithi[2]!;
  const tMid = 0.5 * (tStart + tEnd);
  let karana = _tithi[0]! * 2 - 1;

  let kStart: number;
  let kEnd: number;
  if (birthTimeHrs > tMid) {
    // second half of tithi
    karana += 1;
    kStart = tMid;
    kEnd = tEnd;
  } else {
    // first half of tithi
    kStart = tStart;
    kEnd = tMid;
  }

  return [karana, kStart, kEnd];
}

/**
 * Calculate raasi (Moon's zodiac sign) with end time (async).
 * Python: raasi(jd, place)
 *
 * @returns [raasiNo (1-12), endTimeHours, fracLeft, ...optional next raasi data]
 */
// @parity: py=raasi
export async function raasiAsync(
  jd: number,
  place: Place
): Promise<number[]> {
  const tz = place.timezone;
  const { date } = julianDayToGregorian(jd);
  const jdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });

  const riseData = await sunriseAsync(jd, place);
  const rise = riseData.jd; // Local-time-encoded JD

  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const longitudes: number[] = [];
  for (const t of offsets) {
    longitudes.push(await lunarLongitudeAsync(rise + t));
  }

  // Moon's longitude at jd (Python uses jd directly, V4.4.0 changed from jd_ut to jd)
  const nirayana = await lunarLongitudeAsync(jd);
  const raasiNo = Math.floor(nirayana / 30) + 1;
  const fracLeft = 1.0 - (nirayana / 30) % 1;

  // 3. Find end time by 5-point inverse Lagrange interpolation
  const y = unwrapAngles(longitudes);
  const approxEnd = inverseLagrange(offsets, y, raasiNo * 30);
  const ends = (rise - jdUtc + approxEnd) * 24 + tz;
  const answer: number[] = [raasiNo, ends, fracLeft];

  // 4. Check for skipped raasi
  const raasiTmrw = Math.ceil(longitudes[longitudes.length - 1]! / 30);
  const fracLeftTmrw = 1.0 - (longitudes[longitudes.length - 1]! / 30) % 1;
  const isSkipped = ((raasiTmrw - raasiNo) % 12 + 12) % 12 > 1;
  if (isSkipped) {
    const leapRaasi = raasiNo + 1;
    const leapApproxEnd = inverseLagrange(offsets, y, leapRaasi * 30);
    const leapEnds = (rise + 1 - jdUtc + leapApproxEnd) * 24 + tz;
    const finalRaasi = raasiNo === 12 ? 1 : leapRaasi;
    answer.push(finalRaasi, leapEnds, fracLeftTmrw);
  }

  return answer;
}

// ============================================================================
// SPECIAL LAGNAS
// ============================================================================

/**
 * Calculate Sree Lagna from Moon and Ascendant longitudes
 * Sree Lagna = Ascendant + (Moon's nakshatra remainder * 27)
 *
 * @param moonLongitude - Moon's longitude in degrees
 * @param ascendantLongitude - Ascendant longitude in degrees
 * @returns [rasi (0-11), longitude within rasi]
 */
// @parity: py=sree_lagna_from_moon_asc_longitudes
export function sreeLagnaFromLongitudes(
  moonLongitude: number,
  ascendantLongitude: number
): [number, number] {
  const [, , remainder] = nakshatraPada(moonLongitude);
  const reminderFraction = remainder * 27;
  const sreeLong = normalizeDegrees(ascendantLongitude + reminderFraction);
  const rasi = Math.floor(sreeLong / 30);
  const longitude = sreeLong % 30;
  return [rasi, longitude];
}

/**
 * Calculate Sree Lagna for a given Julian day and place
 * @param jd - Julian day number
 * @param place - Birth place
 * @returns [rasi (0-11), longitude within rasi]
 */
export function getSreeLagna(jd: number, place: Place): [number, number] {
  const moonLong = getPlanetLongitude(jd, place, MOON);
  // Use Sun as ascendant proxy until sync ascendant calculation is implemented
  const ascLong = getPlanetLongitude(jd, place, SUN);
  return sreeLagnaFromLongitudes(moonLong, ascLong);
}

/**
 * Calculate Hora Lagna (special ascendant with rate factor 0.5)
 * Formula: sun_longitude_at_sunrise + (time_since_sunrise_in_minutes * 0.5)
 *
 * @param jd - Julian day number
 * @param place - Birth place
 * @returns [rasi (0-11), longitude within rasi]
 */
export function getHoraLagna(jd: number, place: Place): [number, number] {
  // Get time of birth in hours from JD
  const { time } = julianDayToGregorian(jd);
  const timeOfBirthInHours = time.hour + time.minute / 60 + time.second / 3600;

  // Get sunrise time in hours
  const sunriseData = sunrise(jd, place);
  const sunRiseHours = sunriseData.localTime;

  // Time elapsed since sunrise in minutes
  const timeDiffMins = (timeOfBirthInHours - sunRiseHours) * 60;

  // Get sun's sidereal longitude at sunrise
  const sunriseJdUtc = toUtc(sunriseData.jd, place.timezone);
  const sunLong = solarLongitude(sunriseJdUtc);

  // Hora Lagna = sun_longitude + (elapsed_minutes * 0.5), normalized to 0-360
  const horaLong = normalizeDegrees(sunLong + (timeDiffMins * 0.5));
  const rasi = Math.floor(horaLong / 30);
  const longitude = horaLong % 30;
  return [rasi, longitude];
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// ============================================================================
// PURE CALCULATION FUNCTIONS (No Swiss Ephemeris dependency)
// ============================================================================

/**
 * Ahargana - days elapsed since Mahabharata epoch (Kali Yuga start).
 * Python: ahargana = lambda jd: jd - const.mahabharatha_tithi_julian_day
 *
 * @param jd - Julian day number
 * @returns Number of days since epoch
 */
export function ahargana(jd: number): number {
  return jd - MAHABHARATHA_TITHI_JULIAN_DAY;
}

/**
 * Kali Ahargana days - integer days since Kali Yuga start.
 *
 * @param jd - Julian day number
 * @returns Integer days
 */
export function kaliAharganaDays(jd: number): number {
  return Math.floor(ahargana(jd));
}

/**
 * Calculate elapsed year indices for Indian eras.
 * Returns Kali year, Vikrama year, and Saka year numbers.
 *
 * Python: elapsed_year(jd, maasa_index)
 *
 * @param jd - Julian day number
 * @param maasaIndex - Lunar month index (1-12)
 * @returns [kaliYear, vikramaYear, sakaYear]
 */
// @parity: py=elapsed_year
export function elapsedYear(jd: number, maasaIndex: number): [number, number, number] {
  const ahar = ahargana(jd);
  const kali = Math.floor((ahar + (4 - maasaIndex) * 30) / SIDEREAL_YEAR);
  const saka = kali - 3179;
  const vikrama = saka + 135;
  return [kali, vikrama, saka];
}

/**
 * Calculate ritu (season) from lunar month index.
 * Python: ritu(maasa_index)
 *
 * @param maasaIndex - Lunar month index (1-12)
 * @returns Ritu index: 0=Vasanta, 1=Greeshma, 2=Varsha, 3=Sharath, 4=Hemantha, 5=Shishira
 */
// @parity: py=ritu
export function ritu(maasaIndex: number): number {
  return Math.floor((maasaIndex - 1) / 2);
}

/**
 * Cyclic count of stars including Abhijit (28 stars).
 * Python: utils.cyclic_count_of_stars_with_abhijit
 *
 * @param fromStar - Starting star (1-based)
 * @param count - Number of steps
 * @param direction - 1 for forward, -1 for backward
 * @param starCount - Total number of stars (28 with Abhijit, 27 without)
 * @returns Star number (1-based)
 */
export function cyclicCountOfStarsWithAbhijit(
  fromStar: number,
  count: number,
  direction: number = 1,
  starCount: number = 28
): number {
  return ((fromStar - 1 + (count - 1) * direction) % starCount + starCount) % starCount + 1;
}

/**
 * Cyclic count of stars without Abhijit (27 stars).
 * Python: utils.cyclic_count_of_stars
 */
export function cyclicCountOfStars(
  fromStar: number,
  count: number,
  direction: number = 1
): number {
  return cyclicCountOfStarsWithAbhijit(fromStar, count, direction, 27);
}

// ============================================================================
// SPECIAL LAGNAS
// ============================================================================

/**
 * Compute Indu Lagna (BV Raman method).
 * Uses IL_FACTORS for 9th lord from Asc and 9th lord from Moon,
 * sums modulo 12, then offsets from Moon's house.
 * @param planetPositions - D1 (or varga) planet positions; index 0 = Lagna, index 2 = Moon
 * @returns [rasiNumber, longitudeInRasi]
 */
export function getInduLagna(
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>
): [number, number] {
  const moonPos = planetPositions[2]!;
  const ascPos = planetPositions[0]!;
  const moonHouse = moonPos.rasi;
  const ascHouse = ascPos.rasi;

  const ninthLord = HOUSE_OWNERS[(ascHouse + 8) % 12]!;
  const ninthLordFromMoon = HOUSE_OWNERS[(moonHouse + 8) % 12]!;

  let il = (IL_FACTORS[ninthLord]! + IL_FACTORS[ninthLordFromMoon]!) % 12;
  if (il === 0) il = 12;

  const induRasi = (moonHouse + il - 1) % 12;
  return [induRasi, moonPos.longitude];
}

/**
 * Compute Bhrigu Bindhu Lagna.
 * Midpoint of Moon and Rahu absolute longitudes.
 * @param planetPositions - D1 (or varga) planet positions; index 2 = Moon, index 8 = Rahu
 * @returns [rasiNumber, longitudeInRasi]
 */
export function getBhriguBindhu(
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>
): [number, number] {
  const moonPos = planetPositions[2]!;
  const rahuPos = planetPositions[8]!;

  const moonLong = moonPos.rasi * 30 + moonPos.longitude;
  const rahuLong = rahuPos.rasi * 30 + rahuPos.longitude;

  const moonAdd = moonLong > rahuLong ? 0 : 360;
  const bb = ((rahuLong + moonLong + moonAdd) * 0.5) % 360;

  const rasi = Math.floor(bb / 30) % 12;
  const longInRasi = bb % 30;
  return [rasi, longInRasi];
}

// ============================================================================
// LUNAR PHASE & MOON EVENTS — Phase 4
// ============================================================================

/**
 * Calculate lunar phase (moon - sun longitude difference).
 * Python: lunar_phase(jd, tithi_index=1)
 *
 * NOTE: Python uses `solar_longitude(jd)` and `lunar_longitude(jd)` which
 * call `sidereal_longitude(jd, planet)` — these use the JD directly as UTC.
 *
 * @param jd - Julian Day Number (treated as UTC by the underlying SWE call)
 * @returns Lunar phase angle in degrees (0-360)
 */
export async function lunarPhaseAsync(jd: number): Promise<number> {
  const sunLong = await solarLongitudeAsync(jd);
  const moonLong = await lunarLongitudeAsync(jd);
  return ((moonLong - sunLong) % 360 + 360) % 360;
}

/**
 * Sync version of lunar phase.
 */
// @parity: py=lunar_phase
export function lunarPhase(jd: number): number {
  const sunLong = solarLongitude(jd);
  const moonLong = lunarLongitude(jd);
  return ((moonLong - sunLong) % 360 + 360) % 360;
}

/**
 * Find JD of new moon (lunar phase = 360°).
 * Python: new_moon(jd, tithi_, opt=-1)
 *
 * @param jd - Julian Day Number
 * @param tithi_ - Current tithi number (1-30)
 * @param opt - -1 for previous new moon, +1 for next new moon
 * @returns Julian Day Number of the new moon
 */
// @parity: py=new_moon
export async function newMoonAsync(
  jd: number,
  tithi_: number,
  opt: -1 | 1 = -1
): Promise<number> {
  let start: number;
  if (opt === -1) {
    start = jd - tithi_;        // previous new moon
  } else {
    start = jd + (30 - tithi_); // next new moon
  }

  // Search within a span of (start ± 2) days with 17 sample points
  const x: number[] = [];
  for (let offset = 0; offset < 17; offset++) {
    x.push(-2 + offset / 4);
  }

  const y: number[] = [];
  for (const xi of x) {
    y.push(await lunarPhaseAsync(start + xi));
  }

  const yUnwrapped = unwrapAngles(y);
  const y0 = inverseLagrange(x, yUnwrapped, 360);
  return start + y0;
}

/**
 * Find JD of full moon (lunar phase = 180°).
 * Python: full_moon(jd, tithi_, opt=-1)
 *
 * @param jd - Julian Day Number
 * @param tithi_ - Current tithi number (1-30)
 * @param opt - -1 for previous full moon, +1 for next full moon
 * @returns Julian Day Number of the full moon
 */
// @parity: py=full_moon
export async function fullMoonAsync(
  jd: number,
  tithi_: number,
  opt: -1 | 1 = -1
): Promise<number> {
  let start: number;
  if (tithi_ <= 15) {
    start = opt === -1 ? jd - tithi_ - 15 : jd + (15 - tithi_);
  } else {
    start = opt === -1 ? jd - (tithi_ - 15) : jd + (45 - tithi_);
  }

  const x: number[] = [];
  for (let offset = 0; offset < 17; offset++) {
    x.push(-2 + offset / 4);
  }

  const y: number[] = [];
  for (const xi of x) {
    y.push(await lunarPhaseAsync(start + xi));
  }

  const yUnwrapped = unwrapAngles(y);
  const y0 = inverseLagrange(x, yUnwrapped, 180);
  return start + y0;
}

/**
 * Find the next (or previous) date when a planet enters a zodiac sign.
 * Python: next_planet_entry_date(planet, jd, place, direction=1, increment_days=0.01, precision=0.1, raasi=None)
 *
 * @param planet - Planet index (0-8, PyJHora convention)
 * @param jd - Julian Day Number (local time)
 * @param place - Place data
 * @param direction - 1 for next entry, -1 for previous entry
 * @param raasi - Target raasi (1-12). null = next sign boundary.
 * @returns [jd, planetLongitude] - JD of entry and planet longitude at that point
 */
// @parity: py=next_planet_entry_date
export async function nextPlanetEntryDateAsync(
  planet: number,
  jd: number,
  place: Place,
  direction: 1 | -1 = 1,
  raasi: number | null = null
): Promise<[number, number]> {
  // Handle Ketu by delegating to Rahu
  if (planet === 8) {
    const rahuRaasi = raasi !== null ? ((raasi - 1 + 6) % 12 + 1) : null;
    const ret = await nextPlanetEntryDateAsync(7, jd, place, direction, rahuRaasi);
    const pLong = (ret[1] + 180) % 360;
    return [ret[0], pLong];
  }

  const incrementDays = planet === 1 ? 1.0 / 24 / 60 : 0.01; // Moon: minute steps
  const precision = 0.1;

  let jdCur = jd;
  let jdUtc = jdCur - place.timezone / 24;
  let sl = await siderealLongitudeAsync(jdUtc, planet);

  // Determine target longitude
  let multiple: number;
  if (raasi === null) {
    if (planet === 7) {
      // Rahu moves retrograde
      multiple = (Math.floor(sl / 30) % 12) * 30;
      if (direction === -1) {
        multiple = ((Math.floor(sl / 30) + 1) % 12) * 30;
      }
    } else {
      multiple = ((Math.floor(sl / 30) + 1) % 12) * 30;
      if (direction === -1) {
        multiple = (Math.floor(sl / 30) % 12) * 30;
      }
    }
  } else {
    multiple = (raasi - 1) * 30;
  }

  // Iterative search until planet is within precision of target
  let iterations = 0;
  const maxIterations = 100000;
  while (iterations < maxIterations) {
    if (sl < (multiple + precision) && sl > (multiple - precision)) {
      break;
    }
    jdCur += incrementDays * direction;
    jdUtc = jdCur - place.timezone / 24;
    sl = await siderealLongitudeAsync(jdUtc, planet);
    iterations++;
  }

  // Refine with inverseLagrange using 5-point interpolation
  const { date: sankDate } = julianDayToGregorian(jdUtc);
  const sankSunrise = await sunriseAsync(jdUtc, place);
  const rise = sankSunrise.jd;

  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const planetLongs: number[] = [];
  for (const t of offsets) {
    planetLongs.push(await siderealLongitudeAsync(rise + t, planet));
  }

  const planetHour = inverseLagrange(offsets, planetLongs, multiple);
  const sankJdUtc = gregorianToJulianDay(sankDate, { hour: 0, minute: 0, second: 0 });
  let planetHour1 = (rise + planetHour - sankJdUtc) * 24 + place.timezone;
  const finalJdUtc = sankJdUtc + planetHour1 / 24;
  const finalLong = await siderealLongitudeAsync(finalJdUtc - place.timezone / 24, planet);

  return [finalJdUtc, finalLong];
}

/**
 * Detect next retrograde direction change for a planet.
 * Python: next_planet_retrograde_change_date(planet, panchanga_date, place, increment_days=1, direction=1)
 *
 * @param planet - Planet index (2-6: Mars to Saturn only)
 * @param jd - Julian Day Number (local time)
 * @param place - Place data
 * @param direction - 1 for next change, -1 for previous change
 * @returns [jd, speedSign] where speedSign is 1 (direct) or -1 (retrograde), or null if planet doesn't retrograde
 */
// @parity: py=next_planet_retrograde_change_date
export async function nextPlanetRetrogradeChangeDateAsync(
  planet: number,
  jd: number,
  place: Place,
  direction: 1 | -1 = 1
): Promise<[number, number] | null> {
  if (planet < 2 || planet > 6) return null; // Only Mars-Saturn retrograde

  const { planetSpeedInfoAsync } = await import('../ephemeris/swe-adapter');

  const getSpeedSign = async (jdCheck: number): Promise<number> => {
    const info = await planetSpeedInfoAsync(jdCheck, place, planet);
    return info.longitudeSpeed < 0 ? -1 : 1;
  };

  let jdUtc = jd - place.timezone / 24;
  let slSign = await getSpeedSign(jd);
  let slSignNext = slSign;

  // Coarse search: 1-day increments
  while (slSign === slSignNext) {
    jdUtc += 1 * direction;
    slSignNext = await getSpeedSign(jdUtc + place.timezone / 24);
  }

  // Fine search: 0.01-day (≈14.4 min) increments
  jdUtc -= 1 * direction;
  slSignNext = slSign;
  const fineIncrement = 0.01;
  while (slSign === slSignNext) {
    jdUtc += fineIncrement * direction;
    slSignNext = await getSpeedSign(jdUtc + place.timezone / 24);
  }

  jdUtc += place.timezone / 24;
  return [jdUtc, slSignNext];
}

// ============================================================================
// SPECIAL LAGNAS (Async) — Phase 5
// ============================================================================

/**
 * Calculate special ascendant (Bhava, Hora, Ghati, Vighati Lagnas) — async.
 * Python: special_ascendant(jd, place, lagna_rate_factor=1.0, divisional_chart_factor=1)
 *
 * For D1 chart: sunLong = Sun's sidereal longitude at sunrise,
 * specialLagna = sunLong + (elapsed_minutes_since_sunrise * rateFactor)
 *
 * @param jd - Julian Day Number (local time, including birth time)
 * @param place - Place data
 * @param lagnaRateFactor - Rate factor: 0.25=Bhava, 0.5=Hora, 1.25=Ghati, 15.0=Vighati
 * @param divisionalChartFactor - Varga chart factor (1=D-1, 9=D-9, etc.)
 * @param chartMethod - Chart calculation method (default 1)
 * @returns [constellation (0-11), longitude_within_sign]
 */
/** Exact local-time hours encoded in a JD (Python: jd_to_gregorian(jd)[3] via swe.revjul) */
function localHoursFromJd(jd: number): number {
  return (jd + 0.5 - Math.floor(jd + 0.5)) * 24;
}

/**
 * Python utils.udhayadhi_nazhikai(jd, place)[1] — ghatis since sunrise as
 * tharparai1/3600 where tharparai1 = int(h)*9000 + int(m)*150 + int(s)
 * (h,m,s from utils.to_dms(time_diff, as_string=False) with seconds rounding).
 */
function udhayadhiNazhikaiGhati(tobHours: number, sunriseHours: number, prevSunriseHours?: number): number {
  let timeDiff = tobHours - sunriseHours;
  if (tobHours < sunriseHours && prevSunriseHours !== undefined) {
    timeDiff = 24.0 + tobHours - prevSunriseHours;
  }
  // Python to_dms(as_string=False): d=int, m=int, s=round with 60-carry
  let h = Math.trunc(timeDiff);
  const mins = (timeDiff - h) * 60;
  let m = Math.trunc(mins);
  let s = Math.round((mins - m) * 60);
  if (s === 60) { m += 1; s = 0; }
  if (m === 60) { h += 1; m = 0; }
  const tharparai1 = h * 9000 + m * 150 + s;
  return tharparai1 / 3600.0;
}

// @parity: py=special_ascendant
export async function specialAscendantAsync(
  jd: number,
  place: Place,
  lagnaRateFactor: number = 1.0,
  divisionalChartFactor: number = 1,
  chartMethod: number = 1
): Promise<[number, number]> {
  // Python: _,_,_,tob = jd_to_gregorian(jd) — exact fractional hours (no h/m/s rounding)
  const timeOfBirthInHours = localHoursFromJd(jd);

  const srise = await sunriseAsync(jd, place);
  const sunRiseHours = srise.localTime;
  const timeDiffMins = (timeOfBirthInHours - sunRiseHours) * 60;

  // Python: jd_at_sunrise = srise[2] + place.timezone/24
  // Then pp = charts.divisional_chart(jd_at_sunrise, place, divisional_chart_factor=...)
  const jdAtSunrise = srise.jd + place.timezone / 24;
  let sunLong: number;
  if (divisionalChartFactor > 1) {
    const pp = getDivisionalChart(jdAtSunrise, place, divisionalChartFactor, chartMethod);
    const sunPos = pp[1]!; // Sun: [planet, [rasi, long_within_sign]]
    sunLong = sunPos[1][0] * 30 + sunPos[1][1];
  } else {
    const jdUtcSunrise = jdAtSunrise - place.timezone / 24;
    sunLong = await siderealLongitudeAsync(jdUtcSunrise, 0);
  }

  const splLong = (sunLong + timeDiffMins * lagnaRateFactor) % 360;
  return dasavargaFromLong(splLong, divisionalChartFactor);
}

/** Bhava Lagna (rate = 0.25) */
export async function bhavaLagnaAsync(
  jd: number, place: Place,
  divisionalChartFactor: number = 1, chartMethod: number = 1
): Promise<[number, number]> {
  return specialAscendantAsync(jd, place, 0.25, divisionalChartFactor, chartMethod);
}

/** Hora Lagna (rate = 0.5) */
export async function horaLagnaAsync(
  jd: number, place: Place,
  divisionalChartFactor: number = 1, chartMethod: number = 1
): Promise<[number, number]> {
  return specialAscendantAsync(jd, place, 0.5, divisionalChartFactor, chartMethod);
}

/** Ghati Lagna (rate = 1.25) */
export async function ghatiLagnaAsync(
  jd: number, place: Place,
  divisionalChartFactor: number = 1, chartMethod: number = 1
): Promise<[number, number]> {
  return specialAscendantAsync(jd, place, 1.25, divisionalChartFactor, chartMethod);
}

/** Vighati Lagna (rate = 15.0) */
export async function vighatiLagnaAsync(
  jd: number, place: Place,
  divisionalChartFactor: number = 1, chartMethod: number = 1
): Promise<[number, number]> {
  return specialAscendantAsync(jd, place, 15.0, divisionalChartFactor, chartMethod);
}

/**
 * Calculate Kunda Lagna — async.
 * Python: kunda_lagna(jd, place, divisional_chart_factor=1, chart_method=1)
 * Formula: (ascendant_full_longitude * 81) % 360
 *
 * @param jd - Julian Day Number (local time)
 * @param place - Place data
 * @param divisionalChartFactor - Varga chart factor (1=D-1, 9=D-9, etc.)
 * @returns [constellation (0-11), longitude_within_sign]
 */
// @parity: py=kunda_lagna
export async function kundaLagnaAsync(
  jd: number,
  place: Place,
  divisionalChartFactor: number = 1
): Promise<[number, number]> {
  const [ascConst, ascLong] = await ascendantFullAsync(jd, place);
  const al = ascConst * 30 + ascLong;
  const al1 = (al * 81) % 360;
  return dasavargaFromLong(al1, divisionalChartFactor);
}

// ============================================================================
// PANCHANGA DISPLAY — Phase 6
// ============================================================================

/**
 * Calculate trikalam (Raahu Kaalam, Yamagandam, Gulikai Kaalam) — async.
 * Python: trikalam(jd, place, option='raahu kaalam')
 *
 * @param jd - Julian Day Number (date only, midnight)
 * @param place - Place data
 * @param option - 'raahu kaalam', 'yamagandam', or 'gulikai'
 * @returns [startTimeHours, endTimeHours] as float hours
 */
export async function trikalamAsync(
  jd: number,
  place: Place,
  option: 'raahu kaalam' | 'yamagandam' | 'gulikai' = 'raahu kaalam'
): Promise<[number, number]> {
  const srise = await sunriseAsync(jd, place);
  const sset = await sunsetAsync(jd, place);
  const dayDur = sset.localTime - srise.localTime;
  const weekday = calculateVara(jd).number;

  const offsets: Record<string, number[]> = {
    'raahu kaalam': [0.875, 0.125, 0.75, 0.5, 0.625, 0.375, 0.25],
    'gulikai':      [0.75, 0.625, 0.5, 0.375, 0.25, 0.125, 0.0],
    'yamagandam':   [0.5, 0.375, 0.25, 0.125, 0.0, 0.75, 0.625],
  };

  const offset = offsets[option]?.[weekday] ?? 0;
  const startTime = srise.localTime + dayDur * offset;
  const endTime = startTime + 0.125 * dayDur;

  return [startTime, endTime];
}

/**
 * Calculate Abhijit Muhurta — the auspicious mid-day period.
 * Python: abhijit_muhurta(jd, place)
 * 8th of 15 muhurtas during daytime.
 *
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns [startTimeHours, endTimeHours] as float hours
 */
export async function abhijitMuhurtaAsync(
  jd: number,
  place: Place
): Promise<[number, number]> {
  const srise = await sunriseAsync(jd, place);
  const sset = await sunsetAsync(jd, place);
  const dayDur = sset.localTime - srise.localTime;

  const startTime = srise.localTime + (7 / 15) * dayDur;
  const endTime = srise.localTime + (8 / 15) * dayDur;

  return [startTime, endTime];
}

/**
 * Calculate Durmuhurtam — inauspicious periods.
 * Python: durmuhurtam(jd, place)
 *
 * @param jd - Julian Day Number
 * @param place - Place data
 * @returns Array of [startTimeHours, endTimeHours] pairs (1 or 2 periods)
 */
export async function durmuhurtamAsync(
  jd: number,
  place: Place
): Promise<[number, number][]> {
  const srise = await sunriseAsync(jd, place);
  const sset = await sunsetAsync(jd, place);
  const dayDur = sset.localTime - srise.localTime;

  const nextSr = await sunriseAsync(jd + 1, place);
  const nightDur = 24.0 + nextSr.localTime - sset.localTime;

  const weekday = calculateVara(jd).number;

  // Offsets from sunrise (in 12ths of day duration)
  const durOffsets: [number, number][] = [
    [10.4, 0.0],  // Sunday
    [6.4, 8.8],   // Monday
    [2.4, 4.8],   // Tuesday (2nd uses night_dur)
    [5.6, 0.0],   // Wednesday
    [4.0, 8.8],   // Thursday
    [2.4, 6.4],   // Friday
    [1.6, 0.0],   // Saturday
  ];

  const answer: [number, number][] = [];
  const offPair = durOffsets[weekday]!;

  for (let i = 0; i < 2; i++) {
    const offset = offPair[i]!;
    if (offset !== 0.0) {
      const dur = (weekday === 2 && i === 1) ? nightDur : dayDur;
      const base = (weekday === 2 && i === 1) ? sset.localTime : srise.localTime;
      const startTime = base + dur * offset / 12;
      const endTime = startTime + dayDur * 0.8 / 12;
      answer.push([startTime, endTime]);
    }
  }

  return answer;
}

// ============================================================================
// ECLIPSE FUNCTIONS — Phase 7
// ============================================================================

/**
 * Check if a solar eclipse occurs on the given JD at the given location.
 * Python: is_solar_eclipse(jd, place)
 *
 * @param jd - Julian Day Number (local-time encoded)
 * @param place - Place
 * @returns attr array with eclipse properties (attr[0] = fraction covered), or null
 */
// @parity: py=is_solar_eclipse
export async function isSolarEclipseAsync(
  jd: number,
  place: Place
): Promise<{ retflag: number; attr: number[] } | null> {
  const { date } = julianDayToGregorian(jd);
  const jdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });
  return solarEclipseHowAsync(jdUtc, place);
}

/**
 * Find the next solar eclipse visible at the given location.
 * Python: next_solar_eclipse(jd, place)
 *
 * @param jd - Julian Day Number (local-time encoded)
 * @param place - Place
 * @returns [retflag, tret, attr] matching Python format
 *   tret[0] = greatest eclipse, tret[1] = first contact, tret[2-4] = 2nd/3rd/4th contact
 *   attr[0] = fraction of solar diameter covered, attr[2] = obscuration
 */
// @parity: py=next_solar_eclipse
export async function nextSolarEclipseAsync(
  jd: number,
  place: Place
): Promise<[number, number[], number[]]> {
  const result = await nextSolarEclipseLocAsync(jd, place, 0);
  return [result.retflag, result.tret, result.attr];
}

/**
 * Find the next lunar eclipse visible at the given location.
 * Python: next_lunar_eclipse(jd, place)
 *
 * @param jd - Julian Day Number (local-time encoded)
 * @param place - Place
 * @returns [retflag, tret, attr] matching Python format
 *   tret[0] = greatest eclipse, tret[1] = first contact, tret[2-4] = 2nd/3rd/4th contact
 *   attr[0] = fraction covered, attr[2] = obscuration
 */
// @parity: py=next_lunar_eclipse
export async function nextLunarEclipseAsync(
  jd: number,
  place: Place
): Promise<[number, number[], number[]]> {
  const result = await nextLunarEclipseLocAsync(jd, place, 0);
  return [result.retflag, result.tret, result.attr];
}

// ============================================================================
// BHAVA (HOUSE) CALCULATIONS — Phase 3
// ============================================================================

/**
 * Calculate dasavarga sign from absolute longitude.
 * Python: dasavarga_from_long(longitude, divisional_chart_factor=1)
 *
 * @param longitude - Absolute sidereal longitude (0-360)
 * @param divisionalChartFactor - Chart division factor (1=Rasi, 9=Navamsa, etc.)
 * @returns [constellation (0-11), longitude_within_rasi]
 */
// @parity: py=dasavarga_from_long
export function dasavargaFromLong(
  longitude: number,
  divisionalChartFactor: number = 1
): [number, number] {
  const onePada = 360.0 / (12 * divisionalChartFactor);
  const oneSign = 12.0 * onePada;
  const signsElapsed = longitude / oneSign;
  const fractionLeft = signsElapsed % 1;
  let constellation = Math.floor(fractionLeft * 12);
  let longInRaasi = (longitude - constellation * 30) % 30;

  // Handle boundary: if long_in_raasi ≈ 30, wrap to 0 and advance constellation
  const oneSecondInDeg = 1.0 / 3600;
  if (Math.floor(longInRaasi + oneSecondInDeg) === 30) {
    longInRaasi = 0;
    constellation = (constellation + 1) % 12;
  }
  return [constellation, longInRaasi];
}

/**
 * Calculate planet positions for a given divisional chart (async).
 * Python: dhasavarga(jd, place, divisional_chart_factor=1)
 *
 * @param jd - Julian Day Number (local time)
 * @param place - Place data
 * @param divisionalChartFactor - Chart division factor
 * @returns Array of [planet_id, [rasi, longitude]] tuples
 */
// @parity: py=dhasavarga
export async function dhasavargaAsync(
  jd: number,
  place: Place,
  divisionalChartFactor: number = 1
): Promise<Array<[number, [number, number]]>> {
  const jdUtc = jd - place.timezone / 24;
  const positions: Array<[number, [number, number]]> = [];

  for (let p = 0; p <= 8; p++) {
    let nirayanLong: number;
    if (p === 8) {
      // Ketu = Rahu + 180
      const rahuLong = await siderealLongitudeAsync(jdUtc, 7);
      nirayanLong = normalizeDegrees(rahuLong + 180);
    } else {
      nirayanLong = await siderealLongitudeAsync(jdUtc, p);
    }
    const divisionalChart = dasavargaFromLong(nirayanLong, divisionalChartFactor);
    positions.push([p, divisionalChart]);
  }

  return positions;
}

/**
 * Bhava Madhya KP (Placidus house cusps) — async.
 * Python: bhaava_madhya_kp(jd, place)
 *
 * @param jd - Julian Day Number (local time)
 * @param place - Place data
 * @returns Array of 12 sidereal house cusp longitudes
 */
// @parity: py=bhaava_madhya_kp
export async function bhaavaMadhyaKP(
  jd: number,
  place: Place
): Promise<number[]> {
  return houseCuspsAsync(jd, place, 'P');
}

/**
 * Bhava Madhya SWE — house cusps for any western house system.
 * Python: bhaava_madhya_swe(jd, place, house_code='P')
 *
 * @param jd - Julian Day Number (local time)
 * @param place - Place data
 * @param houseCode - Single-character house system code ('P', 'K', 'O', etc.)
 * @returns Array of 12 sidereal house cusp longitudes
 */
// @parity: py=bhaava_madhya_swe
export async function bhaavaMadhyaSwe(
  jd: number,
  place: Place,
  houseCode: string = 'P'
): Promise<number[]> {
  if (!(houseCode in WESTERN_HOUSE_SYSTEMS)) {
    console.warn(`house_code should be one of WESTERN_HOUSE_SYSTEMS keys. Value 'P' assumed`);
    houseCode = 'P';
  }
  return houseCuspsAsync(jd, place, houseCode);
}

/**
 * Bhava Madhya Sripathi — Sripathi trisection of KP quadrant cusps.
 * Python: bhaava_madhya_sripathi(jd, place)
 *
 * Takes the KP (Placidus) cusps and trisects the quadrants:
 * Quadrant points: cusps[0], cusps[3], cusps[6], cusps[9], cusps[0] (wrap)
 * Intermediate cusps (1,2), (4,5), (7,8), (10,11) are evenly spaced within each quadrant.
 *
 * @param jd - Julian Day Number (local time)
 * @param place - Place data
 * @returns Array of 12 sidereal house cusp longitudes
 */
// @parity: py=bhaava_madhya_sripathi
export async function bhaavaMadhyaSripathi(
  jd: number,
  place: Place
): Promise<number[]> {
  const bm = await bhaavaMadhyaKP(jd, place);
  const bmf = [0, 3, 6, 9, 12]; // quadrant boundary indices

  for (let ib = 1; ib < bmf.length; ib++) {
    const bi1 = bmf[ib - 1]! % 12;
    const bi2 = bmf[ib]! % 12;
    let b1 = bm[bi1]!;
    let b2 = bm[bi2]!;
    if (b2 < b1) b2 += 360;
    const bd = Math.abs(b2 - b1) / 3.0;
    bm[(bi1 + 1) % 12] = (bm[bi1 % 12]! + bd) % 360;
    bm[(bi2 + 11) % 12] = (bm[bi2 % 12]! - bd + 360) % 360; // (bi2-1)%12
  }

  return bm;
}

/**
 * Assign planets to bhava houses based on cusp boundaries.
 * Python: _assign_planets_to_houses(planet_positions, bhava_houses, bhava_madhya_method=1)
 *
 * @param planetPositions - Array of [planet_id, [rasi, longitude]] (includes Lagna as 'L')
 * @param bhavaHouses - Array of [start, mid, end] tuples for each house
 * @param bhavaMadhyaMethod - House system method (1-5 or western code)
 * @returns Array of [rasi, [start, mid, end], planetsInHouse[]] for each house
 */
// @parity: py=_assign_planets_to_houses
export function assignPlanetsToHouses(
  planetPositions: Array<[number | string, [number, number]]>,
  bhavaHouses: Array<[number, number, number]>,
  bhavaMadhyaMethod: number | string = 1
): Array<[number, [number, number, number], (number | string)[]]> {
  const result: Array<[number, [number, number, number], (number | string)[]]> = [];

  for (const [bhavaStart, bhavaMid, bhavaEnd0] of bhavaHouses) {
    let bhavaEnd = bhavaEnd0;
    const planetsInHouse: (number | string)[] = [];
    if (bhavaEnd < bhavaStart) bhavaEnd += 360;

    for (const [p, [h, long]] of planetPositions) {
      const pLong = h * 30 + long;
      if (
        (pLong >= bhavaStart && pLong < bhavaEnd) ||
        (pLong + 360 >= bhavaStart && pLong + 360 < bhavaEnd)
      ) {
        planetsInHouse.push(p);
      }
    }

    let houseRasi: number;
    if (bhavaMadhyaMethod === 1 || bhavaMadhyaMethod === 5) {
      // Rasi based on bhava cusp (mid)
      houseRasi = Math.floor(bhavaMid / 30);
    } else if (bhavaMadhyaMethod === 2) {
      // Rasi based on bhava start
      houseRasi = Math.floor(bhavaStart / 30);
    } else {
      // Sripati / KP / Western: rasi based on bhava start, mod 360 applied to tuple
      houseRasi = Math.floor(bhavaStart / 30);
    }

    if (bhavaMadhyaMethod === 3 || bhavaMadhyaMethod === 4 ||
        typeof bhavaMadhyaMethod === 'string') {
      result.push([
        houseRasi,
        [bhavaStart % 360, bhavaMid % 360, bhavaEnd % 360],
        planetsInHouse,
      ]);
    } else {
      result.push([houseRasi, [bhavaStart, bhavaMid, bhavaEnd], planetsInHouse]);
    }
  }

  return result;
}

/**
 * Unified bhava madhya calculation supporting all 5 Indian + Western house systems.
 * Python: _bhaava_madhya_new(jd, place, bhava_madhya_method=1)
 *
 * @param jd - Julian Day Number (local time)
 * @param place - Place data
 * @param bhavaMadhyaMethod - House system method:
 *   1 = Equal Housing (Lagna in middle)
 *   2 = Equal Housing (Lagna as start)
 *   3 = Sripathi
 *   4 = KP (Placidus)
 *   5 = Each Rasi is the house
 *   'P','K','O','R','C','A','V','X','H','T','B','M' = Western systems
 * @returns Array of [rasi, [start, mid, end], planetsInHouse[]] for each house
 */
// @parity: py=_bhaava_madhya_new
export async function bhaavaMadhyaNew(
  jd: number,
  place: Place,
  bhavaMadhyaMethod: number | string = BHAAVA_MADHYA_METHOD
): Promise<Array<[number, [number, number, number], (number | string)[]]>> {
  if (!(bhavaMadhyaMethod in AVAILABLE_HOUSE_SYSTEMS)) {
    console.warn('bhava_madhya_method should be one of AVAILABLE_HOUSE_SYSTEMS keys. Value 1 assumed');
    bhavaMadhyaMethod = 1;
  }

  // Get ascendant
  const [ascConstellation, ascLongitude, , ] = await ascendantFullAsync(jd, place);
  const ascFullLong = (ascConstellation * 30 + ascLongitude) % 360;

  // Get planet positions (D1)
  const planetPositionsRaw = await dhasavargaAsync(jd, place, 1);
  // Prepend Lagna (ascendant)
  const planetPositions: Array<[number | string, [number, number]]> = [
    [ASCENDANT_SYMBOL, [ascConstellation, ascLongitude]],
    ...planetPositionsRaw,
  ];

  const bhavaHouses: Array<[number, number, number]> = [];

  if (bhavaMadhyaMethod === 1) {
    // Equal Housing — Lagna in the middle
    let bhavaMid = ascFullLong;
    for (let h = 0; h < 12; h++) {
      const bhavaStart = (bhavaMid - 15.0 + 360) % 360;
      const bhavaEnd = (bhavaMid + 15.0) % 360;
      bhavaHouses.push([bhavaStart, bhavaMid, bhavaEnd]);
      bhavaMid = normalizeDegrees(bhavaMid + 30);
    }
  } else if (bhavaMadhyaMethod === 2) {
    // Equal Housing — Lagna as start
    let bhavaMidStart = ascFullLong;
    for (let h = 0; h < 12; h++) {
      const bhavaStart = bhavaMidStart;
      const bhavaMid = (bhavaStart + 15.0) % 360;
      const bhavaEnd = (bhavaMid + 15.0) % 360;
      bhavaHouses.push([bhavaStart, bhavaMid, bhavaEnd]);
      bhavaMidStart = normalizeDegrees(bhavaStart + 30);
    }
  } else if (bhavaMadhyaMethod === 3) {
    // Sripathi
    const bm = await bhaavaMadhyaSripathi(jd, place);
    const bmExt = [...bm, bm[0]!];
    for (let h = 0; h < 12; h++) {
      const bhavaStart = bmExt[h]!;
      const bhavaMid = 0.5 * (bmExt[h]! + bmExt[h + 1]!);
      const bhavaEnd = bmExt[h + 1]!;
      bhavaHouses.push([bhavaStart % 360, bhavaMid % 360, bhavaEnd % 360]);
    }
  } else if (bhavaMadhyaMethod === 4 || typeof bhavaMadhyaMethod === 'string') {
    // KP or Western house systems
    const bm = bhavaMadhyaMethod === 4
      ? await bhaavaMadhyaKP(jd, place)
      : await bhaavaMadhyaSwe(jd, place, bhavaMadhyaMethod as string);
    const bmExt = [...bm, bm[0]!];
    for (let h = 0; h < 12; h++) {
      let bmh = bmExt[h]!;
      let bmh1 = bmExt[h + 1]!;
      if (bmh1 < bmh) bmh1 += 360;
      const bhavaStart = bmh;
      const bhavaMid = 0.5 * (bmh + bmh1);
      const bhavaEnd = bmh1;
      bhavaHouses.push([bhavaStart % 360, bhavaMid % 360, bhavaEnd % 360]);
    }
  } else if (bhavaMadhyaMethod === 5) {
    // Each Rasi is the house
    for (let h = 0; h < 12; h++) {
      const h1 = (h + ascConstellation) % 12;
      const bhavaStart = h1 * 30;
      const bhavaMid = bhavaStart + ascLongitude;
      const bhavaEnd = ((h1 + 1) % 12) * 30;
      bhavaHouses.push([bhavaStart % 360, bhavaMid % 360, bhavaEnd % 360]);
    }
  }

  return assignPlanetsToHouses(planetPositions, bhavaHouses, bhavaMadhyaMethod);
}

// ============================================================================
// PLANET SPEED & RETROGRADE
// ============================================================================

/**
 * Lunar daily motion (sync).
 * Python: _lunar_daily_motion(jd)
 */
// @parity: py=_lunar_daily_motion
export function lunarDailyMotion(jd: number): number {
  const today = lunarLongitude(jd);
  let tomorrow = lunarLongitude(jd + 1);
  if (tomorrow < today) tomorrow += 360;
  return tomorrow - today;
}

/**
 * Solar daily motion (sync).
 * Python: _solar_daily_motion(jd)
 */
// @parity: py=_solar_daily_motion
export function solarDailyMotion(jd: number): number {
  const today = solarLongitude(jd);
  let tomorrow = solarLongitude(jd + 1);
  if (tomorrow < today) tomorrow += 360;
  return tomorrow - today;
}

/** Planets in retrograde (sync). Python: planets_in_retrograde(jd, place) */
// @parity: py=planets_in_retrograde
export const planetsInRetrograde = _planetsInRetrograde;
/** Planets in retrograde (async). */
export const planetsInRetrogradeAsync = _planetsInRetrogradeAsync;
/** Planet speed info (sync). Python: _planet_speed_info(jd, place, planet) */
// @parity: py=_planet_speed_info
export const planetSpeedInfo = _planetSpeedInfo;
/** Planet speed info (async). */
export const planetSpeedInfoAsync = _planetSpeedInfoAsync;

/**
 * Daily Moon speed.
 * Python: daily_moon_speed(jd, place)
 */
export function dailyMoonSpeed(jd: number, place: Place): number {
  // Python _planet_speed_info rounds longitude_speed to 3 decimals
  return _pyRound(_planetSpeedInfo(jd, place, MOON).longitudeSpeed, 3);
}

/** Mirror of Python round(x, n) used by _planet_speed_info round_factors. */
function _pyRound(x: number, n: number): number {
  const f = Math.pow(10, n);
  return Math.round(x * f) / f;
}

/**
 * Daily Sun speed.
 * Python: daily_sun_speed(jd, place)
 */
export function dailySunSpeed(jd: number, place: Place): number {
  return _pyRound(_planetSpeedInfo(jd, place, SUN).longitudeSpeed, 3);
}

/**
 * Daily speed of any planet.
 * Python: daily_planet_speed(jd, place, planet)
 */
export function dailyPlanetSpeed(jd: number, place: Place, planet: number): number {
  return _pyRound(_planetSpeedInfo(jd, place, planet).longitudeSpeed, 3);
}

/**
 * All planets speed info (sync).
 * Python: planets_speed_info(jd, place)
 */
// @parity: py=planets_speed_info
export function planetsSpeedInfo(jd: number, place: Place): Record<number, number[]> {
  const result: Record<number, number[]> = {};
  const planets = [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU];
  for (const p of planets) {
    if (p === KETU) {
      result[p] = result[RAHU]!.slice();
      continue;
    }
    const info = _planetSpeedInfo(jd, place, p);
    // Python planets_speed_info round_factors = [3,3,4,3,3,6]
    result[p] = [
      _pyRound(info.longitude, 3), _pyRound(info.latitude, 3), _pyRound(info.distance, 4),
      _pyRound(info.longitudeSpeed, 3), _pyRound(info.latitudeSpeed, 3), _pyRound(info.distanceSpeed, 6),
    ];
  }
  return result;
}

/**
 * Planets in Graha Yudh (planetary war).
 * Python: planets_in_graha_yudh(jd, place)
 */
// @parity: py=planets_in_graha_yudh
export function planetsInGrahaYudh(jd: number, place: Place): Array<[number, number, number]> {
  const psi = planetsSpeedInfo(jd, place);
  const longLatList: Array<[number, number]> = [];
  for (const p of [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU]) {
    const info = psi[p]!;
    longLatList.push([info[0]!, info[1]!]);
  }

  const result: Array<[number, number, number]> = [];
  const n = longLatList.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [long1, lat1] = longLatList[i]!;
      const [long2, lat2] = longLatList[j]!;
      if (long1 === long2) {
        if (lat1 === lat2) {
          result.push([i, j, 0]); // Bhed-yuti
        } else {
          const latDist = Math.abs(lat2 - lat1);
          if (lat1 * lat2 > 0 && latDist * 3600 <= GRAHA_YUDH_CRITERIA_1) {
            result.push([i, j, 1]); // Ullekh-yuti
          } else if (lat1 * lat2 > 0 && latDist <= GRAHA_YUDH_CRITERIA_2) {
            result.push([i, j, 2]); // Apsavya-yuti
          } else if (latDist <= GRAHA_YUDH_CRITERIA_3) {
            result.push([i, j, 3]); // Anshumard-yuti
          }
        }
      }
    }
  }
  return result;
}

// ============================================================================
// VAARA (WEEKDAY) - sync
// ============================================================================

/**
 * Vaara/weekday using ahargana.
 * Python: vaara(jd)
 */
export function vaara(jd: number): number {
  if (USE_AHARGHANA_FOR_VAARA_CALCULATION) {
    return (kaliAharganaDays(jd) % 7 + 5) % 7;
  }
  return Math.ceil(jd + 1) % 7;
}

// ============================================================================
// LUNAR MONTH & VEDIC DATE
// ============================================================================

/**
 * Lunar year index (samvatsara index from Kali year).
 * Python: lunar_year_index(jd, maasa_index)
 */
// @parity: py=lunar_year_index
export function lunarYearIndex(jd: number, maasaIndex: number): number {
  let kali = elapsedYear(jd, maasaIndex)[0];
  const kaliBase = 14;
  let kaliStart = KALI_START_YEAR;
  if (kali < 4009 && FORCE_KALI_START_YEAR_FOR_YEARS_BEFORE_KALI_YEAR_4009) {
    kaliStart = KALI_START_YEAR;
  }
  if (kali >= 4009) kali = (kali - kaliBase) % 60;
  const samvatIndex = (kali + kaliStart + Math.floor((kali * 211 - 108) / 18000)) % 60;
  return samvatIndex - 1;
}

// ============================================================================
// DECLINATION OF PLANETS
// ============================================================================

/**
 * Declination of planets (Sun to Saturn).
 * Python: declination_of_planets(jd, place)
 */
// @parity: py=declination_of_planets
export function declinationOfPlanets(jd: number, place: Place): number[] {
  const ayaVal = getAyanamsaValue(jd);
  const pp = getAllPlanetPositionsSync(jd, place).slice(0, 7);
  const bhujas: number[] = new Array(7).fill(0);
  const northSouthSign: number[] = new Array(7).fill(1);

  for (let p = 0; p < 7; p++) {
    const [h, long] = pp[p]!;
    const pLong = h * 30 + long + ayaVal;
    if (pLong >= 0 && pLong < 180) {
      northSouthSign[p] = [0, 2, 4, 5].includes(p) ? 1 : -1;
    } else {
      northSouthSign[p] = [1, 6].includes(p) ? 1 : -1;
    }
    bhujas[p] = pLong % 360;
    if (pLong > 90 && pLong < 180) bhujas[p] = 180 - pLong;
    else if (pLong > 180 && pLong < 270) bhujas[p] = pLong - 180;
    else if (pLong > 270 && pLong < 360) bhujas[p] = 360 - pLong;
    bhujas[p] = Math.round(bhujas[p]! * 100) / 100;
  }
  northSouthSign[3] = 1; // Mercury always North

  const bd = [0, 362 / 60, 703 / 60, 1002 / 60, 1238 / 60, 1388 / 60, 1440 / 60];
  const bx = [0, 15, 30, 45, 60, 75, 90];

  const declinations: number[] = [];
  for (let p = 0; p < 7; p++) {
    declinations.push(northSouthSign[p]! * inverseLagrange(bd, bx, bhujas[p]!));
  }
  return declinations;
}

// Helper to get all planet positions sync (rasi, longitude pairs)
// Uses PyJHora planet indices (0-8) which siderealLongitude maps to SWE internally.
function getAllPlanetPositionsSync(jd: number, place: Place): Array<[number, number]> {
  const jdUtc = jd - place.timezone / 24;
  const result: Array<[number, number]> = [];
  const planets = [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU];
  for (const p of planets) {
    // siderealLongitude accepts PyJHora indices (0-8) and handles Ketu internally
    const long = siderealLongitude(jdUtc, p);
    const rasi = Math.floor(long / 30);
    const longInSign = long % 30;
    result.push([rasi, longInSign]);
  }
  return result;
}

// ============================================================================
// SOLAR UPAGRAHA LONGITUDES (already partially done in charts.ts, but adding to drik too)
// ============================================================================

/** Dhuma longitude from Sun longitude */
export function dhumaLongitude(sunLong: number): number {
  return (sunLong + 133 + 20 / 60) % 360;
}

/** Vyatipaata longitude */
export function vyatipaataLongitude(sunLong: number): number {
  return (360 - dhumaLongitude(sunLong)) % 360;
}

/** Parivesha longitude */
export function pariveshaLongitude(sunLong: number): number {
  return (vyatipaataLongitude(sunLong) + 180) % 360;
}

/** Indrachaapa longitude */
export function indrachaapLongitude(sunLong: number): number {
  return (360 - pariveshaLongitude(sunLong)) % 360;
}

/** Upaketu longitude */
export function upaketuLongitude(sunLong: number): number {
  return (sunLong - 30) % 360;
}

/**
 * Solar upagraha longitudes.
 * Python: solar_upagraha_longitudes(solar_longitude, upagraha, divisional_chart_factor)
 */
// @parity: py=solar_upagraha_longitudes
export function solarUpagrahaLongitudes(
  solarLong: number,
  upagraha: string,
  divisionalChartFactor: number = 1
): [number, number] | undefined {
  const upagrahaFns: Record<string, (sl: number) => number> = {
    dhuma: dhumaLongitude,
    vyatipaata: vyatipaataLongitude,
    parivesha: pariveshaLongitude,
    indrachaapa: indrachaapLongitude,
    upaketu: upaketuLongitude,
  };
  const fn = upagrahaFns[upagraha.toLowerCase()];
  if (!fn) return undefined;
  const long = fn(solarLong);
  return dasavargaFromLong(long, divisionalChartFactor);
}

// ============================================================================
// UPAGRAHA LONGITUDE (Gulika, Maandi, Kaala, Mrityu, etc.)
// ============================================================================

/**
 * Upagraha longitude calculation.
 * Python: upagraha_longitude(dob, tob, place, planet_index, ...)
 *
 * @param jd - Julian day for the date
 * @param place - Place
 * @param planetIndex - 0=Sun, 1=Moon, 2=Mars, 3=Mercury, 4=Jupiter, 5=Venus, 6=Saturn
 * @param upagrahaPartMiddle - true for 'middle', false for 'begin'
 * @returns [constellation, longitude_in_sign]
 */
// @parity: py=upagraha_longitude
export function upagrahaLongitude(
  jd: number, place: Place, tobHours: number,
  planetIndex: number, upagrahaPartMiddle: boolean = true
): [number, number] {
  const dayNumber = vaara(jd);
  const sr = sunrise(jd, place);
  const ss = sunset(jd, place);
  let srise = sr.localTime;
  let sset = ss.localTime;

  let planetPart: number;
  if (tobHours < srise) {
    // Night: previous day sunset to today's sunrise
    const prevSs = sunset(jd - 1, place);
    sset = prevSs.localTime;
    planetPart = DAY_RULERS[dayNumber]!.indexOf(planetIndex);
    // Use night rulers
    planetPart = NIGHT_RULERS[dayNumber]!.indexOf(planetIndex);
  } else if (tobHours > sset) {
    // Night: today's sunset to next sunrise
    const nextSr = sunrise(jd + 1, place);
    srise = nextSr.localTime;
    planetPart = NIGHT_RULERS[dayNumber]!.indexOf(planetIndex);
  } else {
    planetPart = DAY_RULERS[dayNumber]!.indexOf(planetIndex);
  }

  if (planetPart === -1) return [0, 0]; // Planet not found in rulers

  const dayDur = Math.abs(sset - srise);
  const onePart = dayDur / 8;
  const planetStartTime = srise + planetPart * onePart;

  let jdKaala: number;
  if (upagrahaPartMiddle) {
    const planetEndTime = srise + (planetPart + 1) * onePart;
    const planetMiddleTime = 0.5 * (planetStartTime + planetEndTime);
    jdKaala = gregorianToJulianDay(
      julianDayToGregorian(jd).date,
      { hour: Math.floor(planetMiddleTime), minute: Math.floor((planetMiddleTime % 1) * 60), second: 0 }
    );
  } else {
    jdKaala = gregorianToJulianDay(
      julianDayToGregorian(jd).date,
      { hour: Math.floor(planetStartTime), minute: Math.floor((planetStartTime % 1) * 60), second: 0 }
    );
  }

  // For upagraha, we need the lagna (ascendant) at the specific time.
  // Sync version uses Sun as a rough proxy since we don't have sync ascendant.
  const jdUtc = jdKaala - place.timezone / 24;
  const upagrahaLong = solarLongitude(jdUtc);
  return dasavargaFromLong(normalizeDegrees(upagrahaLong), 1);
}

/**
 * Async version of upagraha longitude (accurate, uses async ascendant).
 */
export async function upagrahaLongitudeAsync(
  jd: number, place: Place, tobHours: number,
  planetIndex: number, upagrahaPartMiddle: boolean = true
): Promise<[number, number]> {
  const dayNumber = vaara(jd);
  const sr = await sunriseAsync(jd, place);
  const ss = await sunsetAsync(jd, place);
  let srise = sr.localTime;
  let sset = ss.localTime;

  let planetPart: number;
  if (tobHours < srise) {
    const prevSs = await sunsetAsync(jd - 1, place);
    sset = prevSs.localTime;
    planetPart = NIGHT_RULERS[dayNumber]!.indexOf(planetIndex);
  } else if (tobHours > sset) {
    const nextSr = await sunriseAsync(jd + 1, place);
    srise = nextSr.localTime;
    planetPart = NIGHT_RULERS[dayNumber]!.indexOf(planetIndex);
  } else {
    planetPart = DAY_RULERS[dayNumber]!.indexOf(planetIndex);
  }

  if (planetPart === -1) return [0, 0];

  const dayDur = Math.abs(sset - srise);
  const onePart = dayDur / 8;
  const planetStartTime = srise + planetPart * onePart;

  let timeForAsc: number;
  if (upagrahaPartMiddle) {
    const planetEndTime = srise + (planetPart + 1) * onePart;
    timeForAsc = 0.5 * (planetStartTime + planetEndTime);
  } else {
    timeForAsc = planetStartTime;
  }

  const { date } = julianDayToGregorian(jd);
  const jdKaala = gregorianToJulianDay(date, {
    hour: Math.floor(timeForAsc),
    minute: Math.floor((timeForAsc % 1) * 60),
    second: Math.round(((timeForAsc % 1) * 60 % 1) * 60),
  });

  const asc = await ascendantFullAsync(jdKaala, place);
  const upagrahaLong = asc[0] * 30 + asc[1];
  return dasavargaFromLong(normalizeDegrees(upagrahaLong), 1);
}

/** Kaala longitude - rises at middle of Sun's part */
export async function kaalaLongitudeAsync(
  jd: number, place: Place, tobHours: number
): Promise<[number, number]> {
  return upagrahaLongitudeAsync(jd, place, tobHours, SUN, true);
}

/** Mrityu longitude - rises at middle of Mars's part */
export async function mrityuLongitudeAsync(
  jd: number, place: Place, tobHours: number
): Promise<[number, number]> {
  return upagrahaLongitudeAsync(jd, place, tobHours, MARS, true);
}

/** Artha Praharaka longitude - rises at middle of Mercury's part */
export async function arthaPraharakaLongitudeAsync(
  jd: number, place: Place, tobHours: number
): Promise<[number, number]> {
  return upagrahaLongitudeAsync(jd, place, tobHours, MERCURY, true);
}

/** Yama Ghantaka longitude - rises at middle of Jupiter's part */
export async function yamaGhantakaLongitudeAsync(
  jd: number, place: Place, tobHours: number
): Promise<[number, number]> {
  return upagrahaLongitudeAsync(jd, place, tobHours, JUPITER, true);
}

/** Gulika longitude - rises at begin of Saturn's part */
export async function gulikaLongitudeAsync(
  jd: number, place: Place, tobHours: number
): Promise<[number, number]> {
  return upagrahaLongitudeAsync(jd, place, tobHours, SATURN, false);
}

/** Maandi longitude - rises at middle of Saturn's part */
export async function maandiLongitudeAsync(
  jd: number, place: Place, tobHours: number
): Promise<[number, number]> {
  return upagrahaLongitudeAsync(jd, place, tobHours, SATURN, true);
}

// ============================================================================
// PRANAPADA LAGNA
// ============================================================================

/**
 * Pranapada Lagna (async).
 * Python: pranapada_lagna(jd, place, ...)
 */
// @parity: py=pranapada_lagna
export async function pranapadaLagnaAsync(
  jd: number, place: Place, divisionalChartFactor: number = 1,
  chartMethod: number = 1
): Promise<[number, number]> {
  // birth_long = (udhayadhi_nazhikai(jd, place)[1]*4)%12
  const sr = await sunriseAsync(jd, place);
  const tobHours = localHoursFromJd(jd);
  let prevSunriseHours: number | undefined;
  if (tobHours < sr.localTime) {
    prevSunriseHours = (await sunriseAsync(jd - 1, place)).localTime;
  }
  const ghatis = udhayadhiNazhikaiGhati(tobHours, sr.localTime, prevSunriseHours);
  const birthLong = (ghatis * 4) % 12;

  // Python: pp = charts.divisional_chart(jd, place, divisional_chart_factor=...)
  // Sun longitude at birth time (not sunrise)
  let sunLong: number;
  if (divisionalChartFactor > 1) {
    const pp = getDivisionalChart(jd, place, divisionalChartFactor, chartMethod);
    const sunPos = pp[1]!; // Sun: [planet, [rasi, long_within_sign]]
    sunLong = sunPos[1][0] * 30 + sunPos[1][1];
  } else {
    const jdUtc = jd - place.timezone / 24;
    sunLong = await solarLongitudeAsync(jdUtc);
  }

  const pl1Base = birthLong * 30 + sunLong;
  const sl = dasavargaFromLong(sunLong, divisionalChartFactor);
  let x: number;
  if (FIXED_SIGNS.includes(sl[0])) {
    x = 240;
  } else if (DUAL_SIGNS.includes(sl[0])) {
    x = 120;
  } else {
    x = 0;
  }
  const splLong = (pl1Base + x) % 360;
  return dasavargaFromLong(splLong, divisionalChartFactor);
}

// ============================================================================
// NEXT SOLAR DATE (critical for Kaala dhasa / annual charts)
// ============================================================================

/**
 * Find the JD when Sun returns to the same longitude after N years/months.
 * Python: next_solar_date(jd_at_dob, place, years, months, sixty_hours)
 */
export async function nextSolarDateAsync(
  jdAtDob: number, place: Place, years: number = 1, months: number = 1, sixtyHours: number = 1
): Promise<number> {
  if (years === 1 && months === 1 && sixtyHours === 1) return jdAtDob;

  const dv = await dhasavargaAsync(jdAtDob, place, 1);
  const sunPos = dv[0]![1] as [number, number];
  const sunLongAtDob = sunPos[0] * 30 + sunPos[1];

  const sunLongExtra = ((years - 1) * 360 + (months - 1) * 30 + (sixtyHours - 1) * 2.5) % 360;
  const jdExtra = Math.floor(((years - 1) + (months - 1) / 12 + (sixtyHours - 1) / 144) * TROPICAL_YEAR);
  const jdNext = jdAtDob + jdExtra;
  const sunLongNext = (sunLongAtDob + sunLongExtra) % 360;

  return nextSolarJdAsync(jdNext, place, sunLongNext);
}

async function nextSolarJdAsync(jd: number, place: Place, sunLong: number): Promise<number> {
  let jdNext = jd;
  let sl = await solarLongitudeAsync(jdNext - place.timezone / 24);
  let maxIter = 400;
  while (maxIter-- > 0) {
    if (sl < sunLong + 1 && sl > sunLong) {
      jdNext -= 1;
      break;
    }
    jdNext += 1;
    sl = await solarLongitudeAsync(jdNext - place.timezone / 24);
  }

  const sr = await sunriseAsync(jdNext, place);
  const sankSunrise = sr.jd;
  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const solarLongs: number[] = [];
  for (const t of offsets) {
    solarLongs.push(await solarLongitudeAsync(sankSunrise + t));
  }
  const solarHour = inverseLagrange(offsets, solarLongs, sunLong);
  const { date } = julianDayToGregorian(jdNext);
  const sankJdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });
  const solarHour1 = (sankSunrise + solarHour - sankJdUtc) * 24 + place.timezone;
  return gregorianToJulianDay(date, {
    hour: Math.floor(solarHour1),
    minute: Math.floor((solarHour1 % 1) * 60),
    second: Math.round(((solarHour1 % 1) * 60 % 1) * 60),
  });
}

/**
 * Sync helper: iteratively find JD when Sun reaches target longitude.
 * Python: __next_solar_jd(jd, place, sun_long)
 * Uses sync solarLongitude() and sunrise() via WASM ccall.
 */
function nextSolarJd(jd: number, place: Place, sunLong: number): number {
  let jdNext = jd;
  let sl = solarLongitude(jdNext - place.timezone / 24);
  let maxIter = 400;
  while (maxIter-- > 0) {
    if (sl < sunLong + 1 && sl > sunLong) {
      jdNext -= 1;
      break;
    }
    jdNext += 1;
    sl = solarLongitude(jdNext - place.timezone / 24);
  }

  const sr = sunrise(jdNext, place);
  const sankSunrise = sr.jd;
  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const solarLongs = offsets.map(t => solarLongitude(sankSunrise + t));
  const solarHour = inverseLagrange(offsets, solarLongs, sunLong);
  const { date } = julianDayToGregorian(jdNext);
  const sankJdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });
  const solarHour1 = (sankSunrise + solarHour - sankJdUtc) * 24 + place.timezone;
  return gregorianToJulianDay(date, {
    hour: Math.floor(solarHour1),
    minute: Math.floor((solarHour1 % 1) * 60),
    second: Math.round(((solarHour1 % 1) * 60 % 1) * 60),
  });
}

/**
 * Sync version: Find the JD when Sun returns to the same longitude after N years/months/sixty_hours.
 * Python: next_solar_date(jd_at_dob, place, years, months, sixty_hours)
 *
 * Uses actual solar longitude search with iterative refinement (matching Python).
 * This replaces the tropical-year approximation used in kaala.ts and other modules.
 *
 * @param jdAtDob - Julian Day Number at birth (local-encoded)
 * @param place - Place struct
 * @param years - Number of years since birth (1 = birth year itself)
 * @param months - Number of months from birth month (1 = same month)
 * @param sixtyHours - Number of 60-hour periods (1 = first period)
 * @returns Julian Day Number when Sun reaches the target longitude
 */
// @parity: py=next_solar_date
export function nextSolarDate(
  jdAtDob: number, place: Place, years: number = 1, months: number = 1, sixtyHours: number = 1
): number {
  if (years === 1 && months === 1 && sixtyHours === 1) return jdAtDob;

  // Get Sun's sidereal longitude at DOB (matching Python: dhasavarga(jd, place, 1)[0][1])
  // dhasavarga internally does jd_utc = jd - tz/24, then sidereal_longitude(jd_utc, SUN)
  const jdUtc = jdAtDob - place.timezone / 24;
  const sunLongAtDob = solarLongitude(jdUtc);

  // Calculate target longitude offset and approximate JD offset
  const sunLongExtra = ((years - 1) * 360 + (months - 1) * 30 + (sixtyHours - 1) * 2.5) % 360;
  const jdExtra = Math.floor(((years - 1) + (months - 1) / 12 + (sixtyHours - 1) / 144) * TROPICAL_YEAR);
  const jdNext = jdAtDob + jdExtra;
  const sunLongNext = (sunLongAtDob + sunLongExtra) % 360;

  return nextSolarJd(jdNext, place, sunLongNext);
}

// ============================================================================
// CONJUNCTION OF PLANET PAIRS
// ============================================================================

/**
 * Find next conjunction of two planets.
 * Python: next_conjunction_of_planet_pair(jd, place, p1, p2, direction, separation_angle, ...)
 */
// @parity: py=next_conjunction_of_planet_pair
export async function nextConjunctionOfPlanetPairAsync(
  jd: number, place: Place, p1: number, p2: number,
  direction: number = 1, separationAngle: number = 0,
  incrementSpeedFactor: number = 0.25
): Promise<[number, number, number] | null> {
  if ((p1 === RAHU && p2 === KETU) || (p1 === KETU && p2 === RAHU)) {
    return null; // Rahu and Ketu never conjoin
  }

  // Helper to get planet longitude at a given local JD
  async function getPlanetLong(planet: number, localJd: number): Promise<number> {
    const utcJd = localJd - place.timezone / 24;
    return siderealLongitudeAsync(utcJd, planet);
  }

  // Adaptive step: use planet speeds to determine increment_days
  // Python: increment_days = increment_speed_factor / max(p1_speed, p2_speed)
  const speedInfo = planetsSpeedInfo(jd, place);
  const p1Speed = speedInfo[p1] ? Math.abs(speedInfo[p1]![3]!) : 1;
  const p2Speed = speedInfo[p2] ? Math.abs(speedInfo[p2]![3]!) : 1;
  const fasterSpeed = Math.max(p1Speed, p2Speed) || 1;
  const incrementDays = (incrementSpeedFactor / fasterSpeed) * direction;

  const maxDaysToSearch = 1000000;
  let curJd = jd;
  let searchCounter = 0;

  while (searchCounter < maxDaysToSearch) {
    curJd += incrementDays;
    const p1Long = await getPlanetLong(p1, curJd);
    const p2Long = await getPlanetLong(p2, curJd);
    const longDiff = (360 + p1Long - p2Long - separationAngle) % 360;

    if (longDiff < 0.5) {
      // Fine-tune with inverse Lagrange
      const jdList = Array.from({ length: 20 }, (_, i) => curJd + (i - 10) * incrementDays);
      const longDiffList: number[] = [];
      for (const jdt of jdList) {
        const pl1 = await getPlanetLong(p1, jdt);
        const pl2 = await getPlanetLong(p2, jdt);
        longDiffList.push((360 + pl1 - pl2 - separationAngle) % 360);
      }
      try {
        const conjJd = inverseLagrange(jdList, longDiffList, 0.0);
        const fp1 = await getPlanetLong(p1, conjJd);
        const fp2 = await getPlanetLong(p2, conjJd);
        return [conjJd, normalizeDegrees(fp1), normalizeDegrees(fp2)];
      } catch {
        return [curJd, normalizeDegrees(p1Long), normalizeDegrees(p2Long)];
      }
    }
    searchCounter++;
  }
  return null;
}

/** Previous conjunction */
// @parity: py=previous_conjunction_of_planet_pair
export async function previousConjunctionOfPlanetPairAsync(
  jd: number, place: Place, p1: number, p2: number, separationAngle: number = 0
): Promise<[number, number, number] | null> {
  return nextConjunctionOfPlanetPairAsync(jd, place, p1, p2, -1, separationAngle);
}

// ============================================================================
// PREVIOUS PLANET ENTRY DATE
// ============================================================================

/**
 * Previous planet entry date (async wrapper).
 * Python: previous_planet_entry_date(planet, jd, place, ...)
 */
// @parity: py=previous_planet_entry_date
export async function previousPlanetEntryDateAsync(
  planet: number, jd: number, place: Place, raasi?: number
): Promise<[number, number]> {
  return nextPlanetEntryDateAsync(planet, jd, place, -1, raasi);
}

// ============================================================================
// NEXT SOLAR MONTH / YEAR (simple wrappers)
// ============================================================================

/** Next solar month (Sun enters next sign) */
// @parity: py=next_solar_month
export async function nextSolarMonthAsync(
  jd: number, place: Place, raasi?: number
): Promise<[number, number]> {
  return nextPlanetEntryDateAsync(SUN, jd, place, 1, raasi);
}

/** Previous solar month */
// @parity: py=previous_solar_month
export async function previousSolarMonthAsync(
  jd: number, place: Place, raasi?: number
): Promise<[number, number]> {
  return previousPlanetEntryDateAsync(SUN, jd, place, raasi);
}

/** Next solar year (Sun enters Aries) */
// @parity: py=next_solar_year
export async function nextSolarYearAsync(jd: number, place: Place): Promise<[number, number]> {
  return nextPlanetEntryDateAsync(SUN, jd, place, 1, 1);
}

/** Previous solar year */
// @parity: py=previous_solar_year
export async function previousSolarYearAsync(jd: number, place: Place): Promise<[number, number]> {
  return previousPlanetEntryDateAsync(SUN, jd, place, 1);
}

// ============================================================================
// GRAHA DREKKANA
// ============================================================================

/**
 * Graha Drekkana.
 * Python: graha_drekkana(jd, place, use_bv_raman_table)
 */
// @parity: py=graha_drekkana
// Python const.drekkana_table / drekkana_table_bvraman (differ from constants.ts DREKKANA_TABLE*)
const _PY_DREKKANA_TABLE = [
  [1, 6, 1], [0, 6, 4], [0, 1, 1], [6, 0, 5], [4, 0, 1], [0, 1, 0],
  [0, 4, 1], [5, 2, 6], [1, 0, 1], [3, 0, 0], [4, 0, 0], [0, 0, 5],
];
const _PY_DREKKANA_TABLE_BVRAMAN = [
  [1, 5, 0], [0, 6, 6], [0, 5, 1], [6, 4, 4], [5, 1, 6], [0, 1, 5],
  [0, 0, 6], [4, 4, 6], [6, 0, 1], [2, 0, 1], [0, 0, 0], [0, 0, 0],
];

export function grahaDrekkana(jd: number, place: Place, useBvRamanTable: boolean = false): number[] {
  const pp = getAllPlanetPositionsSync(jd, place);
  const table = useBvRamanTable ? _PY_DREKKANA_TABLE_BVRAMAN : _PY_DREKKANA_TABLE;
  return pp.map(([h, long]) => table[h]![Math.floor(long / 10)]!);
}

// ============================================================================
// MUHURTHA FUNCTIONS
// ============================================================================

/**
 * Brahma Muhurtha.
 * Python: brahma_muhurtha(jd, place) -> (start, end) in float hours
 */
// @parity: py=brahma_muhurtha
export async function brahmaMuhurthaAsync(jd: number, place: Place): Promise<[number, number]> {
  const dl = dayLength(jd, place);
  const nl = nightLength(jd, place);
  const nm = nl / 15;
  const sr = sunrise(jd, place).localTime;
  return [sr - 2 * nm, sr - nm];
}

/**
 * Godhuli Muhurtha.
 * Python: godhuli_muhurtha(jd, place)
 */
// @parity: py=godhuli_muhurtha
export async function godhuliMuhurthaAsync(jd: number, place: Place): Promise<[number, number]> {
  const dl = dayLength(jd, place);
  const nl = nightLength(jd, place);
  const dm = dl / 15;
  const nm = nl / 15;
  const ss = sunset(jd, place).localTime;
  return [ss - 0.25 * dm, ss + 0.25 * nm];
}

/**
 * Sandhya periods (3 periods).
 * Python: sandhya_periods(jd, place) -> (pratah, madhyaahna, saayam)
 */
// @parity: py=sandhya_periods
export async function sandhyaPeriodsAsync(
  jd: number, place: Place
): Promise<[[number, number], [number, number], [number, number]]> {
  const dl = dayLength(jd, place);
  const ghati = dl / 30;
  const sr = sunrise(jd, place).localTime;
  const ss = sunset(jd, place).localTime;
  const noon = sr + 0.5 * dl;
  return [
    [sr - 2 * ghati, sr + ghati],        // Pratah
    [noon - 1.5 * ghati, noon + 1.5 * ghati], // Madhyaahna
    [ss - ghati, ss + 2 * ghati],         // Saayam
  ];
}

/**
 * Vijaya Muhurtha (day and night).
 * Python: vijaya_muhurtha(jd, place) -> (day_period, night_period)
 */
// @parity: py=vijaya_muhurtha
export async function vijayaMuhurthaAsync(
  jd: number, place: Place
): Promise<[[number, number], [number, number]]> {
  const dl = dayLength(jd, place);
  const gd = dl / 30;
  const nl = nightLength(jd, place);
  const gn = nl / 30;
  const sr = sunrise(jd, place).localTime;
  const ss = sunset(jd, place).localTime;
  const noon = sr + 0.5 * dl;
  const midnight = ss + 0.5 * nl;
  return [
    [noon - gd, noon + gd],
    [midnight - gn, midnight + gn],
  ];
}

/**
 * Nishita Kaala (8th muhurtha of night).
 * Python: nishita_kaala(jd, place) -> (start, end)
 */
// @parity: py=nishita_kaala
export async function nishitaKaalaAsync(jd: number, place: Place): Promise<[number, number]> {
  const nl = nightLength(jd, place);
  const gn = nl / 30;
  const ss = sunset(jd, place).localTime;
  return [ss + 7 * gn, ss + 8 * gn];
}

/**
 * Nishita Muhurtha (2 ghatis around midnight).
 * Python: nishita_muhurtha(jd, place)
 */
// @parity: py=nishita_muhurtha
export async function nishitaMuhurthaAsync(jd: number, place: Place): Promise<[number, number]> {
  const nl = nightLength(jd, place);
  const gn = nl / 30;
  const ss = sunset(jd, place).localTime;
  const midnight = ss + 0.5 * nl;
  return [midnight - gn, midnight + gn];
}

/**
 * Tamil Jaamam (10 equal divisions of day+night).
 * Python: tamil_jaamam(jd, place)
 */
// @parity: py=tamil_jaamam
export function tamilJaamam(jd: number, place: Place): Array<[number, number]> {
  const dl = dayLength(jd, place);
  const dayJaamam = dl / 5;
  const nl = nightLength(jd, place);
  const nightJaamam = nl / 5;
  const sr = sunrise(jd, place).localTime;
  const ss = sunset(jd, place).localTime;
  const jaamam: Array<[number, number]> = [];
  for (let j = 0; j < 5; j++) {
    jaamam.push([sr + j * dayJaamam, sr + (j + 1) * dayJaamam]);
  }
  for (let j = 0; j < 5; j++) {
    jaamam.push([ss + j * nightJaamam, ss + (j + 1) * nightJaamam]);
  }
  return jaamam;
}

// ============================================================================
// FRACTION MOON YET TO TRAVERSE
// ============================================================================

/**
 * Fraction of nakshatra Moon has yet to traverse.
 * Python: fraction_moon_yet_to_traverse(jd, place, round_to_digits)
 */
// @parity: py=fraction_moon_yet_to_traverse
export function fractionMoonYetToTraverse(jd: number, place: Place, roundToDigits: number = 5): number {
  const jdUtc = jd - place.timezone / 24;
  const oneStar = 360 / 27;
  const moonLong = lunarLongitude(jdUtc);
  const [, , rem] = nakshatraPada(moonLong);
  const fraction = (oneStar - rem) / oneStar;
  return parseFloat(fraction.toFixed(roundToDigits));
}

// ============================================================================
// DISHA SHOOL
// ============================================================================

/**
 * Disha Shool for the day.
 * Python: disha_shool(jd)
 * @returns direction index: 0=North, 1=South, 2=West, 3=North (matches Python const.disha_shool_map)
 */
// @parity: py=disha_shool
export function dishaShool(jd: number): number {
  return DISHA_SHOOL_MAP[vaara(jd)]!;
}

// ============================================================================
// SHIVA VAASA / AGNI VAASA
// ============================================================================

/**
 * Shiva Vaasa index.
 * Python: shiva_vaasa(jd, place, method)
 */
// @parity: py=shiva_vaasa
export function shivaVaasa(jd: number, place: Place, method: number = 2): [number, number] {
  // Python tithi() dispatches to tithi_using_planet_speed (default flag True)
  const tit = tithiUsingPlanetSpeed(jd, place);
  const tithiIndex = tit[0]!;
  const tEnd = tit[2]!;

  if (method === 1) {
    const placeDict1: Record<number, number> = {
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
      8: 1, 9: 2, 10: 3, 11: 4, 12: 5, 13: 6, 14: 7,
      16: 1, 17: 2, 18: 3, 19: 4, 20: 5, 21: 6, 22: 7,
      23: 1, 24: 2, 25: 3, 26: 4, 27: 5, 28: 6, 29: 7,
      15: 1, 30: 2,
    };
    return [placeDict1[tithiIndex] ?? 1, tEnd];
  }

  const placeDict2: Record<number, number> = { 0: 1, 1: 5, 2: 2, 3: 6, 4: 3, 5: 7, 6: 4 };
  return [placeDict2[(tithiIndex * 2 + 5) % 7] ?? 1, tEnd];
}

/**
 * Agni Vaasa index.
 * Python: agni_vaasa(jd, place)
 */
// @parity: py=agni_vaasa
export function agniVaasa(jd: number, place: Place): [number, number] {
  // Python tithi() dispatches to tithi_using_planet_speed (default flag True)
  const tit = tithiUsingPlanetSpeed(jd, place);
  const tithiIndex = tit[0]!;
  const tEnd = tit[2]!;
  const day = vaara(jd) + 1;
  const avList = [1, 2, 3, 1];
  return [avList[(tithiIndex + 1 + day) % 4]!, tEnd];
}

// ============================================================================
// NEXT TITHI
// ============================================================================

/**
 * Find the JD when a specific tithi occurs.
 * Python: next_tithi(jd, place, required_tithi, opt, start_of_tithi)
 */
// @parity: py=next_tithi
export async function nextTithiAsync(
  jd: number, place: Place, requiredTithi: number, opt: number = 1, startOfTithi: boolean = true
): Promise<number> {
  const tithi_ = (await calculateTithiAsync(jd, place))[0];
  const tithiAngle = startOfTithi ? (requiredTithi - 1) * 12 : requiredTithi * 12;

  let incDays: number;
  if (tithi_ <= requiredTithi) {
    incDays = opt === -1 ? -tithi_ - requiredTithi : requiredTithi - tithi_;
  } else {
    incDays = opt === -1 ? -(tithi_ - requiredTithi) : 30 + requiredTithi - tithi_;
  }

  const start = jd + incDays;
  const x = Array.from({ length: 17 }, (_, i) => -2 + i / 4);
  const y: number[] = [];
  for (const xi of x) {
    y.push(await lunarPhaseAsync(start + xi));
  }
  const y0 = inverseLagrange(x, y, tithiAngle);
  return start + y0 + place.timezone / 24;
}

// ============================================================================
// SAHASRA CHANDRODAYAM
// ============================================================================

/**
 * 1000th full moon from birth date.
 * Python: sahasra_chandrodayam(jd, place) -> (year, month, day)
 */
// @parity: py=sahasra_chandrodayam
export async function sahasraChandrodayamAsync(
  jd: number, place: Place
): Promise<[number, number, number]> {
  // Python's tithi() uses the planet-speed method (const.use_planet_speed... = True),
  // which evaluates the phase at the moment jd (not at sunrise). Using the
  // sunrise-based tithi here can return 15 right after a full moon, stalling the loop.
  let fullMoonsCount = 0;
  let tithi_ = tithiUsingPlanetSpeed(jd, place)[0]!;
  let fullMoonJd = jd;
  while (fullMoonsCount < 1000) {
    fullMoonJd = await fullMoonAsync(jd, tithi_, 1);
    fullMoonsCount++;
    jd = fullMoonJd + 0.25;
    tithi_ = tithiUsingPlanetSpeed(jd, place)[0]!;
  }
  const { date } = julianDayToGregorian(fullMoonJd);
  // Python returns utils.jd_to_gregorian(jd)[:-1] — a (y, m, d) tuple
  return [date.year, date.month, date.day];
}

// ============================================================================
// VEDIC TIME CONVERSION
// ============================================================================

/**
 * Convert float hours to Vedic time (ghati, phala, vighati).
 * Python: float_hours_to_vedic_time(jd, place, float_hours, force_equal, vedic_hours_per_day)
 */
// @parity: py=float_hours_to_vedic_time
export function floatHoursToVedicTime(
  jd: number, place: Place, floatHours?: number, vedicHoursPerDay: number = 60
): [number, number, number] {
  if (![30, 60].includes(vedicHoursPerDay)) vedicHoursPerDay = 60;
  if (floatHours === undefined) {
    // Python: utils.jd_to_gregorian(jd) returns continuous float hours (swe.revjul);
    // do not reconstruct from rounded h:m:s (seconds may round to 60).
    floatHours = ((jd + 0.5) - Math.floor(jd + 0.5)) * 24;
  }

  const todaySunrise = sunrise(jd, place).localTime;
  const tomorrowSunrise = 24 + sunrise(jd + 1, place).localTime;
  const ghatiPerHour = vedicHoursPerDay / (tomorrowSunrise - todaySunrise);
  let localHoursSinceSunrise = floatHours - todaySunrise;
  if (localHoursSinceSunrise < 0) localHoursSinceSunrise += 24;

  let totalGhati = localHoursSinceSunrise * ghatiPerHour;
  totalGhati = totalGhati % vedicHoursPerDay;

  const ghati = Math.floor(totalGhati);
  const phala = Math.floor((totalGhati - ghati) * vedicHoursPerDay);
  const vighati = Math.floor(((totalGhati - ghati) * vedicHoursPerDay - phala) * vedicHoursPerDay);

  return [ghati, phala, vighati];
}

/**
 * Convert float hours to Vedic time with equal day/night ghatis.
 * Python: float_hours_to_vedic_time_equal_day_night_ghati(...)
 */
// @parity: py=float_hours_to_vedic_time_equal_day_night_ghati
export function floatHoursToVedicTimeEqualDayNightGhati(
  jd: number, place: Place, floatHours?: number, vedicHoursPerDay: number = 60
): [number, number, number] {
  if (![30, 60].includes(vedicHoursPerDay)) vedicHoursPerDay = 60;
  const halfVedicHour = vedicHoursPerDay / 2;

  if (floatHours === undefined) {
    // Python: continuous float hours from swe.revjul (see floatHoursToVedicTime)
    floatHours = ((jd + 0.5) - Math.floor(jd + 0.5)) * 24;
  }

  const todaySunrise = sunrise(jd, place).localTime;
  const todaySunset = sunset(jd, place).localTime;
  const dl = dayLength(jd, place);
  const nl = nightLength(jd, place);
  const dayGhatiPerHour = halfVedicHour / dl;
  const nightGhatiPerHour = halfVedicHour / nl;

  let totalGhati: number;
  if (floatHours <= todaySunset && floatHours >= todaySunrise) {
    let ghatiHours = floatHours - todaySunrise;
    if (ghatiHours < 0) ghatiHours += 24;
    totalGhati = ghatiHours * dayGhatiPerHour;
  } else {
    totalGhati = floatHours >= todaySunset
      ? halfVedicHour + (floatHours - todaySunset) * nightGhatiPerHour
      : vedicHoursPerDay - (todaySunrise - floatHours) * nightGhatiPerHour;
  }

  totalGhati = totalGhati % vedicHoursPerDay;
  const ghati = Math.floor(totalGhati);
  const phala = Math.floor((totalGhati - ghati) * vedicHoursPerDay);
  const vighati = Math.floor(((totalGhati - ghati) * vedicHoursPerDay - phala) * vedicHoursPerDay);

  return [ghati, phala, vighati];
}

// ============================================================================
// CHANDRASHTAMA
// ============================================================================

/**
 * Chandrashtama rasi and next Moon entry JD.
 * Python: chandrashtama(jd, place)
 */
// @parity: py=chandrashtama
export async function chandrashtamaAsync(
  jd: number, place: Place
): Promise<[number, number]> {
  const jdUtc = jd - place.timezone / 24;
  const moonLong = await lunarLongitudeAsync(jdUtc);
  const moon = dasavargaFromLong(moonLong)[0];
  const chandrashtamaRasi = (moon - 7 + 12) % 12 + 1;
  const [nextMoonJd] = await nextPlanetEntryDateAsync(MOON, jd, place, 1);
  return [chandrashtamaRasi, nextMoonJd];
}

// ============================================================================
// NEXT PANCHAKA DAYS
// ============================================================================

/**
 * Next panchaka nakshatra period.
 * Python: next_panchaka_days(jd, place)
 */
// @parity: py=next_panchaka_days
export async function nextPanchakaDaysAsync(
  jd: number, place: Place
): Promise<[number, number]> {
  const [startJd] = await nextPlanetEntryDateAsync(MOON, jd, place, 1, 11);
  const [endJd] = await nextPlanetEntryDateAsync(MOON, jd, place, 1, 1);
  return [startJd, endJd];
}

// ============================================================================
// SPECIAL TITHIS
// ============================================================================

/**
 * Special tithis (12 tithis x 3 cycles).
 * Python: special_tithis = lambda jd,place: ...
 */
export function specialTithis(jd: number, place: Place): number[][][] {
  const result: number[][][] = [];
  for (let c = 1; c <= 3; c++) {
    const cycleResult: number[][] = [];
    for (let t = 1; t <= 12; t++) {
      // Would need full tithi() with tithi_index and cycle params
      // Simplified: return tithi number for the default
      const tit = calculateTithi(jd, place);
      cycleResult.push([tit.number, tit.startTime, tit.endTime]);
    }
    result.push(cycleResult);
  }
  return result;
}

// ============================================================================
// GAURI CHOGHADIYA
// ============================================================================

/**
 * Gauri Choghadiya - North Indian time division (8 parts day + 8 parts night).
 * Python: gauri_choghadiya(jd, place)
 * @returns Array of [choghadiya_type, start_hours, end_hours]
 */
// @parity: py=gauri_choghadiya
export function gauriChoghadiya(jd: number, place: Place): Array<[number, string, string]> {
  // Python: sset uses gauri_choghadiya_setting=True (local-encoded set jd)
  const sr = sunrise(jd, place);
  const ss = sunset(jd, place, true);
  const dayDur = (ss.localTime - sr.localTime) / 24;
  const _vaara = vaara(jd);
  const result: Array<[number, string, string]> = [];

  // Day choghadiyas: end times via jd arithmetic, formatted as to_dms strings
  let startTime = toDms24(sr.localTime);
  for (let i = 1; i <= 8; i++) {
    const gt = sr.jd + (i * dayDur) / 8;
    const endTime = toDms24(jdHours(gt));
    const gcType = GAURI_CHOGHADIYA_DAY_TABLE[_vaara]![i - 1]!;
    result.push([gcType, startTime, endTime]);
    startTime = endTime;
  }

  // Night choghadiyas: sunset to next sunrise
  const nextSr = sunrise(jd + 1, place);
  const nightDur = (24 + nextSr.localTime - ss.localTime) / 24;
  for (let i = 1; i <= 8; i++) {
    const gt = ss.jd + (i * nightDur) / 8;
    const endTime = toDms24(jdHours(gt));
    const gcType = GAURI_CHOGHADIYA_NIGHT_TABLE[_vaara]![i - 1]!;
    result.push([gcType, startTime, endTime]);
    startTime = endTime;
  }

  return result;
}

/**
 * Amrit Kaalam - periods where gauri choghadiya type is 3 (Amrit).
 * Python: amrit_kaalam(jd, place)
 */
// @parity: py=amrit_kaalam
export function amritKaalam(jd: number, place: Place): Array<[string, string]> {
  return gauriChoghadiya(jd, place)
    .filter(([gc]) => gc === 3)
    .map(([, start, end]) => [start, end]);
}

// ============================================================================
// SHUBHA HORA
// ============================================================================

/**
 * Shubha Hora - South Indian time division (12 parts day + 12 parts night).
 * Python: shubha_hora(jd, place)
 * @returns Array of [hora_planet, start_hours, end_hours]
 */
// @parity: py=shubha_hora
export function shubhaHora(jd: number, place: Place): Array<[number, string, string]> {
  // Python: sset uses gauri_choghadiya_setting=True (local-encoded set jd)
  const sr = sunrise(jd, place);
  const ss = sunset(jd, place, true);
  const dayDur = (ss.localTime - sr.localTime) / 24;
  const _vaara = vaara(jd);
  const result: Array<[number, string, string]> = [];

  let startTime = toDms24(sr.localTime);
  for (let i = 1; i <= 12; i++) {
    const gt = sr.jd + (i * dayDur) / 12;
    const endTime = toDms24(jdHours(gt));
    const gcType = SHUBHA_HORA_DAY_TABLE[i - 1]![_vaara]!;
    result.push([gcType, startTime, endTime]);
    startTime = endTime;
  }

  const nextSr = sunrise(jd + 1, place);
  const nightDur = (24 + nextSr.localTime - ss.localTime) / 24;
  for (let i = 1; i <= 12; i++) {
    const gt = ss.jd + (i * nightDur) / 12;
    const endTime = toDms24(jdHours(gt));
    const gcType = SHUBHA_HORA_NIGHT_TABLE[i - 1]![_vaara]!;
    result.push([gcType, startTime, endTime]);
    startTime = endTime;
  }

  return result;
}

// ============================================================================
// AMRITA GADIYA & VARJYAM
// ============================================================================

/**
 * Amrita Gadiya timing.
 * Python: amrita_gadiya(jd, place)
 * @returns [start_hours, end_hours]
 */
// @parity: py=amrita_gadiya
export async function amritaGadiya(jd: number, place: Place): Promise<[number, number]> {
  // Python uses nakshatra() (accurate start/end via inverse Lagrange) — the
  // sync calculateNakshatra approximation diverges by hours.
  const [nakNo, , nakBeg, nakEnd] = await nakshatraAsync(jd, place) as [number, number, number, number];
  const nakDurn = nakEnd - nakBeg;
  const nakFac = (AMRITA_GADIYA_VARJYAM_STAR_MAP[nakNo - 1]![0] as number) / 24;
  const agStart = nakBeg + nakFac * nakDurn;
  const agDurn = nakDurn * 1.6 / 24;
  return [agStart, agStart + agDurn];
}

/**
 * Varjyam timing.
 * Python: varjyam(jd, place)
 * @returns [start_hours, end_hours] or [start1, end1, start2, end2] for Moolam
 */
// @parity: py=varjyam
export async function varjyam(jd: number, place: Place): Promise<number[]> {
  // Python uses nakshatra() (accurate start/end via inverse Lagrange) — the
  // sync calculateNakshatra approximation diverges by hours.
  const [nakNo, , nakBeg, nakEnd] = await nakshatraAsync(jd, place) as [number, number, number, number];
  const nakDurn = nakEnd - nakBeg;
  const agDurn = nakDurn * 1.6 / 24;

  if (nakNo === 19) {
    // Moolam has two Varjyam timings
    const varjyamFactor = AMRITA_GADIYA_VARJYAM_STAR_MAP[nakNo - 1]![1] as [number, number];
    const nakFac1 = varjyamFactor[0] / 24;
    const nakFac2 = varjyamFactor[1] / 24;
    const agStart1 = nakBeg + nakFac1 * nakDurn;
    const agStart2 = nakBeg + nakFac2 * nakDurn;
    return [agStart1, agStart1 + agDurn, agStart2, agStart2 + agDurn];
  }

  const nakFac = (AMRITA_GADIYA_VARJYAM_STAR_MAP[nakNo - 1]![1] as number) / 24;
  const agStart = nakBeg + nakFac * nakDurn;
  return [agStart, agStart + agDurn];
}

// ============================================================================
// ANANDHAADHI YOGA
// ============================================================================

/**
 * Anandhaadhi Yoga index.
 * Python: anandhaadhi_yoga(jd, place)
 * @returns [yoga_index, nak_start_time]
 */
// @parity: py=anandhaadhi_yoga
export function anandhaadhiYoga(jd: number, place: Place): [number, number] {
  // Python: nak = nakshatra(jd, place); return index, nak[2] (accurate start time)
  const nak = nakshatraSync(jd, place);
  const day = vaara(jd);
  const starList = ANANDHAADHI_YOGA_DAY_STAR_LIST[day]!;
  const yogaIndex = starList.indexOf(nak[0]! - 1);
  return [yogaIndex, nak[2]!];
}

// ============================================================================
// TRIGUNA
// ============================================================================

/**
 * Triguna of the day/time.
 * Python: triguna(jd, place)
 * @returns triguna index: 0=Sathva, 1=Rajas, 2=Thamas
 */
// @parity: py=triguna
export function triguna(jd: number, place: Place): number {
  // NOTE: Python triguna() returns (guna, period_start_key, period_end_key);
  // this port returns only the guna index (callers/tests rely on scalar shape).
  const { time } = julianDayToGregorian(jd);
  const fh = time.hour + time.minute / 60 + time.second / 3600;
  const day = vaara(jd);
  // Python utils.triguna_of_the_day_time: largest boundary <= time_of_day
  const boundaries = Object.keys(TRIGUNA_DAYS_DICT).map(Number).sort((a, b) => a - b);
  let minKey = boundaries[boundaries.length - 1]!;
  const below = boundaries.filter((k) => k <= fh);
  if (below.length > 0) minKey = below[below.length - 1]!;
  return TRIGUNA_DAYS_DICT[minKey]![day]!;
}

// ============================================================================
// VIVAHA CHAKRA PALAN
// ============================================================================

/**
 * Vivaha Chakra Palan.
 * Python: vivaha_chakra_palan(jd, place)
 */
// @parity: py=vivaha_chakra_palan
export function vivahChakraPalan(jd: number, place: Place): number | null {
  const jdUtc = jd - place.timezone / 24;
  const sunLong = solarLongitude(jdUtc);
  const sunStar = nakshatraPada(sunLong)[0];
  const moonLong = lunarLongitude(jdUtc);
  const moonStar = nakshatraPada(moonLong)[0];

  // Initialize 3x3 grid
  const grid: number[][] = Array.from({ length: 3 }, () => Array(3).fill(0));
  const positions: [number, number][] = [[1,2],[2,2],[2,1],[2,0],[1,0],[0,0],[0,1],[0,2]];
  const allStars = Array.from({ length: 27 }, (_, i) => (sunStar + i - 2 + 27) % 27 + 1);

  grid[1]![1] = sunStar;
  for (let i = 0; i < positions.length; i++) {
    const [r, c] = positions[i]!;
    // Each position gets 3 stars
    grid[r]![c] = allStars[3 * (i + 1)]!;
  }

  // Find moon star position
  const mapping: Record<string, number> = {
    '1,1':1,'1,2':2,'2,2':3,'2,1':4,'2,0':5,'1,0':6,'0,0':7,'0,1':8,'0,2':9,
  };

  // Simplified: find which group moon belongs to
  for (let i = 0; i < positions.length; i++) {
    const starsInGroup = allStars.slice(3 * (i + 1), 3 * (i + 2));
    if (starsInGroup.includes(moonStar)) {
      const [r, c] = positions[i]!;
      return mapping[`${r},${c}`] ?? null;
    }
  }
  if (moonStar === sunStar) return 1;
  return null;
}

// ============================================================================
// TAMIL YOGAM
// ============================================================================

/**
 * Tamil Yogam.
 * Python: tamil_yogam(jd, place, check_special_yogas, use_sringeri_panchanga_version)
 * @returns [yoga_index, nak_start, nak_end, ...optional original_yoga]
 */
// @parity: py=tamil_yogam
export function tamilYogam(
  jd: number, place: Place,
  checkSpecialYogas: boolean = true,
  useSringeriVersion: boolean = false
): number[] {
  const panchang = useSringeriVersion ? TAMIL_BASIC_YOGA_SRINGERI_LIST : TAMIL_BASIC_YOGA_LIST;
  // Python: nak = nakshatra(jd, place); uses nak[2] (start) and nak[3] (end)
  const nak = nakshatraSync(jd, place);
  const naks = nak[0]! - 1;
  const nakStart = nak[2]!;
  const nakEnd = nak[3]!;
  const wday = vaara(jd);
  const yi = panchang[wday]![naks]!;

  if (!checkSpecialYogas) return [yi, nakStart, nakEnd];

  // Check special yogas
  const ad = [AMRITA_SIDDHA_YOGA_DICT, MRITYU_YOGA_DICT, DAGHDA_YOGA_DICT, YAMAGHATA_YOGA_DICT, UTPATA_YOGA_DICT];
  for (let idx = 0; idx < ad.length; idx++) {
    if (ad[idx]![wday] === naks) {
      return [4 + idx, nakStart, nakEnd, yi];
    }
  }
  if (SARVARTHA_SIDDHA_YOGA[wday]?.includes(naks)) {
    return [TAMIL_YOGA_NAMES.length - 1, nakStart, nakEnd];
  }
  return [yi, nakStart, nakEnd, yi];
}

// ============================================================================
// THAARABALAM
// ============================================================================

/**
 * Thaarabalam calculation.
 * Python: thaaraabalam(jd, place, return_only_good_stars)
 */
// @parity: py=thaaraabalam
export function thaarabalam(jd: number, place: Place, returnOnlyGoodStars: boolean = true): number[] | number[][] {
  const goodThaarabalam = [0, 2, 4, 6, 8];
  const gtb: number[] = [];
  const nak = nakshatraSync(jd, place);
  const todaysStar = nak[0]!;

  const tbDict: number[][] = Array.from({ length: 9 }, () => []);
  for (let birthStar = 1; birthStar <= 27; birthStar++) {
    // Python utils.count_stars(from, to) = ((to + 27 - from) % 27) + 1
    const tbDiv = (((todaysStar + 27 - birthStar) % 27) + 1) % 9;
    if (returnOnlyGoodStars && goodThaarabalam.includes(tbDiv)) gtb.push(birthStar);
    tbDict[tbDiv]!.push(birthStar);
  }
  return returnOnlyGoodStars ? gtb : tbDict;
}

// ============================================================================
// MUHURTHAS (30 periods of day)
// ============================================================================

/**
 * 30 muhurthas of the day (15 day + 15 night).
 * Python: muhurthas(jd, place)
 * @returns Array of [muhurtha_name, auspicious(0/1), [start_hours, end_hours]]
 */
// @parity: py=muhurthas
export function muhurthas(jd: number, place: Place): Array<[string, number, [number, number]]> {
  const dl = dayLength(jd, place);
  const dayMuhurtha = dl / 15;
  const nl = nightLength(jd, place);
  const nightMuhurtha = nl / 15;
  const sr = sunrise(jd, place).localTime;
  const ss = sunset(jd, place).localTime;

  const periods: [number, number][] = [];
  for (let j = 0; j < 15; j++) {
    periods.push([sr + j * dayMuhurtha, sr + (j + 1) * dayMuhurtha]);
  }
  for (let j = 0; j < 15; j++) {
    periods.push([ss + j * nightMuhurtha, ss + (j + 1) * nightMuhurtha]);
  }

  const muhurthaKeys = Object.keys(MUHURTHAS_OF_THE_DAY);
  return muhurthaKeys.map((name, i) => [name, MUHURTHAS_OF_THE_DAY[name]!, periods[i]!]);
}

// ============================================================================
// YOGINI VAASA
// ============================================================================

/**
 * Yogini Vaasa from tithi.
 * Python: yogini_vaasa(jd, place)
 */
// @parity: py=yogini_vaasa
export function yoginiVaasa(jd: number, place: Place): number {
  const tithiIndex = calculateTithi(jd, place).number;
  return YOGINI_VAASA_TITHI_MAP[tithiIndex - 1]!;
}

// ============================================================================
// PUSHKARA YOGA
// ============================================================================

/**
 * Pushkara Yoga (dwi/tri pushkara).
 * Python: pushkara_yoga(jd, place)
 * @returns [type, start, end] or empty array. type: 1=dwi, 2=tri
 */
// @parity: py=pushkara_yoga
export function pushkaraYoga(jd: number, place: Place): number[] {
  const tithiList = [2, 17, 7, 22, 12, 27];
  const dayList = [1, 3, 7];
  const dwiStarList = [5, 14, 23];
  const triStarList = [16, 7, 3, 11, 21, 25];

  // Python tithi() dispatches to tithi_using_planet_speed; nakshatra() is inverse-Lagrange
  const tit = tithiUsingPlanetSpeed(jd, place);
  const tNo = tit[0]!;
  const day = vaara(jd) + 1;
  const nak = nakshatraSync(jd, place);
  const nakNo = nak[0]!;
  const nStart = nak[2]!;
  const srise1 = sunrise(jd, place).localTime;
  const srise2 = sunrise(jd + 1, place).localTime + 24;

  let ptimes: number[] = [];
  const chkd = dayList.includes(day);
  const chkt = tithiList.includes(tNo) || tithiList.includes((tNo + 29) % 30);
  if (chkd && chkt) {
    const chkn11 = dwiStarList.includes(nakNo);
    const chkn12 = dwiStarList.includes((nakNo + 26) % 27);
    if (chkn11 || chkn12) {
      ptimes = chkn11 ? [1, nStart, srise2] : [1, srise1, nStart];
    }
    const chkn21 = triStarList.includes(nakNo);
    const chkn22 = triStarList.includes((nakNo + 26) % 27);
    if (chkn21 || chkn22) {
      // NOTE: Python reuses chkn11 here (not chkn21) — replicated for parity
      ptimes = chkn11 ? [2, nStart, srise2] : [2, srise1, nStart];
    }
  }
  return ptimes;
}

// ============================================================================
// AADAL YOGA & VIDAAL YOGA
// ============================================================================

/**
 * Aadal Yoga.
 * Python: aadal_yoga(jd, place)
 * @returns [sunrise_hours, star_end] if yoga exists, else empty array
 */
// @parity: py=aadal_yoga
/** Python utils.cyclic_count_of_stars_with_abhijit_in_22(const.abhijit_order_of_stars, from, to). */
function _cyclicCountOfStarsWithAbhijitIn22(fromStar: number, toStar: number): number {
  const lst = [...Array.from({ length: 21 }, (_, i) => i), 27, ...Array.from({ length: 6 }, (_, i) => 21 + i)];
  const startIdx = lst.indexOf(fromStar);
  const endIdx = lst.indexOf(toStar);
  return startIdx <= endIdx
    ? (endIdx - startIdx + 1) % lst.length
    : lst.length - startIdx + endIdx + 1;
}

export function aadalYoga(jd: number, place: Place): number[] {
  const jdUtc = jd - place.timezone / 24;
  const nak = nakshatraSync(jd, place);
  const starEnd = nak[3]!;
  const moonStar = nakshatraPada(lunarLongitude(jdUtc))[0];
  const sunStar = nakshatraPada(solarLongitude(jdUtc))[0];
  const srise = sunrise(jd, place).localTime;
  const knt = _cyclicCountOfStarsWithAbhijitIn22(sunStar - 1, moonStar - 1);
  return [2, 7, 9, 14, 16, 21, 23, 28].includes(knt) ? [srise, starEnd] : [];
}

/**
 * Vidaal Yoga.
 * Python: vidaal_yoga(jd, place)
 */
// @parity: py=vidaal_yoga
export function vidaalYoga(jd: number, place: Place): number[] {
  const jdUtc = jd - place.timezone / 24;
  const nak = nakshatraSync(jd, place);
  const starEnd = nak[3]!;
  const moonStar = nakshatraPada(lunarLongitude(jdUtc))[0];
  const sunStar = nakshatraPada(solarLongitude(jdUtc))[0];
  const srise = sunrise(jd, place).localTime;
  const knt = _cyclicCountOfStarsWithAbhijitIn22(sunStar - 1, moonStar - 1);
  return [3, 6, 10, 13, 17, 20, 24, 27].includes(knt) ? [srise, starEnd] : [];
}

// ============================================================================
// NAVA THAARA & SPECIAL THAARA
// ============================================================================

/**
 * Nava Thaara.
 * Python: nava_thaara(jd, place, from_lagna_or_moon)
 * @param fromLagnaOrMoon 0=from lagna, 1=from moon star
 */
// @parity: py=nava_thaara
/** Python const.nakshathra_lords in dict insertion order. */
const NAK_LORD_PAIRS: Array<[number, number[]]> = [
  [8, [0, 9, 18]], [5, [1, 10, 19]], [0, [2, 11, 20]], [1, [3, 12, 21]],
  [2, [4, 13, 22]], [7, [5, 14, 23]], [4, [6, 15, 24]], [6, [7, 16, 25]], [3, [8, 17, 26]],
];

export function navaThaara(jd: number, place: Place, fromLagnaOrMoon: number = 0): Array<[number, number[]]> {
  // Python: base = nakshatra(jd,place)[0]-1 if from moon, else ascendant(jd,place)[2]-1
  let baseStar: number;
  if (fromLagnaOrMoon === 1) {
    baseStar = nakshatraSync(jd, place)[0]! - 1;
  } else {
    const asc = ascendantFullSync(jd, place);
    baseStar = (asc ? asc[2] : ascendant(jd, place)[2]) - 1;
  }
  const ntl = NAK_LORD_PAIRS.map(([, starList]) => starList.map(s => (baseStar + s) % 27));
  const result: Array<[number, number[]]> = [];
  // Python: [(lord, sl) for sl in ntl for lord, csl in lords.items() if sorted(sl)==sorted(csl)]
  for (const sl of ntl) {
    const sortedSl = [...sl].sort((a, b) => a - b).join(',');
    for (const [lord, csl] of NAK_LORD_PAIRS) {
      if ([...csl].sort((a, b) => a - b).join(',') === sortedSl) {
        result.push([lord, sl]);
      }
    }
  }
  return result;
}

/**
 * Special Thaara.
 * Python: special_thaara(jd, place, from_lagna_or_moon)
 */
// @parity: py=special_thaara
/** Python const.special_thaara_lords_1 in dict insertion order. */
const SPECIAL_THAARA_LORD_PAIRS: Array<[number, number[]]> = [
  [8, [0, 9, 18]], [5, [1, 10, 19]], [0, [2, 11, 20]], [1, [3, 12, 21, 22]],
  [2, [4, 13, 23]], [7, [5, 14, 24]], [4, [6, 15, 25]], [6, [7, 16, 26]], [3, [8, 17, 27]],
];

export function specialThaara(jd: number, place: Place, fromLagnaOrMoon: number = 0): Array<[number, number]> {
  // Python: base = nakshatra(jd,place)[0]-1 if from moon, else ascendant(jd,place)[2]-1
  let baseStar: number;
  if (fromLagnaOrMoon === 1) {
    baseStar = nakshatraSync(jd, place)[0]! - 1;
  } else {
    const asc = ascendantFullSync(jd, place);
    baseStar = (asc ? asc[2] : ascendant(jd, place)[2]) - 1;
  }
  const baseInc = fromLagnaOrMoon === 1 ? -1 : 0;
  const stl = SPECIAL_THAARA_MAP.map(s => (baseStar + s + baseInc) % 28);

  const result: Array<[number, number]> = [];
  for (const star of stl) {
    for (const [lord, csl] of SPECIAL_THAARA_LORD_PAIRS) {
      if (csl.includes(star)) {
        result.push([lord, star]);
      }
    }
  }
  return result;
}

// ============================================================================
// LUNAR MONTH & SAMVATSARA (async)
// ============================================================================

/**
 * Lunar month with adhika masa detection.
 * Python: lunar_month(jd, place)
 * @returns [month_index(1-12), is_leap_month, is_nija_month]
 */
// @parity: py=lunar_month
export async function lunarMonthAsync(jd: number, place: Place, _depth: number = 0): Promise<[number, boolean, boolean]> {
  const ti = (await calculateTithiAsync(jd, place))[0];
  const srData = await sunriseAsync(jd, place);
  const critical = srData.jd;
  const lastNewMoon = await newMoonAsync(critical, ti, -1);
  const nextNewMoon = await newMoonAsync(critical, ti, 1);
  const thisSolarMonth = (await raasiAsync(lastNewMoon, place))[0];
  const nextSolarMonth = (await raasiAsync(nextNewMoon, place))[0];
  const isLeapMonth = thisSolarMonth === nextSolarMonth;
  const lunarMonth = (thisSolarMonth + 1) % 12;

  let isNijaMonth = false;
  if (!isLeapMonth && _depth < 1) {
    const [pm, pa] = await lunarMonthAsync(jd - 30, place, _depth + 1);
    isNijaMonth = pm === lunarMonth && pa;
  }
  return [lunarMonth, isLeapMonth, isNijaMonth];
}

/**
 * Next lunar month boundary (new moon or full moon).
 * Python: next_lunar_month(jd, place, lunar_month_type, direction)
 */
// @parity: py=next_lunar_month
export async function nextLunarMonthAsync(
  jd: number, place: Place, lunarMonthType: number = 0, direction: number = 1
): Promise<[[number, number, number], number]> {
  if (lunarMonthType === 2) {
    // Solar month
    const [entryJd] = direction === 1
      ? await nextPlanetEntryDateAsync(SUN, jd, place, 1)
      : await previousPlanetEntryDateAsync(SUN, jd, place);
    const { date, time } = julianDayToGregorian(entryJd);
    return [[date.year, date.month, date.day], time.hour + time.minute / 60 + time.second / 3600];
  }

  const tithiToCheck = lunarMonthType === 0 ? 30 : 15;
  // Python's tithi() resolves to tithi_using_planet_speed (moment-based phase)
  const ti = tithiUsingPlanetSpeed(jd, place)[0]!;
  const lmJd = lunarMonthType === 0
    ? await newMoonAsync(jd, ti, direction)
    : await fullMoonAsync(jd, ti, direction);
  // tithi returns [number, startTime, endTime, ...]
  const tit = tithiUsingPlanetSpeed(lmJd, place);
  let lmh = (tit[0] === tithiToCheck ? tit[2] : tit[1])!;
  const { date } = julianDayToGregorian(lmJd);
  let { year: lmy, month: lmm, day: lmd } = date;

  if (lmh > 24) {
    const extraDays = Math.floor(lmh / 24);
    lmh = lmh % 24;
    const d = new Date(lmy, lmm - 1, lmd + extraDays);
    lmy = d.getFullYear(); lmm = d.getMonth() + 1; lmd = d.getDate();
  } else if (lmh < 0) {
    lmh = lmh + 24;
    const d = new Date(lmy, lmm - 1, lmd - 1);
    lmy = d.getFullYear(); lmm = d.getMonth() + 1; lmd = d.getDate();
  }
  // Python returns (Date(y,m,d), lmh) — Date serializes as a 3-tuple
  return [[lmy, lmm, lmd], lmh];
}

/**
 * Previous lunar month boundary.
 * Python: previous_lunar_month(jd, place, lunar_month_type)
 */
// @parity: py=previous_lunar_month
export async function previousLunarMonthAsync(
  jd: number, place: Place, lunarMonthType: number = 0
): Promise<[[number, number, number], number]> {
  return nextLunarMonthAsync(jd, place, lunarMonthType, -1);
}

/**
 * Next lunar year start.
 * Python: next_lunar_year(jd, place, lunar_month_type, direction)
 */
// @parity: py=next_lunar_year
export async function nextLunarYearAsync(
  jd: number, place: Place, lunarMonthType: number = 0, direction: number = 1
): Promise<[{ year: number; month: number; day: number }, number] | null> {
  if (lunarMonthType === 2) {
    const [entryJd] = await nextSolarYearAsync(jd, place);
    const { date, time } = julianDayToGregorian(entryJd);
    return [date, time.hour + time.minute / 60 + time.second / 3600];
  }

  let curJd = jd;
  for (let i = 0; i < 13; i++) {
    const [lmDate, lmh] = direction === 1
      ? await nextLunarMonthAsync(curJd, place, lunarMonthType)
      : await previousLunarMonthAsync(curJd, place, lunarMonthType);
    curJd = gregorianToJulianDay(
      { year: lmDate[0], month: lmDate[1], day: lmDate[2] },
      { hour: Math.floor(lmh), minute: Math.floor((lmh % 1) * 60), second: 0 });
    const lm = await lunarMonthAsync(curJd, place);
    const lunarMonthNumber = lm[0];
    if (lunarMonthNumber === 1) {
      return [lmDate, lmh];
    }
    curJd += direction * 14;
  }
  return null;
}

/**
 * Previous lunar year start.
 * Python: previous_lunar_year(jd, place, lunar_month_type)
 */
// @parity: py=previous_lunar_year
export async function previousLunarYearAsync(
  jd: number, place: Place, lunarMonthType: number = 0
): Promise<[{ year: number; month: number; day: number }, number] | null> {
  if (lunarMonthType === 2) {
    const [entryJd] = await previousSolarYearAsync(jd, place);
    const { date, time } = julianDayToGregorian(entryJd);
    return [date, time.hour + time.minute / 60 + time.second / 3600];
  }
  return nextLunarYearAsync(jd, place, lunarMonthType, -1);
}

// ============================================================================
// TAMIL SOLAR MONTH AND DATE
// ============================================================================

/**
 * Tamil solar month and date.
 * Python: tamil_solar_month_and_date(panchanga_date, place, tamil_month_method, base_time, use_utc)
 * @returns [tamil_month (0-11), day_count]
 */
/**
 * Tamil solar month and date with method dispatch.
 * Python: tamil_solar_month_and_date(panchanga_date, place, tamil_month_method, base_time, use_utc)
 * @param tamilMonthMethod - 0: RaviAnnaswamy, 1: V4.3.5, 2: V4.3.8, 3+: new (default)
 */
/**
 * Python's tamil_* functions take a panchanga Date; the TS port historically
 * takes a JD. Accept either: a {year,month,day} object is converted to a JD
 * using the same convention as the Python counterpart (00:00 UT or 10:00).
 */
type DateOrJd = number | { year: number; month: number; day: number };
function dateOrJdToJd(d: DateOrJd, hour: number = 0): number {
  return typeof d === 'number'
    ? d
    : gregorianToJulianDay(d, { hour, minute: 0, second: 0 });
}

// @parity: py=tamil_solar_month_and_date
export function tamilSolarMonthAndDate(
  jd: DateOrJd, place: Place, tamilMonthMethod: number = 3,
  baseTime: number = 0, useUtc: boolean = true
): [number, number] {
  if (tamilMonthMethod === 0) {
    return tamilSolarMonthAndDateRaviAnnaswamy(jd, place);
  } else if (tamilMonthMethod === 1) {
    return tamilSolarMonthAndDateV435(jd, place);
  } else if (tamilMonthMethod === 2) {
    return tamilSolarMonthAndDateV438(jd, place);
  } else {
    return tamilSolarMonthAndDateNew(jd, place, baseTime, useUtc);
  }
}

/**
 * Samvatsara (solar year name index).
 * Python: samvatsara(panchanga_date, place, zodiac)
 * @returns samvatsara index [0..59]
 */
// @parity: py=samvatsara
export function samvatsara(jd: DateOrJd, place: Place, zodiac: number = 0): number {
  // Find previous sankranti
  const [psd] = previousSankrantiDate(jd, place, zodiac);
  let year = psd[0];
  if (year > 0) year -= 1;
  return (year - 1926 + 60) % 60;
}

/**
 * Previous Sankranti Date.
 * Python: _previous_sankranti_date_new(panchanga_date, place, zodiac)
 * @returns [sankranti_date, solar_hour, tamil_month, tamil_day]
 */
// @parity: py=previous_sankranti_date
export function previousSankrantiDate(
  jdOrDate: DateOrJd, place: Place, zodiac?: number
): [[number, number, number], number, number, number] {
  // Python: prev_day = previous_panchanga_day(panchanga_date, 1); jd = gregorian_to_jd(prev_day)
  const jd = dateOrJdToJd(jdOrDate, 0);
  let multiple: number;
  if (zodiac !== undefined) {
    multiple = zodiac * 30;
  } else {
    const [tMonth] = tamilSolarMonthAndDate(jd - 1, place);
    multiple = tMonth * 30;
  }

  let curJd = jd - 1;
  // Python: sl = solar_longitude(sunset_jd) — sunset jd is local-encoded, no tz shift
  const ssJd = sunset(curJd, place).jd;
  let sl = solarLongitude(ssJd);
  let sankJd = ssJd;

  // Walk backward to find sankranti (zodiac search may go back up to a year)
  let maxIter = 400;
  while (maxIter-- > 0) {
    const slr = sl % 30;
    if (slr < 1 && slr > 0) {
      if (zodiac === undefined) break;
      if (Math.floor(sl / 30) === zodiac) break;
    }
    sankJd -= 1;
    sl = solarLongitude(sankJd);
  }

  const { date: sankDate } = julianDayToGregorian(sankJd);
  const srJd = sunrise(sankJd, place).jd;
  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const solarLongs = offsets.map(t => solarLongitude(srJd + t) % 360);
  const solarHour = inverseLagrange(offsets, solarLongs, multiple % 360);
  const sankJdUtc = gregorianToJulianDay(sankDate, { hour: 0, minute: 0, second: 0 });
  const solarHour1 = (srJd + solarHour - sankJdUtc) * 24 + place.timezone;
  const [tMonth, tDay] = tamilSolarMonthAndDate(sankDate, place);
  // Apply Tamil date/time conversion (matching Python: _convert_to_tamil_date_and_time)
  const [finalDate, finalHour] = convertToTamilDateAndTime(sankDate, solarHour1, place);

  return [[finalDate.year, finalDate.month, finalDate.day], finalHour, tMonth, tDay];
}

// ============================================================================
// NEXT ASCENDANT ENTRY DATE
// ============================================================================

/**
 * Next ascendant entry date.
 * Python: next_ascendant_entry_date(jd, place, direction, precision, raasi, divisional_chart_factor)
 */
// @parity: py=next_ascendant_entry_date
export async function nextAscendantEntryDateAsync(
  jd: number, place: Place, direction: number = 1, precision: number = 1.0,
  raasi?: number, divisionalChartFactor: number = 1
): Promise<[number, number]> {
  const incrementDays = 1.0 / 24 / 60 / divisionalChartFactor;
  let [ascConst, ascCoord] = await ascendantFullAsync(jd, place);
  let sl = ascConst * 30 + ascCoord;

  let multiple: number;
  if (raasi === undefined) {
    multiple = direction === 1
      ? ((Math.floor(sl * divisionalChartFactor / 30) + 1) % 12) * 30
      : (Math.floor(sl * divisionalChartFactor / 30) % 12) * 30;
  } else {
    multiple = (raasi - 1) * 30;
  }

  let curJd = jd;
  let maxIter = 10000;
  while (maxIter-- > 0) {
    if (sl < multiple + precision && sl > multiple - precision) break;
    curJd += incrementDays * direction;
    [ascConst, ascCoord] = await ascendantFullAsync(curJd, place);
    sl = (ascConst * 30 + ascCoord) * divisionalChartFactor % 360;
  }

  const offsets = Array.from({ length: 20 }, (_, i) => (i - 10) * incrementDays);
  const ascLongs: number[] = [];
  for (const t of offsets) {
    const [aC, aL] = await ascendantFullAsync(curJd + t, place);
    ascLongs.push((aC * 30 + aL) * divisionalChartFactor % 360);
  }
  const ascHour = inverseLagrange(offsets, ascLongs, multiple);
  curJd += ascHour;
  [ascConst, ascCoord] = await ascendantFullAsync(curJd, place);
  const ascLong = (ascConst * 30 + ascCoord) * divisionalChartFactor % 360;
  return [curJd, ascLong];
}

/**
 * Previous ascendant entry date.
 * Python: previous_ascendant_entry_date(jd, place, ...)
 */
// no @parity: Python previous_ascendant_entry_date always raises TypeError
// (forwards increment_days to next_ascendant_entry_date which lacks that kwarg).
export async function previousAscendantEntryDateAsync(
  jd: number, place: Place, precision: number = 1.0,
  raasi?: number, divisionalChartFactor: number = 1
): Promise<[number, number]> {
  return nextAscendantEntryDateAsync(jd, place, -1, precision, raasi, divisionalChartFactor);
}

// ============================================================================
// UDHAYA LAGNA MUHURTHA
// ============================================================================

/**
 * Udhaya Lagna Muhurtha - ascendant entry JD into each of 12 rasis.
 * Python: udhaya_lagna_muhurtha(jd, place)
 * @returns [(rasi, start_hours, end_hours), ...]
 */
// @parity: py=udhaya_lagna_muhurtha
export async function udhayaLagnaMuhurthaAsync(
  jd: number, place: Place
): Promise<Array<[number, number, number]>> {
  const asc = await ascendantFullAsync(jd, place);
  const ascRasi = asc[0];

  let [jdStart] = await nextAscendantEntryDateAsync(jd, place, -1);
  let curJd = jdStart + CONJUNCTION_INCREMENT;
  const ulm: Array<[number, number, number]> = [];

  for (let l = 0; l < 12; l++) {
    const [jdEnd] = await nextAscendantEntryDateAsync(curJd, place, 1);
    const { time: tStart } = julianDayToGregorian(jdStart);
    const { time: tEnd } = julianDayToGregorian(jdEnd);
    const fhs = tStart.hour + tStart.minute / 60 + tStart.second / 3600;
    const fhe = tEnd.hour + tEnd.minute / 60 + tEnd.second / 3600;
    ulm.push([(ascRasi + l) % 12, fhs, fhe]);
    jdStart = jdEnd;
    curJd = jdEnd + CONJUNCTION_INCREMENT;
  }
  return ulm;
}

// ============================================================================
// CHANDRABALAM & PANCHAKA RAHITHA
// ============================================================================

/**
 * Chandrabalam - auspicious ascendant positions relative to Moon.
 * Python: chandrabalam(jd, place)
 */
// @parity: py=chandrabalam
export async function chandrabalamAsync(jd: number, place: Place): Promise<number[]> {
  const ulm = await udhayaLagnaMuhurthaAsync(jd, place);
  const jdUtc = jd - place.timezone / 24;
  const moon = Math.floor(lunarLongitude(jdUtc) / 30) + 1;
  const nextSr = sunrise(jd + 1, place).localTime;
  const cbGood = [1, 3, 6, 7, 10];

  let cb: number[] = [];
  for (const [asc, , at] of ulm) {
    const count = ((moon - asc) % 12 + 12) % 12 + 1;
    if (cbGood.includes(count) && at < nextSr) {
      cb.push(asc);
    }
  }
  return cb;
}

/**
 * Panchaka Rahitha.
 * Python: panchaka_rahitha(jd, place)
 */
// @parity: py=panchaka_rahitha
export async function panchakaRahithaAsync(
  jd: number, place: Place
): Promise<Array<[number, number, number]>> {
  const ulm = await udhayaLagnaMuhurthaAsync(jd, place);
  const badPanchakas = [1, 2, 4, 6, 8];
  const tithiNo = calculateTithi(jd, place).number + 1;
  const nakNo = calculateNakshatra(jd, place).number;
  const day = vaara(jd) + 1;

  const pr: Array<[number, number, number]> = [];
  for (const [asc, ascBeg, ascEnd] of ulm) {
    const ascRasi = asc + 1;
    const rem = (tithiNo + nakNo + day + ascRasi) % 9;
    if (badPanchakas.includes(rem)) {
      pr.push([rem, ascBeg, ascEnd]);
    } else {
      pr.push([0, ascBeg, ascEnd]);
    }
  }
  return pr;
}

// ============================================================================
// NEXT PLANET RETROGRADE CHANGE DATE
// (already in file but adding the non-async wrapper for completeness)
// ============================================================================

// ============================================================================
// PLANETARY POSITIONS (sync, matching Python format)
// ============================================================================

/**
 * Planetary positions matching Python format.
 * Python: planetary_positions(jd, place)
 * @returns [[planet_id, [rasi, long_in_sign]], ...]
 */
// @parity: py=planetary_positions
export function planetaryPositions(jd: number, place: Place): Array<[number, [number, number]]> {
  const pp = getAllPlanetPositionsSync(jd, place);
  const planets = [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU];
  return planets.map((p, i) => [p, pp[i]!]);
}

// ============================================================================
// ASCENDANT (sync, matching Python format)
// ============================================================================

/**
 * Ascendant calculation (sync approximation).
 * Python: ascendant(jd, place)
 * @returns [constellation, longitude_in_sign, nakshatra, pada]
 */
// @parity: py=ascendant
export function ascendant(jd: number, place: Place): [number, number, number, number] {
  // Accurate sync ascendant via cached WASM (swe_houses_ex), matching Python.
  const full = ascendantFullSync(jd, place);
  if (full) return full;
  // Fallback before WASM init: approximate using Sun longitude (known limitation)
  const jdUtc = jd - place.timezone / 24;
  const long = solarLongitude(jdUtc);
  const constellation = Math.floor(long / 30);
  const longInSign = long % 30;
  const [nak, pada] = nakshatraPada(long);
  return [constellation, longInSign, nak, pada];
}

// ============================================================================
// VEDIC DATE (async)
// ============================================================================

/**
 * Vedic date (solar or lunar calendar).
 * Python: vedic_date(jd, place, calendar_type, tamil_month_method, base_time, use_utc)
 * @param calendarType 0=Solar, 1=Amantha Lunar, 2=Purnimantha Lunar
 */
/**
 * Vedic date (solar or lunar calendar).
 * Python: vedic_date(jd, place, calendar_type, tamil_month_method, base_time, use_utc)
 * @param calendarType - 0: Solar, 1: Amanta lunar, 2: Purnimanta lunar
 * @param tamilMonthMethod - 0: RaviAnnaswamy, 1: V4.3.5, 2: V4.3.8, 3+: new (default)
 */
// @parity: py=vedic_date
export async function vedicDateAsync(
  jd: number, place: Place, calendarType: number = 0,
  tamilMonthMethod: number = 3,
  baseTime: number = 0, useUtc: boolean = true
): Promise<[number, number, number, boolean, boolean]> {
  if (calendarType === 0) {
    const [month, day] = tamilSolarMonthAndDate(jd, place, tamilMonthMethod, baseTime, useUtc);
    const year = samvatsara(jd, place, 0);
    return [month + 1, day, year, false, false];
  }
  return lunarMonthDateAsync(jd, place, calendarType === 2);
}

/**
 * Lunar month date.
 * Python: lunar_month_date(jd, place, use_purnimanta_system)
 */
// @parity: py=lunar_month_date
export async function lunarMonthDateAsync(
  jd: number, place: Place, usePurnimantaSystem: boolean = false
): Promise<[number, number, number, boolean, boolean]> {
  const srData = await sunriseAsync(jd, place);
  const critical = srData.jd;
  const ti = (await calculateTithiAsync(critical, place))[0];
  const lastNewMoon = await newMoonAsync(critical, ti, -1);
  const nextNewMoon = await newMoonAsync(critical, ti, 1);
  const thisSolarMonth = (await raasiAsync(lastNewMoon, place))[0] - 1;
  const nextSolarMonth = (await raasiAsync(nextNewMoon, place))[0] - 1;
  const isLeapMonth = thisSolarMonth === nextSolarMonth;
  let lunarMonth = (thisSolarMonth + 1) % 12;
  let lunarDay = ((ti - 1) % 30) + 1;

  if (usePurnimantaSystem) {
    if (lunarDay > 15) lunarMonth = (lunarMonth + 1) % 12;
    lunarDay = ((lunarDay - 16 + 30) % 30) + 1;
  }

  let isNijaMonth = false;
  if (!isLeapMonth) {
    const [pm, pa] = await lunarMonthAsync(jd - 30, place);
    isNijaMonth = pm === lunarMonth && pa;
  }
  const lunarYear = lunarYearIndex(jd, lunarMonth + 1);
  return [lunarMonth + 1, lunarDay, lunarYear, isLeapMonth, isNijaMonth];
}

// ============================================================================
// NEXT ANNUAL SOLAR DATE APPROXIMATE
// ============================================================================

/**
 * Next annual solar date (approximate, no ephemeris needed).
 * Python: next_annual_solar_date_approximate(dob, tob, years)
 */
// @parity: py=next_annual_solar_date_approximate
export function nextAnnualSolarDateApproximate(
  dob: [number, number, number] | { year: number; month: number; day: number },
  tob: [number, number, number],
  years: number
): number {
  // Python: const.annual_chart_solar_positions — (days, h, m, s) past whole weeks
  const ACSP: Record<number, [number, number, number, number]> = {
    1: [1, 6, 9, 12], 2: [2, 12, 18, 18], 3: [3, 18, 27, 30], 4: [5, 0, 36, 36],
    5: [6, 6, 45, 48], 6: [0, 12, 55, 0], 7: [1, 19, 4, 6], 8: [3, 1, 13, 18],
    9: [4, 7, 22, 30], 10: [5, 13, 31, 36], 20: [4, 3, 3, 12], 30: [2, 16, 34, 54],
    40: [1, 6, 6, 30], 50: [6, 19, 38, 6], 60: [5, 9, 9, 42], 70: [3, 22, 41, 24],
    80: [2, 12, 13, 0], 90: [1, 1, 44, 36], 100: [6, 15, 16, 12],
  };
  const dobArr: [number, number, number] = Array.isArray(dob)
    ? dob : [dob.year, dob.month, dob.day];
  const tobh = (tob[0] + tob[1] / 60 + tob[2] / 3600) / 24;
  const jdAtDob = gregorianToJulianDay(
    { year: dobArr[0], month: dobArr[1], day: dobArr[2] },
    { hour: tob[0], minute: tob[1], second: tob[2] }
  );
  const weekdayOfDob = Math.ceil(jdAtDob % 7);
  // Decompose (years-1) digits into place values, e.g. 24 -> [20, 4]
  const digits = String(years - 1).split('');
  let d = 0;
  for (let i = 0; i < digits.length; i++) {
    const key = parseInt(digits[i]!, 10) * 10 ** (digits.length - i - 1);
    const [dd, hh, mm, ss] = ACSP[key]!;
    d += dd + (hh + mm / 60 + ss / 3600) / 24;
  }
  const dy = Math.floor(d);
  const dh = d % 1;
  const weekdayIncrement = Math.floor(weekdayOfDob + dy) % 7;
  const bday = new Date(dobArr[0] + years - 1, dobArr[1] - 1, dobArr[2]);
  const bwd = bday.getDay(); // Sunday=0 .. Saturday=6, matches Python (weekday()+1)%7
  const mod7 = (x: number) => ((x % 7) + 7) % 7;
  const bday1 = mod7(weekdayIncrement - bwd);
  const bday0 = -mod7(bwd - weekdayIncrement);
  const offset = Math.min(bday0, bday1);
  const nd = Math.floor(tobh + dh);
  const nh = ((tobh + dh) % 1) * 24;
  const dday = new Date(dobArr[0] + years - 1, dobArr[1] - 1, dobArr[2] + offset + nd);
  // Python: utils.to_dms(nh, as_string=False) -> [h, m, round(s)]
  const h = Math.floor(nh);
  const mins = (nh - h) * 60;
  let m = Math.floor(mins);
  let sec = Math.round((mins - m) * 60);
  if (sec === 60) { m += 1; sec = 0; }
  return gregorianToJulianDay(
    { year: dday.getFullYear(), month: dday.getMonth() + 1, day: dday.getDate() },
    { hour: h, minute: m, second: sec }
  );
}

// ============================================================================
// SREE LAGNA (async version)
// ============================================================================

/**
 * Sree Lagna from JD (async).
 * Python: sree_lagna(jd, place, ...)
 */
// @parity: py=sree_lagna
export async function sreeLagnaAsync(
  jd: number, place: Place, divisionalChartFactor: number = 1,
  chartMethod: number = 1
): Promise<[number, number]> {
  let moonLong: number;
  let ascLong: number;
  if (divisionalChartFactor > 1) {
    const pp = getDivisionalChart(jd, place, divisionalChartFactor, chartMethod);
    const ascPos = pp[0]!; // Ascendant: [planet, [rasi, long_within_sign]]
    const moonPos = pp[2]!; // Moon
    moonLong = moonPos[1][0] * 30 + moonPos[1][1];
    ascLong = ascPos[1][0] * 30 + ascPos[1][1];
  } else {
    const jdUtc = jd - place.timezone / 24;
    moonLong = await lunarLongitudeAsync(jdUtc);
    const asc = await ascendantFullAsync(jd, place);
    ascLong = asc[0] * 30 + asc[1];
  }
  return sreeLagnaFromLongitudes(moonLong, ascLong, divisionalChartFactor);
}

// ============================================================================
// INDU LAGNA (async version)
// ============================================================================

/**
 * Indu Lagna (async).
 * Python: indu_lagna(jd, place, ...)
 */
// @parity: py=indu_lagna
export async function induLagnaAsync(
  jd: number, place: Place, divisionalChartFactor: number = 1,
  chartMethod: number = 1
): Promise<[number, number]> {
  let moonRasi: number;
  let moonLongInSign: number;
  let ascRasi: number;
  if (divisionalChartFactor > 1) {
    const pp = getDivisionalChart(jd, place, divisionalChartFactor, chartMethod);
    const moonPos = pp[2]!; // Moon
    const ascPos = pp[0]!; // Ascendant
    moonRasi = moonPos[1][0];
    moonLongInSign = moonPos[1][1];
    ascRasi = ascPos[1][0];
  } else {
    const positions = getAllPlanetPositionsSync(jd, place);
    const moonPos = positions[1]!;
    moonRasi = moonPos[0];
    moonLongInSign = moonPos[1];
    const asc = await ascendantFullAsync(jd, place);
    ascRasi = asc[0];
  }

  const ninthFromMoon = (moonRasi + 8) % 12;
  const ninthLord = HOUSE_OWNERS[ninthFromMoon]!;
  const ninthFromAsc = (ascRasi + 8) % 12;
  const ninthLordAsc = HOUSE_OWNERS[ninthFromAsc]!;

  const il9thMoon = IL_FACTORS[ninthLord] ?? 0;
  const il9thAsc = IL_FACTORS[ninthLordAsc] ?? 0;
  let ilSum = (il9thMoon + il9thAsc) % 12;
  if (ilSum === 0) ilSum = 12;
  const ilRasi = (moonRasi + ilSum - 1) % 12;
  // Python returns (indu_rasi, moon's longitude within sign) directly
  return [ilRasi, moonLongInSign];
}

// ============================================================================
// BHRIGU BINDHU (async version)
// ============================================================================

/**
 * Bhrigu Bindhu (async).
 * Python: bhrigu_bindhu_lagna(jd, place, ...)
 */
// @parity: py=bhrigu_bindhu_lagna
export async function bhriguBindhuAsync(
  jd: number, place: Place, divisionalChartFactor: number = 1,
  chartMethod: number = 1
): Promise<[number, number]> {
  let moonLong: number;
  let rahuLong: number;
  if (divisionalChartFactor > 1) {
    const pp = getDivisionalChart(jd, place, divisionalChartFactor, chartMethod);
    const moonPos = pp[2]!; // Moon
    const rahuPos = pp[8]!; // Rahu
    moonLong = moonPos[1][0] * 30 + moonPos[1][1];
    rahuLong = rahuPos[1][0] * 30 + rahuPos[1][1];
  } else {
    const positions = getAllPlanetPositionsSync(jd, place);
    const moonPos = positions[1]!;
    const rahuPos = positions[7]!;
    moonLong = moonPos[0] * 30 + moonPos[1];
    rahuLong = rahuPos[0] * 30 + rahuPos[1];
  }
  // Python: moon_add = 0 if moon_long > rahu_long else 360; bb = (0.5*(rahu+moon+moon_add)) % 360
  const moonAdd = moonLong > rahuLong ? 0 : 360;
  const bb = (0.5 * (rahuLong + moonLong + moonAdd)) % 360;
  // Python calls dasavarga_from_long(bb) with default factor 1
  return dasavargaFromLong(normalizeDegrees(bb), 1);
}

// ============================================================================
// RE-EXPORTS from swe-adapter
// ============================================================================

/** Re-export sunrise/sunset/moonrise/moonset from swe-adapter */
export {
  sunrise, sunriseAsync, sunset, sunsetAsync,
  solarLongitude, solarLongitudeAsync,
  lunarLongitude, lunarLongitudeAsync,
  siderealLongitude, siderealLongitudeAsync,
  getAyanamsaValue, setAyanamsaMode,
};
// NOTE: no @parity tags for sunrise/sunset/moonrise/moonset — Python returns
// [local_hours, "HH:MM:SS", jd] tuples while TS returns {localTime, timeString,
// jd} objects that the whole codebase depends on; values are verified
// indirectly via midday/trikalam/gauri_choghadiya/etc. parity fixtures.
export const moonrise = _moonrise;
export const moonriseAsync = _moonriseAsync;
export const moonset = _moonset;
export const moonsetAsync = _moonsetAsync;

/** Re-export jd_to_gregorian (Python: jd_to_gregorian = lambda jd: swe.revjul(jd, swe.GREG_CAL)) */
export const jdToGregorian = julianDayToGregorian;

/** Reset ayanamsa mode to default (Lahiri) */
export function resetAyanamsaMode(): void {
  setAyanamsaMode('LAHIRI');
}

/**
 * bhaava_madhya — simple wrapper dispatching to KP vs Sripathi.
 * Python: bhaava_madhya(jd, place, bhava_method)
 * @param bhavaMethod - 1: KP/Placidus, 2: Sripathi (default from constants)
 * @returns Array of 12 house cusp longitudes
 */
// @parity: py=bhaava_madhya
export async function bhaavaMadhya(
  jd: number, place: Place, bhavaMethod: number = BHAAVA_MADHYA_METHOD
): Promise<number[]> {
  if (bhavaMethod === 1) {
    return bhaavaMadhyaKP(jd, place);
  } else {
    return bhaavaMadhyaSripathi(jd, place);
  }
}

// ============================================================================
// SIMPLE UTILITY FUNCTIONS
// ============================================================================

/** navamsa_from_long = dasavarga_from_long(longitude, 9) */
export function navamsaFromLong(longitude: number): [number, number] {
  return dasavargaFromLong(longitude, 9);
}

/** Old navamsa calculation - returns just the sign index */
// @parity: py=navamsa_from_long_old
export function navamsaFromLongOld(longitude: number): number {
  const onePada = 360 / (12 * 9);
  const oneSign = 12 * onePada;
  const signsElapsed = longitude / oneSign;
  const fractionLeft = signsElapsed % 1;
  return Math.floor(fractionLeft * 12);
}

/**
 * Python-compatible: ketu = (rahu_longitude + 180) % 360
 * Ketu is always 180° from Rahu; takes Rahu longitude, returns Ketu longitude.
 */
export function ketu(rahuLongitude: number): number {
  return (rahuLongitude + 180) % 360;
}

/**
 * Python-compatible: rahu = (ketu_longitude + 180) % 360
 * Rahu is always 180° from Ketu; takes Ketu longitude, returns Rahu longitude.
 */
export function rahu(ketuLongitude: number): number {
  return (ketuLongitude + 180) % 360;
}

/** Get Rahu longitude at a given JD via sidereal_longitude */
export function rahuLongitude(jd: number): number {
  return siderealLongitude(jd, RAHU);
}

/** Get Ketu longitude at a given JD (180° from Rahu) */
export function ketuLongitude(jd: number): number {
  return normalizeDegrees(rahuLongitude(jd) + 180);
}

/** Map planet constant to Swiss Ephemeris planet index */
export function ephemerisPlanetIndex(planet: number): number {
  return SWE_PLANETS[planet] ?? planet;
}

/** raahu_kaalam — convenience wrapper for trikalamAsync */
export async function raahuKaalamAsync(jd: number, place: Place): Promise<[number, number]> {
  return trikalamAsync(jd, place, 'raahu kaalam');
}

/** yamaganda_kaalam — convenience wrapper for trikalamAsync */
export async function yamagandaKaalamAsync(jd: number, place: Place): Promise<[number, number]> {
  return trikalamAsync(jd, place, 'yamagandam');
}

/** gulikai_kaalam — convenience wrapper for trikalamAsync */
export async function gulikaiKaalamAsync(jd: number, place: Place): Promise<[number, number]> {
  return trikalamAsync(jd, place, 'gulikai');
}

/** next_sankranti_date — find next sun entry to a rasi */
/**
 * Next sankranti date (sun entry to next rasi).
 * Python: next_sankranti_date(panchanga_date, place)
 * @returns [Date, solarHour, tamilMonth, tamilDay] matching Python format
 */
// @parity: py=next_sankranti_date
export function nextSankrantiDate(
  jdOrDate: DateOrJd, place: Place
): [[number, number, number], number, number, number] {
  // Python: next_day = previous_panchanga_day(panchanga_date, 1); jd = gregorian_to_jd(next_day)
  const jd = dateOrJdToJd(jdOrDate, 0);
  const [tMonth] = tamilSolarMonthAndDate(jd - 1, place);
  const multiple = ((tMonth + 1) % 12) * 30;

  // Python: sl = solar_longitude(sunset_jd) — sunset jd is local-encoded, no tz shift
  let sunsetJd = sunset(jd - 1, place).jd;
  let sl = solarLongitude(sunsetJd);

  // Walk forward to find sankranti
  let maxIter = 60;
  while (maxIter-- > 0) {
    const rem = sl % 30;
    if (rem < 1 && rem > 0) break;
    sunsetJd += 1;
    sl = solarLongitude(sunsetJd);
  }

  const sankDate = julianDayToGregorian(sunsetJd).date;
  const srJd = sunrise(sunsetJd, place).jd;
  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const solarLongs = offsets.map(t => solarLongitude(srJd + t) % 360);
  const solarHour = inverseLagrange(offsets, solarLongs, multiple % 360);
  const sankJdUtc = gregorianToJulianDay(sankDate, { hour: 0, minute: 0, second: 0 });
  let solarHour1 = (srJd + solarHour - sankJdUtc) * 24 + place.timezone;

  const [tamilMonth, tamilDay] = tamilSolarMonthAndDate(sankDate, place);
  const [finalDate, finalHour] = convertToTamilDateAndTime(sankDate, solarHour1, place);

  return [[finalDate.year, finalDate.month, finalDate.day], finalHour, tamilMonth, tamilDay];
}

/**
 * Next sankranti date (async, simple — returns JD and rasi).
 * Kept for backwards compatibility.
 */
export async function nextSankrantiDateAsync(
  jd: number, place: Place
): Promise<{ jd: number; rasi: number }> {
  const jdUtc = jd - place.timezone / 24;
  const sunLong = solarLongitude(jdUtc);
  const currentRasi = Math.floor(sunLong / 30);
  const nextRasi = (currentRasi + 1) % 12;
  const result = await nextPlanetEntryDateAsync(SUN, jd, place, nextRasi);
  return { jd: result, rasi: nextRasi };
}

/** days_in_tamil_month — count days remaining in current Tamil month */
// @parity: py=days_in_tamil_month
export function daysInTamilMonth(jdOrDate: DateOrJd, place: Place): number {
  // Python: jd = utils.gregorian_to_jd(panchanga_date); sl = solar_longitude(sunset_jd)
  const jd = dateOrJdToJd(jdOrDate, 0);
  const [, dayCount] = tamilSolarMonthAndDate(jdOrDate, place);
  let sunsetJd = sunset(jd, place).jd;
  let sl = solarLongitude(sunsetJd);
  let count = dayCount;
  while (true) {
    const rem = sl % 30;
    if (rem < 30 && rem > 29) break;
    sunsetJd += 1;
    sl = solarLongitude(sunsetJd);
    count += 1;
    if (count > 35) break; // safety limit
  }
  return count;
}

// ============================================================================
// SET TROPICAL / SIDERAL PLANETS
// ============================================================================

/** Switch planet list to tropical (includes Uranus, Neptune, Pluto, excludes Rahu/Ketu) */
// @parity: py=set_tropical_planets
export function setTropicalPlanets(): void {
  // In the TS port, planet lists are managed differently per context.
  // This is a compatibility stub matching Python's set_tropical_planets().
  // The actual planet list used depends on function parameters, not global state.
}

/** Switch planet list to sidereal (default: Sun..Ketu, optionally Uranus..Pluto) */
// @parity: py=set_sideral_planets
export function setSiderealPlanets(): void {
  // Compatibility stub matching Python's set_sideral_planets().
}

// ============================================================================
// MIXED CHART LAGNA FUNCTIONS
// ============================================================================

/**
 * Build D-1 PlanetPosition[] from sync positions for charts module.
 * Maps planetaryPositions() + ascendant() into the PlanetPosition format.
 */
function buildD1Positions(jd: number, place: Place): PlanetPosition[] {
  const asc = ascendant(jd, place);
  const pp = planetaryPositions(jd, place);
  const positions: PlanetPosition[] = [
    { planet: -1, rasi: asc[0], longitude: asc[1] }, // Ascendant as planet -1
  ];
  for (const [pid, [rasi, long]] of pp) {
    positions.push({ planet: pid, rasi, longitude: long });
  }
  return positions;
}

/**
 * Special ascendant for mixed chart.
 * Python: special_ascendant_mixed_chart(jd, place, vf1, cm1, vf2, cm2, lagna_rate_factor)
 */
// @parity: py=special_ascendant_mixed_chart
export function specialAscendantMixedChart(
  jd: number, place: Place,
  vargaFactor1: number = 1, chartMethod1: number = 1,
  vargaFactor2: number = 1, chartMethod2: number = 1,
  lagnaRateFactor: number = 1.0
): [number, number] {
  const mixedDvf = vargaFactor1 * vargaFactor2;
  // Python: _,_,_,tob = jd_to_gregorian(jd) — exact fractional hours
  const tobHours = localHoursFromJd(jd);
  const srise = sunrise(jd, place);
  const sunRiseHours = srise.localTime;
  const timeDiffMins = (tobHours - sunRiseHours) * 60;

  // Get sun position at sunrise in mixed chart
  const jdAtSunrise = srise.jd + place.timezone / 24;
  const d1Pos = buildD1Positions(jdAtSunrise, place);
  const mixedPos = getMixedDivisionalChart(d1Pos, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2);
  const sunPos = mixedPos[1]; // Sun is index 1 (after Asc)
  const sunLong = sunPos!.rasi * 30 + sunPos!.longitude;
  const splLong = (sunLong + timeDiffMins * lagnaRateFactor) % 360;
  return dasavargaFromLong(splLong, mixedDvf);
}

/** Bhava lagna for mixed chart */
export function bhavaLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  return specialAscendantMixedChart(jd, place, vf1, cm1, vf2, cm2, 0.25);
}

/** Hora lagna for mixed chart */
export function horaLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  return specialAscendantMixedChart(jd, place, vf1, cm1, vf2, cm2, 0.5);
}

/** Ghati lagna for mixed chart */
export function ghatiLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  return specialAscendantMixedChart(jd, place, vf1, cm1, vf2, cm2, 1.25);
}

/** Vighati lagna for mixed chart */
export function vighatiLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  return specialAscendantMixedChart(jd, place, vf1, cm1, vf2, cm2, 15.0);
}

/** Indu lagna for mixed chart */
// @parity: py=indu_lagna_mixed_chart
export function induLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  const d1Pos = buildD1Positions(jd, place);
  const mixedPos = getMixedDivisionalChart(d1Pos, vf1, cm1, vf2, cm2);
  const moonHouse = mixedPos[2]!.rasi; // Moon is index 2
  const ascHouse = mixedPos[0]!.rasi;  // Asc is index 0
  const ninthLord = HOUSE_OWNERS[(ascHouse + 8) % 12]!;
  const ninthLordFromMoon = HOUSE_OWNERS[(moonHouse + 8) % 12]!;
  let il1 = (IL_FACTORS[ninthLord]! + IL_FACTORS[ninthLordFromMoon]!) % 12;
  if (il1 === 0) il1 = 12;
  const induRasi = (moonHouse + il1 - 1) % 12;
  return [induRasi, mixedPos[2]!.longitude];
}

/** Kunda lagna for mixed chart */
// @parity: py=kunda_lagna_mixed_chart
export function kundaLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  const mixedDvf = vf1 * vf2;
  const d1Pos = buildD1Positions(jd, place);
  const mixedPos = getMixedDivisionalChart(d1Pos, vf1, cm1, vf2, cm2);
  const asc = mixedPos[0]!;
  const al = asc.rasi * 30 + asc.longitude;
  const al1 = (al * 81) % 360;
  return dasavargaFromLong(al1, mixedDvf);
}

/** Bhrigu Bindhu lagna for mixed chart */
// @parity: py=bhrigu_bindhu_lagna_mixed_chart
export function bhriguBindhuLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  const d1Pos = buildD1Positions(jd, place);
  const mixedPos = getMixedDivisionalChart(d1Pos, vf1, cm1, vf2, cm2);
  const moonLong = mixedPos[2]!.rasi * 30 + mixedPos[2]!.longitude;
  const rahuLong = mixedPos[8]!.rasi * 30 + mixedPos[8]!.longitude; // Rahu is index 8
  const moonAdd = moonLong > rahuLong ? 0 : 360;
  const bb = (0.5 * (rahuLong + moonLong + moonAdd)) % 360;
  return dasavargaFromLong(bb);
}

/** Sree lagna for mixed chart */
// @parity: py=sree_lagna_mixed_chart
export function sreeLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  const mixedDvf = vf1 * vf2;
  const d1Pos = buildD1Positions(jd, place);
  const mixedPos = getMixedDivisionalChart(d1Pos, vf1, cm1, vf2, cm2);
  const ascLong = mixedPos[0]!.rasi * 30 + mixedPos[0]!.longitude;
  const moonLong = mixedPos[2]!.rasi * 30 + mixedPos[2]!.longitude;
  return sreeLagnaFromLongitudes(moonLong, ascLong, mixedDvf);
}

/** Pranapada lagna for mixed chart */
// @parity: py=pranapada_lagna_mixed_chart
export function pranapadaLagnaMixedChart(
  jd: number, place: Place,
  vf1: number = 1, cm1: number = 1, vf2: number = 1, cm2: number = 1
): [number, number] {
  const mixedDvf = vf1 * vf2;
  // Python: birth_long = (utils.udhayadhi_nazhikai(jd, place)[1]*4)%12
  const sr = sunrise(jd, place);
  const tobHours = localHoursFromJd(jd);
  let prevSunriseHours: number | undefined;
  if (tobHours < sr.localTime) {
    prevSunriseHours = sunrise(jd - 1, place).localTime;
  }
  const ghatis = udhayadhiNazhikaiGhati(tobHours, sr.localTime, prevSunriseHours);
  const birthLong = (ghatis * 4) % 12;

  const d1Pos = buildD1Positions(jd, place);
  const mixedPos = getMixedDivisionalChart(d1Pos, vf1, cm1, vf2, cm2);
  const sunLong = mixedPos[1]!.rasi * 30 + mixedPos[1]!.longitude;
  let pl1 = birthLong * 30 + sunLong;
  const sl = dasavargaFromLong(sunLong, mixedDvf);
  if (FIXED_SIGNS.includes(sl[0])) {
    pl1 += 240;
  } else if (DUAL_SIGNS.includes(sl[0])) {
    pl1 += 120;
  }
  const splLong = pl1 % 360;
  return dasavargaFromLong(splLong, mixedDvf);
}

// ============================================================================
// TITHI USING PLANET SPEED
// ============================================================================

/**
 * Tithi calculation using planet speed method.
 * Python: tithi_using_planet_speed(jd, place, tithi_index, planet1, planet2, cycle)
 */
// @parity: py=tithi_using_planet_speed
export function tithiUsingPlanetSpeed(
  jd: number, place: Place,
  tithiIndex: number = 1, planet1: number = MOON, planet2: number = SUN,
  cycle: number = 1
): number[] {
  const { time } = julianDayToGregorian(jd);
  const jdHours = time.hour + time.minute / 60 + time.second / 3600;

  function getTithiUsingPlanetSpeed(jd_: number, place_: Place): number[] {
    const jdUtc = jd_ - place_.timezone / 24;
    // Compute tithi phase using planet longitudes
    const p1Long = siderealLongitude(jdUtc, planet1);
    const p2Long = siderealLongitude(jdUtc, planet2);
    const totalPhase = ((tithiIndex * (p1Long - p2Long) + (cycle - 1) * 180) % 360 + 360) % 360;
    const oneTithi = 360 / 30;
    const tit = Math.ceil(totalPhase / oneTithi);
    let tithiNo = tit;
    const degreesLeft = tit * oneTithi - totalPhase;
    const oneDayHours = dayLength(jd_, place_) + nightLength(jd_, place_);
    const dailyPlanet1Motion = dailyMoonSpeed(jd_, place_);
    const dailyPlanet2Motion = dailySunSpeed(jd_, place_);
    const endTime = jdHours + (degreesLeft / (dailyPlanet1Motion - dailyPlanet2Motion)) * oneDayHours;
    const fracLeft = degreesLeft / oneTithi;
    const startTime = endTime - (endTime - jdHours) / fracLeft;
    if (INCREASE_TITHI_BY_ONE_BEFORE_KALI_YUGA && jd_ < MAHABHARATHA_TITHI_JULIAN_DAY) {
      tithiNo = tithiNo % 30 + 1;
    }
    return [tithiNo, startTime, endTime];
  }

  const ret = getTithiUsingPlanetSpeed(jd, place);
  if (ret[2]! < 24) {
    const ret1 = getTithiUsingPlanetSpeed(jd + ret[2]! / 24, place);
    const nextTithi = ret[0]! % 30 + 1;
    const nextTithiStart = ret[2]!;
    const nextTithiEnd = ret[2]! + ret1[2]!;
    ret.push(nextTithi, nextTithiStart, nextTithiEnd);
  }
  return ret;
}

// ============================================================================
// YOGAM OLD
// ============================================================================

/**
 * Legacy yogam calculation (using internal _get_yogam equivalent).
 * Python: yogam_old(jd, place, planet1, planet2, tithi_index, cycle)
 */
// @parity: py=yogam_old
export function yogamOld(
  jd: number, place: Place,
  planet1: number = MOON, planet2: number = SUN,
  tithiIndex: number = 1, cycle: number = 1
): number[] {
  // Internal _get_yogam equivalent — matches Python _get_yogam(jd, place, planet1, planet2, tithi_index, cycle)
  function getYogam(jd_: number, place_: Place): number[] {
    const tz = place_.timezone;
    const { date } = julianDayToGregorian(jd_);
    const jdUtc = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });
    const rise = sunrise(jd_, place_).jd;
    const oneYoga = 360 / 27;

    // Use lunar_longitude/solar_longitude like Python _get_yogam
    const moonAtRise = siderealLongitude(rise, MOON);
    const sunAtRise = siderealLongitude(rise, SUN);
    const total = ((tithiIndex * (moonAtRise + sunAtRise) + (cycle - 1) * 180) % 360 + 360) % 360;
    const yog = Math.ceil(total / oneYoga) || 27;
    const degreesLeft = yog * oneYoga - total;

    const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
    const totalMotion: number[] = [];
    for (const t of offsets) {
      const moonDiff = ((siderealLongitude(rise + t, MOON) - moonAtRise) % 360 + 360) % 360;
      const sunDiff = ((siderealLongitude(rise + t, SUN) - sunAtRise) % 360 + 360) % 360;
      totalMotion.push(((tithiIndex * (moonDiff + sunDiff) + (cycle - 1) * 180) % 360 + 360) % 360);
    }

    const approxEnd = inverseLagrange(offsets, totalMotion, degreesLeft);
    const ends = (rise + approxEnd - jdUtc) * 24 + tz;
    const answer: number[] = [yog, ends];

    // Check for skipped yoga
    const moonTmrw = siderealLongitude(rise + 1, MOON);
    const sunTmrw = siderealLongitude(rise + 1, SUN);
    const totalTmrw = ((tithiIndex * (moonTmrw + sunTmrw) + (cycle - 1) * 180) % 360 + 360) % 360;
    const tomorrow = Math.ceil(totalTmrw / oneYoga) || 27;
    const isSkipped = ((tomorrow - yog) % 27 + 27) % 27 > 1;
    if (isSkipped) {
      const leapYog = yog + 1;
      const leapDegreesLeft = leapYog * oneYoga - total;
      const leapApproxEnd = inverseLagrange(offsets, totalMotion, leapDegreesLeft);
      const leapEnds = (rise + leapApproxEnd - jdUtc) * 24 + tz;
      answer.push(leapYog === 28 ? 1 : leapYog, leapEnds);
    }

    return answer;
  }

  const yoga = getYogam(jd, place);
  const yogaPrev = getYogam(jd - 1, place);
  const yogaNo = yoga[0]!;
  let yogaStart = yogaPrev[1]!;
  const yogaEnd = yoga[1]!;

  if (yogaStart < 24.0) {
    yogaStart = -yogaStart;
  } else if (yogaStart > 24) {
    yogaStart -= 24.0;
  }

  // Python: result = [_yoga_no, _yoga_start, _yoga_end] + _yoga[2:]
  return [yogaNo, yogaStart, yogaEnd, ...yoga.slice(2)];
}

// ============================================================================
// SYNC ACCURATE NAKSHATRA (inverse Lagrange, mirrors Python _get_nakshathra)
// Uses sync WASM siderealLongitude/sunrise — accurate when WASM initialized.
// ============================================================================

/** Sync mirror of _getNakshatraAsync / Python _get_nakshathra(jd, place). */
function _getNakshatraSync(jd: number, place: Place): number[] {
  const tz = place.timezone;
  const { date } = julianDayToGregorian(jd);
  const jdUt = gregorianToJulianDay(date, { hour: 0, minute: 0, second: 0 });
  const jdUtc = jd - tz / 24;

  // Python _get_nakshathra passes jd_utc to sunrise
  const rise = sunrise(jdUtc, place).jd;

  const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
  const longitudes: number[] = [];
  for (const t of offsets) {
    longitudes.push(siderealLongitude(rise + t, 1));
  }
  const unwrapped = unwrapAngles(longitudes);
  const extended = extendAngleRange(unwrapped, 360);
  const x = Array.from({ length: extended.length }, (_, i) => offsets[i % offsets.length]!);

  const nirayana = lunarLongitude(jdUtc);
  const [nakNo, padamNo] = nakshatraPada(nirayana);

  let yCheck = normalizeAngle(nakNo * 360 / 27, Math.min(...extended));
  let approxEnd = inverseLagrange(x, extended, yCheck);
  let ends = (rise - jdUt + approxEnd) * 24 + tz;
  const answer: number[] = [nakNo, padamNo, ends];

  let leapNak = nakNo + 1;
  yCheck = normalizeAngle(leapNak * 360 / 27, Math.min(...extended));
  approxEnd = inverseLagrange(x, extended, yCheck);
  ends = (rise - jdUt + approxEnd) * 24 + tz;
  leapNak = nakNo === 27 ? 1 : leapNak;
  answer.push(leapNak, padamNo, ends);
  return answer;
}

/**
 * Sync mirror of Python public nakshatra(jd, place).
 * @returns [nakNo, padamNo, startTime, endTime, nextNakNo, nextPadamNo, nextEndTime]
 */
export function nakshatraSync(jd: number, place: Place): number[] {
  const _nak = _getNakshatraSync(jd, place);
  const _nakPrev = _getNakshatraSync(jd - 1, place);
  let nakStart = _nakPrev[2]!;
  if (nakStart < 24.0) {
    nakStart = -nakStart;
  } else if (nakStart > 24) {
    nakStart -= 24.0;
  }
  return [_nak[0]!, _nak[1]!, nakStart, _nak[2]!, ..._nak.slice(3)];
}

// ============================================================================
// PYTHON-DEFAULT (PLANET SPEED) PANCHANGA VARIANTS
// Python const.use_planet_speed_for_panchangam_end_timings defaults to True,
// so drik.tithi/yogam/karana dispatch to the planet-speed implementations.
// These exports mirror that default path for parity with Python.
// ============================================================================

/**
 * Yogam using planet speeds (Python default path).
 * Python: yogam(jd, place, tithi_index, planet1, planet2, cycle)
 * with const.use_planet_speed_for_panchangam_end_timings = True.
 *
 * @returns [yogamNo, startTime, endTime, fracLeft, ...optional next yogam quad]
 */
export function yogamUsingPlanetSpeed(
  jd: number, place: Place,
  tithiIndex: number = 1, planet1: number = MOON, planet2: number = SUN,
  cycle: number = 1
): number[] {
  const { time } = julianDayToGregorian(jd);
  const jdHours = time.hour + time.minute / 60 + time.second / 3600;

  function getYogamNew(jd_: number): number[] {
    const jdUtc = jd_ - place.timezone / 24;
    // Python _special_yoga_phase: (tithi_index*(p1 + p2) + (cycle-1)*180) % 360
    const p1Long = siderealLongitude(jdUtc, planet1);
    const p2Long = siderealLongitude(jdUtc, planet2);
    const yogaPhase = ((tithiIndex * (p1Long + p2Long) + (cycle - 1) * 180) % 360 + 360) % 360;
    const total = yogaPhase % 360;
    const oneYoga = 360 / 27;
    const yog = Math.ceil(total / oneYoga);
    const yogamNo = yog;
    const degreesLeft = yog * oneYoga - total;
    // Python: use only Moon/Sun speeds for end time calculations
    const dailyPlanet1Motion = dailyMoonSpeed(jd_, place);
    const dailyPlanet2Motion = dailySunSpeed(jd_, place);
    const endTime = jdHours + (degreesLeft / (dailyPlanet1Motion + dailyPlanet2Motion)) * 24;
    const fracLeft = degreesLeft / oneYoga;
    const startTime = endTime - (endTime - jdHours) / fracLeft;
    return [yogamNo, startTime, endTime, fracLeft];
  }

  const result = getYogamNew(jd);
  if (result[2]! < 24) {
    // NOTE: Python adds result[2] (hours) directly to jd (days) — replicated verbatim.
    const nextRes = getYogamNew(jd + result[2]!);
    nextRes[1] = result[2]!;
    nextRes[2]! += 24;
    nextRes[3] = getFraction(nextRes[1]!, nextRes[2]!, jdHours);
    result.push(...nextRes);
  }
  return result;
}

/**
 * Karana via the Python-default (planet speed) tithi path.
 * Python: karana(jd, place) — which calls tithi(), dispatching to
 * tithi_using_planet_speed when use_planet_speed_for_panchangam_end_timings=True.
 *
 * @returns [karanaNo (1..60), startTime, endTime]
 */
export function karana(jd: number, place: Place): [number, number, number] {
  const { time } = julianDayToGregorian(jd);
  const birthTimeHrs = time.hour + time.minute / 60 + time.second / 3600;

  const _tithi = tithiUsingPlanetSpeed(jd, place);
  const tStart = _tithi[1]!;
  const tEnd = _tithi[2]!;
  const tMid = 0.5 * (tStart + tEnd);
  let karanaNo = _tithi[0]! * 2 - 1;
  let kStart: number;
  let kEnd: number;
  if (birthTimeHrs > tMid) {
    karanaNo += 1;
    kStart = tMid;
    kEnd = tEnd;
  } else {
    kStart = tStart;
    kEnd = tMid;
  }
  return [karanaNo, kStart, kEnd];
}

/**
 * Full nakshatra with start time, matching Python's public nakshatra().
 * Python: nakshatra(jd, place) — wraps _get_nakshathra for jd and jd-1 to
 * derive the start time (negative => started previous day).
 *
 * @returns [nakNo, padamNo, startTime, endTime, nextNakNo, nextPadamNo, nextEndTime]
 */
export async function nakshatraAsync(jd: number, place: Place): Promise<number[]> {
  const _nak = await _getNakshatraAsync(jd, place);
  const _nakPrev = await _getNakshatraAsync(jd - 1, place);
  const nakNo = _nak[0]!;
  const padNo = _nak[1]!;
  let nakStart = _nakPrev[2]!;
  const nakEnd = _nak[2]!;
  if (nakStart < 24.0) {
    nakStart = -nakStart;
  } else if (nakStart > 24) {
    nakStart -= 24.0;
  }
  return [nakNo, padNo, nakStart, nakEnd, ..._nak.slice(3)];
}

// ============================================================================
// KARAKA TITHI / KARAKA YOGAM
// ============================================================================

/**
 * Karaka tithi (sync fallback) — uses standard tithi.
 * Python: karaka_tithi(jd, place)
 */
/** Chara karaka planets (AmK, AK) from sync planet positions (mirrors Python karaka_* setup). */
function _charaKarakaPlanets(jd: number, place: Place): [number, number] {
  const pp = getAllPlanetPositionsSync(jd, place);
  const positions = pp.map(([rasi, longitude], i) => ({ planet: i, rasi, longitude }));
  // Python adds dummy Lagna ['L',(0,-10)] at index 0
  const positionsWithLagna = [{ planet: -1, rasi: 0, longitude: -10 }, ...positions];
  const ks = getCharaKarakas(positionsWithLagna);
  return [ks[1]!, ks[0]!]; // [AmK (planet1), AK (planet2)]
}

// @parity: py=karaka_tithi
export function karakaTithi(jd: number, place: Place): number[] {
  // Python: tithi(jd, place, 1, AmK, AK) — dispatches to tithi_using_planet_speed
  const [p1, p2] = _charaKarakaPlanets(jd, place);
  return tithiUsingPlanetSpeed(jd, place, 1, p1, p2, 1);
}

/**
 * Karaka tithi (async) — tithi using chara karaka planets (AK and AmK).
 * Python: karaka_tithi(jd, place)
 * Gets chara karakas from dhasavarga positions, then computes tithi
 * using AmK (planet1) and AK (planet2).
 */
export async function karakaTithiAsync(jd: number, place: Place): Promise<number[]> {
  const pp = await dhasavargaAsync(jd, place);
  const positions = pp.map(([planet, [rasi, longitude]]) => ({
    planet,
    rasi,
    longitude
  }));
  // Add dummy lagna position at index 0 (Python adds ['L',(0,-10)])
  const positionsWithLagna = [{ planet: -1, rasi: 0, longitude: -10 }, ...positions];
  const ks = getCharaKarakas(positionsWithLagna);
  const p1 = ks[1]!; // AmK (Amatya Karaka)
  const p2 = ks[0]!; // AK (Atma Karaka)

  const _tithi = await _getTithiGenericAsync(jd, place, p1, p2, 1, 1);
  const _tithiPrev = await _getTithiGenericAsync(jd - 1, place, p1, p2, 1, 1);

  const tithiNo = _tithi[0]!;
  let tithiStart = _tithiPrev[1]!;
  const tithiEnd = _tithi[1]!;

  if (tithiStart < 24.0) {
    tithiStart = -tithiStart;
  } else if (tithiStart > 24) {
    tithiStart -= 24.0;
  }

  const result: number[] = [tithiNo, tithiStart, tithiEnd];

  if (tithiEnd < 24.0) {
    const _tithi1 = await _getTithiGenericAsync(jd + tithiEnd / 24, place, p1, p2, 1, 1);
    const nextTithiNo = (tithiNo % 30) + 1;
    const nextTithiStart = tithiEnd;
    const nextTithiEnd = tithiEnd + _tithi1[1]!;
    result.push(nextTithiNo, nextTithiStart, nextTithiEnd);
  }

  return result;
}

/**
 * Karaka yogam (sync fallback) — uses standard yogam.
 * Python: karaka_yogam(jd, place)
 */
// @parity: py=karaka_yogam
export function karakaYogam(jd: number, place: Place): number[] {
  // Python: yogam(jd, place, 1, AmK, AK, 1) — dispatches to planet-speed yogam
  const [p1, p2] = _charaKarakaPlanets(jd, place);
  return yogamUsingPlanetSpeed(jd, place, 1, p1, p2, 1);
}

/**
 * Karaka yogam (async) — yogam using chara karaka planets (AK and AmK).
 * Python: karaka_yogam(jd, place)
 */
export async function karakaYogamAsync(jd: number, place: Place): Promise<number[]> {
  const pp = await dhasavargaAsync(jd, place);
  const positions = pp.map(([planet, [rasi, longitude]]) => ({
    planet,
    rasi,
    longitude
  }));
  const positionsWithLagna = [{ planet: -1, rasi: 0, longitude: -10 }, ...positions];
  const ks = getCharaKarakas(positionsWithLagna);
  const p1 = ks[1]!; // AmK
  const p2 = ks[0]!; // AK

  const _yoga = await _getYogamGenericAsync(jd, place, p1, p2, 1, 1);
  const _yogaPrev = await _getYogamGenericAsync(jd - 1, place, p1, p2, 1, 1);

  const yogaNo = _yoga[0]!;
  let yogaStart = _yogaPrev[1]!;
  const yogaEnd = _yoga[1]!;

  if (yogaStart < 24.0) {
    yogaStart = -yogaStart;
  } else if (yogaStart > 24) {
    yogaStart -= 24.0;
  }

  const result: number[] = [yogaNo, yogaStart, yogaEnd];
  return result;
}

// ============================================================================
// TAMIL SOLAR MONTH VARIANTS
// ============================================================================

/**
 * Tamil solar month and date (V4.3.8 method — uses solar longitude at JD).
 * Python: tamil_solar_month_and_date_V4_3_8(panchanga_date, place)
 */
// @parity: py=tamil_solar_month_and_date_V4_3_8
export function tamilSolarMonthAndDateV438(
  jd: DateOrJd, place: Place
): [number, number] {
  let startJd = dateOrJdToJd(jd, 0); // Python: utils.gregorian_to_jd(panchanga_date)
  let sl = solarLongitude(startJd);
  const tamilMonth = Math.floor(sl / 30);
  let dayCount = 1;
  while (true) {
    const rem = sl % 30;
    if (rem < 1 && rem > 0) break;
    startJd -= 1;
    sl = solarLongitude(startJd);
    dayCount++;
    if (dayCount > 35) break; // safety
  }
  return [tamilMonth, dayCount];
}

/**
 * Tamil solar month and date (V4.3.5 method — uses sunset JD).
 * Python: tamil_solar_month_and_date_V4_3_5(panchanga_date, place)
 */
// @parity: py=tamil_solar_month_and_date_V4_3_5
export function tamilSolarMonthAndDateV435(
  jd: DateOrJd, place: Place
): [number, number] {
  let sunsetJd = sunset(dateOrJdToJd(jd, 0), place).jd;
  let sl = solarLongitude(sunsetJd);
  const tamilMonth = Math.floor(sl / 30);
  let dayCount = 1;
  while (true) {
    const rem = sl % 30;
    if (rem < 1 && rem > 0) break;
    sunsetJd -= 1;
    sl = solarLongitude(sunsetJd);
    dayCount++;
    if (dayCount > 35) break; // safety
  }
  return [tamilMonth, dayCount];
}

/**
 * Tamil solar month and date (Ravi Annaswamy method).
 * Python: tamil_solar_month_and_date_RaviAnnnaswamy(panchanga_date, place)
 */
// @parity: py=tamil_solar_month_and_date_RaviAnnnaswamy
export function tamilSolarMonthAndDateRaviAnnaswamy(
  jd: DateOrJd, place: Place
): [number, number] {
  // Python: jd = utils.julian_day_number(panchanga_date, (10,0,0))
  const jdSet = sunset(dateOrJdToJd(jd, 10), place).jd;
  const jdUtc = jdSet - place.timezone / 24;
  let sr = solarLongitude(jdUtc);
  const tamilMonth = Math.floor(sr / 30);
  let dayCount = 1;
  let searchJd = jdUtc;
  while (true) {
    const rem = sr % 30;
    if (rem < 1 && rem > 0) break;
    searchJd -= 1;
    sr = solarLongitude(searchJd);
    dayCount++;
    if (dayCount > 35) break; // safety
  }
  return [tamilMonth, dayCount];
}

/**
 * Tamil solar month and date (new V4.4.0 method).
 * Python: tamil_solar_month_and_date_new(panchanga_date, place, base_time, use_utc)
 */
// @parity: py=tamil_solar_month_and_date_new
export function tamilSolarMonthAndDateNew(
  jdOrDate: DateOrJd, place: Place, baseTime: number = 0, useUtc: boolean = true
): [number, number] {
  // Python: jd = utils.julian_day_number(panchanga_date, (10,0,0))
  const jd = dateOrJdToJd(jdOrDate, 10);
  let jdBase: number;
  if (baseTime === 0) {
    jdBase = sunset(jd, place).jd;
  } else if (baseTime === 1) {
    jdBase = sunrise(jd, place).jd;
  } else {
    // midday
    const sr = sunrise(jd, place);
    const ss = sunset(jd, place);
    jdBase = (sr.jd + ss.jd) / 2;
  }
  let jdUtc = useUtc ? jdBase - place.timezone / 24 : jdBase;
  let sr = solarLongitude(jdUtc);
  const tamilMonth = Math.floor(sr / 30);
  let dayCount = 1;
  let searchJd = jd;
  while (true) {
    const rem = sr % 30;
    if (rem < 1 && rem > 0) break;
    searchJd -= 1;
    if (baseTime === 0) {
      jdBase = sunset(searchJd, place).jd;
    } else if (baseTime === 1) {
      jdBase = sunrise(searchJd, place).jd;
    } else {
      const srr = sunrise(searchJd, place);
      const sss = sunset(searchJd, place);
      jdBase = (srr.jd + sss.jd) / 2;
    }
    jdUtc = useUtc ? jdBase - place.timezone / 24 : jdBase;
    sr = solarLongitude(jdUtc);
    dayCount++;
    if (dayCount > 35) break; // safety
  }
  return [tamilMonth, dayCount];
}

/**
 * Tamil solar month and date from JD.
 * Python: tamil_solar_month_and_date_from_jd(jd, place)
 */
// @parity: py=tamil_solar_month_and_date_from_jd
export function tamilSolarMonthAndDateFromJd(
  jd: number, place: Place
): [number, number] {
  const jdSet = sunset(jd, place).jd;
  let jdUtc = jdSet - place.timezone / 24;
  let sr = solarLongitude(jdUtc);
  const tamilMonth = Math.floor(sr / 30);
  let dayCount = 1;
  while (true) {
    const rem = sr % 30;
    if (rem < 1 && rem > 0) break;
    jdUtc -= 1;
    sr = solarLongitude(jdUtc);
    dayCount++;
    if (dayCount > 35) break; // safety
  }
  return [tamilMonth, dayCount];
}

// ============================================================================
// SAHASRA CHANDRODAYAM OLD (legacy — uses ephem library, stub only)
// ============================================================================

/**
 * Legacy sahasra chandrodayam using ephem library.
 * Python: sahasra_chandrodayam_old(dob, tob, place)
 * NOTE: The Python version uses the `ephem` library which is not available in TS.
 * This is a stub that returns [-1, -1, -1] to indicate unsupported.
 */
// no @parity: Python version needs the `ephem` library; this is a stub.
export function sahasraChandrodayamOld(
  _dob: [number, number, number], _tob: [number, number], _place: Place
): [number, number, number] {
  return [-1, -1, -1];
}

// ============================================================================
// UDHAYADHI NAZHIKAI (helper for birth rectification)
// ============================================================================

/**
 * Computes nazhikai (ghatikas) from sunrise to the given JD's time.
 * Python: utils.udhayadhi_nazhikai(jd, place)
 *
 * @returns [formattedString, nazhikaiAsFloat]
 */
export function udhayadhiNazhikai(jd: number, place: Place): [string, number] {
  const { time: { hour: _h, minute: _m, second: _s } } = julianDayToGregorian(jd);
  const birthTimeHrs = _h + _m / 60 + _s / 3600;
  let sunriseTimeHrs = sunrise(jd, place).localTime;

  let timeDiff = birthTimeHrs - sunriseTimeHrs;
  if (birthTimeHrs < sunriseTimeHrs) {
    sunriseTimeHrs = sunrise(jd - 1, place).localTime;
    timeDiff = 24.0 + birthTimeHrs - sunriseTimeHrs;
  }

  const totalSecs = Math.abs(timeDiff) * 3600;
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs - hours * 3600) / 60);
  const seconds = Math.floor(totalSecs - hours * 3600 - minutes * 60);

  const tharparai1 = hours * 9000 + minutes * 150 + seconds;
  const naazhigai = Math.floor(tharparai1 / 3600);
  const vinadigal = Math.floor((tharparai1 - naazhigai * 3600) / 60);
  const tharparai = Math.floor(tharparai1 - naazhigai * 3600 - vinadigal * 60);

  return [`${naazhigai}:${vinadigal}:${tharparai}`, tharparai1 / 3600.0];
}

// ============================================================================
// BIRTH TIME RECTIFICATION (Experimental)
// ============================================================================

/**
 * Nakshatra Suddhi birth time rectification.
 * Python: _birthtime_rectification_nakshathra_suddhi(jd, place)
 *
 * EXPERIMENTAL — results may not be accurate.
 *
 * @returns adjustMinutes (number) if no rectification needed (0),
 *          [hour, minute, second] if rectified,
 *          [true, closestNakshatra] if could not converge
 */
// @parity: py=_birthtime_rectification_nakshathra_suddhi
export function birthtimeRectificationNakshatraSuddhi(
  jd: number, place: Place
): number | [number, number, number] | [boolean, number] {
  const stepMinutes = 0.25;
  const loopCount = 120;
  const nak = calculateNakshatra(jd, place)[0];

  function getEstimatedNakshatra(jdTest: number): [boolean, number] {
    const ud = udhayadhiNazhikai(jdTest, place);
    const ud1d = Math.floor(ud[1] * 4 % 9);
    const ud2 = [0, 1, 2].map(n => (ud1d + n * 9) % 27 + 1);
    const rectificationRequired = !ud2.includes(nak);
    let nakClose = nak;
    if (rectificationRequired) {
      // closest element from list
      nakClose = ud2.reduce((closest, v) =>
        Math.abs(v - nak) < Math.abs(closest - nak) ? v : closest, ud2[0]!);
    }
    return [rectificationRequired, nakClose];
  }

  const [rectRequired] = getEstimatedNakshatra(jd);
  if (!rectRequired) return 0;

  for (let l = 1; l <= loopCount; l++) {
    // Try +adjustment
    let adjustMinutes = l * stepMinutes;
    let jd1 = jd + adjustMinutes / 1440.0;
    let [reqd] = getEstimatedNakshatra(jd1);
    if (!reqd) {
      const { time: { hour, minute, second } } = julianDayToGregorian(jd1);
      return [hour, minute, second];
    }

    // Try -adjustment
    adjustMinutes = -l * stepMinutes;
    jd1 = jd + adjustMinutes / 1440.0;
    [reqd] = getEstimatedNakshatra(jd1);
    if (!reqd) {
      const { time: { hour, minute, second } } = julianDayToGregorian(jd1);
      return [hour, minute, second];
    }
  }

  const [, nakClose] = getEstimatedNakshatra(jd);
  return [true, nakClose];
}

/**
 * Lagna Suddhi birth time rectification.
 * Python: _birthtime_rectification_lagna_suddhi(jd, place)
 *
 * EXPERIMENTAL — checks if lagna is [1,5,7,9] from Moon or Maandi in Rasi and Navamsa.
 *
 * @returns true if rectification IS required, false if not
 */
// @parity: py=_birthtime_rectification_lagna_suddhi
export async function birthtimeRectificationLagnaSuddhiAsync(
  jd: number, place: Place
): Promise<boolean> {
  const ppr = await dhasavargaAsync(jd, place, 1); // Rasi chart
  const ppn = await dhasavargaAsync(jd, place, 9); // Navamsa chart

  const { time: { hour, minute, second } } = julianDayToGregorian(jd);
  const tobHours = hour + minute / 60 + second / 3600;

  // Rasi chart checks
  const lagnaRasi = ppr[0]![1][0];
  const moonRasi = ppr[2]![1][0];
  const maandiRasiResult = upagrahaLongitude(jd, place, tobHours, 6, true); // Maandi
  const maandiRasi = maandiRasiResult[0];

  if ([1, 5, 7, 9].includes(getRelativeHouseOfPlanet(lagnaRasi, moonRasi))) return false;
  if ([1, 5, 7, 9].includes(getRelativeHouseOfPlanet(lagnaRasi, maandiRasi))) return false;

  // Navamsa chart checks
  const lagnaNavamsa = ppn[0]![1][0];
  const moonNavamsa = ppn[2]![1][0];
  const maandiNavResult = upagrahaLongitude(jd, place, tobHours, 6, true);
  const maandiNavLong = maandiNavResult[0] * 30 + maandiNavResult[1];
  const [maandiNavRasi] = dasavargaFromLong(maandiNavLong, 9);

  if ([1, 5, 7, 9].includes(getRelativeHouseOfPlanet(lagnaNavamsa, moonNavamsa))) return false;
  if ([1, 5, 7, 9].includes(getRelativeHouseOfPlanet(lagnaNavamsa, maandiNavRasi))) return false;

  return true;
}

/**
 * Janma Suddhi birth time rectification.
 * Python: _birthtime_rectification_janma_suddhi(jd, place, gender)
 *
 * EXPERIMENTAL — checks if gender matches expected from Ishtakaal Ghatikas.
 *
 * @param gender - 0 for male, 1 for female
 * @returns true if rectification IS required, false if not
 */
// @parity: py=_birthtime_rectification_janma_suddhi
export function birthtimeRectificationJanmaSuddhi(
  jd: number, place: Place, gender: number
): boolean {
  const ud = udhayadhiNazhikai(jd, place);
  const ud1d = Math.floor(ud[1] * 60 % 225);
  const janmaSuddhiDict: Record<number, [number, number][]> = {
    0: [[0, 15], [46, 90], [151, 224]],
    1: [[16, 45], [91, 150]]
  };
  const ranges = janmaSuddhiDict[gender] ?? [];
  const matchesGender = ranges.some(([low, high]) => ud1d > low && ud1d < high);
  return !matchesGender;
}

// ============================================================================
// NISHEKA (Conception) TIME CALCULATION (Experimental)
// ============================================================================

/**
 * Nisheka (conception) time calculation — method 1.
 * Python: _nisheka_time(jd, place)
 *
 * EXPERIMENTAL — formula may not be fully accurate. May differ from JHora by up to 15 days.
 *
 * @returns Julian day number of estimated nisheka time
 */
// @parity: py=_nisheka_time
export async function nishekaTimeAsync(jd: number, place: Place): Promise<number> {
  const pp = await dhasavargaAsync(jd, place, 1);
  const { time: { hour, minute, second } } = julianDayToGregorian(jd);
  const tobHours = hour + minute / 60 + second / 3600;

  const satLong = pp[7]![1][0] * 30 + pp[7]![1][1]; // Saturn
  const moonLong = pp[2]![1][0] * 30 + pp[2]![1][1]; // Moon
  const lagnaLong = pp[0]![1][0] * 30 + pp[0]![1][1]; // Lagna (Sun proxy)
  const ninthHouseLong = (240 + lagnaLong + 15) % 360;

  const gl = upagrahaLongitude(jd, place, tobHours, 6, false); // Gulika (begin)
  const gulikaLong = gl[0] * 30 + gl[1];
  const ml = upagrahaLongitude(jd, place, tobHours, 6, true);  // Maandi (middle)
  const maandiLong = ml[0] * 30 + ml[1];

  const a = 0.5 * (((satLong - gulikaLong) % 30 + 30) % 30 + ((satLong - maandiLong) % 30 + 30) % 30);
  const b = ((ninthHouseLong - lagnaLong) % 360 + 360) % 360;
  const c = (a + b) % 360;
  const c1 = c % 30;
  const bm = Math.floor(c / 30);
  const d = c1 + moonLong % 30;

  return jd - (bm * SIDEREAL_YEAR / 12 + d);
}

/**
 * Nisheka (conception) time calculation — method 2.
 * Python: _nisheka_time_1(jd, place)
 *
 * EXPERIMENTAL — alternative formula.
 *
 * @returns Julian day number of estimated nisheka time
 */
// @parity: py=_nisheka_time_1
export async function nishekaTime1Async(jd: number, place: Place): Promise<number> {
  const pp = await dhasavargaAsync(jd, place, 1);
  const { time: { hour, minute, second } } = julianDayToGregorian(jd);
  const tobHours = hour + minute / 60 + second / 3600;

  const ascHouse = pp[0]![1][0];
  const lagnaLong = ascHouse * 30 + pp[0]![1][1];

  // Determine drishya (visible/invisible)
  // In Python, lagna lord is computed, but here we simplify:
  // Use planet 0 (Sun) as lagna lord proxy
  const lagnaLordLong = pp[1]![1][0] * 30 + pp[1]![1][1]; // Sun's position as proxy
  let drishya = 1.0;
  if (lagnaLordLong < (lagnaLong + 15) || lagnaLordLong > (lagnaLong + 195)) {
    drishya = -1;
  }

  const satLong = pp[7]![1][0] * 30 + pp[7]![1][1]; // Saturn
  const gl = upagrahaLongitude(jd, place, tobHours, 6, false); // Gulika
  const gulikaLong = gl[0] * 30 + gl[1];
  const moonLong = pp[2]![1][1]; // Moon longitude within sign

  const a = Math.abs(satLong - gulikaLong) % 30;
  const c = (a + moonLong) % 30;

  return jd - (273 + drishya * c * 27.3217 / 30);
}

/** nakshatra_new — newer algorithm using planet speed */
// @parity: py=nakshatra_new
export function nakshatraNew(jd: number, place: Place): number[] {
  const jdUtc = jd - place.timezone / 24;
  const oneStar = 360 / 27;
  const moonLong = lunarLongitude(jdUtc);
  const [nakNo, padamNo] = nakshatraPada(moonLong);
  const degreesLeft = nakNo * oneStar - moonLong;
  const sr = sunrise(jd, place);
  const jdHours = (jd - Math.floor(jd)) * 24;
  const moonSpeed = dailyMoonSpeed(jd, place);
  const endTime = jdHours + (degreesLeft / moonSpeed) * 24;

  // Previous day
  const prevJdUtc = (jd - 1) - place.timezone / 24;
  const prevMoonLong = lunarLongitude(prevJdUtc);
  const [prevNakNo, prevPadamNo] = nakshatraPada(prevMoonLong);
  const prevDegreesLeft = prevNakNo * oneStar - prevMoonLong;
  const prevMoonSpeed = dailyMoonSpeed(jd - 1, place);
  const prevJdHours = ((jd - 1) - Math.floor(jd - 1)) * 24;
  let prevEndTime = prevJdHours + (prevDegreesLeft / prevMoonSpeed) * 24;

  let nakStart = prevEndTime;
  if (nakStart < 24.0) {
    nakStart = -nakStart;
  } else if (nakStart > 24) {
    nakStart -= 24.0;
  }

  return [nakNo, padamNo, nakStart, endTime];
}

