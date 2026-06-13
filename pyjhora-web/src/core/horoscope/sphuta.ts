/**
 * Sphuta (Sensitive Point) Calculations
 * Ported from PyJHora sphuta.py
 *
 * Calculates various sensitive points from planet longitudes:
 * - Tri Sphuta (Moon + Ascendant + Gulika)
 * - Chatur Sphuta (Sun + Tri Sphuta)
 * - Pancha Sphuta (Rahu + Chatur Sphuta)
 * - Prana Sphuta (Ascendant*5 + Gulika)
 * - Deha Sphuta (Moon*8 + Gulika)
 * - Mrityu Sphuta (Gulika*7 + Sun)
 * - Sookshma Tri Sphuta (Prana + Deha + Mrityu)
 * - Beeja Sphuta (seed point - male fertility)
 * - Kshetra Sphuta (field point - female fertility)
 * - Tithi Sphuta
 * - Yoga Sphuta
 * - Yogi Sphuta
 * - Avayogi Sphuta
 * - Rahu Tithi Sphuta
 */

import { PlanetPosition } from '../types';
import { SUN, MOON, MARS, JUPITER, VENUS, RAHU } from '../constants';
import { dasavargaFromLong } from './varga-utils';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract absolute longitude (0-360) from a planet in the positions array.
 * @param positions - Array of planet positions
 * @param planetIndex - Planet index (SUN=0, MOON=1, etc.; Lagna=-1)
 * @returns Absolute longitude in degrees (0-360)
 */
const getAbsLong = (positions: PlanetPosition[], planetIndex: number): number => {
  const pos = positions.find(p => p.planet === planetIndex);
  if (!pos) throw new Error(`Planet ${planetIndex} not found in positions`);
  return pos.rasi * 30 + pos.longitude;
};

// Lagna (Ascendant) planet index convention used throughout the codebase
const LAGNA = -1;

// ============================================================================
// GULIKA-DEPENDENT SPHUTA CALCULATIONS
// ============================================================================

/**
 * Tri Sphuta - triple sensitive point.
 * Formula: (Moon + Ascendant + Gulika) % 360
 *
 * @param positions - D-1 planet positions (must include Lagna at planet=-1)
 * @param gulikaLongitude - Absolute longitude of Gulika in degrees (0-360)
 * @returns Rasi and longitude of the Tri Sphuta
 */
export const triSphuta = (
  positions: PlanetPosition[],
  gulikaLongitude: number
): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const ascLong = getAbsLong(positions, LAGNA);
  const triLong = (moonLong + ascLong + gulikaLongitude) % 360;
  return dasavargaFromLong(triLong, 1);
};

/**
 * Chatur Sphuta - quadruple sensitive point.
 * Formula: (Sun + triSphuta) % 360
 *
 * @param positions - D-1 planet positions (must include Lagna at planet=-1)
 * @param gulikaLongitude - Absolute longitude of Gulika in degrees (0-360)
 * @returns Rasi and longitude of the Chatur Sphuta
 */
export const chaturSphuta = (
  positions: PlanetPosition[],
  gulikaLongitude: number
): { rasi: number; longitude: number } => {
  const sunLong = getAbsLong(positions, SUN);
  const tri = triSphuta(positions, gulikaLongitude);
  const triAbsLong = tri.rasi * 30 + tri.longitude;
  const chaturLong = (sunLong + triAbsLong) % 360;
  return dasavargaFromLong(chaturLong, 1);
};

/**
 * Pancha Sphuta - quintuple sensitive point.
 * Formula: (Rahu + chaturSphuta) % 360
 *
 * @param positions - D-1 planet positions (must include Lagna at planet=-1)
 * @param gulikaLongitude - Absolute longitude of Gulika in degrees (0-360)
 * @returns Rasi and longitude of the Pancha Sphuta
 */
export const panchaSphuta = (
  positions: PlanetPosition[],
  gulikaLongitude: number
): { rasi: number; longitude: number } => {
  const rahuLong = getAbsLong(positions, RAHU);
  const chatur = chaturSphuta(positions, gulikaLongitude);
  const chaturAbsLong = chatur.rasi * 30 + chatur.longitude;
  const panchaLong = (rahuLong + chaturAbsLong) % 360;
  return dasavargaFromLong(panchaLong, 1);
};

