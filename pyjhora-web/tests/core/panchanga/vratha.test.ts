/**
 * Tests for Vratha (observance) date calculations
 * Ported from PyJHora vratha.py
 *
 * Tests basic tithi-date, nakshatra-date, and special vratha calculations.
 */

import { describe, expect, it } from 'vitest';
import {
  tithiDates,
  nakshatraDates,
  yogaDates,
  amavasyaDates,
  pournamiDates,
  ekadhashiDates,
  shivarathriDates,
  pradoshamDates,
  durgashtamiDates,
  kaalashtamiDates,
  sashtiDates,
  sankataharaChathurthiDates,
  specialVrathaDates,
  SPECIAL_VRATHA_MAP,
  MANVAADHI_TITHIS,
  ASHTAKA_TITHIS,
  YUGADHI_TITHIS,
  PRADOSHAM_SUNSET_OFFSET,
  EKADHASHI_LIST,
} from '@core/panchanga/vratha';
import type { Place, JhoraDate } from '@core/types';

// ============================================================================
// TEST DATA
// ============================================================================

const chennai: Place = { name: 'Chennai', latitude: 13.0878, longitude: 80.2785, timezone: 5.5 };
const startDate: JhoraDate = { year: 2025, month: 1, day: 1 };

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Vratha - Constants', () => {
  it('SPECIAL_VRATHA_MAP should have all expected keys', () => {
    const expectedKeys = [
      'pradosham', 'sankranti', 'amavasya', 'pournami', 'ekadhashi',
      'sashti', 'sankatahara_chathurthi', 'vinayaka_chathurthi',
      'shivarathri', 'chandra_dharshan', 'moondraam_pirai', 'srartha',
      'ashtaka', 'manvaadhi', 'yugadhi', 'mahalaya_paksha',
      'sathyanarayana_puja', 'durgashtami', 'kaalashtami',
    ];
    for (const key of expectedKeys) {
      expect(SPECIAL_VRATHA_MAP).toHaveProperty(key);
    }
  });

  it('EKADHASHI_LIST should have 23 entries', () => {
    expect(EKADHASHI_LIST).toHaveLength(23);
  });

  it('PRADOSHAM_SUNSET_OFFSET should be [-1.5, 1.5]', () => {
    expect(PRADOSHAM_SUNSET_OFFSET).toEqual([-1.5, 1.5]);
  });

  it('MANVAADHI_TITHIS should have 14 entries', () => {
    expect(Object.keys(MANVAADHI_TITHIS)).toHaveLength(14);
  });

  it('ASHTAKA_TITHIS should have 3 entries', () => {
    expect(Object.keys(ASHTAKA_TITHIS)).toHaveLength(3);
  });

  it('YUGADHI_TITHIS should have 4 entries', () => {
    expect(Object.keys(YUGADHI_TITHIS)).toHaveLength(4);
  });
});

// ============================================================================
// TITHI DATES
// ============================================================================

describe('Vratha - Tithi Dates', () => {
  it('should find next amavasya (tithi 30)', () => {
    const results = tithiDates(chennai, startDate, null, [30]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const first = results[0];
    expect(first.date).toHaveLength(3);
    expect(first.date[0]).toBe(2025);
    expect(first.tag).toContain('Tithi 30');
  });

  it('should find next pournami (tithi 15)', () => {
    const results = tithiDates(chennai, startDate, null, [15]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tag).toContain('Tithi 15');
  });

  it('should find multiple tithis when end date is given', () => {
    const endDate: JhoraDate = { year: 2025, month: 6, day: 30 };
    const results = tithiDates(chennai, startDate, endDate, [30]);
    // There should be roughly 6 amavasyas in 6 months
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results.length).toBeLessThanOrEqual(8);
  });
});

// ============================================================================
// SPECIAL VRATHA CONVENIENCE FUNCTIONS
// ============================================================================

describe('Vratha - Convenience Functions', () => {
  it('amavasyaDates should find next amavasya', () => {
    const results = amavasyaDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tag).toContain('Amavasya');
  });

  it('pournamiDates should find next pournami', () => {
    const results = pournamiDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tag).toContain('Pournami');
  });

  it('ekadhashiDates should find next ekadashi', () => {
    const results = ekadhashiDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tag).toContain('Ekadashi');
  });

  it('shivarathriDates should find next shivarathri', () => {
    const results = shivarathriDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tag).toContain('Shivarathri');
  });

  it('sashtiDates should find next sashti', () => {
    const results = sashtiDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('sankataharaChathurthiDates should find next sankatahara chathurthi', () => {
    const results = sankataharaChathurthiDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('durgashtamiDates should find next durgashtami', () => {
    const results = durgashtamiDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('kaalashtamiDates should find next kaalashtami', () => {
    const results = kaalashtamiDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// PRADOSHAM
// ============================================================================

describe('Vratha - Pradosham', () => {
  it('should find next pradosham with day name', () => {
    const results = pradoshamDates(chennai, startDate, null);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tag).toContain('Pradosham');
    // Pradosham times should be around sunset
    expect(results[0].startTime).toBeGreaterThan(10);
    expect(results[0].endTime).toBeGreaterThan(results[0].startTime);
  });
});

// ============================================================================
// SPECIAL VRATHA DISPATCHER
// ============================================================================

describe('Vratha - specialVrathaDates dispatcher', () => {
  it('should return null for unknown vratha type', () => {
    const results = specialVrathaDates(chennai, startDate, null, 'unknown_vratha');
    expect(results).toBeNull();
  });

  it('should dispatch pradosham correctly', () => {
    const results = specialVrathaDates(chennai, startDate, null, 'pradosham');
    expect(results).not.toBeNull();
    expect(results!.length).toBeGreaterThanOrEqual(1);
  });

  it('should dispatch amavasya correctly', () => {
    const results = specialVrathaDates(chennai, startDate, null, 'amavasya');
    expect(results).not.toBeNull();
    expect(results!.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// NAKSHATRA & YOGA DATES
// ============================================================================

describe('Vratha - Nakshatra Dates', () => {
  it('should find next occurrence of a given nakshatra', () => {
    // Look for Rohini (4)
    const results = nakshatraDates(chennai, startDate, null, [4]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].date[0]).toBe(2025);
  });
});

describe('Vratha - Yoga Dates', () => {
  it('should find next occurrence of a given yoga', () => {
    // Look for Vyatipata (17) or Vaidhriti (27)
    const results = yogaDates(chennai, startDate, null, [17, 27]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].date[0]).toBe(2025);
  });
});

// ============================================================================
// VRATHA DATE STRUCTURE
// ============================================================================

describe('Vratha - VrathaDate structure', () => {
  it('returned dates should have correct structure', () => {
    const results = tithiDates(chennai, startDate, null, [15]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const vd = results[0];
    // date should be [year, month, day]
    expect(vd.date).toHaveLength(3);
    expect(typeof vd.date[0]).toBe('number');
    expect(typeof vd.date[1]).toBe('number');
    expect(typeof vd.date[2]).toBe('number');
    // startTime and endTime should be numbers (hours)
    expect(typeof vd.startTime).toBe('number');
    expect(typeof vd.endTime).toBe('number');
    // tag should be a non-empty string
    expect(typeof vd.tag).toBe('string');
    expect(vd.tag.length).toBeGreaterThan(0);
  });
});
