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
// @parity: py=tri_sphuta
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
// @parity: py=chatur_sphuta
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
// @parity: py=pancha_sphuta
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
// @parity: py=prana_sphuta
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
// @parity: py=deha_sphuta
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
// @parity: py=mrityu_sphuta
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
// @parity: py=sookshma_tri_sphuta
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
// @parity: py=beeja_sphuta
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
// @parity: py=kshetra_sphuta
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
// @parity: py=tithi_sphuta
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
// @parity: py=yoga_sphuta
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
// @parity: py=yogi_sphuta
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
// @parity: py=avayogi_sphuta
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
// @parity: py=rahu_tithi_sphuta
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
// @parity: py=tri_sphuta_mixed_chart
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
// @parity: py=chatur_sphuta_mixed_chart
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
// @parity: py=pancha_sphuta_mixed_chart
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
// @parity: py=prana_sphuta_mixed_chart
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
// @parity: py=deha_sphuta_mixed_chart
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
// @parity: py=mrityu_sphuta_mixed_chart
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
// @parity: py=sookshma_tri_sphuta_mixed_chart
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
// @parity: py=beeja_sphuta_mixed_chart
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
// @parity: py=kshetra_sphuta_mixed_chart
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
// @parity: py=tithi_sphuta_mixed_chart
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
// @parity: py=yoga_sphuta_mixed_chart
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
// @parity: py=yogi_sphuta_mixed_chart
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
// @parity: py=avayogi_sphuta_mixed_chart
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
// @parity: py=rahu_tithi_sphuta_mixed_chart
export const rahuTithiSphotaMixedChart = (
  positions: PlanetPosition[],
  mixedDvf: number
): { rasi: number; longitude: number } => {
  const rahuLong = getAbsLong(positions, RAHU);
  const sunLong = getAbsLong(positions, SUN);
  const tithiLong = ((rahuLong - sunLong) % 360 + 360) % 360;
  return dasavargaFromLong(tithiLong, mixedDvf);
};