/**
 * Prana Sphuta - vital breath sensitive point.
 * Formula: (Ascendant * 5 + Gulika) % 360
 *
 * @param positions - D-1 planet positions (must include Lagna at planet=-1)
 * @param gulikaLongitude - Absolute longitude of Gulika in degrees (0-360)
 * @returns Rasi and longitude of the Prana Sphuta
 */
export const pranaSphuta = (
  positions: PlanetPosition[],
  gulikaLongitude: number
): { rasi: number; longitude: number } => {
  const ascLong = getAbsLong(positions, LAGNA);
  const pranaLong = (ascLong * 5 + gulikaLongitude) % 360;
  return dasavargaFromLong(pranaLong, 1);
};

/**
 * Deha Sphuta - body sensitive point.
 * Formula: (Moon * 8 + Gulika) % 360
 *
 * @param positions - D-1 planet positions
 * @param gulikaLongitude - Absolute longitude of Gulika in degrees (0-360)
 * @returns Rasi and longitude of the Deha Sphuta
 */
export const dehaSphuta = (
  positions: PlanetPosition[],
  gulikaLongitude: number
): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const dehaLong = (moonLong * 8 + gulikaLongitude) % 360;
  return dasavargaFromLong(dehaLong, 1);
};

/**
 * Mrityu Sphuta - death sensitive point.
 * Formula: (Gulika * 7 + Sun) % 360
 *
 * @param positions - D-1 planet positions
 * @param gulikaLongitude - Absolute longitude of Gulika in degrees (0-360)
 * @returns Rasi and longitude of the Mrityu Sphuta
 */
export const mrityuSphuta = (
  positions: PlanetPosition[],
  gulikaLongitude: number
): { rasi: number; longitude: number } => {
  const sunLong = getAbsLong(positions, SUN);
  const mrityuLong = (gulikaLongitude * 7 + sunLong) % 360;
  return dasavargaFromLong(mrityuLong, 1);
};

/**
 * Sookshma Tri Sphuta - subtle triple sensitive point.
 * Formula: (Prana Sphuta + Deha Sphuta + Mrityu Sphuta) % 360
 *
 * @param positions - D-1 planet positions (must include Lagna at planet=-1)
 * @param gulikaLongitude - Absolute longitude of Gulika in degrees (0-360)
 * @returns Rasi and longitude of the Sookshma Tri Sphuta
 */
export const sookshmaTriSphuta = (
  positions: PlanetPosition[],
  gulikaLongitude: number
): { rasi: number; longitude: number } => {
  const prana = pranaSphuta(positions, gulikaLongitude);
  const deha = dehaSphuta(positions, gulikaLongitude);
  const mrityu = mrityuSphuta(positions, gulikaLongitude);
  const sookshmaLong = (
    prana.rasi * 30 + prana.longitude +
    deha.rasi * 30 + deha.longitude +
    mrityu.rasi * 30 + mrityu.longitude
  ) % 360;
  return dasavargaFromLong(sookshmaLong, 1);
};

// ============================================================================
// SPHUTA CALCULATIONS (NO GULIKA DEPENDENCY)
// ============================================================================

/**
 * Beeja Sphuta (Seed Point) - male fertility indicator.
 * Formula: (Sun + Jupiter + Venus) % 360
 *
 * @param positions - D-1 planet positions
 * @returns Rasi and longitude of the Beeja Sphuta
 */
export const beejaSphuta = (positions: PlanetPosition[]): { rasi: number; longitude: number } => {
  const sunLong = getAbsLong(positions, SUN);
  const jupiterLong = getAbsLong(positions, JUPITER);
  const venusLong = getAbsLong(positions, VENUS);
  const beejaLong = (sunLong + jupiterLong + venusLong) % 360;
  return dasavargaFromLong(beejaLong, 1);
};

/**
 * Kshetra Sphuta (Field Point) - female fertility indicator.
 * Formula: (Moon + Jupiter + Mars) % 360
 *
 * @param positions - D-1 planet positions
 * @returns Rasi and longitude of the Kshetra Sphuta
 */
export const kshetraSphuta = (positions: PlanetPosition[]): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const jupiterLong = getAbsLong(positions, JUPITER);
  const marsLong = getAbsLong(positions, MARS);
  const kshetraLong = (moonLong + jupiterLong + marsLong) % 360;
  return dasavargaFromLong(kshetraLong, 1);
};

