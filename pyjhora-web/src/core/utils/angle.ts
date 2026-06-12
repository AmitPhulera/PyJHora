/**
 * Angle and coordinate utilities ported from utils.py
 * Handles degree/radian conversions, longitude normalization, etc.
 */

// ============================================================================
// ANGLE CONVERSIONS
// ============================================================================

/** Degrees to radians */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/** Radians to degrees */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

// ============================================================================
// LONGITUDE NORMALIZATION
// ============================================================================

/**
 * Normalize angle to 0-360 range
 * @param degrees - Angle in degrees
 * @returns Normalized angle (0-360)
 */
export function normalizeDegrees(degrees: number): number {
  let normalized = degrees % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  // Avoid -0
  return normalized === 0 ? 0 : normalized;
}

/**
 * Normalize angle to -180 to +180 range
 * @param degrees - Angle in degrees
 * @returns Normalized angle (-180 to +180)
 */
export function normalizeDegreesSymmetric(degrees: number): number {
  let normalized = normalizeDegrees(degrees);
  if (normalized > 180) {
    normalized -= 360;
  }
  return normalized;
}

/**
 * Get the longitude within a rasi (0-30)
 * @param longitude - Total longitude (0-360)
 * @returns Longitude within the sign (0-30)
 */
export function longitudeInSign(longitude: number): number {
  return normalizeDegrees(longitude) % 30;
}

/**
 * Get the rasi (sign) index from longitude
 * @param longitude - Total longitude (0-360)
 * @returns Rasi index (0-11)
 */
export function rasiFromLongitude(longitude: number): number {
  return Math.floor(normalizeDegrees(longitude) / 30);
}

/**
 * Normalize angle to be within [start, start + 360).
 *
 * Python: normalize_angle(angle, start=0)
 *
 * @param angle - Angle in degrees
 * @param start - Start of the range (default 0)
 * @returns Normalized angle within [start, start + 360)
 */
// @parity: py=normalize_angle
export function normalizeAngle(angle: number, start = 0): number {
  let a = angle;
  while (a >= start + 360) a -= 360;
  while (a < start) a += 360;
  return a;
}

/**
 * Make angle lie between [-180, 180).
 *
 * Python: norm180 = lambda angle: (angle - 360) if angle >= 180 else angle
 *
 * @param angle - Angle in [0, 360) range
 * @returns Angle in [-180, 180) range
 */
export function norm180(angle: number): number {
  return angle >= 180 ? angle - 360 : angle;
}

/**
 * Make angle lie between [0, 360).
 *
 * Python: norm360 = lambda angle: angle % 360
 *
 * @param angle - Any angle
 * @returns Angle in [0, 360) range
 */
export function norm360(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

// ============================================================================
// DEGREE/MINUTE/SECOND CONVERSIONS
// ============================================================================

/** DMS (Degrees/Minutes/Seconds) structure */
export interface DMS {
  degrees: number;
  minutes: number;
  seconds: number;
  isNegative: boolean;
}

/**
 * Convert decimal degrees to DMS
 * @param decimalDegrees - Angle in decimal degrees
 * @returns DMS structure
 */
export function toDMS(decimalDegrees: number): DMS {
  const isNegative = decimalDegrees < 0;
  const absolute = Math.abs(decimalDegrees);
  
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60);

  return { degrees, minutes, seconds, isNegative };
}

/**
 * Convert DMS to decimal degrees
 * @param dms - DMS structure
 * @returns Decimal degrees
 */
export function fromDMS(dms: DMS): number {
  const decimal = dms.degrees + dms.minutes / 60 + dms.seconds / 3600;
  return dms.isNegative ? -decimal : decimal;
}

/**
 * Format decimal degrees as string
 * @param degrees - Decimal degrees
 * @param format - 'dms' or 'dm' or 'degrees'
 * @returns Formatted string
 */
