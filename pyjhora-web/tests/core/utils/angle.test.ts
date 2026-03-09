/**
 * Tests for angle utility functions
 * Python reference: utils.py angle/DMS conversions
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeDegrees,
  normalizeDegreesSymmetric,
  normalizeAngle,
  norm180,
  norm360,
  toDMS,
  fromDMS,
  toDmsPrec,
  fromDmsStrToDms,
  fromDmsStrToDegrees,
  dmsToString,
  longitudeInSign,
  rasiFromLongitude,
  angularDistance,
  angularDifference,
  signDistance,
  countRasis,
  nakshatraFromLongitude,
  roundTo,
  almostEqual,
  formatDegrees,
} from '../../../src/core/utils/angle';

describe('Angle Normalization', () => {
  describe('normalizeDegrees', () => {
    it('should normalize positive angle', () => {
      expect(normalizeDegrees(370)).toBeCloseTo(10);
    });
    it('should normalize negative angle', () => {
      expect(normalizeDegrees(-10)).toBeCloseTo(350);
    });
    it('should keep 0 as 0', () => {
      expect(normalizeDegrees(0)).toBe(0);
    });
    it('should keep 180 as 180', () => {
      expect(normalizeDegrees(180)).toBe(180);
    });
  });

  describe('normalizeAngle', () => {
    it('should normalize to default [0, 360) range', () => {
      expect(normalizeAngle(370)).toBeCloseTo(10);
      expect(normalizeAngle(-10)).toBeCloseTo(350);
    });

    it('should normalize to custom start range', () => {
      // Range [-180, 180)
      expect(normalizeAngle(200, -180)).toBeCloseTo(-160);
      expect(normalizeAngle(-200, -180)).toBeCloseTo(160);
    });

    it('should return value within [start, start+360)', () => {
      const start = 90;
      const result = normalizeAngle(50, start);
      expect(result).toBeGreaterThanOrEqual(start);
      expect(result).toBeLessThan(start + 360);
    });
  });

  describe('norm180', () => {
    it('should convert 0-360 to -180 to 180', () => {
      expect(norm180(0)).toBe(0);
      expect(norm180(179)).toBe(179);
      expect(norm180(180)).toBe(-180);
      expect(norm180(350)).toBe(-10);
    });
  });

  describe('norm360', () => {
    it('should normalize to 0-360', () => {
      expect(norm360(370)).toBeCloseTo(10);
      expect(norm360(-10)).toBeCloseTo(350);
      expect(norm360(0)).toBe(0);
    });
  });
});

describe('DMS Conversions', () => {
  describe('toDMS', () => {
    it('should convert positive decimal to DMS', () => {
      const dms = toDMS(23.5);
      expect(dms.degrees).toBe(23);
      expect(dms.minutes).toBe(30);
      expect(dms.seconds).toBe(0);
      expect(dms.isNegative).toBe(false);
    });

    it('should convert negative decimal to DMS', () => {
      const dms = toDMS(-33.87);
      expect(dms.degrees).toBe(33);
      expect(dms.minutes).toBe(52);
      expect(dms.isNegative).toBe(true);
    });
  });

  describe('fromDMS', () => {
    it('should convert DMS back to decimal', () => {
      const decimal = fromDMS({ degrees: 23, minutes: 30, seconds: 0, isNegative: false });
      expect(decimal).toBeCloseTo(23.5);
    });
  });

  describe('toDmsPrec', () => {
    it('should return float seconds', () => {
      const [d, m, s] = toDmsPrec(23.508333);
      expect(d).toBe(23);
      expect(m).toBe(30);
      expect(s).toBeCloseTo(30.0, 0);
    });
  });

  describe('fromDmsStrToDms', () => {
    it('should parse simple time string', () => {
      const [h, m, s] = fromDmsStrToDms('10:34:00');
      expect(h).toBe(10);
      expect(m).toBe(34);
      expect(s).toBe(0);
    });

    it('should handle (+1) next day marker', () => {
      const [h, m, s] = fromDmsStrToDms('06:10:00(+1)');
      expect(h).toBe(30); // 24 + 6
      expect(m).toBe(10);
      expect(s).toBe(0);
    });

    it('should handle (-1) previous day marker', () => {
      const [h] = fromDmsStrToDms('23:00:00(-1)');
      expect(h).toBe(-1); // -24 + 23
    });

    it('should strip AM/PM', () => {
      const [h, m, s] = fromDmsStrToDms('10:34:00 AM');
      expect(h).toBe(10);
      expect(m).toBe(34);
      expect(s).toBe(0);
    });
  });

  describe('fromDmsStrToDegrees', () => {
    it('should convert time string to decimal', () => {
      expect(fromDmsStrToDegrees('10:30:00')).toBeCloseTo(10.5);
    });

    it('should convert with seconds', () => {
      expect(fromDmsStrToDegrees('10:30:36')).toBeCloseTo(10.51);
    });
  });

  describe('dmsToString', () => {
    it('should format with degree symbols', () => {
      const result = dmsToString([23, 30, 45]);
      expect(result).toContain('23');
      expect(result).toContain('30');
      expect(result).toContain('45');
    });
  });
});

describe('Rasi/Nakshatra Calculations', () => {
  describe('rasiFromLongitude', () => {
    it('should return rasi index', () => {
      expect(rasiFromLongitude(0)).toBe(0);    // Aries
      expect(rasiFromLongitude(45)).toBe(1);   // Taurus
      expect(rasiFromLongitude(359)).toBe(11); // Pisces
    });
  });

  describe('longitudeInSign', () => {
    it('should return longitude within sign', () => {
      expect(longitudeInSign(45)).toBeCloseTo(15);
      expect(longitudeInSign(90)).toBeCloseTo(0);
    });
  });

  describe('signDistance', () => {
    it('should count signs between positions', () => {
      expect(signDistance(0, 0)).toBe(12);
      expect(signDistance(0, 1)).toBe(1);
      expect(signDistance(11, 0)).toBe(1);
    });
  });

  describe('countRasis', () => {
    it('should count inclusively forward', () => {
      expect(countRasis(0, 0)).toBe(1);
      expect(countRasis(0, 1)).toBe(2);
      expect(countRasis(0, 11)).toBe(12);
    });

    it('should count backward', () => {
      expect(countRasis(0, 11, -1)).toBe(2);
      expect(countRasis(5, 3, -1)).toBe(3);
    });
  });

  describe('nakshatraFromLongitude', () => {
    it('should return nakshatra info', () => {
      const result = nakshatraFromLongitude(0);
      expect(result.nakshatra).toBe(0); // Ashwini
      expect(result.pada).toBe(1);
    });

    it('should return correct pada', () => {
      // 13.33 * 1 = pada 1 ends at 3.33, pada 2 at 6.67, etc.
      const result = nakshatraFromLongitude(5);
      expect(result.nakshatra).toBe(0);
      expect(result.pada).toBe(2);
    });
  });
});

describe('Angular Calculations', () => {
  describe('angularDistance', () => {
    it('should compute shortest distance', () => {
      expect(angularDistance(10, 20)).toBeCloseTo(10);
      expect(angularDistance(350, 10)).toBeCloseTo(20);
      expect(angularDistance(0, 180)).toBeCloseTo(180);
    });
  });

  describe('angularDifference', () => {
    it('should return signed difference', () => {
      expect(angularDifference(10, 20)).toBeCloseTo(10);
      expect(angularDifference(350, 10)).toBeCloseTo(20);
      expect(angularDifference(20, 10)).toBeCloseTo(-10);
    });
  });
});

describe('Precision Utilities', () => {
  describe('roundTo', () => {
    it('should round to specified decimals', () => {
      expect(roundTo(3.14159, 2)).toBeCloseTo(3.14);
      expect(roundTo(3.14159, 4)).toBeCloseTo(3.1416);
    });
  });

  describe('almostEqual', () => {
    it('should detect near-equal values', () => {
      expect(almostEqual(1.0, 1.0 + 1e-10)).toBe(true);
      expect(almostEqual(1.0, 1.1)).toBe(false);
    });
  });

  describe('formatDegrees', () => {
    it('should format in DMS', () => {
      const result = formatDegrees(23.5, 'dms');
      expect(result).toContain('23');
      expect(result).toContain('30');
    });
  });
});
