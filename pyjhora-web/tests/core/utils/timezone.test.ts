import { describe, it, expect } from 'vitest';
import {
  ianaZoneForCoords,
  offsetHoursForZoneAtDate,
  offsetHoursForCoordsAtDate,
} from '@/core/utils/timezone';

describe('timezone helpers', () => {
  it('resolves IANA zones from coordinates', () => {
    expect(ianaZoneForCoords(29.5829, 80.2182)).toBe('Asia/Kolkata');
    expect(ianaZoneForCoords(40.714, -74.006)).toBe('America/New_York');
    expect(ianaZoneForCoords(51.507, -0.127)).toBe('Europe/London');
  });

  it('India is always +5.5 (no DST)', () => {
    const summer = offsetHoursForCoordsAtDate(29.5829, 80.2182, '1995-06-08', '03:55');
    const winter = offsetHoursForCoordsAtDate(29.5829, 80.2182, '1995-12-08', '03:55');
    expect(summer).toBe(5.5);
    expect(winter).toBe(5.5);
  });

  it('New York shifts between -4 (summer DST) and -5 (winter)', () => {
    const summer = offsetHoursForCoordsAtDate(40.714, -74.006, '1995-07-01', '12:00');
    const winter = offsetHoursForCoordsAtDate(40.714, -74.006, '1995-01-01', '12:00');
    expect(summer).toBe(-4);
    expect(winter).toBe(-5);
  });

  it('parses fractional offsets via Intl longOffset', () => {
    // Asia/Kolkata is GMT+5:30 → 5.5
    expect(offsetHoursForZoneAtDate('Asia/Kolkata', new Date('1995-06-08T00:00:00Z'))).toBe(5.5);
    // Asia/Kathmandu is GMT+5:45 → 5.75
    expect(offsetHoursForZoneAtDate('Asia/Kathmandu', new Date('1995-06-08T00:00:00Z'))).toBe(5.75);
  });

  it('returns 0 for an unknown zone', () => {
    expect(offsetHoursForZoneAtDate('Not/AZone', new Date())).toBe(0);
  });
});
