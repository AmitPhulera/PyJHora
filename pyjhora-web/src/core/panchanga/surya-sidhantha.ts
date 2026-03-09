/**
 * Surya Siddhanta calculations
 * Ported from PyJHora surya_sidhantha.py
 *
 * Computes mean and true planetary positions using classical Indian astronomy.
 * Reference: Indian Astronomy - An Introduction - S. Balachandra Rao
 *
 * NOTE: Work in progress -- some outer-planet positions may differ from Drik.
 */

import {
  CIVIL_DAYS_IN_MAHAYUGA,
  DAILY_MEAN_MOTIONS,
  KETU,
  MADOCCA_REVOLUTIONS,
  MAHABHARATHA_TITHI_JULIAN_DAY,
  MANDAKENDRAJYA_INDIAN_SINE_RADIUS,
  MANODCCA_POSITIONS_AT_KALI,
  MARS,
  MEAN_REVOLUTIONS_MOON_KALI,
  MEAN_REVOLUTIONS_RAHU_KALI,
  MEAN_REVOLUTIONS_SUN_KALI,
  MERCURY,
  MOON,
  PLANET_MANDAPHALA_PERIPHERY_MODERN,
  PLANET_MEAN_LONGITUDES,
  PLANET_MEAN_REVOLUTIONS_AT_KALI,
  PLANET_SIGHRA_PERIPHERIES,
  RAHU,
  SATURN,
  SUN,
  UJJAIN_LAT_LONG,
  VENUS,
  MOON_APOGEE_MEAN_MOTION,
  JUPITER,
  ASCENDANT_SYMBOL,
} from '../constants';
import type { Place } from '../types';
import { normalizeDegrees } from '../utils/angle';
import { julianDayToGregorian, gregorianToJulianDay } from '../utils/julian';
import { sunrise as drikSunrise } from '../ephemeris/swe-adapter';
import { vaara } from './drik';

// ============================================================================
// HELPERS
// ============================================================================

const sind = (x: number): number => Math.sin((x * Math.PI) / 180);
const cosd = (x: number): number => Math.cos((x * Math.PI) / 180);

const PLANET_LIST = [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU];

// ============================================================================
// AHARGANA
// ============================================================================

/**
 * Kali ahargana -- days since the Kali epoch, with weekday correction.
 */
export function kaliAhargana(jd: number): number {
  const kad = Math.floor(jd - MAHABHARATHA_TITHI_JULIAN_DAY);
  const wday = kad % 7;
  const wdayjd = vaara(jd);
  const winc = wdayjd - 5 - wday;
  return kad + winc;
}

/**
 * Khanda Khaadyaka ahargana
 */
export function aharganaKhandaKhaadyaka(jd: number): number {
  return jd - 1964031;
}

// ============================================================================
// MEAN LONGITUDES
// ============================================================================

/**
 * Mean solar longitude (degrees).
 * Returns [decimalDegrees, formattedString].
 */
export function meanSolarLongitude(jd: number): number {
  const dailyMotion = (MEAN_REVOLUTIONS_SUN_KALI / CIVIL_DAYS_IN_MAHAYUGA) * 360;
  const kan = kaliAhargana(jd);
  return ((kan * dailyMotion) % 360 + 360) % 360;
}

/**
 * Mean lunar longitude (degrees).
 */
export function meanLunarLongitude(jd: number): number {
  const dailyMotion = (MEAN_REVOLUTIONS_MOON_KALI / CIVIL_DAYS_IN_MAHAYUGA) * 360;
  const kan = kaliAhargana(jd);
  return ((kan * dailyMotion) % 360 + 360) % 360;
}

/**
 * Mean lunar apogee longitude (degrees).
 */
export function meanLunarApogeeLongitude(jd: number): number {
  const dailyMotion = (MADOCCA_REVOLUTIONS[MOON] / CIVIL_DAYS_IN_MAHAYUGA) * 360;
  const kan = kaliAhargana(jd);
  return ((kan * dailyMotion) % 360 + MANODCCA_POSITIONS_AT_KALI[MOON] + 360) % 360;
}

/**
 * Mean Rahu longitude (degrees).
 */
