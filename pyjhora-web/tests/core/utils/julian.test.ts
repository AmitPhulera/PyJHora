/**
 * Tests for Julian Day utilities
 * Python reference: utils.py julian_day_number, jd_to_gregorian, etc.
 */
import { describe, expect, it } from 'vitest';
import {
  gregorianToJulianDay,
  julianDayToGregorian,
  toUtc,
  fromUtc,
  isLeapYear,
  daysInMonth,
  weekday,
  daysToYMD,
} from '../../../src/core/utils/julian';

describe('Julian Day Conversions', () => {
  describe('gregorianToJulianDay', () => {
    it('should convert J2000 epoch correctly', () => {
      // J2000.0 = 2000-01-01 12:00:00 TT => JD 2451545.0
      const jd = gregorianToJulianDay({ year: 2000, month: 1, day: 1 }, { hour: 12, minute: 0, second: 0 });
      expect(jd).toBeCloseTo(2451545.0, 4);
    });

    it('should handle known historical date', () => {
      // 1996-12-07 noon => JD ~2450425.0
      const jd = gregorianToJulianDay({ year: 1996, month: 12, day: 7 });
      expect(jd).toBeCloseTo(2450425.0, 0);
    });

    it('should handle BC dates', () => {
      // 4713 BC Jan 1 noon (Julian) => JD 0.0 (but in Gregorian calendar it's different)
      const jd = gregorianToJulianDay({ year: -3114, month: 1, day: 23 });
      expect(jd).toBeGreaterThan(0);
    });
  });

  describe('julianDayToGregorian', () => {
    it('should round-trip with gregorianToJulianDay', () => {
      const original = { year: 2025, month: 3, day: 15 };
      const time = { hour: 10, minute: 30, second: 0 };
      const jd = gregorianToJulianDay(original, time);
      const { date, time: t } = julianDayToGregorian(jd);
      expect(date.year).toBe(2025);
      expect(date.month).toBe(3);
      expect(date.day).toBe(15);
      expect(t.hour).toBe(10);
    });

    it('should convert J2000 back', () => {
      const { date } = julianDayToGregorian(2451545.0);
      expect(date.year).toBe(2000);
      expect(date.month).toBe(1);
      expect(date.day).toBe(1);
    });
  });

  describe('toUtc / fromUtc', () => {
    it('should convert to UTC by subtracting timezone offset', () => {
      const localJd = 2451545.0;
      const utcJd = toUtc(localJd, 5.5); // IST
      expect(utcJd).toBeCloseTo(localJd - 5.5 / 24);
    });

    it('should convert from UTC by adding timezone offset', () => {
      const utcJd = 2451545.0;
      const localJd = fromUtc(utcJd, 5.5);
      expect(localJd).toBeCloseTo(utcJd + 5.5 / 24);
    });

    it('should round-trip', () => {
      const original = 2451545.0;
      const tz = -5;
      expect(fromUtc(toUtc(original, tz), tz)).toBeCloseTo(original);
    });
  });
});

describe('Date Utilities', () => {
  describe('isLeapYear', () => {
    it('should identify leap years', () => {
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2004)).toBe(true);
      expect(isLeapYear(1900)).toBe(false);
      expect(isLeapYear(2100)).toBe(false);
    });
  });

  describe('daysInMonth', () => {
    it('should return correct days', () => {
      expect(daysInMonth(2025, 1)).toBe(31);
      expect(daysInMonth(2025, 2)).toBe(28);
      expect(daysInMonth(2024, 2)).toBe(29);
      expect(daysInMonth(2025, 4)).toBe(30);
    });
  });

  describe('weekday', () => {
    it('should return correct weekday', () => {
      // 2000-01-01 (Saturday) => JD 2451545.0 noon
      // weekday: 0=Sun, 6=Sat
      const jd = gregorianToJulianDay({ year: 2000, month: 1, day: 1 });
      const wd = weekday(jd);
      expect(wd).toBe(6); // Saturday
    });
  });

  describe('daysToYMD', () => {
    it('should break down days into years, months, days', () => {
      const result = daysToYMD(400);
      expect(result.years).toBe(1);
      expect(result.months).toBeGreaterThanOrEqual(0);
      expect(result.days).toBeGreaterThanOrEqual(0);
    });

    it('should handle less than a year', () => {
      const result = daysToYMD(45);
      expect(result.years).toBe(0);
      expect(result.months).toBe(1);
    });
  });
});
