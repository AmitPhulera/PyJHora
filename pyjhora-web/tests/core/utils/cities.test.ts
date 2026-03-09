/**
 * Tests for city database and lookup utilities
 * Python reference: utils.py city lookup, get_location, timezone resolution
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  setCityDatabase,
  lookupCity,
  searchCities,
  findNearestCity,
  cityToPlace,
  getLocation,
  getTimezoneOffsetFromName,
  isCityDatabaseLoaded,
  getCityCount,
} from '../../../src/core/utils/cities';
import type { CityRecord } from '../../../src/core/utils/cities';

// Sample city data for testing
const SAMPLE_CITIES: CityRecord[] = [
  ['India', 'Chennai, India', 13.0827, 80.2707, 'Asia/Kolkata', 5.5],
  ['India', 'Delhi, India', 28.6139, 77.209, 'Asia/Kolkata', 5.5],
  ['India', 'Hyderabad, India', 17.385, 78.4867, 'Asia/Kolkata', 5.5],
  ['India', 'Mumbai, India', 19.076, 72.8777, 'Asia/Kolkata', 5.5],
  ['United States', 'Chicago, IL', 41.8375, -87.6866, 'America/Chicago', -6],
  ['United States', 'Los Angeles, CA', 34.1141, -118.4068, 'America/Los_Angeles', -8],
  ['United States', 'New York, NY', 40.6943, -73.9249, 'America/New_York', -5],
  ['United Kingdom', 'London, United Kingdom', 51.5074, -0.1278, 'Europe/London', 0],
  ['Australia', 'Sydney, Australia', -33.8688, 151.2093, 'Australia/Sydney', 11],
  ['Singapore', 'Singapore, Singapore', 1.3521, 103.8198, 'Asia/Singapore', 8],
];

describe('City Database', () => {
  beforeEach(() => {
    setCityDatabase(SAMPLE_CITIES);
  });

  describe('database management', () => {
    it('should report database as loaded', () => {
      expect(isCityDatabaseLoaded()).toBe(true);
    });

    it('should report correct city count', () => {
      expect(getCityCount()).toBe(SAMPLE_CITIES.length);
    });
  });

  describe('lookupCity', () => {
    it('should find city by exact name (case-insensitive)', () => {
      const result = lookupCity('Chennai, India');
      expect(result).not.toBeNull();
      expect(result!.latitude).toBeCloseTo(13.0827);
      expect(result!.longitude).toBeCloseTo(80.2707);
      expect(result!.timezoneOffset).toBe(5.5);
    });

    it('should be case-insensitive', () => {
      const result = lookupCity('chennai, india');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Chennai, India');
    });

    it('should return null for unknown city', () => {
      expect(lookupCity('Unknown City')).toBeNull();
    });
  });

  describe('searchCities', () => {
    it('should find cities by partial name', () => {
      const results = searchCities('chen');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.name).toBe('Chennai, India');
    });

    it('should prioritize starts-with matches', () => {
      const results = searchCities('new');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.name).toBe('New York, NY');
    });

    it('should return empty for short queries', () => {
      expect(searchCities('a')).toEqual([]);
    });

    it('should respect limit', () => {
      const results = searchCities('in', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('findNearestCity', () => {
    it('should find nearest city to coordinates', () => {
      // Near Chennai
      const result = findNearestCity(13.0, 80.0);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Chennai, India');
    });

    it('should find nearest city globally', () => {
      // Near Sydney
      const result = findNearestCity(-34.0, 151.0);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Sydney, Australia');
    });
  });

  describe('cityToPlace', () => {
    it('should convert CityResult to Place', () => {
      const city = lookupCity('Delhi, India')!;
      const place = cityToPlace(city);
      expect(place.name).toBe('Delhi, India');
      expect(place.latitude).toBeCloseTo(28.6139);
      expect(place.longitude).toBeCloseTo(77.209);
      expect(place.timezone).toBe(5.5);
    });
  });

  describe('getLocation', () => {
    it('should return Place for known city', () => {
      const place = getLocation('Mumbai, India');
      expect(place).not.toBeNull();
      expect(place!.name).toBe('Mumbai, India');
      expect(place!.timezone).toBe(5.5);
    });

    it('should return null for unknown city', () => {
      expect(getLocation('Nonexistent City')).toBeNull();
    });
  });
});

describe('Timezone Resolution', () => {
  describe('getTimezoneOffsetFromName', () => {
    it('should resolve Asia/Kolkata to +5.5', () => {
      const offset = getTimezoneOffsetFromName('Asia/Kolkata');
      expect(offset).toBe(5.5);
    });

    it('should resolve UTC to 0', () => {
      const offset = getTimezoneOffsetFromName('UTC');
      expect(offset).toBe(0);
    });

    it('should return 0 for invalid timezone', () => {
      const offset = getTimezoneOffsetFromName('Invalid/Timezone');
      expect(offset).toBe(0);
    });
  });
});
