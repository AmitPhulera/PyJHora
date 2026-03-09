/**
 * Tests for festival database lookup
 *
 * Verifies that the festival data is correctly loaded and that
 * lookup/search functions work as expected.
 */

import { describe, expect, it } from 'vitest';
import {
  FESTIVAL_DATA,
  lookupFestivals,
  searchFestivals,
  getFestivalName,
  type FestivalEntry,
} from '@core/data/festivals';
import {
  getFestivalsOfTheDay,
} from '@core/panchanga/vratha';
import type { Place } from '@core/types';
import { gregorianToJulianDay } from '@core/utils/julian';

// ============================================================================
// TEST DATA
// ============================================================================

const chennai: Place = { name: 'Chennai', latitude: 13.0878, longitude: 80.2785, timezone: 5.5 };

// ============================================================================
// FESTIVAL DATA INTEGRITY
// ============================================================================

describe('Festival Data - Integrity', () => {
  it('should have festival entries loaded', () => {
    expect(FESTIVAL_DATA.length).toBeGreaterThan(100);
  });

  it('should have 198 entries matching the CSV (199 lines minus header)', () => {
    expect(FESTIVAL_DATA.length).toBe(198);
  });

  it('every entry should have required fields', () => {
    for (const entry of FESTIVAL_DATA) {
      expect(typeof entry.name).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.en).toBe('string');
      expect(entry.en.length).toBeGreaterThan(0);
      expect(typeof entry.calendarType).toBe('number');
      expect([0, 1, 2]).toContain(entry.calendarType);
      expect(typeof entry.icon).toBe('string');
    }
  });

  it('should have multilingual names for all entries', () => {
    for (const entry of FESTIVAL_DATA) {
      expect(entry.ta.length).toBeGreaterThan(0);
      expect(entry.te.length).toBeGreaterThan(0);
      expect(entry.ka.length).toBeGreaterThan(0);
      expect(entry.hi.length).toBeGreaterThan(0);
      expect(entry.ml.length).toBeGreaterThan(0);
    }
  });

  it('tithi values should be 1-30 or null', () => {
    for (const entry of FESTIVAL_DATA) {
      if (entry.tithi !== null) {
        expect(entry.tithi).toBeGreaterThanOrEqual(1);
        expect(entry.tithi).toBeLessThanOrEqual(30);
      }
    }
  });

  it('nakshatra values should be 1-27 or null', () => {
    for (const entry of FESTIVAL_DATA) {
      if (entry.nakshatra !== null) {
        expect(entry.nakshatra).toBeGreaterThanOrEqual(1);
        expect(entry.nakshatra).toBeLessThanOrEqual(27);
      }
    }
  });

  it('tamilMonth values should be 1-12 or null', () => {
    for (const entry of FESTIVAL_DATA) {
      if (entry.tamilMonth !== null) {
        expect(entry.tamilMonth).toBeGreaterThanOrEqual(1);
        expect(entry.tamilMonth).toBeLessThanOrEqual(12);
      }
    }
  });
});

// ============================================================================
// KNOWN FESTIVALS
// ============================================================================

describe('Festival Data - Known Festivals', () => {
  it('should contain Diwali', () => {
    const results = searchFestivals('Diwali');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].en).toContain('Diwali');
    expect(results[0].ta).toBe('\u0BA4\u0BC0\u0BAA\u0BBE\u0BB5\u0BB3\u0BBF'); // தீபாவளி
  });

  it('should contain Pongal', () => {
    const results = searchFestivals('Pongal');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const pongal = results.find((f) => f.en === 'Pongal');
    expect(pongal).toBeDefined();
    expect(pongal!.tamilMonth).toBe(10);
    expect(pongal!.tamilDay).toBe(1);
  });

  it('should contain Holi', () => {
    const results = searchFestivals('Holi');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tithi).toBe(15);
  });

  it('should contain Maha Shivaratri', () => {
    const results = searchFestivals('Maha Shivaratri');
    expect(results.length).toBe(1);
    expect(results[0].tithi).toBe(29);
    expect(results[0].tamilMonth).toBe(11);
  });

  it('should contain Rama Navami', () => {
    const results = searchFestivals('Rama Navami');
    expect(results.length).toBe(1);
    expect(results[0].tithi).toBe(9);
    expect(results[0].calendarType).toBe(1);
  });

  it('should contain Vinayaka Chaturthi', () => {
    const results = searchFestivals('Vinayaka Chaturthi');
    expect(results.length).toBe(1);
    expect(results[0].tithi).toBe(4);
    expect(results[0].tamilMonth).toBe(5);
  });
});

// ============================================================================
// LOOKUP BY CRITERIA
// ============================================================================