export function meanRahuLongitude(jd: number): number {
  const dailyMotion = (MEAN_REVOLUTIONS_RAHU_KALI / CIVIL_DAYS_IN_MAHAYUGA) * 360;
  const kan = kaliAhargana(jd);
  return 180.0 - ((kan * dailyMotion) % 360);
}

/**
 * Mean Ketu longitude (degrees).
 */
export function meanKetuLongitude(jd: number): number {
  return (180.0 + meanRahuLongitude(jd)) % 360;
}

// ============================================================================
// CORRECTIONS
// ============================================================================

/**
 * Desantara correction for a planet given a place.
 */
export function desantaraCorrection(place: Place, planet: number): number {
  const dailyMotion = DAILY_MEAN_MOTIONS[planet];
  const ulong = UJJAIN_LAT_LONG[1];
  return ((ulong - place.longitude) / 360.0) * dailyMotion;
}

/**
 * Bhujantara correction for a planet given mandaphala of the Sun.
 */
export function bhujantaraCorrection(planet: number, mandaphalaSun: number): number {
  return (DAILY_MEAN_MOTIONS[planet] * mandaphalaSun) / 360;
}

// ============================================================================
// PLANET MEAN LONGITUDE (with desantara)
// ============================================================================

/**
 * Mean longitude of a planet (with desantara correction applied).
 * Also updates the global PLANET_MEAN_LONGITUDES state.
 */
export function planetMeanLongitude(jd: number, place: Place, planet: number): number {
  // Reset
  PLANET_MEAN_LONGITUDES[planet] = 0.0;

  const meanRevolutions = PLANET_MEAN_REVOLUTIONS_AT_KALI[planet];
  const dailyMotion = (meanRevolutions / CIVIL_DAYS_IN_MAHAYUGA) * 360;
  const kan = kaliAhargana(jd);
  let meanLong = ((kan * dailyMotion) + 360) % 360;

  if (planet === RAHU || planet === KETU) {
    meanLong = 180.0 - meanLong;
  }
  if (planet === KETU) {
    meanLong = (180.0 + meanLong) % 360;
  }

  const dc = desantaraCorrection(place, planet);
  const corrected = (meanLong + dc + 360.0) % 360;
  PLANET_MEAN_LONGITUDES[planet] = corrected;
  return corrected;
}

// ============================================================================
// MANDAPHALA  (Equation of Centre)
// ============================================================================

/**
 * Mandaphala (equation of centre) for a planet.
 */
export function mandaphalaPlanet(jd: number, planet: number, planetMeanLong: number): number {
  if (planet === RAHU || planet === KETU) return 0.0;

  const kan = kaliAhargana(jd);
  const mandoccaRevs = MADOCCA_REVOLUTIONS[planet];
  const posAtKali = MANODCCA_POSITIONS_AT_KALI[planet];
  const mandoccaMotion = ((kan / CIVIL_DAYS_IN_MAHAYUGA) * mandoccaRevs * 360) % 360;
  const planetMandocca = posAtKali + mandoccaMotion;

  const mandakendra = (planetMandocca - planetMeanLong + 360) % 360;
  const mandakendraSign = mandakendra > 180.0 ? -1.0 : 1.0;

  if (planet === SUN || planet === MOON) {
    const [Po, Pe] = PLANET_MANDAPHALA_PERIPHERY_MODERN[planet];
    const correctedPeriphery = Pe - (Pe - Po) * Math.abs(sind(mandakendra));
    const rectifiedPeriphery = (MANDAKENDRAJYA_INDIAN_SINE_RADIUS / 360.0) * correctedPeriphery;
    return mandakendraSign * rectifiedPeriphery * sind(mandakendra);
  } else {
    const [Po, Pe] = PLANET_MANDAPHALA_PERIPHERY_MODERN[planet];
    const correctedPeriphery = Pe - (Pe - Po) * Math.abs(sind(mandakendra));
    return (MANDAKENDRAJYA_INDIAN_SINE_RADIUS / 360.0) * correctedPeriphery * sind(mandakendra);
  }
}

// ============================================================================
// SIGHRA CORRECTION (for outer/inner planets)
// ============================================================================