/**
 * Tithi Sphuta - sensitive point derived from Moon-Sun difference.
 * Formula: (Moon - Sun) % 360
 *
 * @param positions - D-1 planet positions
 * @returns Rasi and longitude of the Tithi Sphuta
 */
export const tithiSphuta = (positions: PlanetPosition[]): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const sunLong = getAbsLong(positions, SUN);
  const tithiLong = ((moonLong - sunLong) % 360 + 360) % 360;
  return dasavargaFromLong(tithiLong, 1);
};

/**
 * Yoga Sphuta - sensitive point from Sun+Moon combination.
 * Formula: (Moon + Sun + yogiOffset) % 360
 * Where yogiOffset = 93 + 20/60 = 93.333... if addYogiLongitude is true, else 0.
 *
 * @param positions - D-1 planet positions
 * @param addYogiLongitude - Whether to add the yogi longitude offset (default false)
 * @returns Rasi and longitude of the Yoga Sphuta
 */
export const yogaSphuta = (
  positions: PlanetPosition[],
  addYogiLongitude: boolean = false
): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const sunLong = getAbsLong(positions, SUN);
  const yogiLong = addYogiLongitude ? 93 + 20 / 60 : 0;
  const yogaLong = (moonLong + sunLong + yogiLong) % 360;
  return dasavargaFromLong(yogaLong, 1);
};

/**
 * Yogi Sphuta - yoga sphuta with yogi longitude added.
 * Simply calls yogaSphuta with addYogiLongitude=true.
 *
 * @param positions - D-1 planet positions
 * @returns Rasi and longitude of the Yogi Sphuta
 */
export const yogiSphuta = (positions: PlanetPosition[]): { rasi: number; longitude: number } => {
  return yogaSphuta(positions, true);
};

/**
 * Avayogi Sphuta - opposite of yogi point.
 * Formula: (yogiSphuta + 186 + 40/60) % 360
 *
 * @param positions - D-1 planet positions
 * @returns Rasi and longitude of the Avayogi Sphuta
 */
export const avayogiSphuta = (positions: PlanetPosition[]): { rasi: number; longitude: number } => {
  const yogi = yogiSphuta(positions);
  const avayogiLong = (yogi.rasi * 30 + yogi.longitude + 186 + 40 / 60) % 360;
  return dasavargaFromLong(avayogiLong, 1);
};

/**
 * Rahu Tithi Sphuta - tithi sphuta using Rahu instead of Moon.
 * Formula: (Rahu - Sun) % 360
 *
 * @param positions - D-1 planet positions
 * @returns Rasi and longitude of the Rahu Tithi Sphuta
 */
export const rahuTithiSphuta = (positions: PlanetPosition[]): { rasi: number; longitude: number } => {
  const rahuLong = getAbsLong(positions, RAHU);
  const sunLong = getAbsLong(positions, SUN);
  const tithiLong = ((rahuLong - sunLong) % 360 + 360) % 360;
  return dasavargaFromLong(tithiLong, 1);
};

// ============================================================================
// MIXED CHART SPHUTA VARIANTS
// ============================================================================
// These functions take planet positions from a mixed chart (charts.mixedChart)
// and use the mixed divisional chart factor (vargaFactor1 * vargaFactor2)
// for the final dasavarga conversion.

/**
 * Tri Sphuta for mixed chart.
 * Formula: (Moon + Ascendant + Gulika) % 360, converted with mixed dvf.
 *
 * @param positions - Planet positions from mixed chart
 * @param gulikaLongitude - Absolute longitude of Gulika (computed with mixed dvf)
 * @param mixedDvf - Mixed divisional chart factor (vargaFactor1 * vargaFactor2)
 */
export const triSphotaMixedChart = (
  positions: PlanetPosition[],
  gulikaLongitude: number,
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const ascLong = getAbsLong(positions, LAGNA);
  const triLong = (moonLong + ascLong + gulikaLongitude) % 360;
  return dasavargaFromLong(triLong, mixedDvf);
};

/**
 * Chatur Sphuta for mixed chart.
 * Formula: (Sun + triSphutaMixedChart) % 360
 */
export const chaturSphotaMixedChart = (
  positions: PlanetPosition[],
  gulikaLongitude: number,
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const sunLong = getAbsLong(positions, SUN);
  const tri = triSphotaMixedChart(positions, gulikaLongitude, mixedDvf);
  const triAbsLong = tri.rasi * 30 + tri.longitude;
  const chaturLong = (sunLong + triAbsLong) % 360;
  return dasavargaFromLong(chaturLong, mixedDvf);
};

