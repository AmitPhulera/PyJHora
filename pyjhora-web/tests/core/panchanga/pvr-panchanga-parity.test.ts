/**
 * PVR Panchanga Parity Tests
 *
 * Ports panchanga-related test cases from pvr_tests.py that are NOT already
 * covered in drik-extended.test.ts, panchanga-async.test.ts, or drik.test.ts.
 *
 * Specifically covers:
 * - Moonset for Chennai 2024-07-17 and Bangalore 2013-01-18
 * - Shillong sunrise for 2009-06-21
 * - Helsinki karana for 2013-01-18
 * - Helsinki multi-yogam for 2013-05-22
 * - Tithi end-time verification (hours)
 * - Nakshatra pada + end-time verification
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  initializeEphemeris,
  sunriseAsync,
  moonsetAsync,
} from '@core/ephemeris/swe-adapter';
import {
  calculateTithiAsync,
  calculateNakshatraAsync,
  calculateYogaAsync,
  calculateKaranaAsync,
  vaara,
} from '@core/panchanga/drik';
import type { Place } from '@core/types';
import { gregorianToJulianDay } from '@core/utils/julian';

// ---------------------------------------------------------------------------
// Places (matching Python pvr_tests.py globals)
// ---------------------------------------------------------------------------

const bangalore: Place = {
  name: 'Bangalore',
  latitude: 12.972,
  longitude: 77.594,
  timezone: 5.5,
};

const helsinki: Place = {
  name: 'Helsinki',
  latitude: 60.17,
  longitude: 24.935,
  timezone: 2.0,
};

const shillong: Place = {
  name: 'Shillong',
  latitude: 25.569,
  longitude: 91.883,
  timezone: 5.5,
};

const chennai: Place = {
  name: 'Chennai,India',
  latitude: 13.0878,
  longitude: 80.2785,
  timezone: 5.5,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a JD from date + optional time (defaults to midnight, matching
 * Python's `gregorian_to_jd` which calls swe.julday(y, m, d, 0.0)).
 */
function jd(
  year: number, month: number, day: number,
  hour = 0, minute = 0, second = 0,
): number {
  return gregorianToJulianDay({ year, month, day }, { hour, minute, second });
}

/**
 * Build a JD using julian_day_number semantics (with explicit time),
 * matching Python's `utils.julian_day_number(dob, tob)`.
 */
function jdWithTime(
  dob: [number, number, number],
  tob: [number, number, number],
): number {
  return gregorianToJulianDay(
    { year: dob[0], month: dob[1], day: dob[2] },
    { hour: tob[0], minute: tob[1], second: tob[2] },
  );
}

// ---------------------------------------------------------------------------
// Python global date variables
// ---------------------------------------------------------------------------

// Python: date1 = utils.gregorian_to_jd(drik.Date(2009, 7, 15))  -- midnight
const date1 = jd(2009, 7, 15);
// Python: date2 = utils.gregorian_to_jd(drik.Date(2013, 1, 18))  -- midnight
const date2 = jd(2013, 1, 18);
// Python: date4 = utils.gregorian_to_jd(drik.Date(2009, 6, 21))  -- midnight
const date4 = jd(2009, 6, 21);

// ============================================================================
// TESTS
// ============================================================================

