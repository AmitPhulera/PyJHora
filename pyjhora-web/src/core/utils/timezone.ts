/**
 * Timezone helpers.
 *
 * The horoscope engine needs a *numeric* UTC offset in hours (e.g. 5.5 for
 * India, -4 for New York in summer). A place only gives us an IANA zone name
 * (via `tz-lookup` on its lat/lon); the actual offset depends on the date
 * because of DST. So we resolve the offset *for the birth date* using the
 * platform `Intl` time-zone database — a 1995 summer NYC birth correctly
 * yields -4, a winter one -5, and India (no DST) is always +5.5.
 */
import tzLookup from 'tz-lookup';

/** IANA timezone name for a coordinate (e.g. "Asia/Kolkata"). */
export function ianaZoneForCoords(latitude: number, longitude: number): string {
  return tzLookup(latitude, longitude);
}

/**
 * UTC offset in hours for an IANA zone at a specific instant.
 *
 * Uses Intl's `timeZoneName: 'longOffset'` / `shortOffset` part, which encodes
 * the offset as "GMT+5:30" / "GMT-4". Falls back to 0 if the zone is unknown.
 */
export function offsetHoursForZoneAtDate(zone: string, date: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    });
    const part = fmt.formatToParts(date).find((p) => p.type === 'timeZoneName');
    return parseGmtOffset(part?.value ?? '');
  } catch {
    return 0;
  }
}

/**
 * Numeric UTC offset (hours) for a coordinate at a given local date/time.
 *
 * @param latitude  decimal degrees
 * @param longitude decimal degrees
 * @param dateStr   "YYYY-MM-DD"
 * @param timeStr   "HH:MM" (optional, defaults to noon)
 */
export function offsetHoursForCoordsAtDate(
  latitude: number,
  longitude: number,
  dateStr: string,
  timeStr = '12:00',
): number {
  const zone = ianaZoneForCoords(latitude, longitude);
  // The instant is approximate (we treat the local wall-clock time as UTC to
  // pick the date); DST transitions happen at most twice a year, so being off
  // by the offset itself almost never changes which side of a transition we
  // land on. Good enough to resolve the standard-vs-daylight offset.
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const instant = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0));
  return offsetHoursForZoneAtDate(zone, instant);
}

/** Parse "GMT+5:30", "GMT-4", "GMT" → 5.5, -4, 0. */
function parseGmtOffset(value: string): number {
  const match = value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  return sign * (hours + minutes / 60);
}