/**
 * Pancha Sphuta for mixed chart.
 * Formula: (Rahu + chaturSphutaMixedChart) % 360
 */
export const panchaSphotaMixedChart = (
  positions: PlanetPosition[],
  gulikaLongitude: number,
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const rahuLong = getAbsLong(positions, RAHU);
  const chatur = chaturSphotaMixedChart(positions, gulikaLongitude, mixedDvf);
  const chaturAbsLong = chatur.rasi * 30 + chatur.longitude;
  const panchaLong = (rahuLong + chaturAbsLong) % 360;
  return dasavargaFromLong(panchaLong, mixedDvf);
};

/**
 * Prana Sphuta for mixed chart.
 * Formula: (Ascendant * 5 + Gulika) % 360
 */
export const pranaSphotaMixedChart = (
  positions: PlanetPosition[],
  gulikaLongitude: number,
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const ascLong = getAbsLong(positions, LAGNA);
  const pranaLong = (ascLong * 5 + gulikaLongitude) % 360;
  return dasavargaFromLong(pranaLong, mixedDvf);
};

/**
 * Deha Sphuta for mixed chart.
 * Formula: (Moon * 8 + Gulika) % 360
 */
export const dehaSphotaMixedChart = (
  positions: PlanetPosition[],
  gulikaLongitude: number,
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const dehaLong = (moonLong * 8 + gulikaLongitude) % 360;
  return dasavargaFromLong(dehaLong, mixedDvf);
};

/**
 * Mrityu Sphuta for mixed chart.
 * Formula: (Gulika * 7 + Sun) % 360
 */
export const mrityuSphotaMixedChart = (
  positions: PlanetPosition[],
  gulikaLongitude: number,
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const sunLong = getAbsLong(positions, SUN);
  const mrityuLong = (gulikaLongitude * 7 + sunLong) % 360;
  return dasavargaFromLong(mrityuLong, mixedDvf);
};

/**
 * Sookshma Tri Sphuta for mixed chart.
 * Formula: (Prana + Deha + Mrityu) % 360
 */
export const sookshmaTriSphotaMixedChart = (
  positions: PlanetPosition[],
  gulikaLongitude: number,
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const prana = pranaSphotaMixedChart(positions, gulikaLongitude, mixedDvf);
  const deha = dehaSphotaMixedChart(positions, gulikaLongitude, mixedDvf);
  const mrityu = mrityuSphotaMixedChart(positions, gulikaLongitude, mixedDvf);
  const sookshmaLong = (
    prana.rasi * 30 + prana.longitude +
    deha.rasi * 30 + deha.longitude +
    mrityu.rasi * 30 + mrityu.longitude
  ) % 360;
  return dasavargaFromLong(sookshmaLong, mixedDvf);
};

/**
 * Beeja Sphuta for mixed chart.
 * Formula: (Sun + Jupiter + Venus) % 360
 */
export const beejaSphotaMixedChart = (
  positions: PlanetPosition[],
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const sunLong = getAbsLong(positions, SUN);
  const jupiterLong = getAbsLong(positions, JUPITER);
  const venusLong = getAbsLong(positions, VENUS);
  const beejaLong = (sunLong + jupiterLong + venusLong) % 360;
  return dasavargaFromLong(beejaLong, mixedDvf);
};

/**
 * Kshetra Sphuta for mixed chart.
 * Formula: (Moon + Jupiter + Mars) % 360
 */
export const kshetraSphotaMixedChart = (
  positions: PlanetPosition[],
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const jupiterLong = getAbsLong(positions, JUPITER);
  const marsLong = getAbsLong(positions, MARS);
  const kshetraLong = (moonLong + jupiterLong + marsLong) % 360;
  return dasavargaFromLong(kshetraLong, mixedDvf);
};

/**
 * Tithi Sphuta for mixed chart.
 * Formula: (Moon - Sun) % 360
 */
export const tithiSphotaMixedChart = (
  positions: PlanetPosition[],
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const sunLong = getAbsLong(positions, SUN);
  const tithiLong = ((moonLong - sunLong) % 360 + 360) % 360;
  return dasavargaFromLong(tithiLong, mixedDvf);
};

