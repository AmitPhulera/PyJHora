/**
 * City database and lookup utilities
 * Ported from Python utils.py city lookup functions
 *
 * The full city database is stored as a JSON file in public/world_cities.json
 * and loaded on demand. A small set of common cities is embedded for immediate use.
 *
 * CSV sources:
 *   - world_cities_with_tz.csv (162k cities with timezone offsets)
 *   - uscities.csv (31k US cities with timezone names)
 *
 * JSON format: Array of [country, name, lat, lon, tz_name, tz_offset]
 */

import type { Place } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/** Raw city record as stored in the JSON database */
export type CityRecord = [
  country: string,
  name: string,
  lat: number,
  lon: number,
  tzName: string,
  tzOffset: number,
];

/** City search result */
export interface CityResult {
  country: string;
  name: string;
  latitude: number;
  longitude: number;
  timezoneName: string;
  timezoneOffset: number;
}

// ============================================================================
// DATABASE STATE
// ============================================================================

/** In-memory city database (loaded on demand) */
let cityDatabase: CityRecord[] | null = null;

/** Index mapping lowercase name -> array index for fast lookup */
let cityIndex: Map<string, number> | null = null;

// ============================================================================
// DATABASE LOADING
// ============================================================================

/**
 * Load the full city database from the JSON file.
 * Call this once at app startup or before first city lookup.
 * The JSON file is expected at /world_cities.json (served from public/).
 *
 * @param url - URL to the city database JSON (default: '/world_cities.json')
 * @returns Number of cities loaded
 */
export async function loadCityDatabase(url = '/world_cities.json'): Promise<number> {
  if (cityDatabase !== null) {
    return cityDatabase.length;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load city database: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as CityRecord[];
  cityDatabase = data;

  // Build index
  cityIndex = new Map();
  for (let i = 0; i < data.length; i++) {
    const record = data[i]!;
    const key = record[1].toLowerCase();
    // Only store first occurrence (keeps the most important city for duplicates)
    if (!cityIndex.has(key)) {
      cityIndex.set(key, i);
    }
  }

  return data.length;
}

/**
 * Set city database directly (for testing or pre-loaded data).
 * @param data - Array of city records
 */
export function setCityDatabase(data: CityRecord[]): void {
  cityDatabase = data;
  cityIndex = new Map();
  for (let i = 0; i < data.length; i++) {
    const record = data[i]!;
    const key = record[1].toLowerCase();
    if (!cityIndex.has(key)) {
      cityIndex.set(key, i);
    }
  }
}

/**
 * Check if the city database is loaded.
 */
export function isCityDatabaseLoaded(): boolean {
  return cityDatabase !== null;
}

/**
 * Get the number of cities in the loaded database.
 */
export function getCityCount(): number {
  return cityDatabase?.length ?? 0;
}

// ============================================================================
// CITY LOOKUP
// ============================================================================

/**
 * Convert a CityRecord to a CityResult.
 */
function recordToResult(record: CityRecord): CityResult {
  return {
    country: record[0],
    name: record[1],
    latitude: record[2],
    longitude: record[3],
    timezoneName: record[4],
    timezoneOffset: record[5],
  };
}

/**
 * Look up a city by exact name match (case-insensitive).
 * Equivalent to Python's world_cities_dict lookup.
 *
 * @param cityName - City name to look up (e.g., "Chennai, India")
 * @returns CityResult or null if not found
 */
export function lookupCity(cityName: string): CityResult | null {
  if (!cityDatabase || !cityIndex) return null;

  const idx = cityIndex.get(cityName.toLowerCase());
  if (idx === undefined) return null;

  const record = cityDatabase[idx];
  if (!record) return null;

  return recordToResult(record);
}

/**
 * Search cities by partial name match (case-insensitive).
 * Returns up to `limit` results sorted by relevance.
 *
 * @param query - Search query
 * @param limit - Maximum number of results (default 20)
 * @returns Array of matching cities
 */
export function searchCities(query: string, limit = 20): CityResult[] {
  if (!cityDatabase || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  const results: CityResult[] = [];
  const startsWithResults: CityResult[] = [];

  for (const record of cityDatabase) {
    const name = record[1].toLowerCase();

    if (name.startsWith(lowerQuery)) {
      startsWithResults.push(recordToResult(record));
      if (startsWithResults.length >= limit) break;
    } else if (name.includes(lowerQuery)) {
      results.push(recordToResult(record));
    }
  }

  // Starts-with matches first, then contains matches
  const combined = [...startsWithResults, ...results];
  return combined.slice(0, limit);
}

/**
 * Find the nearest city to given coordinates.
 *
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns Nearest city or null if database not loaded
 */
export function findNearestCity(latitude: number, longitude: number): CityResult | null {
  if (!cityDatabase) return null;

  let bestDist = Infinity;
  let bestRecord: CityRecord | null = null;

  for (const record of cityDatabase) {
    // Quick approximate distance (no need for haversine for nearest search)
    const dlat = record[2] - latitude;
    const dlon = record[3] - longitude;
    const dist = dlat * dlat + dlon * dlon;

    if (dist < bestDist) {
      bestDist = dist;
      bestRecord = record;
    }
  }

  return bestRecord ? recordToResult(bestRecord) : null;
}

/**
 * Convert a CityResult to a Place object.
 *
 * @param city - CityResult from lookup
 * @returns Place object for use in calculations
 */
export function cityToPlace(city: CityResult): Place {
  return {
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezoneOffset,
  };
}

/**
 * Look up a city and return as a Place object.
 * Combines lookupCity + cityToPlace.
 *
 * Equivalent to Python's get_location() for database lookups.
 *
 * @param cityName - City name
 * @returns Place or null
 */
export function getLocation(cityName: string): Place | null {
  const city = lookupCity(cityName);
  if (!city) return null;
  return cityToPlace(city);
}

// ============================================================================
// TIMEZONE RESOLUTION FROM COORDINATES
// ============================================================================

/**
 * Get timezone offset for a location using the Intl API.
 * This uses the browser's timezone database to resolve timezone from a
 * timezone name string. For coordinates without a known timezone name,
 * it falls back to the browser's local timezone.
 *
 * Equivalent to Python's get_place_timezone_offset() using TimezoneFinder.
 *
 * @param timezoneName - IANA timezone name (e.g., "Asia/Kolkata")
 * @param date - Date for DST calculation (default: now)
 * @returns Timezone offset in hours from UTC
 */
export function getTimezoneOffsetFromName(timezoneName: string, date: Date = new Date()): number {
  try {
    // Get UTC time components
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
    const localStr = date.toLocaleString('en-US', { timeZone: timezoneName });

    const utcDate = new Date(utcStr);
    const localDate = new Date(localStr);

    return (localDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  } catch {
    // If timezone name is invalid, return 0
    return 0;
  }
}

/**
 * Get timezone offset for given coordinates by looking up the nearest city.
 * Falls back to estimating timezone from longitude if database not loaded.
 *
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param date - Date for DST calculation
 * @returns Timezone offset in hours
 */
export function getTimezoneOffsetFromCoords(
  latitude: number,
  longitude: number,
  date: Date = new Date(),
): number {
  // Try nearest city lookup
  const nearest = findNearestCity(latitude, longitude);
  if (nearest) {
    // If we have a timezone name, resolve it for DST accuracy
    if (nearest.timezoneName) {
      return getTimezoneOffsetFromName(nearest.timezoneName, date);
    }
    return nearest.timezoneOffset;
  }

  // Fallback: estimate from longitude (1 hour per 15 degrees)
  return Math.round(longitude / 15);
}