export function formatDegrees(degrees: number, format: 'dms' | 'dm' | 'degrees' = 'dms'): string {
  const dms = toDMS(degrees);
  const sign = dms.isNegative ? '-' : '';

  switch (format) {
    case 'degrees':
      return `${sign}${degrees.toFixed(4)}°`;
    case 'dm':
      return `${sign}${dms.degrees}° ${dms.minutes}'`;
    case 'dms':
    default:
      return `${sign}${dms.degrees}° ${dms.minutes}' ${dms.seconds}"`;
  }
}

/**
 * Format longitude with sign and rasi
 * @param longitude - Total longitude (0-360)
 * @param rasiNames - Array of rasi names
 * @returns Formatted string like "15° 30' 45" Leo"
 */
export function formatLongitudeWithRasi(longitude: number, rasiNames: string[]): string {
  const rasi = rasiFromLongitude(longitude);
  const longInSign = longitudeInSign(longitude);
  const dms = toDMS(longInSign);
  const rasiName = rasiNames[rasi] ?? `Rasi${rasi}`;
  
  return `${dms.degrees}° ${dms.minutes}' ${dms.seconds}" ${rasiName}`;
}

// ============================================================================
// ANGULAR CALCULATIONS
// ============================================================================

/**
 * Calculate angular distance (shortest path) between two longitudes
 * @param long1 - First longitude
 * @param long2 - Second longitude
 * @returns Angular distance (0-180)
 */