/**
 * Yoga Sphuta for mixed chart.
 * Formula: (Moon + Sun + yogiOffset) % 360
 */
export const yogaSphotaMixedChart = (
  positions: PlanetPosition[],
  mixedDvf: number,
  addYogiLongitude: boolean = false
): { rasi: number; longitude: number } => {
  const moonLong = getAbsLong(positions, MOON);
  const sunLong = getAbsLong(positions, SUN);
  const yogiLong = addYogiLongitude ? 93 + 20 / 60 : 0;
  const yogaLong = (moonLong + sunLong + yogiLong) % 360;
  return dasavargaFromLong(yogaLong, mixedDvf);
};

/**
 * Yogi Sphuta for mixed chart.
 * Simply calls yogaSphotaMixedChart with addYogiLongitude=true.
 */
export const yogiSphotaMixedChart = (
  positions: PlanetPosition[],
  mixedDvf: number
): { rasi: number; longitude: number } => {
  return yogaSphotaMixedChart(positions, mixedDvf, true);
};

/**
 * Avayogi Sphuta for mixed chart.
 * Formula: (yogiSphutaMixedChart + 186 + 40/60) % 360
 */
export const avayogiSphotaMixedChart = (
  positions: PlanetPosition[],
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const yogi = yogiSphotaMixedChart(positions, mixedDvf);
  const avayogiLong = (yogi.rasi * 30 + yogi.longitude + 186 + 40 / 60) % 360;
  return dasavargaFromLong(avayogiLong, mixedDvf);
};

/**
 * Rahu Tithi Sphuta for mixed chart.
 * Formula: (Rahu - Sun) % 360
 */
export const rahuTithiSphotaMixedChart = (
  positions: PlanetPosition[],
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const rahuLong = getAbsLong(positions, RAHU);
  const sunLong = getAbsLong(positions, SUN);
  const tithiLong = ((rahuLong - sunLong) % 360 + 360) % 360;
  return dasavargaFromLong(tithiLong, mixedDvf);
};

// ============================================================================
// DOB/TOB/PLACE ASYNC WRAPPERS (Python-signature parity)
//
// Python sphuta.py functions take (dob, tob, place, ...) and compute the
// chart + gulika internally. The pure functions above take precomputed
// positions. These wrappers mirror the Python signatures and return
// Python-shaped [rasi, longitude] tuples.
// ============================================================================

import type { Place, JhoraDate } from '../types';
import { julianDayNumber } from '../utils/julian';
import {
  ascendantFullAsync,
  siderealLongitudeAsync,
} from '../ephemeris/swe-adapter';
import { normalizeDegrees } from '../utils/angle';
import { getDivisionalChart } from './charts';
import { dasavargaFromLong as drikDasavargaFromLong, gulikaLongitudeAsync } from '../panchanga/drik';

type Tob = [number, number, number];

const tobToTime = (tob: Tob) => ({ hour: tob[0], minute: tob[1], second: tob[2] });

/**
 * Compute Lagna-first planet positions (PlanetPosition[]) for a divisional
 * chart, mirroring Python charts.divisional_chart(jd, place, ...).
 */
export async function divisionalPositionsAsync(
  jd: number,
  place: Place,
  divisionalChartFactor: number = 1,
  chartMethod: number = 1
): Promise<PlanetPosition[]> {
  const jdUtc = jd - place.timezone / 24;
  const d1: PlanetPosition[] = [];
  const [ascRasi, ascLong] = await ascendantFullAsync(jd, place);
  d1.push({ planet: -1, rasi: ascRasi, longitude: ascLong } as PlanetPosition);
  const rahuLong = await siderealLongitudeAsync(jdUtc, 7);
  for (let p = 0; p <= 8; p++) {
    const long =
      p === 7 ? rahuLong : p === 8 ? normalizeDegrees(rahuLong + 180) : await siderealLongitudeAsync(jdUtc, p);
    const [rasi, longInSign] = drikDasavargaFromLong(long, 1);
    d1.push({ planet: p, rasi, longitude: longInSign } as PlanetPosition);
  }
  if (divisionalChartFactor === 1) return d1;
  return getDivisionalChart(d1, divisionalChartFactor, chartMethod);
}

