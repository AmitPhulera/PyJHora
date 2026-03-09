/**
 * Naadi marriage prediction module
 * Ported from PyJHora horoscope/prediction/naadi_marriage.py
 *
 * Based on: Prediction Secrets Naadi Astrology
 *           A research work based on Rao's system
 *           by Sri Satyanarayana Naik
 *
 * Provides marriage yoga checks based on Naadi astrology principles.
 */

import {
  JUPITER,
  MARS,
  SATURN,
  VENUS,
} from '../../constants';
import {
  buildHouseChart,
  getGrahaDrishtiPlanetsOfPlanet,
  getPlanetToHouseDict,
} from '../house';

// ============================================================================
// TYPES
// ============================================================================

/** Planet position entry */
export interface PlanetPositionEntry {
  planet: number;
  rasi: number;
  longitude: number;
}

/** Gender constants */
export const GENDER_MALE = 0;
export const GENDER_FEMALE = 1;

/** Yoga check result */
export interface YogaResult {
  isPresent: boolean;
  message: string;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get the marriage signifying planet based on gender.
 * Male: Venus (5), Female: Mars (2)
 */
const getMarriagePlanet = (gender: number): number => {
  return gender === GENDER_FEMALE ? MARS : VENUS;
};

// ============================================================================
// YOGA CHECKS
// ============================================================================

/**
 * Yoga 1/7: Check if marriage planet aspects Jupiter or Saturn.
 * If true: Marriage will happen.
 * If false: Obstacles in marriage, disputes with spouse.
 *
 * @param planetPositions - Array of planet positions
 * @param gender - 0 for male, 1 for female
 * @returns YogaResult
 */
export const checkYoga1 = (
  planetPositions: PlanetPositionEntry[],
  gender: number = GENDER_MALE,
): YogaResult => {
  const chart = buildHouseChart(planetPositions);
  const planet = getMarriagePlanet(gender);
  const aspectedPlanets = getGrahaDrishtiPlanetsOfPlanet(chart, planet);

  // Check if Jupiter (4) or Saturn (6) is aspected by marriage planet
  const isPresent = [JUPITER, SATURN].some(p => aspectedPlanets.includes(p));

  const message = isPresent
    ? 'Marriage will happen'
    : 'Obstacles in marriage, if married, disputes with spouse';

  return { isPresent, message };
};

/**
 * Yoga 2/8 and 3/9: Check for early or late marriage.
 * If Jupiter aspects the marriage planet: Early marriage.
 * If Saturn aspects the marriage planet: Late marriage.
 *
 * @param planetPositions - Array of planet positions
 * @param gender - 0 for male, 1 for female
 * @returns YogaResult
 */
export const checkYoga2 = (
  planetPositions: PlanetPositionEntry[],
  gender: number = GENDER_MALE,
): YogaResult => {
  const chart = buildHouseChart(planetPositions);
  const planet = getMarriagePlanet(gender);
  const aspectedPlanets = getGrahaDrishtiPlanetsOfPlanet(chart, planet);

  // Check if Jupiter aspects the marriage planet
  if (aspectedPlanets.includes(JUPITER)) {
    return { isPresent: true, message: 'Early Marriage' };
  }

  // Check if Saturn aspects the marriage planet
  if (aspectedPlanets.includes(SATURN)) {
    return { isPresent: true, message: 'Late Marriage' };
  }

  return { isPresent: false, message: 'Neither Early/Late Marriage' };
};

/**
 * Yoga 4/10: Check if Ketu aspects the marriage planet.
 * If true: Obstacles in marriage, disputes with spouse.
 *
 * @param planetPositions - Array of planet positions
 * @param gender - 0 for male, 1 for female
 * @returns YogaResult
 */
export const checkYoga3 = (
  planetPositions: PlanetPositionEntry[],
  gender: number = GENDER_MALE,
): YogaResult => {
  const chart = buildHouseChart(planetPositions);
  const planet = getMarriagePlanet(gender);

  // Ketu is planet 8 - check if Ketu aspects the marriage planet
  const aspectedByKetu = getGrahaDrishtiPlanetsOfPlanet(chart, 8);
  const isPresent = aspectedByKetu.includes(planet);

  const message = isPresent
    ? 'Obstacles in marriage, If married disputes with spouse.'
    : '';

  return { isPresent, message };
};

/**
 * Yoga 5/6/16: Check if Rahu aspects the marriage planet.
 * If true: Marriage delayed or if married, will not like the spouse.
 *
 * @param planetPositions - Array of planet positions
 * @param gender - 0 for male, 1 for female
 * @returns YogaResult
 */
export const checkYoga4 = (
  planetPositions: PlanetPositionEntry[],
  gender: number = GENDER_MALE,
): YogaResult => {
  const chart = buildHouseChart(planetPositions);
  const planet = getMarriagePlanet(gender);

  // Rahu is planet 7 - check if Rahu aspects the marriage planet
  const aspectedByRahu = getGrahaDrishtiPlanetsOfPlanet(chart, 7);
  const isPresent = aspectedByRahu.includes(planet);

  const message = isPresent
    ? 'Marriage delayed or if married, will not like the spouse.'
    : '';

  return { isPresent, message };
};

/**
 * Check all marriage yogas.
 *
 * @param planetPositions - Array of planet positions
 * @param gender - 0 for male, 1 for female
 * @returns Array of YogaResult for all four yoga checks
 */
export const checkMarriageYogas = (
  planetPositions: PlanetPositionEntry[],
  gender: number = GENDER_MALE,
): YogaResult[] => {
  return [
    checkYoga1(planetPositions, gender),
    checkYoga2(planetPositions, gender),
    checkYoga3(planetPositions, gender),
    checkYoga4(planetPositions, gender),
  ];
};