describe('Festival Data - lookupFestivals', () => {
  it('should find festivals by tithi', () => {
    const results = lookupFestivals({ tithi: 15 });
    expect(results.length).toBeGreaterThan(0);
    // Entries either have tithi=15 or tithi=null (matching any tithi, per Python logic)
    for (const r of results) {
      expect(r.tithi === 15 || r.tithi === null).toBe(true);
    }
  });

  it('should find festivals by tithi array', () => {
    const results = lookupFestivals({ tithi: [13, 28] });
    expect(results.length).toBeGreaterThanOrEqual(2);
    // Should find Pradosham entries
    const pradosham = results.filter((r) => r.en.includes('Pradosham'));
    expect(pradosham.length).toBe(2);
  });

  it('should find festivals by tamilMonth and tamilDay', () => {
    const results = lookupFestivals({ tamilMonth: 10, tamilDay: 1 });
    expect(results.length).toBeGreaterThanOrEqual(1);
    // Pongal and Makara Sankranthi are on month 10, day 1
    const names = results.map((r) => r.en);
    expect(names.some((n) => n.includes('Pongal') || n.includes('Sankranthi'))).toBe(true);
  });

  it('should filter by calendarType', () => {
    const solarOnly = lookupFestivals({ tithi: 15, calendarType: 0 });
    const purniOnly = lookupFestivals({ tithi: 15, calendarType: 2 });
    // All solar results have calendarType 0
    for (const r of solarOnly) {
      expect(r.calendarType).toBe(0);
    }
    for (const r of purniOnly) {
      expect(r.calendarType).toBe(2);
    }
  });

  it('should find Ekadashi festivals by tithi 11', () => {
    const results = lookupFestivals({ tithi: 11, calendarType: 2 });
    expect(results.length).toBeGreaterThan(5);
    const ekadashis = results.filter((r) => r.en.toLowerCase().includes('ekadashi'));
    expect(ekadashis.length).toBeGreaterThan(5);
  });

  it('should return empty for impossible combined criteria', () => {
    // Use criteria that no festival can match: tithi 99 AND tamilMonth 99
    // Note: festivals with null tithi still pass the tithi check (Python behavior),
    // so we also need an impossible month.
    const results = lookupFestivals({ tithi: 99, tamilMonth: 99 });
    expect(results.length).toBe(0);
  });
});

// ============================================================================
// SEARCH BY NAME
// ============================================================================

describe('Festival Data - searchFestivals', () => {
  it('should search case-insensitively', () => {
    const r1 = searchFestivals('diwali');
    const r2 = searchFestivals('DIWALI');
    const r3 = searchFestivals('Diwali');
    expect(r1.length).toBe(r2.length);
    expect(r2.length).toBe(r3.length);
    expect(r1.length).toBeGreaterThan(0);
  });

  it('should search partial names', () => {
    const results = searchFestivals('Ekadashi');
    expect(results.length).toBeGreaterThan(10);
  });

  it('should return empty for non-existent festival', () => {
    const results = searchFestivals('Xyzzy Festival That Does Not Exist');
    expect(results.length).toBe(0);
  });
});

// ============================================================================
// GET FESTIVAL NAME
// ============================================================================

describe('Festival Data - getFestivalName', () => {
  it('should return English name by default', () => {
    const diwali = searchFestivals('Diwali')[0];
    expect(getFestivalName(diwali)).toContain('Diwali');
  });

  it('should return Tamil name', () => {
    const diwali = searchFestivals('Diwali')[0];
    const tamilName = getFestivalName(diwali, 'ta');
    expect(tamilName).toBe('\u0BA4\u0BC0\u0BAA\u0BBE\u0BB5\u0BB3\u0BBF'); // தீபாவளி
  });

  it('should return Hindi name', () => {
    const diwali = searchFestivals('Diwali')[0];
    const hindiName = getFestivalName(diwali, 'hi');
    expect(hindiName.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// GET FESTIVALS OF THE DAY
// ============================================================================

describe('Festival Data - getFestivalsOfTheDay', () => {
  it('should return an array (possibly empty) for any given day', () => {
    const jd = gregorianToJulianDay(
      { year: 2025, month: 1, day: 15 },
      { hour: 6, minute: 0, second: 0 },
    );
    const results = getFestivalsOfTheDay(jd, chennai);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should filter by festival name substring', () => {
    const jd = gregorianToJulianDay(
      { year: 2025, month: 1, day: 15 },
      { hour: 6, minute: 0, second: 0 },
    );
    const results = getFestivalsOfTheDay(jd, chennai, 'Ekadashi');
    // All results (if any) should contain "Ekadashi" in the English name
    for (const r of results) {
      expect(r.en.toLowerCase()).toContain('ekadashi');
    }
  });

  it('returned entries should have valid structure', () => {
    const jd = gregorianToJulianDay(
      { year: 2025, month: 3, day: 14 },
      { hour: 6, minute: 0, second: 0 },
    );
    const results = getFestivalsOfTheDay(jd, chennai);
    for (const r of results) {
      expect(typeof r.name).toBe('string');
      expect(typeof r.en).toBe('string');
      expect(typeof r.ta).toBe('string');
      expect(typeof r.calendarType).toBe('number');
    }
  });
});
