/**
 * Tara Dasha parity tests.
 *
 * Tests verify the algorithm logic:
 * 1. Kendra detection and strongest planet selection
 * 2. Proper dasha sequence from starting lord
 * 3. Dasha start date calculation from Moon's nakshatra
 * 4. Antardhasa generation
 * 5. Both Sanjay Rath and Parasara methods
 *
 * Note: Python uses the actual Lagna for kendra detection. TS uses Sun's rasi
 * as Lagna proxy (no sync ascendant). This means the starting lord may differ
 * from Python for charts where the actual Lagna is not in the same rasi as Sun.
 * This is a known systemic limitation documented in MEMORY.md.
 */
import { describe, expect, it } from 'vitest';
import type { Place } from '../../../../src/core/types';
import {
  SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU,
  SIDEREAL_YEAR
} from '../../../../src/core/constants';
import {
  getTaraDashaBhukti,
  getTaraDashaBhuktiTuples,
  getNextTaraLord
} from '../../../../src/core/dhasa/graha/tara';
import { gregorianToJulianDay } from '../../../../src/core/utils/julian';

const chennai: Place = {
  name: 'Chennai',
  latitude: 13.0878,
  longitude: 80.2785,
  timezone: 5.5
};

const jd = gregorianToJulianDay(
  { year: 1996, month: 12, day: 7 },
  { hour: 10, minute: 34, second: 0 }
);

