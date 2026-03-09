/**
 * Panchanga date manipulation utilities ported from Python utils.py
 *
 * Functions for date arithmetic, date differencing, and
 * conversion between panchanga dates and Julian days.
 */

import type { JhoraDate, JhoraTime } from '../types';
import { gregorianToJulianDay, julianDayToGregorian, daysInMonth } from './julian';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Sidereal year in days (used for year calculations in dasha/panchanga) */
export const SIDEREAL_YEAR = 365.256363;

// ============================================================================
// DATE NAVIGATION
// ============================================================================

/**
 * Get the next panchanga day (add days to a date).
 *
 * Python: next_panchanga_day(panchanga_date, add_days=1)
 *
 * @param date - Starting date
 * @param addDays - Number of days to add (default 1)
 * @returns New date
 */
export function nextPanchangaDay(date: JhoraDate, addDays = 1): JhoraDate {
  const jd = gregorianToJulianDay(date, { hour: 12, minute: 0, second: 0 });
  const newJd = jd + addDays;
  const result = julianDayToGregorian(newJd);
  return result.date;
}

/**
 * Get the previous panchanga day (subtract days from a date).
 *
 * Python: previous_panchanga_day(panchanga_date, minus_days=1)
 *
 * @param date - Starting date
 * @param minusDays - Number of days to subtract (default 1)
 * @returns New date
 */
export function previousPanchangaDay(date: JhoraDate, minusDays = 1): JhoraDate {
  return nextPanchangaDay(date, -minusDays);
}

// ============================================================================
// DATE DIFFERENCES
// ============================================================================

/**
 * Calculate difference between two dates in years, months, and days.
 *
 * Python: panchanga_date_diff(panchanga_date1, panchanga_date2)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Object with years, months, days
 */
export function panchangaDateDiff(
  date1: JhoraDate,
  date2: JhoraDate,
): { years: number; months: number; days: number } {
  const jd1 = gregorianToJulianDay(date1, { hour: 12, minute: 0, second: 0 });
  const jd2 = gregorianToJulianDay(date2, { hour: 12, minute: 0, second: 0 });
  const totalDays = jd2 - jd1;

  const years = Math.floor(totalDays / SIDEREAL_YEAR);
  const remainAfterYears = totalDays - years * SIDEREAL_YEAR;
  const months = Math.floor(remainAfterYears / (SIDEREAL_YEAR / 12));
  const days = Math.round(remainAfterYears - months * (SIDEREAL_YEAR / 12));

  return { years, months, days };
}

/**
 * Calculate difference between two dates in days.
 *
 * Python: panchanga_time_delta(panchanga_date1, panchanga_date2)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Difference in days (date1 - date2)
 */
export function panchangaTimeDelta(date1: JhoraDate, date2: JhoraDate): number {
  const jd1 = gregorianToJulianDay(date1, { hour: 12, minute: 0, second: 0 });
  const jd2 = gregorianToJulianDay(date2, { hour: 12, minute: 0, second: 0 });
  return jd1 - jd2;
}

// ============================================================================
// DATE-TIME STRING CONVERSION
// ============================================================================

/**
 * Convert a date-time string in various formats to a JhoraDate tuple.
 * Supports multiple common date formats.
 *
 * Python: get_year_month_day_from_date_format(date_text)
 *
 * @param dateText - Date string like "2025-01-15", "15/01/2025", "2025,01,15"
 * @returns JhoraDate or null if unparseable
 */
export function parseDateString(dateText: string): JhoraDate | null {
  let text = dateText.trim();
  let isBce = false;

  // Detect BCE from leading minus
  const hyphenCount = (text.match(/-/g) ?? []).length;
  if (hyphenCount >= 3 || (hyphenCount === 1 && !text.includes('/') && !text.includes(','))) {
    // Could be BCE if starts with minus
    if (text.startsWith('-')) {
      isBce = true;
      text = text.substring(1);
    }
  }

  // Try common formats
  const patterns: Array<{ regex: RegExp; order: 'ymd' | 'dmy' | 'mdy' }> = [
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, order: 'ymd' },
    { regex: /^(\d{4}),(\d{1,2}),(\d{1,2})$/, order: 'ymd' },
    { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, order: 'ymd' },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: 'dmy' },
    { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: 'dmy' },
  ];

  for (const { regex, order } of patterns) {
    const match = text.match(regex);
    if (match) {
      let year: number, month: number, day: number;
      if (order === 'ymd') {
        year = parseInt(match[1]!, 10);
        month = parseInt(match[2]!, 10);
        day = parseInt(match[3]!, 10);
      } else if (order === 'dmy') {
        day = parseInt(match[1]!, 10);
        month = parseInt(match[2]!, 10);
        year = parseInt(match[3]!, 10);
      } else {
        month = parseInt(match[1]!, 10);
        day = parseInt(match[2]!, 10);
        year = parseInt(match[3]!, 10);
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        if (isBce) year = -year;
        return { year, month, day };
      }
    }
  }

  // Fallback: try comma-separated numbers
  const parts = text.split(',').map((s) => parseInt(s.trim(), 10));
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
    let [year, month, day] = parts as [number, number, number];
    if (isBce) year = -year;
    return { year, month, day };
  }

  return null;
}

// ============================================================================
// DOB AGE CALCULATION
// ============================================================================

/**
 * Get age in years, months, and 60-hour periods from date of birth.
 *
 * Python: get_dob_years_months_60hrs_from_today(dob, tob)
 *
 * @param dob - Date of birth
 * @param tob - Time of birth
 * @param currentDate - Current date (default: today)
 * @returns Object with years, months, and 60-hour periods
 */
export function getAgeFrom(
  dob: JhoraDate,
  tob: JhoraTime,
  currentDate?: JhoraDate,
): { years: number; months: number; sixtyHours: number } {
  const now = currentDate ?? (() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  })();

  const jdDob = gregorianToJulianDay(dob, tob);
  const jdNow = gregorianToJulianDay(now, tob);

  if (jdNow > jdDob) {
    const totalDays = jdNow - jdDob;
    const years = Math.floor(totalDays / SIDEREAL_YEAR);
    const remainDays = totalDays % SIDEREAL_YEAR;
    const months = Math.floor(remainDays / 30);
    const dayRemainder = remainDays % 30;
    const sixtyHours = Math.floor(dayRemainder / 2.5);
    return { years: years + 1, months: months + 1, sixtyHours };
  }

  return { years: 1, months: 1, sixtyHours: 1 };
}

// ============================================================================
// DATE DIFF IN YEARS/MONTHS/DAYS (relative delta)
// ============================================================================

/**
 * Calculate date difference as years, months, days using calendar arithmetic.
 * More accurate than Julian day division for human-readable age.
 *
 * Python: date_diff_in_years_months_days(start_date_str, end_date_str)
 *
 * @param start - Start date
 * @param end - End date
 * @returns Object with years, months, days
 */
export function dateDiffYMD(
  start: JhoraDate,
  end: JhoraDate,
): { years: number; months: number; days: number } {
  let years = end.year - start.year;
  let months = end.month - start.month;
  let days = end.day - start.day;

  if (days < 0) {
    months -= 1;
    // Days in the previous month of the end date
    const prevMonth = end.month === 1 ? 12 : end.month - 1;
    const prevMonthYear = end.month === 1 ? end.year - 1 : end.year;
    days += daysInMonth(prevMonthYear, prevMonth);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}