/** Absolute longitude of a planet by Lagna-first Python index (0=Lagna, 1=Sun, 2=Moon, ...). */
const absLongAt = (pp: PlanetPosition[], pyIndex: number): number =>
  pp[pyIndex]!.rasi * 30 + pp[pyIndex]!.longitude;

/** Gulika absolute longitude (deg 0-360), mirroring Python drik.gulika_longitude. */
async function gulikaAbsLongAsync(dob: JhoraDate, tob: Tob, place: Place): Promise<number> {
  const jd = julianDayNumber(dob, tobToTime(tob));
  const tobHours = tob[0] + tob[1] / 60 + tob[2] / 3600;
  const g = await gulikaLongitudeAsync(jd, place, tobHours);
  return g[0] * 30 + g[1];
}

type SphutaTuple = [number, number];

interface SphutaContext {
  pp: PlanetPosition[];
  gulikaLong: () => Promise<number>;
  dvf: number;
}

async function sphutaContext(
  dob: JhoraDate, tob: Tob, place: Place, dvf: number, chartMethod: number
): Promise<SphutaContext> {
  const jd = julianDayNumber(dob, tobToTime(tob));
  const pp = await divisionalPositionsAsync(jd, place, dvf, chartMethod);
  return { pp, gulikaLong: () => gulikaAbsLongAsync(dob, tob, place), dvf };
}

async function mixedSphutaContext(
  dob: JhoraDate, tob: Tob, place: Place,
  vf1: number, cm1: number, vf2: number, cm2: number
): Promise<SphutaContext> {
  const jd = julianDayNumber(dob, tobToTime(tob));
  const dvf = vf1 * vf2;
  const d1 = await divisionalPositionsAsync(jd, place, 1, 1);
  const pp1 = getDivisionalChart(d1, vf1, cm1);
  const pp = getDivisionalChart(pp1, vf2, cm2);
  return { pp, gulikaLong: () => gulikaAbsLongAsync(dob, tob, place), dvf };
}

// --- formulas shared by normal and mixed variants -------------------------

const triFromCtx = async (c: SphutaContext): Promise<SphutaTuple> => {
  const long = (absLongAt(c.pp, 2) + absLongAt(c.pp, 0) + (await c.gulikaLong())) % 360;
  return drikDasavargaFromLong(long, c.dvf);
};
const chaturFromCtx = async (c: SphutaContext): Promise<SphutaTuple> => {
  const tri = await triFromCtx(c);
  const long = (absLongAt(c.pp, 1) + tri[0] * 30 + tri[1]) % 360;
  return drikDasavargaFromLong(long, c.dvf);
};
const panchaFromCtx = async (c: SphutaContext): Promise<SphutaTuple> => {
  const chatur = await chaturFromCtx(c);
  const long = (absLongAt(c.pp, 8) + chatur[0] * 30 + chatur[1]) % 360;
  return drikDasavargaFromLong(long, c.dvf);
};
const pranaFromCtx = async (c: SphutaContext): Promise<SphutaTuple> =>
  drikDasavargaFromLong((absLongAt(c.pp, 0) * 5 + (await c.gulikaLong())) % 360, c.dvf);
const dehaFromCtx = async (c: SphutaContext): Promise<SphutaTuple> =>
  drikDasavargaFromLong((absLongAt(c.pp, 2) * 8 + (await c.gulikaLong())) % 360, c.dvf);
const mrityuFromCtx = async (c: SphutaContext): Promise<SphutaTuple> =>
  drikDasavargaFromLong(((await c.gulikaLong()) * 7 + absLongAt(c.pp, 1)) % 360, c.dvf);
const sookshmaTriFromCtx = async (c: SphutaContext): Promise<SphutaTuple> => {
  const prana = await pranaFromCtx(c);
  const deha = await dehaFromCtx(c);
  const mrityu = await mrityuFromCtx(c);
  const long =
    (prana[0] * 30 + prana[1] + deha[0] * 30 + deha[1] + mrityu[0] * 30 + mrityu[1]) % 360;
  return drikDasavargaFromLong(long, c.dvf);
};
const beejaFromCtx = (c: SphutaContext): SphutaTuple =>
  drikDasavargaFromLong((absLongAt(c.pp, 1) + absLongAt(c.pp, 5) + absLongAt(c.pp, 6)) % 360, c.dvf);
const kshetraFromCtx = (c: SphutaContext): SphutaTuple =>
  drikDasavargaFromLong((absLongAt(c.pp, 2) + absLongAt(c.pp, 5) + absLongAt(c.pp, 3)) % 360, c.dvf);