describe('Tara Dasha Algorithm Tests', () => {
  describe('getNextTaraLord', () => {
    it('Sanjay Rath method: Venus->Moon->Ketu->Saturn->Jupiter->Mercury->Rahu->Mars->Sun->Venus', () => {
      expect(getNextTaraLord(VENUS, 1, 1)).toBe(MOON);
      expect(getNextTaraLord(MOON, 1, 1)).toBe(KETU);
      expect(getNextTaraLord(KETU, 1, 1)).toBe(SATURN);
      expect(getNextTaraLord(SATURN, 1, 1)).toBe(JUPITER);
      expect(getNextTaraLord(JUPITER, 1, 1)).toBe(MERCURY);
      expect(getNextTaraLord(MERCURY, 1, 1)).toBe(RAHU);
      expect(getNextTaraLord(RAHU, 1, 1)).toBe(MARS);
      expect(getNextTaraLord(MARS, 1, 1)).toBe(SUN);
      expect(getNextTaraLord(SUN, 1, 1)).toBe(VENUS);
    });

    it('Parasara method: Venus->Sun->Moon->Mars->Rahu->Jupiter->Saturn->Mercury->Ketu->Venus', () => {
      expect(getNextTaraLord(VENUS, 1, 2)).toBe(SUN);
      expect(getNextTaraLord(SUN, 1, 2)).toBe(MOON);
      expect(getNextTaraLord(MOON, 1, 2)).toBe(MARS);
      expect(getNextTaraLord(MARS, 1, 2)).toBe(RAHU);
      expect(getNextTaraLord(RAHU, 1, 2)).toBe(JUPITER);
      expect(getNextTaraLord(JUPITER, 1, 2)).toBe(SATURN);
      expect(getNextTaraLord(SATURN, 1, 2)).toBe(MERCURY);
      expect(getNextTaraLord(MERCURY, 1, 2)).toBe(KETU);
      expect(getNextTaraLord(KETU, 1, 2)).toBe(VENUS);
    });

    it('should handle reverse direction', () => {
      expect(getNextTaraLord(VENUS, -1, 1)).toBe(SUN);
      expect(getNextTaraLord(SUN, -1, 1)).toBe(MARS);
    });
  });

  describe('Structural correctness', () => {
    it('should produce exactly 9 maha dasha periods (Sanjay Rath)', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false });
      expect(result.mahadashas.length).toBe(9);
    });

    it('should produce exactly 9 maha dasha periods (Parasara)', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false, dhasaMethod: 2 });
      expect(result.mahadashas.length).toBe(9);
    });

    it('total duration should be 120 years', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false });
      const total = result.mahadashas.reduce((s, d) => s + d.durationYears, 0);
      expect(total).toBe(120);
    });

    it('total duration should be 120 years (Parasara)', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false, dhasaMethod: 2 });
      const total = result.mahadashas.reduce((s, d) => s + d.durationYears, 0);
      expect(total).toBe(120);
    });

    it('should have all 9 unique planets across mahadashas', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false });
      const lords = new Set(result.mahadashas.map(m => m.lord));
      expect(lords.size).toBe(9);
      expect(lords).toContain(SUN);
      expect(lords).toContain(MOON);
      expect(lords).toContain(MARS);
      expect(lords).toContain(MERCURY);
      expect(lords).toContain(JUPITER);
      expect(lords).toContain(VENUS);
      expect(lords).toContain(SATURN);
      expect(lords).toContain(RAHU);
      expect(lords).toContain(KETU);
    });

    it('mahadasha start dates should be increasing', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false });
      for (let i = 1; i < result.mahadashas.length; i++) {
        expect(result.mahadashas[i]!.startJd).toBeGreaterThan(result.mahadashas[i - 1]!.startJd);
      }
    });

    it('dasha start date should be before birth date (sesham)', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false });
      // At least the first dasha should start before or at birth
      expect(result.mahadashas[0]!.startJd).toBeLessThanOrEqual(jd);
    });
  });

  describe('Antardhasa (Bhukti) generation', () => {
    it('should produce 81 bhuktis (9x9) with includeAntardasa=true', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: true });
      expect(result.bhuktis).toBeDefined();
      expect(result.bhuktis!.length).toBe(81);
    });

    it('each maha dasha should have 9 bhuktis', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: true });
      const firstLord = result.mahadashas[0]!.lord;
      const bhuktisForFirst = result.bhuktis!.filter(b => b.dashaLord === firstLord);
      expect(bhuktisForFirst.length).toBe(9);
    });

    it('bhukti lords should follow Sanjay Rath sequence starting from dasha lord', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: true });
      const firstLord = result.mahadashas[0]!.lord;
      const bhuktisForFirst = result.bhuktis!.filter(b => b.dashaLord === firstLord);

      // First bhukti lord should be the dasha lord itself
      expect(bhuktisForFirst[0]!.bhuktiLord).toBe(firstLord);

      // Subsequent bhukti lords should follow the sequence
      let expectedLord = firstLord;
      for (const bhukti of bhuktisForFirst) {
        expect(bhukti.bhuktiLord).toBe(expectedLord);
        expectedLord = getNextTaraLord(expectedLord, 1, 1);
      }
    });
  });

  describe('Tuple output format', () => {
    it('without antardasa: tuples should be (lord, dateStr, duration)', () => {
      const tuples = getTaraDashaBhuktiTuples(jd, chennai, { includeAntardasa: false });
      expect(tuples.length).toBe(9);
      for (const t of tuples) {
        expect(t.length).toBe(3); // [lord, dateStr, duration]
        expect(typeof t[0]).toBe('number');
        expect(typeof t[1]).toBe('string');
        expect(typeof t[2]).toBe('number');
      }
    });

    it('with antardasa: tuples should be (dhasaLord, bhuktiLord, dateStr, duration)', () => {
      const tuples = getTaraDashaBhuktiTuples(jd, chennai, { includeAntardasa: true });
      expect(tuples.length).toBe(81);
      for (const t of tuples) {
        expect(t.length).toBe(4); // [dhasaLord, bhuktiLord, dateStr, duration]
        expect(typeof t[0]).toBe('number');
        expect(typeof t[1]).toBe('number');
        expect(typeof t[2]).toBe('string');
        expect(typeof t[3]).toBe('number');
      }
    });

    it('date format should match Python: YYYY-MM-DD HH:MM:SS AM/PM', () => {
      const tuples = getTaraDashaBhuktiTuples(jd, chennai, { includeAntardasa: false });
      const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (AM|PM)$/;
      for (const t of tuples) {
        expect(t[1]).toMatch(datePattern);
      }
    });
  });

  describe('Sanjay Rath vs Parasara method differences', () => {
    it('should produce different sequences for different methods', () => {
      const sanjay = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false, dhasaMethod: 1 });
      const parasara = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false, dhasaMethod: 2 });

      // Both start with the same lord (determined by kendra analysis)
      expect(sanjay.mahadashas[0]!.lord).toBe(parasara.mahadashas[0]!.lord);

      // But subsequent lords should differ (unless by coincidence)
      // Sanjay Rath sequence from Sun: Sun, Venus, Moon, Ketu, Saturn, Jupiter, Mercury, Rahu, Mars
      // Parasara sequence from Sun: Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus
      const sanjayLords = sanjay.mahadashas.map(m => m.lord);
      const parasaraLords = parasara.mahadashas.map(m => m.lord);

      // The sequences should not be identical (they have different orders)
      expect(sanjayLords).not.toEqual(parasaraLords);
    });

    it('Sanjay Rath durations match: Venus=20, Moon=10, Ketu=7, Saturn=19, Jupiter=16, Mercury=17, Rahu=18, Mars=7, Sun=6', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false, dhasaMethod: 1 });
      const durationMap: Record<number, number> = {};
      for (const m of result.mahadashas) {
        durationMap[m.lord] = m.durationYears;
      }
      expect(durationMap[VENUS]).toBe(20);
      expect(durationMap[MOON]).toBe(10);
      expect(durationMap[KETU]).toBe(7);
      expect(durationMap[SATURN]).toBe(19);
      expect(durationMap[JUPITER]).toBe(16);
      expect(durationMap[MERCURY]).toBe(17);
      expect(durationMap[RAHU]).toBe(18);
      expect(durationMap[MARS]).toBe(7);
      expect(durationMap[SUN]).toBe(6);
    });

    it('Parasara durations match: Venus=20, Sun=6, Moon=10, Mars=7, Rahu=18, Jupiter=16, Saturn=19, Mercury=17, Ketu=7', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false, dhasaMethod: 2 });
      const durationMap: Record<number, number> = {};
      for (const m of result.mahadashas) {
        durationMap[m.lord] = m.durationYears;
      }
      expect(durationMap[VENUS]).toBe(20);
      expect(durationMap[SUN]).toBe(6);
      expect(durationMap[MOON]).toBe(10);
      expect(durationMap[MARS]).toBe(7);
      expect(durationMap[RAHU]).toBe(18);
      expect(durationMap[JUPITER]).toBe(16);
      expect(durationMap[SATURN]).toBe(19);
      expect(durationMap[MERCURY]).toBe(17);
      expect(durationMap[KETU]).toBe(7);
    });
  });

  describe('Kendra detection correctness', () => {
    it('starting lord should be a planet (0-8), not Lagna (-1)', () => {
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false });
      expect(result.mahadashas[0]!.lord).toBeGreaterThanOrEqual(0);
      expect(result.mahadashas[0]!.lord).toBeLessThanOrEqual(8);
    });

    it('for this chart with Sun-as-Lagna, Sun should be the starting lord (only kendra planet)', () => {
      // With Sun in rasi 7 as Lagna proxy, kendras are rasis 7, 10, 1, 4
      // Only Sun itself (rasi 7) is in a kendra, so Sun is the starting lord
      const result = getTaraDashaBhukti(jd, chennai, { includeBhuktis: false });
      expect(result.mahadashas[0]!.lord).toBe(SUN);
    });
  });
});