function trueLongitudeAfterSighraCorrection(
  jd: number,
  place: Place,
  planet: number,
  planetMeanLong: number,
  mandaphalaCorr: number
): number {
  if (planet === SUN || planet === MOON || planet === RAHU || planet === KETU) {
    return 0.0;
  }

  const MP = planetMeanLong;

  function getSighraAnomaly(): number {
    if (PLANET_MEAN_LONGITUDES[SUN] === 0.0) {
      PLANET_MEAN_LONGITUDES[SUN] = meanSolarLongitude(jd);
    }
    if (planet === MERCURY || planet === VENUS) {
      return (planetMeanLong - PLANET_MEAN_LONGITUDES[SUN] + 360) % 360;
    }
    return (PLANET_MEAN_LONGITUDES[SUN] - planetMeanLong + 360) % 360;
  }

  function getSighraCorrection(pml: number): number {
    const m = getSighraAnomaly();
    const sign = (m > 90 && m < 270) ? -1.0 : 1.0;

    const [Po, Pe] = PLANET_SIGHRA_PERIPHERIES[planet];
    const P = Pe - (Pe - Po) * Math.abs(sind(m));
    const r = P / 360.0;
    const R = MANDAKENDRAJYA_INDIAN_SINE_RADIUS * 60.0;

    const dohphala = r * R * sind(m);
    const kotiphala = r * R * cosd(m);
    const sphutakoti = R + kotiphala;
    const sighrakarna = Math.sqrt(sphutakoti * sphutakoti + dohphala * dohphala);
    const rsinsighraphala = (dohphala * R) / sighrakarna;
    return (Math.asin(rsinsighraphala / R) * 180.0) / Math.PI;
  }

  const SE1 = getSighraCorrection(MP);
  const P1 = MP + 0.5 * SE1;
  const ME1 = mandaphalaCorr;
  const P2 = P1 + 0.5 * ME1;
  const ME2 = mandaphalaPlanet(jd, planet, P2);
  const P3 = MP + ME2;
  PLANET_MEAN_LONGITUDES[planet] = P3;
  const SE2 = getSighraCorrection(P3);
  return P3 + SE2;
}

// ============================================================================
// TRUE LONGITUDE
// ============================================================================

/** Mutable module-level state for Sun's mandaphala (used in bhujantara). */
let _mandaphalaSun = 0.0;

/**
 * True longitude of a planet using Surya Siddhanta.
 */
export function planetTrueLongitude(
  jd: number,
  place: Place,
  planet: number,
  planetMeanLong: number
): number {
  if (planet === RAHU || planet === KETU) return planetMeanLong;

  const mandaphala = mandaphalaPlanet(jd, planet, planetMeanLong);
  if (planet === SUN) {
    _mandaphalaSun = mandaphala;
  }

  let corrected = planetMeanLong + mandaphala;
  corrected += bhujantaraCorrection(planet, _mandaphalaSun);
  let trueLong = (corrected + 360) % 360;

  if (planet === SUN || planet === MOON) {
    return trueLong;
  }

  trueLong = (trueLongitudeAfterSighraCorrection(jd, place, planet, planetMeanLong, mandaphala) + 360) % 360;
  return trueLong;
}

// ============================================================================
// COMPOSITE RESULTS
// ============================================================================

/**
 * All planet positions via Surya Siddhanta.
 * Returns array of [planetId, [rasiIndex, longitudeInSign]].
 */
export function planetPositions(jd: number, place: Place): Array<[number | string, [number, number]]> {
  const results: Array<[number | string, [number, number]]> = [];
  _mandaphalaSun = 0.0;

  // Reset all mean longitudes
  for (const p of PLANET_LIST) {
    PLANET_MEAN_LONGITUDES[p] = 0.0;
  }

  for (const planet of PLANET_LIST) {
    const meanLong = planetMeanLongitude(jd, place, planet);
    const trueLong = planetTrueLongitude(jd, place, planet, meanLong) % 360;
    const pid = PLANET_LIST.indexOf(planet);
    results.push([pid, [Math.floor(trueLong / 30), trueLong % 30]]);
  }

  // Ascendant placeholder using Sun longitude
  const sunLong = results[0][1][0] * 30 + results[0][1][1];
  const ascResult = ascendantNew(jd, place, sunLong);
  return [[ASCENDANT_SYMBOL, ascResult], ...results];
}

// ============================================================================
// DECLINATION / SUNRISE-SET
// ============================================================================

