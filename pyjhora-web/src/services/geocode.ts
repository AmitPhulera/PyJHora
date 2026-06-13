/**
 * Place search via the free OpenStreetMap Nominatim API.
 *
 * Nominatim usage policy: max ~1 request/second and a descriptive identifier.
 * Callers must debounce input (the PlaceAutocomplete component does ~400ms).
 * Browsers can't set a custom User-Agent, but the Referer header (sent
 * automatically) plus rate-limiting keeps us within fair use. For heavy
 * production traffic this should be swapped for a self-hosted or paid provider.
 */

export interface GeocodeResult {
  /** Human-readable place label, e.g. "Pithoragarh, Uttarakhand, India". */
  displayName: string;
  latitude: number;
  longitude: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Search for places matching a free-text query.
 *
 * @param query  user input (e.g. "pithor")
 * @param signal optional AbortSignal to cancel a stale in-flight request
 * @returns up to 8 matching places (empty array on error / blank query)
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    limit: '8',
    addressdetails: '0',
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    return data.map((item) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
  } catch {
    // AbortError (stale request) or network failure — caller shows no results.
    return [];
  }
}
