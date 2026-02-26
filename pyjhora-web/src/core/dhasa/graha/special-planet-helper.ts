/**
 * Special Starting Planet Helper
 *
 * Resolves longitude for special starting planets used in graha dhasa systems.
 * Matches Python's _dhasa_start() branching for dhasa_starting_planet parameter:
 *   0-8: Regular planets (Sun through Ketu)
 *   'L': Lagna/Ascendant
 *   'M': Maandi
 *   'G': Gulika
 *   'B': Bhrigu Bindhu
 *   'I': Indu Lagna
 *   'P': Pranapada Lagna
 *   'T': Tri-Sphuta
 */

import { ASCENDANT_SYMBOL, MOON } from '../../constants';
import { getDivisionalChart, PlanetPosition } from '../../horoscope/charts';
import { triSphuta } from '../../horoscope/sphuta';
import {
  getPlanetLongitude,
  gulikaLongitudeAsync,
  maandiLongitudeAsync,
  bhriguBindhuAsync,
  induLagnaAsync,
  pranapadaLagnaAsync
} from '../../panchanga/drik';
import type { Place } from '../../types';
import { normalizeDegrees } from '../../utils/angle';
import { julianDayToGregorian } from '../../utils/julian';

/**
 * Resolve the absolute longitude for a dhasa starting planet.
 *
 * For regular planets (0-8) and Lagna ('L'), this operates synchronously.
 * For special planets (M/G/B/I/P/T), this requires async operations.
 *
 * @param dhasaStartingPlanet - Planet index (0-8), or string: 'L', 'M', 'G', 'B', 'I', 'P', 'T'
 * @param jd - Julian Day Number
 * @param place - Place data
 * @param divisionalChartFactor - Divisional chart factor (default 1 = Rasi)
 * @param chartMethod - Chart method (default 1)
 * @param starPositionFromMoon - Star position offset from Moon (default 1)
 * @returns Absolute longitude in degrees (0-360)
 */
export async function resolveStartingPlanetLongitude(
  dhasaStartingPlanet: number | string,
  jd: number,
  place: Place,
  divisionalChartFactor = 1,
  chartMethod = 1,
  starPositionFromMoon = 1
): Promise<number> {
  const oneStar = 360 / 27;
  let planetLong: number;

  if (typeof dhasaStartingPlanet === 'number' && dhasaStartingPlanet >= 0 && dhasaStartingPlanet <= 8) {
    // Regular planets 0-8
    planetLong = getPlanetLongitude(jd, place, dhasaStartingPlanet);

    // Apply divisional chart correction if needed
    if (divisionalChartFactor > 1) {
      const d1Pos: PlanetPosition = {
        planet: dhasaStartingPlanet,
        rasi: Math.floor(planetLong / 30),
        longitude: planetLong % 30
      };
      const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor, chartMethod)[0];
      if (vargaPos) {
        planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
      }
    }
  } else if (dhasaStartingPlanet === ASCENDANT_SYMBOL || dhasaStartingPlanet === 'L') {
    // Lagna/Ascendant: use Sun as proxy (known sync limitation in TS)
    // Python: planet_positions[0][1][0]*30 + planet_positions[0][1][1]
    planetLong = getPlanetLongitude(jd, place, 0); // SUN as Lagna proxy

    if (divisionalChartFactor > 1) {
      const d1Pos: PlanetPosition = {
        planet: 0,
        rasi: Math.floor(planetLong / 30),
        longitude: planetLong % 30
      };
      const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor, chartMethod)[0];
      if (vargaPos) {
        planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
      }
    }
  } else if (typeof dhasaStartingPlanet === 'string') {
    const upper = dhasaStartingPlanet.toUpperCase();
    const { time } = julianDayToGregorian(jd);
    const tobHours = time.hour + time.minute / 60 + time.second / 3600;

    if (upper === 'M') {
      // Maandi
      const mn = await maandiLongitudeAsync(jd, place, tobHours);
      planetLong = mn[0] * 30 + mn[1];
    } else if (upper === 'G') {
      // Gulika
      const gl = await gulikaLongitudeAsync(jd, place, tobHours);
      planetLong = gl[0] * 30 + gl[1];
    } else if (upper === 'B') {
      // Bhrigu Bindhu
      const bb = await bhriguBindhuAsync(jd, place, divisionalChartFactor, chartMethod);
      planetLong = bb[0] * 30 + bb[1];
    } else if (upper === 'I') {
      // Indu Lagna
      const il = await induLagnaAsync(jd, place, divisionalChartFactor, chartMethod);
      planetLong = il[0] * 30 + il[1];
    } else if (upper === 'P') {
      // Pranapada Lagna
      const pp = await pranapadaLagnaAsync(jd, place, divisionalChartFactor, chartMethod);
      planetLong = pp[0] * 30 + pp[1];
    } else if (upper === 'T') {
      // Tri-Sphuta: needs planet positions and gulika longitude
      // Get all planet positions for triSphuta calculation
      const positions: PlanetPosition[] = [];
      for (let p = 0; p <= 8; p++) {
        const long = getPlanetLongitude(jd, place, p);
        positions.push({ planet: p, rasi: Math.floor(long / 30), longitude: long % 30 });
      }
      // Add Lagna placeholder (using Sun as proxy - known limitation)
      const sunLong = getPlanetLongitude(jd, place, 0);
      positions.push({ planet: -1, rasi: Math.floor(sunLong / 30), longitude: sunLong % 30 });

      // Get Gulika longitude for triSphuta
      const gl = await gulikaLongitudeAsync(jd, place, tobHours);
      const gulikaAbsLong = gl[0] * 30 + gl[1];

      // Apply divisional chart if needed
      let triPositions = positions;
      if (divisionalChartFactor > 1) {
        triPositions = getDivisionalChart(positions, divisionalChartFactor, chartMethod);
      }

      const sp = triSphuta(triPositions, gulikaAbsLong);
      planetLong = sp.rasi * 30 + sp.longitude;
    } else {
      // Default to Moon
      planetLong = getPlanetLongitude(jd, place, MOON);
      if (divisionalChartFactor > 1) {
        const d1Pos: PlanetPosition = {
          planet: MOON,
          rasi: Math.floor(planetLong / 30),
          longitude: planetLong % 30
        };
        const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor, chartMethod)[0];
        if (vargaPos) {
          planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
        }
      }
    }
  } else {
    // Default to Moon for any unrecognized value
    planetLong = getPlanetLongitude(jd, place, MOON);
    if (divisionalChartFactor > 1) {
      const d1Pos: PlanetPosition = {
        planet: MOON,
        rasi: Math.floor(planetLong / 30),
        longitude: planetLong % 30
      };
      const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor, chartMethod)[0];
      if (vargaPos) {
        planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
      }
    }
  }

  // Apply star position offset from Moon (only when starting planet is Moon = 1)
  if (dhasaStartingPlanet === 1 || dhasaStartingPlanet === MOON) {
    planetLong += (starPositionFromMoon - 1) * oneStar;
    planetLong = normalizeDegrees(planetLong);
  }

  return planetLong;
}