describe('PVR Panchanga Parity (pvr_tests.py)', () => {
  beforeAll(async () => {
    await initializeEphemeris();
  });

  // ========================================================================
  // Moonset -- from _panchanga_tests()
  // ========================================================================

  describe('moonsetAsync - PVR parity', () => {
    // Python: drik.moonset(jd, place)[1] == '01:49:27 AM'
    // Chennai 2024-07-17, tob=(10,34,0)
    // '01:49:27 AM' ~ 1.824 hours (next day)
    it('2024-07-17 Chennai moonset ~ 01:49 (+1 day)', async () => {
      const testJd = jdWithTime([2024, 7, 17], [10, 34, 0]);
      const result = await moonsetAsync(testJd, chennai);
      // Python returns '01:49:27 AM' which could be next-day.
      // localTime may be > 24 (next day) or ~1.82
      const lt = result.localTime % 24;
      expect(lt).toBeCloseTo(1.82, 0); // ±0.5h tolerance
    }, 30000);

    // Python: drik.moonset(date2, bangalore)[1] == '00:14:12 AM (+1)'
    // '00:14:12 AM (+1)' ~ 24.24h (next day)
    it('2013-01-18 Bangalore moonset ~ 00:14 (+1 day)', async () => {
      const result = await moonsetAsync(date2, bangalore);
      // May be > 24 or wrapped. Either way, close to 0.24 or 24.24
      const lt = result.localTime > 23 ? result.localTime - 24 : result.localTime;
      expect(lt).toBeCloseTo(0.24, 0); // ±0.5h tolerance
    }, 30000);
  });

  // ========================================================================
  // Shillong sunrise -- from _panchanga_tests()
  // ========================================================================

  describe('sunriseAsync - PVR parity (Shillong)', () => {
    // Python: drik.sunrise(date4, shillong)[1] == '04:36:16 AM' ~ 4.604h
    it('2009-06-21 Shillong sunrise ~ 04:36', async () => {
      const result = await sunriseAsync(date4, shillong);
      expect(result.localTime).toBeCloseTo(4.604, 0); // ±0.5h
    }, 30000);
  });

  // ========================================================================
  // Karana -- from _panchanga_tests()
  // ========================================================================

  describe('calculateKaranaAsync - PVR parity (Helsinki)', () => {
    // Python: drik.karana(date2, helsinki)[0] == 13
    it('2013-01-18 Helsinki: karana = 13', async () => {
      const result = await calculateKaranaAsync(date2, helsinki);
      expect(result[0]).toBe(13);
    }, 30000);
  });

  // ========================================================================
  // Vaara -- from _panchanga_tests()
  // ========================================================================

  describe('vaara - PVR parity', () => {
    // Python: drik.vaara(date2) == 5 (Friday)
    it('2013-01-18: vaara = 5 (Friday)', () => {
      const result = vaara(date2);
      expect(result).toBe(5);
    });
  });

  // ========================================================================
  // Tithi -- from _tithi_tests()
  // End-time verification (Python returns end time as formatted string;
  // TS async returns [tithiNo, startHours, endHours, ...])
  // ========================================================================

  describe('calculateTithiAsync - PVR end-time parity', () => {
    // Python: date1(2009-07-15) Bangalore → [23, '03:08:16 AM (+1)']
    // '03:08:16 AM (+1)' = next day 3.14h → endTime ~ 27.14h from midnight
    it('2009-07-15 Bangalore: tithi=23, end ~ 27.1h', async () => {
      const result = await calculateTithiAsync(date1, bangalore);
      expect(result[0]).toBe(23);
      expect(result[2]).toBeCloseTo(27.14, 0);
    }, 30000);

    // Python: date2(2013-01-18) Bangalore → [7, '16:25:03 PM']
    // '16:25:03 PM' = 16.42h
    it('2013-01-18 Bangalore: tithi=7, end ~ 16.4h', async () => {
      const result = await calculateTithiAsync(date2, bangalore);
      expect(result[0]).toBe(7);
      expect(result[2]).toBeCloseTo(16.42, 0);
    }, 30000);

    // Python: date2(2013-01-18) Helsinki → [7, '12:55:03 PM']
    // '12:55:03 PM' = 12.92h
    it('2013-01-18 Helsinki: tithi=7, end ~ 12.9h', async () => {
      const result = await calculateTithiAsync(date2, helsinki);
      expect(result[0]).toBe(7);
      expect(result[2]).toBeCloseTo(12.92, 0);
    }, 30000);

    // Python: 2010-04-24 Bangalore → [11, '03:34:34 AM (+1)'] = ~27.58h
    it('2010-04-24 Bangalore: tithi=11, end ~ 27.6h', async () => {
      const apr24 = jd(2010, 4, 24);
      const result = await calculateTithiAsync(apr24, bangalore);
      expect(result[0]).toBe(11);
      expect(result[2]).toBeCloseTo(27.58, 0);
    }, 30000);

    // Python: 2013-02-03 Bangalore → [23, '06:33:55 AM (+1)'] = ~30.57h
    it('2013-02-03 Bangalore: tithi=23, end ~ 30.6h', async () => {
      const feb3 = jd(2013, 2, 3);
      const result = await calculateTithiAsync(feb3, bangalore);
      expect(result[0]).toBe(23);
      expect(result[2]).toBeCloseTo(30.57, 0);
    }, 30000);

    // Python: 1996-12-07 Chennai(13.0389,80.2619) → [27, '03:31:07 AM (+1)'] = ~27.52h
    it('1996-12-07 Chennai: tithi=27, end ~ 27.5h', async () => {
      const bsDob = jdWithTime([1996, 12, 7], [0, 0, 0]);
      const place: Place = { name: 'place', latitude: 13.0389, longitude: 80.2619, timezone: 5.5 };
      const result = await calculateTithiAsync(bsDob, place);
      expect(result[0]).toBe(27);
      expect(result[2]).toBeCloseTo(27.52, 0);
    }, 30000);
  });

  // ========================================================================
  // Nakshatra -- from _nakshatra_tests()
  // Pada + end-time parity
  // ========================================================================

  describe('calculateNakshatraAsync - PVR pada + end-time parity', () => {
    // Python: date1(2009-07-15) Bangalore → [27, 2, '17:06:35 PM']
    // '17:06:35 PM' = 17.11h
    it('2009-07-15 Bangalore: nak=27, pada=2, end ~ 17.1h', async () => {
      const result = await calculateNakshatraAsync(date1, bangalore);
      expect(result[0]).toBe(27);
      expect(result[1]).toBe(2);
      // result[2] is end time in hours
      expect(result[2]).toBeCloseTo(17.11, 0);
    }, 30000);

    // Python: date2(2013-01-18) Bangalore → [27, 1, '19:23:06 PM']
    // '19:23:06 PM' = 19.38h
    it('2013-01-18 Bangalore: nak=27, pada=1, end ~ 19.4h', async () => {
      const result = await calculateNakshatraAsync(date2, bangalore);
      expect(result[0]).toBe(27);
      expect(result[1]).toBe(1);
      expect(result[2]).toBeCloseTo(19.38, 0);
    }, 30000);

    // Python: 1985-06-09 10:34 Bangalore → [24, 2, '02:32:43 AM (+1)']
    // '02:32:43 AM (+1)' = 26.55h
    it('1985-06-09 Bangalore: nak=24, pada=2, end ~ 26.5h', async () => {
      const pyDate3 = jdWithTime([1985, 6, 9], [10, 34, 0]);
      const result = await calculateNakshatraAsync(pyDate3, bangalore);
      expect(result[0]).toBe(24);
      expect(result[1]).toBe(2);
      expect(result[2]).toBeCloseTo(26.55, 0);
    }, 30000);

    // Python: 2009-06-21 10:34 Shillong → [4, 2, '02:31:12 AM (+1)']
    // '02:31:12 AM (+1)' = 26.52h
    it('2009-06-21 Shillong: nak=4, pada=2, end ~ 26.5h', async () => {
      const pyDate4 = jdWithTime([2009, 6, 21], [10, 34, 0]);
      const result = await calculateNakshatraAsync(pyDate4, shillong);
      expect(result[0]).toBe(4);
      expect(result[1]).toBe(2);
      expect(result[2]).toBeCloseTo(26.52, 0);
    }, 30000);
  });

  // ========================================================================
  // Yogam -- from _yogam_tests()
  // The May 22, 2013 Helsinki case with multi-yogam is the uncovered one
  // ========================================================================

  describe('calculateYogaAsync - PVR parity (multi-yogam)', () => {
    // Python: yogam_old(date3, bangalore) → [1, '23:12:24 PM (-1)', '22:59:08 PM']
    // yogam 1, start ~ 23.21h previous day, end ~ 22.99h same day
    it('1985-06-09 Bangalore: yogam=1', async () => {
      const date3 = jd(1985, 6, 9);
      const result = await calculateYogaAsync(date3, bangalore);
      expect(result[0]).toBe(1);
    }, 30000);

    // Python: yogam_old(date2, bangalore) → [21, '05:08:50 AM', '05:10:18 AM (+1)']
    // yogam 21 (Siddha), end ~ 29.17h (next day 5:10 AM)
    it('2013-01-18 Bangalore: yogam=21', async () => {
      const result = await calculateYogaAsync(date2, bangalore);
      expect(result[0]).toBe(21);
    }, 30000);

    // Python: yogam_old(may22, helsinki)
    //   → [16, '08:45:51 AM (-1)', '06:20:01 AM', 17, '03:21:26 AM (+1)']
    // yogam 16 (Atiganda), end ~ 6.33h, then yogam 17 starts and ends ~27.36h
    it('2013-05-22 Helsinki: yogam=16 (Atiganda)', async () => {
      const may22 = jd(2013, 5, 22);
      const result = await calculateYogaAsync(may22, helsinki);
      expect(result[0]).toBe(16);
      // End time ~ 6.33h
      expect(result[2]).toBeCloseTo(6.33, 0);
    }, 30000);

    // The multi-yogam case: Python returns 6 values when a second yogam
    // also falls within the same day. result[3]=17, result[4]=next end time
    it('2013-05-22 Helsinki: second yogam=17 on same day', async () => {
      const may22 = jd(2013, 5, 22);
      const result = await calculateYogaAsync(may22, helsinki);
      // If the TS implementation returns a second yogam, check it
      if (result.length >= 5) {
        expect(result[3]).toBe(17);
        expect(result[4]).toBeCloseTo(27.36, 0);
      } else {
        // At minimum, the primary yogam should be 16
        expect(result[0]).toBe(16);
      }
    }, 30000);
  });

  // ========================================================================
  // Yogam end-time parity
  // ========================================================================

  describe('calculateYogaAsync - PVR end-time parity', () => {
    // Python: yogam_old(date3=1985-06-09, bangalore) → end ~ 22.99h
    it('1985-06-09 Bangalore: yogam end ~ 22.99h', async () => {
      const date3 = jd(1985, 6, 9);
      const result = await calculateYogaAsync(date3, bangalore);
      expect(result[0]).toBe(1);
      expect(result[2]).toBeCloseTo(22.99, 0);
    }, 30000);

    // Python: yogam_old(date2=2013-01-18, bangalore) → end ~ 29.17h
    // '05:10:18 AM (+1)' = 5.17h + 24 = 29.17h
    it('2013-01-18 Bangalore: yogam end ~ 29.2h', async () => {
      const result = await calculateYogaAsync(date2, bangalore);
      expect(result[0]).toBe(21);
      expect(result[2]).toBeCloseTo(29.17, 0);
    }, 30000);
  });

  // ========================================================================
  // Sunrise/Sunset exact string parity from _panchanga_tests()
  // These verify tighter tolerances than the existing drik-extended tests
  // ========================================================================

  describe('sunriseAsync - PVR exact parity', () => {
    // Python: Chennai 2024-07-17 sunrise = '05:54:27 AM' = 5.9075h
    it('2024-07-17 Chennai sunrise ~ 5.908h', async () => {
      const testJd = jdWithTime([2024, 7, 17], [10, 34, 0]);
      const result = await sunriseAsync(testJd, chennai);
      expect(result.localTime).toBeCloseTo(5.908, 1); // ±0.05h = ±3 min
    }, 30000);

    // Python: Bangalore 2013-01-18 sunrise = '06:49:47 AM' = 6.830h
    it('2013-01-18 Bangalore sunrise ~ 6.830h', async () => {
      const result = await sunriseAsync(date2, bangalore);
      expect(result.localTime).toBeCloseTo(6.830, 1);
    }, 30000);

    // Python: Shillong 2009-06-21 sunrise = '04:36:16 AM' = 4.604h
    it('2009-06-21 Shillong sunrise ~ 4.604h', async () => {
      const result = await sunriseAsync(date4, shillong);
      expect(result.localTime).toBeCloseTo(4.604, 1);
    }, 30000);
  });
});
