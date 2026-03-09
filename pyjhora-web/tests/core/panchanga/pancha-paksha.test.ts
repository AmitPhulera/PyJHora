/**
 * Tests for Pancha Paksha Sastra module
 * Ported from PyJHora pancha_paksha.py
 */

import { describe, expect, it } from 'vitest';
import {
  getBirthNakshatra,
  getPaksha,
  getBirthBirdFromNakshatra,
  getMatchingPanchaPakshiData,
  constructPanchaPakshiInformation,
  PANCHA_PAKSHI_BIRDS,
  PANCHA_PAKSHI_ACTIVITIES,
  PANCHA_PAKSHI_STARS_BIRDS_PAKSHA,
  PANCHA_PAKSHI_DURATION_LIST,
  PP_RELATIONS,
  PP_EFFECTS,
} from '@core/panchanga/pancha-paksha';
import type { Place, JhoraDate, JhoraTime } from '@core/types';
import { julianDayNumber } from '@core/utils/julian';

// ============================================================================
// TEST DATA
// ============================================================================

const chennai: Place = { name: 'Chennai', latitude: 13.0878, longitude: 80.2785, timezone: 5.5 };

// From the Python __main__ block: dob=1996-12-7, tob=10:34:00
const testDob: JhoraDate = { year: 1996, month: 12, day: 7 };
const testTob: JhoraTime = { hours: 10, minutes: 34, seconds: 0 };

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Pancha Paksha Constants', () => {
  it('should have 5 birds', () => {
    expect(PANCHA_PAKSHI_BIRDS).toHaveLength(5);
    expect(PANCHA_PAKSHI_BIRDS[0]).toBe('vulture');
    expect(PANCHA_PAKSHI_BIRDS[4]).toBe('peacock');
  });

  it('should have 5 activities', () => {
    expect(PANCHA_PAKSHI_ACTIVITIES).toHaveLength(5);
    expect(PANCHA_PAKSHI_ACTIVITIES[0]).toBe('ruling');
    expect(PANCHA_PAKSHI_ACTIVITIES[4]).toBe('dying');
  });

  it('should have 3 relations', () => {
    expect(PP_RELATIONS).toHaveLength(3);
    expect(PP_RELATIONS[0]).toBe('enemy');
    expect(PP_RELATIONS[2]).toBe('friend');
  });

  it('should have 5 effects', () => {
    expect(PP_EFFECTS).toHaveLength(5);
  });

  it('should have 27 nakshatra-to-bird mappings', () => {
    // 27 nakshatras but the Python array has 27 entries (index 0-26)
    expect(PANCHA_PAKSHI_STARS_BIRDS_PAKSHA).toHaveLength(27);
    // First 5 nakshatras: vulture(1) in shukla, peacock(5) in krishna
    for (let i = 0; i < 5; i++) {
      expect(PANCHA_PAKSHI_STARS_BIRDS_PAKSHA[i]).toEqual([1, 5]);
    }
    // Last 6 nakshatras: peacock(5) in shukla, vulture(1) in krishna
    for (let i = 21; i < 27; i++) {
      expect(PANCHA_PAKSHI_STARS_BIRDS_PAKSHA[i]).toEqual([5, 1]);
    }
  });

  it('should have correct duration lists', () => {
    expect(PANCHA_PAKSHI_DURATION_LIST).toHaveLength(2);
    // Day durations: 48/144, 30/144, 36/144, 18/144, 12/144
    expect(PANCHA_PAKSHI_DURATION_LIST[0][0]).toBeCloseTo(48 / 144);
    expect(PANCHA_PAKSHI_DURATION_LIST[1][0]).toBeCloseTo(24 / 144);
  });
});

// ============================================================================
// LOOKUP FUNCTION TESTS
// ============================================================================

describe('getBirthBirdFromNakshatra', () => {
  it('should return vulture(1) for star 1 in shukla paksha', () => {
    expect(getBirthBirdFromNakshatra(1, 1)).toBe(1);
  });

  it('should return peacock(5) for star 1 in krishna paksha', () => {
    expect(getBirthBirdFromNakshatra(1, 2)).toBe(5);
  });

  it('should return owl(2) for star 6 in shukla paksha', () => {
    expect(getBirthBirdFromNakshatra(6, 1)).toBe(2);
  });

  it('should return cock(4) for star 6 in krishna paksha', () => {
    expect(getBirthBirdFromNakshatra(6, 2)).toBe(4);
  });

  it('should return crow(3) for star 12 in shukla paksha', () => {
    expect(getBirthBirdFromNakshatra(12, 1)).toBe(3);
  });
});

// ============================================================================
// DATABASE QUERY TESTS
// ============================================================================