const tithiFromCtx = (c: SphutaContext): SphutaTuple =>
  drikDasavargaFromLong(normalizeDegrees(absLongAt(c.pp, 2) - absLongAt(c.pp, 1)), c.dvf);
const yogaFromCtx = (c: SphutaContext, addYogiLongitude: boolean): SphutaTuple => {
  const yogiLong = addYogiLongitude ? 93 + 20 / 60 : 0;
  return drikDasavargaFromLong((absLongAt(c.pp, 2) + absLongAt(c.pp, 1) + yogiLong) % 360, c.dvf);
};
const avayogiFromCtx = (c: SphutaContext): SphutaTuple => {
  const yl = yogaFromCtx(c, true);
  return drikDasavargaFromLong((yl[0] * 30 + yl[1] + 186 + 40 / 60) % 360, c.dvf);
};
const rahuTithiFromCtx = (c: SphutaContext): SphutaTuple =>
  drikDasavargaFromLong(normalizeDegrees(absLongAt(c.pp, 8) - absLongAt(c.pp, 1)), c.dvf);

// --- exported wrappers -----------------------------------------------------

// @parity: py=tri_sphuta
export async function triSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return triFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=chatur_sphuta
export async function chaturSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return chaturFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=pancha_sphuta
export async function panchaSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return panchaFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=prana_sphuta
export async function pranaSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return pranaFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=deha_sphuta
export async function dehaSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return dehaFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=mrityu_sphuta
export async function mrityuSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return mrityuFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=sookshma_tri_sphuta
export async function sookshmaTriSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return sookshmaTriFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=beeja_sphuta
export async function beejaSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return beejaFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=kshetra_sphuta
export async function kshetraSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return kshetraFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=tithi_sphuta
export async function tithiSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return tithiFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=yoga_sphuta
export async function yogaSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1,
  _years = 1, _months = 1, _sixtyHours = 1, addYogiLongitude = false
): Promise<SphutaTuple> {
  return yogaFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod), addYogiLongitude);
}
// @parity: py=yogi_sphuta
export async function yogiSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return yogaFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod), true);
}
// @parity: py=avayogi_sphuta
export async function avayogiSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return avayogiFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}
// @parity: py=rahu_tithi_sphuta
export async function rahuTithiSphutaFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  _ayanamsaMode?: string, divisionalChartFactor = 1, chartMethod = 1
): Promise<SphutaTuple> {
  return rahuTithiFromCtx(await sphutaContext(dob, tob, place, divisionalChartFactor, chartMethod));
}

// @parity: py=tri_sphuta_mixed_chart
export async function triSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return triFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=chatur_sphuta_mixed_chart
export async function chaturSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return chaturFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=pancha_sphuta_mixed_chart
export async function panchaSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return panchaFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=prana_sphuta_mixed_chart
export async function pranaSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return pranaFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=deha_sphuta_mixed_chart
export async function dehaSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return dehaFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=mrityu_sphuta_mixed_chart
export async function mrityuSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return mrityuFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=sookshma_tri_sphuta_mixed_chart
export async function sookshmaTriSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return sookshmaTriFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=beeja_sphuta_mixed_chart
export async function beejaSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return beejaFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=kshetra_sphuta_mixed_chart
export async function kshetraSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return kshetraFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=tithi_sphuta_mixed_chart
export async function tithiSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return tithiFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=yoga_sphuta_mixed_chart
export async function yogaSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1,
  addYogiLongitude = false
): Promise<SphutaTuple> {
  return yogaFromCtx(
    await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2),
    addYogiLongitude
  );
}
// @parity: py=yogi_sphuta_mixed_chart
export async function yogiSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return yogaFromCtx(
    await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2),
    true
  );
}
// @parity: py=avayogi_sphuta_mixed_chart
export async function avayogiSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return avayogiFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
// @parity: py=rahu_tithi_sphuta_mixed_chart
export async function rahuTithiSphutaMixedChartFromDob(
  dob: JhoraDate, tob: Tob, place: Place,
  vargaFactor1 = 1, chartMethod1 = 1, vargaFactor2 = 1, chartMethod2 = 1
): Promise<SphutaTuple> {
  return rahuTithiFromCtx(await mixedSphutaContext(dob, tob, place, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2));
}