export function angularDistance(long1: number, long2: number): number {
  const diff = Math.abs(normalizeDegrees(long1) - normalizeDegrees(long2));
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Calculate signed angular difference (long2 - long1)
 * @param long1 - First longitude
 * @param long2 - Second longitude
 * @returns Signed difference (-180 to +180)
 */
export function angularDifference(long1: number, long2: number): number {
  return normalizeDegreesSymmetric(normalizeDegrees(long2) - normalizeDegrees(long1));
}

/**
 * Calculate the number of signs between two positions
 * @param rasi1 - First rasi (0-11)
 * @param rasi2 - Second rasi (0-11)
 * @returns Number of signs from rasi1 to rasi2 (1-12)
 */
export function signDistance(rasi1: number, rasi2: number): number {
  const diff = ((rasi2 - rasi1) % 12 + 12) % 12;
  return diff === 0 ? 12 : diff;
}

/**
 * Count rasis from one sign to another (inclusive count)
 * This is the TypeScript equivalent of Python's utils.count_rasis
 * @param fromRasi - Starting rasi (0-11)
 * @param toRasi - Ending rasi (0-11)
 * @param dir - Direction: 1 for forward, -1 for backward (default: 1)
 * @param total - Total number of signs (default: 12)
 * @returns Inclusive count of rasis (1-12)
 *
 * Examples:
 * - countRasis(0, 0) = 1 (same sign counts as 1)
 * - countRasis(0, 1) = 2 (Aries to Taurus = 2 signs)
 * - countRasis(0, 11) = 12 (Aries to Pisces = 12 signs)
 */
export function countRasis(fromRasi: number, toRasi: number, dir: 1 | -1 = 1, total: number = 12): number {
  if (dir === 1) {
    return ((toRasi + total - fromRasi) % total) + 1;
  } else {
    return ((fromRasi + total - toRasi) % total) + 1;
  }
}

/**
 * Get house number (1-based) of a planet from ascendant
 * @param ascendantRasi - Ascendant rasi (0-11)
 * @param planetRasi - Planet rasi (0-11)
 * @returns House number (1-12)
 */
export function getHouseNumber(ascendantRasi: number, planetRasi: number): number {
  return signDistance(ascendantRasi, planetRasi);
}

// ============================================================================
// NAKSHATRA CALCULATIONS
// ============================================================================

/** Nakshatra span in degrees */
const NAKSHATRA_SPAN = 360 / 27;

/** Pada span in degrees */
const PADA_SPAN = NAKSHATRA_SPAN / 4;

/**
 * Get nakshatra from longitude
 * @param longitude - Total longitude (0-360)
 * @returns Object with nakshatra index (0-26), pada (1-4), and remainder
 */
export function nakshatraFromLongitude(longitude: number): {
  nakshatra: number;
  pada: number;
  remainder: number;
} {
  const normalized = normalizeDegrees(longitude);
  const nakshatra = Math.floor(normalized / NAKSHATRA_SPAN);
  const remainder = normalized % NAKSHATRA_SPAN;
  const pada = Math.floor(remainder / PADA_SPAN) + 1;

  return { nakshatra, pada, remainder };
}

// ============================================================================
// PRECISION UTILITIES
// ============================================================================

/**
 * Round a number to specified decimal places
 * @param value - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Compare two floating point numbers with tolerance
 * @param a - First number
 * @param b - Second number
 * @param tolerance - Maximum allowed difference (default 1e-9)
 * @returns True if numbers are within tolerance
 */
export function almostEqual(a: number, b: number, tolerance = 1e-9): boolean {
  return Math.abs(a - b) <= tolerance;
}

// ============================================================================
// DMS STRING PARSING (from Python to_dms / from_dms)
// ============================================================================

/**
 * Convert decimal degrees to DMS with float seconds (higher precision).
 *
 * Python: to_dms_prec(deg)
 *
 * @param deg - Decimal degrees
 * @returns [degrees, minutes, seconds] where seconds is a float
 */
// @parity: py=to_dms_prec
export function toDmsPrec(deg: number): [number, number, number] {
  const d = Math.trunc(deg);
  const mins = (deg - d) * 60;
  const m = Math.trunc(mins);
  const s = roundTo((mins - m) * 60, 2);
  return [d, m, s];
}

/**
 * Convert a DMS time string (HH:MM:SS) to [hours, minutes, seconds] tuple.
 * Handles (+1) and (-1) day markers and AM/PM suffixes.
 *
 * Python: from_dms_str_to_dms(dms_str)
 *
 * @param dmsStr - Time string like "10:34:00", "10:34:00 AM", "06:10:00(+1)"
 * @returns [hours, minutes, seconds]
 */
// @parity: py=from_dms_str_to_dms
export function fromDmsStrToDms(dmsStr: string): [number, number, number] {
  let dmsh = 0;
  if (dmsStr.includes('+1')) {
    dmsh = 24;
  } else if (dmsStr.includes('-1')) {
    dmsh = -24;
  }

  const cleaned = dmsStr
    .replace(/\(\+1\)/g, '')
    .replace(/\(-1\)/g, '')
    .replace(/ AM/gi, '')
    .replace(/ PM/gi, '')
    .trim();

  const parts = cleaned.split(':');
  return [
    dmsh + parseInt(parts[0] ?? '0', 10),
    parseInt(parts[1] ?? '0', 10),
    parseInt(parts[2] ?? '0', 10),
  ];
}

/**
 * Convert a DMS time string to decimal degrees/hours.
 *
 * Python: from_dms_str_to_degrees(dms_str)
 *
 * @param dmsStr - Time/angle string like "10:34:00"
 * @returns Decimal value
 */
// @parity: py=from_dms_str_to_degrees
export function fromDmsStrToDegrees(dmsStr: string): number {
  const [d, m, s] = fromDmsStrToDms(dmsStr);
  return d + m / 60 + s / 3600;
}

/**
 * Convert DMS list to formatted string with degree symbols.
 *
 * Python: from_dms_to_str(dms_list)
 *
 * @param dms - Array of [degrees, minutes, seconds]
 * @returns Formatted string like "23\u00b0 30\u2032 45\u2033"
 */
export function dmsToString(dms: [number, number, number]): string {
  return `${dms[0]}\u00b0 ${dms[1]}\u2032 ${dms[2]}\u2033`;
}
