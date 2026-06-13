/**
 * Tests for panchanga date utilities
 * Python reference: utils.py panchanga date functions
 */
import { describe, expect, it } from 'vitest';
import {
  nextPanchangaDay,
  previousPanchangaDay,
  panchangaDateDiff,
  panchangaTimeDelta,
  parseDateString,
  dateDiffYMD,
  getAgeFrom,
} from '../../../src/core/utils/panchanga-date';

describe('Panchanga Date Navigation', () => {
  describe('nextPanchangaDay', () => {
    it('should add 1 day by default', () => {
      const result = nextPanchangaDay({ year: 2025, month: 1, day: 15 });
      expect(result).toEqual([2025, 1, 16]);
    });

    it('should handle month boundaries', () => {
      const result = nextPanchangaDay({ year: 2025, month: 1, day: 31 });
      expect(result).toEqual([2025, 2, 1]);
    });

    it('should handle year boundaries', () => {
      const result = nextPanchangaDay({ year: 2025, month: 12, day: 31 });
      expect(result).toEqual([2026, 1, 1]);
    });

    it('should add multiple days', () => {
      const result = nextPanchangaDay({ year: 2025, month: 1, day: 1 }, 10);
      expect(result[2]).toBe(11);
    });
  });

  describe('previousPanchangaDay', () => {
    it('should subtract 1 day by default', () => {
      const result = previousPanchangaDay({ year: 2025, month: 1, day: 15 });
      expect(result[2]).toBe(14);
    });

    it('should handle month boundaries', () => {
      const result = previousPanchangaDay({ year: 2025, month: 2, day: 1 });
      expect(result).toEqual([2025, 1, 31]);
    });
  });
});

describe('Date Differences', () => {
  describe('panchangaTimeDelta', () => {
    it('should return days between dates', () => {
      const d1 = { year: 2025, month: 1, day: 15 };
      const d2 = { year: 2025, month: 1, day: 10 };
      expect(panchangaTimeDelta(d1, d2)).toBeCloseTo(5, 0);
    });

    it('should return negative for earlier first date', () => {
      const d1 = { year: 2025, month: 1, day: 1 };
      const d2 = { year: 2025, month: 1, day: 10 };
      expect(panchangaTimeDelta(d1, d2)).toBeCloseTo(-9, 0);
    });
  });

  describe('panchangaDateDiff', () => {
    it('should calculate years, months, days difference', () => {
      const d1 = { year: 2020, month: 1, day: 1 };
      const d2 = { year: 2025, month: 1, day: 1 };
      const [years] = panchangaDateDiff(d1, d2);
      expect(years).toBeGreaterThanOrEqual(4);
      expect(years).toBeLessThanOrEqual(5);
    });
  });

  describe('dateDiffYMD', () => {
    it('should compute calendar difference', () => {
      const start = { year: 2020, month: 3, day: 15 };
      const end = { year: 2023, month: 6, day: 20 };
      const diff = dateDiffYMD(start, end);
      expect(diff.years).toBe(3);
      expect(diff.months).toBe(3);
      expect(diff.days).toBe(5);
    });

    it('should handle day borrowing', () => {
      const start = { year: 2025, month: 1, day: 31 };
      const end = { year: 2025, month: 2, day: 15 };
      const diff = dateDiffYMD(start, end);
      expect(diff.years).toBe(0);
      expect(diff.months).toBe(0);
      expect(diff.days).toBe(15);
    });
  });
});

describe('parseDateString', () => {
  it('should parse YYYY-MM-DD', () => {
    const result = parseDateString('2025-01-15');
    expect(result).toEqual({ year: 2025, month: 1, day: 15 });
  });

  it('should parse YYYY,MM,DD', () => {
    const result = parseDateString('2025,01,15');
    expect(result).toEqual({ year: 2025, month: 1, day: 15 });
  });

  it('should parse DD/MM/YYYY', () => {
    const result = parseDateString('15/01/2025');
    expect(result).toEqual({ year: 2025, month: 1, day: 15 });
  });

  it('should parse BCE dates with leading minus', () => {
    const result = parseDateString('-3114,01,01');
    expect(result).not.toBeNull();
    expect(result!.year).toBe(-3114);
  });

  it('should return null for invalid input', () => {
    expect(parseDateString('not a date')).toBeNull();
  });
});

describe('getAgeFrom', () => {
  it('should calculate age from DOB', () => {
    const dob = { year: 1990, month: 6, day: 15 };
    const tob = { hour: 10, minute: 30, second: 0 };
    const currentDate = { year: 2025, month: 6, day: 15 };

    const age = getAgeFrom(dob, tob, currentDate);
    expect(age[0]).toBeGreaterThan(30);
  });

  it('should return 1,1,1 if current date is before DOB', () => {
    const dob = { year: 2030, month: 1, day: 1 };
    const tob = { hour: 10, minute: 0, second: 0 };
    const currentDate = { year: 2025, month: 1, day: 1 };

    const age = getAgeFrom(dob, tob, currentDate);
    expect(age).toEqual([1, 1, 1]);
  });
});