/**
 * Synchronous version: resolve planet longitude for numeric planets only (0-8) and 'L'.
 * Falls back to Moon for unrecognized values.
 * Use resolveStartingPlanetLongitude for async special planets (M/G/B/I/P/T).
 */
export function resolveStartingPlanetLongitudeSync(
  dhasaStartingPlanet: number | string,
  jd: number,
  place: Place,
  divisionalChartFactor = 1,
  chartMethod = 1,
  starPositionFromMoon = 1
): number {
  const oneStar = 360 / 27;
  let planetLong: number;

  if (typeof dhasaStartingPlanet === 'number' && dhasaStartingPlanet >= 0 && dhasaStartingPlanet <= 8) {
    planetLong = getPlanetLongitude(jd, place, dhasaStartingPlanet);

    if (divisionalChartFactor > 1) {
      const d1Pos: PlanetPosition = {
        planet: dhasaStartingPlanet,
        rasi: Math.floor(planetLong / 30),
        longitude: planetLong % 30
      };
      const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor, chartMethod)[0];
      if (vargaPos) {
        planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
      }
    }
  } else if (dhasaStartingPlanet === ASCENDANT_SYMBOL || dhasaStartingPlanet === 'L') {
    // Lagna proxy using Sun
    planetLong = getPlanetLongitude(jd, place, 0);
    if (divisionalChartFactor > 1) {
      const d1Pos: PlanetPosition = {
        planet: 0,
        rasi: Math.floor(planetLong / 30),
        longitude: planetLong % 30
      };
      const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor, chartMethod)[0];
      if (vargaPos) {
        planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
      }
    }
  } else {
    // Default to Moon
    planetLong = getPlanetLongitude(jd, place, MOON);
    if (divisionalChartFactor > 1) {
      const d1Pos: PlanetPosition = {
        planet: MOON,
        rasi: Math.floor(planetLong / 30),
        longitude: planetLong % 30
      };
      const vargaPos = getDivisionalChart([d1Pos], divisionalChartFactor, chartMethod)[0];
      if (vargaPos) {
        planetLong = vargaPos.rasi * 30 + vargaPos.longitude;
      }
    }
  }

  // Apply star position offset from Moon
  if (dhasaStartingPlanet === 1 || dhasaStartingPlanet === MOON) {
    planetLong += (starPositionFromMoon - 1) * oneStar;
    planetLong = normalizeDegrees(planetLong);
  }

  return planetLong;
}

/**
 * Check if the starting planet requires async resolution.
 */
export function isSpecialStartingPlanet(dhasaStartingPlanet: number | string): boolean {
  if (typeof dhasaStartingPlanet !== 'string') return false;
  const upper = dhasaStartingPlanet.toUpperCase();
  return ['M', 'G', 'B', 'I', 'P', 'T'].includes(upper);
}