/**
 * Declination of the Sun (approximate).
 */
export function declinationOfSun(jd: number): number {
  const d = jd - 2451545.0;
  const meanAnomaly = (357.529 * 0.98560028 * d) % 360;
  const meanLong = (280.459 + 0.98564736 * d) % 360;
  const eclipticLong = meanLong + 1.915 * sind(meanAnomaly) + 0.020 * sind(2 * meanAnomaly);
  const obliquity = 23.439 - 0.00000036 * d;
  return (Math.asin(sind(obliquity) * sind(eclipticLong)) * 180) / Math.PI;
}

/**
 * Sunrise and sunset hours (approximate) for the given JD and place.
 * Returns [sunriseHours, sunsetHours].
 */
export function sunriseSet(jd: number, place: Place): [number, number] {
  const declSun = declinationOfSun(jd);
  const lat = place.latitude;
  const prad = Math.PI / 180.0;
  const srHrs = Math.acos(-Math.tan(lat * prad) * Math.tan(declSun * prad)) / prad / 15.0;
  return [12.0 - srHrs, 12.0 + srHrs];
}

// ============================================================================
// ASCENDANT (experimental -- may not be fully accurate)
// ============================================================================

function ascendantNew(jd: number, place: Place, sunLong: number): [number, number] {
  const lat = place.latitude;
  const R = 3438;

  function _declination(latVal: number): number[] {
    const decls = [11.733998794908114, 20.624646006223887, 24.0];
    const td0 = decls.map(d => (R / 6) * Math.tan((latVal * Math.PI) / 180) * Math.tan((d * Math.PI) / 180));
    let td = [-td0[0]];
    for (let i = 1; i < td0.length; i++) {
      td.push(-(td0[i] - td0[i - 1]));
    }
    const td1 = [...td].reverse();
    td = [...td, ...td1.map(v => -v)];
    const td2 = [...td].reverse();
    td = [...td, ...td2.map(v => v)]; // Not negated in Python for last block
    return td;
  }

  const td = _declination(lat);
  const lankaRisingDurations = [278, 299, 323, 323, 299, 278, 278, 299, 323, 323, 299, 278];
  const placeRisingDurations = lankaRisingDurations.map((d, i) => d + td[i]);

  const sunRise = drikSunrise(jd, place);
  const jdSunrise = sunRise.jd;

  const { date: gregDate } = julianDayToGregorian(jd);
  const jdUtc = gregorianToJulianDay(gregDate, { hour: 0, minute: 0, second: 0 });

  const timeFromSunriseVinadi = ((jd - jdSunrise) * 24) / 2.5 * 60;
  const sunLongRem = sunLong % 30;
  const sunLongRemVinadi = sunLongRem * 60.0;
  const sunLongRaasi = Math.floor(sunLong / 30);
  const placeRising = (placeRisingDurations[sunLongRaasi] * sunLongRemVinadi) / (30 * 60);
  const residue = timeFromSunriseVinadi - placeRising;
  const ascLong = (residue / placeRisingDurations[(sunLongRaasi + 1) % 12]) * 30;
  return [Math.floor(ascLong / 30), ascLong % 30];
}

// ============================================================================
// SOLAR MONTH/DATE (Tamil calendar via SS)
// ============================================================================

/**
 * Solar month and date using Surya Siddhanta true solar longitude.
 * Returns [tamilMonth (0-based), dayCount].
 */
export function solarMonthAndDate(
  panchangaDate: { year: number; month: number; day: number },
  place: Place
): [number, number] {
  let jd = gregorianToJulianDay(panchangaDate, { hour: 10, minute: 0, second: 0 });

  let solarMeanLong = planetMeanLongitude(jd, place, SUN);
  let sr = planetTrueLongitude(jd, place, SUN, solarMeanLong);
  const tamilMonth = Math.floor(sr / 30);

  let daycount = 1;
  while (true) {
    if (sr % 30 < 1 && sr % 30 > 0) break;
    jd -= 1;
    solarMeanLong = planetMeanLongitude(jd, place, SUN);
    sr = planetTrueLongitude(jd, place, SUN, solarMeanLong);
    daycount++;
    if (daycount > 40) break; // safety guard
  }
  return [tamilMonth, daycount];
}