describe('getMatchingPanchaPakshiData', () => {
  it('should return rows for bird=1, weekday=1, paksha=1', () => {
    const data = getMatchingPanchaPakshiData(1, 1, 1);
    // Should have 10 periods (5 day + 5 night) x 5 sub-periods = 50 rows
    expect(data.length).toBeGreaterThan(0);
    // All rows should have bird=0 (0-indexed), weekday=0, paksha=0
    for (const row of data) {
      expect(row[3]).toBe(0); // nak_bird_index
      expect(row[0]).toBe(0); // week_day_index
      expect(row[1]).toBe(0); // paksha_index
    }
  });

  it('should return 50 rows for any valid bird/weekday/paksha combo', () => {
    // 10 main periods x 5 sub-periods = 50 rows
    const data = getMatchingPanchaPakshiData(3, 4, 2);
    expect(data).toHaveLength(50);
  });
});

// ============================================================================
// BIRTH STAR / PAKSHA TESTS
// ============================================================================

describe('getBirthNakshatra', () => {
  it('should return a valid nakshatra (1-27) for test date', () => {
    const jd = julianDayNumber(testDob, testTob);
    const nak = getBirthNakshatra(jd, chennai);
    expect(nak).toBeGreaterThanOrEqual(1);
    expect(nak).toBeLessThanOrEqual(27);
  });
});

describe('getPaksha', () => {
  it('should return 1 (shukla) or 2 (krishna)', () => {
    const jd = julianDayNumber(testDob, testTob);
    const paksha = getPaksha(jd, chennai);
    expect([1, 2]).toContain(paksha);
  });
});

// ============================================================================
// FULL CONSTRUCTION TESTS
// ============================================================================

describe('constructPanchaPakshiInformation', () => {
  it('should return headers and periods', () => {
    const jd = julianDayNumber(testDob, testTob);
    const bs = getBirthNakshatra(jd, chennai);
    const paksha = getPaksha(jd, chennai);
    const birdIndex = getBirthBirdFromNakshatra(bs, paksha);

    const result = constructPanchaPakshiInformation(testDob, testTob, chennai, birdIndex);

    expect(result.headers).toHaveLength(11);
    expect(result.headers[0]).toBe('starts_at');
    expect(result.periods.length).toBeGreaterThan(0);
  });

  it('should have 10 periods (5 day + 5 night)', () => {
    const jd = julianDayNumber(testDob, testTob);
    const bs = getBirthNakshatra(jd, chennai);
    const paksha = getPaksha(jd, chennai);
    const birdIndex = getBirthBirdFromNakshatra(bs, paksha);

    const result = constructPanchaPakshiInformation(testDob, testTob, chennai, birdIndex);

    expect(result.periods).toHaveLength(10);
  });

  it('each period should have 5 sub-periods', () => {
    const jd = julianDayNumber(testDob, testTob);
    const bs = getBirthNakshatra(jd, chennai);
    const paksha = getPaksha(jd, chennai);
    const birdIndex = getBirthBirdFromNakshatra(bs, paksha);

    const result = constructPanchaPakshiInformation(testDob, testTob, chennai, birdIndex);

    for (const period of result.periods) {
      expect(period.subPeriods).toHaveLength(5);
    }
  });

  it('sub-periods should have valid bird and activity names', () => {
    const jd = julianDayNumber(testDob, testTob);
    const bs = getBirthNakshatra(jd, chennai);
    const paksha = getPaksha(jd, chennai);
    const birdIndex = getBirthBirdFromNakshatra(bs, paksha);

    const result = constructPanchaPakshiInformation(testDob, testTob, chennai, birdIndex);

    const birdNames = [...PANCHA_PAKSHI_BIRDS];
    const actNames = [...PANCHA_PAKSHI_ACTIVITIES];

    for (const period of result.periods) {
      expect(birdNames).toContain(period.nakBird);
      expect(birdNames).toContain(period.paduPakshi);
      expect(birdNames).toContain(period.bharanaPakshi);

      for (const sub of period.subPeriods) {
        expect(birdNames).toContain(sub.mainBird);
        expect(birdNames).toContain(sub.subBird);
        expect(actNames).toContain(sub.mainActivity);
        expect(actNames).toContain(sub.subActivity);
        expect(sub.rating).toBeGreaterThanOrEqual(1);
        expect(sub.rating).toBeLessThanOrEqual(10);
        expect(sub.powerFactor).toBeGreaterThan(0);
        expect(sub.powerFactor).toBeLessThanOrEqual(1);
      }
    }
  });

  it('first 5 periods should be daytime, last 5 nighttime', () => {
    const jd = julianDayNumber(testDob, testTob);
    const bs = getBirthNakshatra(jd, chennai);
    const paksha = getPaksha(jd, chennai);
    const birdIndex = getBirthBirdFromNakshatra(bs, paksha);

    const result = constructPanchaPakshiInformation(testDob, testTob, chennai, birdIndex);

    for (let i = 0; i < 5; i++) {
      expect(result.periods[i].isDaytime).toBe(true);
    }
    for (let i = 5; i < 10; i++) {
      expect(result.periods[i].isDaytime).toBe(false);
    }
  });
});
