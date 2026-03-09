/**
 * Longevity prediction module
 * Ported from PyJHora horoscope/prediction/longevity.py
 *
 * Based on: Hindu Predictive Astrology by BV Raman
 *
 * Provides checks for:
 * - Baladrishta (infant mortality indicators)
 * - Alpayu (short life indicators)
 * - Madhyayu (middle life indicators)
 * - Life span range calculation (Alpayu/Madhyayu/Poornayu)
 */

import {
  FIXED_SIGNS,
  HOUSE_OWNERS,
  HOUSE_STRENGTHS_OF_PLANETS,
  MOVABLE_SIGNS,
  DUAL_SIGNS,
  NATURAL_BENEFICS,
  NATURAL_MALEFICS,
  SIGN_LORDS,
  STRENGTH_FRIEND,
} from '../../constants';
import {
  buildHouseChart,
  getGrahaDrishtiPlanetsOfPlanet,
  getHouseOwnerFromPlanetPositions,
  getPlanetToHouseDict,
  getQuadrantsOfRaasi,
  getRelativeHouseOfPlanet,
} from '../house';

// ============================================================================
// TYPES
// ============================================================================

/** Planet position entry (same as general module) */
export interface PlanetPositionEntry {
  planet: number;
  rasi: number;
  longitude: number;
}

/** Aayu (longevity) type enumeration */
export const AAYU_ALPAYU = 0;   // Short life (0-32 years)
export const AAYU_MADHYAYU = 1; // Middle life (32-64 years)
export const AAYU_POORNAYU = 2; // Full life (64+ years)

export const AAYU_TYPE_NAMES = ['Alpayu', 'Madhyayu', 'Poornayu'];

// ============================================================================
// HELPER: DETERMINE MALEFICS/BENEFICS FROM POSITIONS
// ============================================================================

/**
 * Get functional malefic planets from positions.
 * Simplified version: returns natural malefics.
 * Full version would check Moon's phase and Mercury's conjunction.
 */
export const getMalefics = (
  planetPositions: PlanetPositionEntry[],
): number[] => {
  // Natural malefics: Sun(0), Mars(2), Saturn(6), Rahu(7), Ketu(8)
  return [...NATURAL_MALEFICS];
};

/**
 * Get functional benefic planets from positions.
 * Simplified version: returns natural benefics.
 */
export const getBenefics = (
  planetPositions: PlanetPositionEntry[],
): number[] => {
  // Natural benefics: Jupiter(4), Venus(5)
  // Mercury(3) and Moon(1) are conditional
  return [...NATURAL_BENEFICS];
};

// ============================================================================
// BALADRISHTA CHECKS
// ============================================================================

/**
 * Check Baladrishta (infant mortality) indicators.
 * @param planetPositions - Array of planet positions
 * @returns Array of boolean checks indicating baladrishta conditions
 */
export const baladrishtaChecks = (
  planetPositions: PlanetPositionEntry[],
): boolean[] => {
  const pToH = getPlanetToHouseDict(planetPositions);
  const lagnaEntry = planetPositions.find(p => p.planet === -1);
  const ascHouse = lagnaEntry?.rasi ?? 0;
  const chart = buildHouseChart(planetPositions);

  const relativeHouse = (sign: number): number =>
    getRelativeHouseOfPlanet(ascHouse, sign);

  const bdChecks: boolean[] = [];

  // Check 1: Moon in kendra with malefics
  const moonHouse = pToH[1] ?? 0;
  const bc1 = NATURAL_MALEFICS.some(m => {
    const maleficQuads = getQuadrantsOfRaasi(pToH[m] ?? 0);
    return maleficQuads.includes(moonHouse);
  });
  bdChecks.push(bc1);

  // Check 2: Moon in 7/8/12th house with malefics and without benefic aspects
  const moonRelHouse = relativeHouse(moonHouse);
  const bc2 =
    [7, 8, 12].includes(moonRelHouse) &&
    NATURAL_MALEFICS.some(m => moonHouse === (pToH[m] ?? -1)) &&
    NATURAL_BENEFICS.some(b => {
      const aspected = getGrahaDrishtiPlanetsOfPlanet(chart, b);
      return aspected.includes(1); // Moon is planet 1
    });
  bdChecks.push(bc2);

  // Check 3: All malefics in 2,6,8,12 houses
  const malefics = getMalefics(planetPositions);
  const bc3 = malefics.every(m => {
    const mRelHouse = relativeHouse(pToH[m] ?? 0);
    return [2, 6, 8, 12].includes(mRelHouse);
  });
  bdChecks.push(bc3);

  // Check 4: Weak moon in ascendant or 8th, malefics in quadrants
  const moonStrength = HOUSE_STRENGTHS_OF_PLANETS[1]?.[moonHouse] ?? 0;
  const bc4 =
    moonStrength < STRENGTH_FRIEND &&
    (moonHouse === ascHouse || relativeHouse(moonHouse) === 8) &&
    NATURAL_MALEFICS.some(m => {
      const moonQuads = getQuadrantsOfRaasi(moonHouse);
      return moonQuads.includes(pToH[m] ?? -1);
    });
  bdChecks.push(bc4);

  // Check 5: Moon in ascendant, Mars in 8th, Sun in 9th, Saturn in 12th
  const bc5 =
    ascHouse === moonHouse &&
    relativeHouse(pToH[0] ?? 0) === 9 &&
    relativeHouse(pToH[2] ?? 0) === 8 &&
    relativeHouse(pToH[6] ?? 0) === 12;
  bdChecks.push(bc5);

  // Check 6: Moon in 8th, Mars in 7th, Rahu in 9th, Jupiter in 3rd
  const bc6 =
    relativeHouse(pToH[1] ?? 0) === 8 &&
    relativeHouse(pToH[2] ?? 0) === 7 &&
    relativeHouse(pToH[7] ?? 0) === 9 &&
    relativeHouse(pToH[4] ?? 0) === 3;
  bdChecks.push(bc6);

  return bdChecks;
};

// ============================================================================
// ALPAYU CHECKS
// ============================================================================

/**
 * Check Alpayu (short life) indicators.
 * @param planetPositions - Array of planet positions
 * @returns Array of boolean checks indicating short life conditions
 */
export const alpayuChecks = (
  planetPositions: PlanetPositionEntry[],
): boolean[] => {
  const pToH = getPlanetToHouseDict(planetPositions);
  const lagnaEntry = planetPositions.find(p => p.planet === -1);
  const ascHouse = lagnaEntry?.rasi ?? 0;
  const chart = buildHouseChart(planetPositions);

  const relativeHouse = (sign: number): number =>
    getRelativeHouseOfPlanet(ascHouse, sign);

  const houseOwner = (sign: number): number =>
    getHouseOwnerFromPlanetPositions(planetPositions, sign);

  const malefics = getMalefics(planetPositions);
  const benefics = getBenefics(planetPositions);
  const lagnaLord = houseOwner(ascHouse);

  const adChecks: boolean[] = [];

  // Check 1: Saturn in 8th, Mars in 5th, Ketu with Ascendant
  const ac1 =
    relativeHouse(pToH[6] ?? 0) === 8 &&
    relativeHouse(pToH[2] ?? 0) === 5 &&
    ascHouse === (pToH[8] ?? -1);
  adChecks.push(ac1);

  // Check 2: All malefics in 6,8,12
  const ac2 = malefics.every(m => {
    const mRelHouse = relativeHouse(pToH[m] ?? 0);
    return [6, 8, 12].includes(mRelHouse);
  });
  adChecks.push(ac2);

  // Check 3: Saturn in lagna, Sun/Moon/Mars in 7th (conjunction check)
  // Note: Python has a bug here (missing operator), ported faithfully with &&
  const ac3 =
    (pToH[1] ?? -1) === (pToH[2] ?? -2) &&
    (pToH[0] ?? -1) === (pToH[1] ?? -2) &&
    relativeHouse(pToH[2] ?? 0) === 7 &&
    ascHouse === (pToH[6] ?? -1);
  adChecks.push(ac3);

  // Check 4: Lord of 8th in ascendant with Ketu
  const eighthLord = houseOwner((ascHouse + 7) % 12);
  const ac4 =
    ascHouse === (pToH[eighthLord] ?? -1) &&
    ascHouse === (pToH[8] ?? -1);
  adChecks.push(ac4);

  // Check 5: Malefics with ascendant and moon in conjunction
  const ac5 = NATURAL_MALEFICS.some(
    m => (pToH[1] ?? -1) === (pToH[m] ?? -2) && ascHouse === (pToH[m] ?? -1),
  );
  adChecks.push(ac5);

  // Check 6: Lord of 8th in ascendant and lagna lord is powerless
  const eighthLord2 = houseOwner((ascHouse + 7) % 12);
  const ac6 =
    (pToH[eighthLord2] ?? -1) === ascHouse &&
    (HOUSE_STRENGTHS_OF_PLANETS[lagnaLord]?.[pToH[lagnaLord] ?? 0] ?? 0) < STRENGTH_FRIEND;
  adChecks.push(ac6);

  // Check 7: Lagna in Scorpio with Sun and Jupiter, 8th lord in quadrants
  let ac7 =
    ascHouse === (pToH[0] ?? -1) &&
    ascHouse === (pToH[4] ?? -1) &&
    ascHouse === 7; // Scorpio
  const eighthLord3 = houseOwner((ascHouse + 7) % 12);
  const ascQuads = getQuadrantsOfRaasi(ascHouse);
  ac7 = ac7 && ascQuads.includes(pToH[eighthLord3] ?? -1);
  adChecks.push(ac7);

  // Check 8: Rahu in 7th, Moon in 8th, Jupiter in ascendant
  const ac8 =
    relativeHouse(pToH[7] ?? 0) === 7 &&
    relativeHouse(pToH[1] ?? 0) === 8 &&
    ascHouse === (pToH[4] ?? -1);
  adChecks.push(ac8);

  // Check 9: Saturn in ascendant owned by malefic, benefics in 3,6,9,12
  const ac9 =
    ascHouse === (pToH[6] ?? -1) &&
    malefics.some(m => m === lagnaLord) &&
    benefics.every(b => [3, 6, 9, 12].includes(relativeHouse(pToH[b] ?? 0)));
  adChecks.push(ac9);

  // Check 10: Lords of Asc and 8th conjoin in 8th with malefics, no benefic aspect
  const ac10 =
    (pToH[lagnaLord] ?? -1) === (pToH[eighthLord] ?? -2) &&
    (pToH[lagnaLord] ?? -1) === (ascHouse + 7) % 12 &&
    malefics.some(m => (pToH[m] ?? -1) === (pToH[lagnaLord] ?? -2)) &&
    NATURAL_BENEFICS.some(b => {
      const aspected = getGrahaDrishtiPlanetsOfPlanet(chart, b);
      return aspected.includes(lagnaLord);
    });
  adChecks.push(ac10);

  return adChecks;
};

// ============================================================================
// MADHYAYU CHECKS
// ============================================================================

/**
 * Check Madhyayu (middle life) indicators.
 * @param planetPositions - Array of planet positions
 * @returns Array of boolean checks indicating middle life conditions
 */
export const madhyayuChecks = (
  planetPositions: PlanetPositionEntry[],
): boolean[] => {
  const pToH = getPlanetToHouseDict(planetPositions);
  const lagnaEntry = planetPositions.find(p => p.planet === -1);
  const ascHouse = lagnaEntry?.rasi ?? 0;

  const relativeHouse = (sign: number): number =>
    getRelativeHouseOfPlanet(ascHouse, sign);

  const houseOwner = (sign: number): number =>
    getHouseOwnerFromPlanetPositions(planetPositions, sign);

  const kendraAspects = getQuadrantsOfRaasi(ascHouse);

  const mdChecks: boolean[] = [];

  // Check 1: Lord of 3rd or 6th in kendra/quadrant
  const thirdLord = houseOwner((ascHouse + 2) % 12);
  const sixthLord = houseOwner((ascHouse + 5) % 12);
  const mc1 =
    kendraAspects.includes(pToH[thirdLord] ?? -1) ||
    kendraAspects.includes(pToH[sixthLord] ?? -1);
  mdChecks.push(mc1);

  // Check 2: Two of 8th, 10th, 11th lords are powerful
  const eighthLord = houseOwner((ascHouse + 7) % 12);
  const tenthLord = houseOwner((ascHouse + 9) % 12);
  const eleventhLord = houseOwner((ascHouse + 10) % 12);
  const powerfulCount = [eighthLord, tenthLord, eleventhLord].filter(
    p => (HOUSE_STRENGTHS_OF_PLANETS[p]?.[pToH[p] ?? 0] ?? 0) > STRENGTH_FRIEND,
  ).length;
  const mc2 = powerfulCount >= 2;
  mdChecks.push(mc2);

  // Check 3: All planets in middle four houses (5-8) from lagna
  // Note: Python has a bug where mc for Mercury/Venus/Jupiter check is overwritten
  // by the all-planets check. Porting the final value (all planets in 5-8).
  const mc3 = Array.from({ length: 7 }, (_, i) => i).every(
    p => [5, 6, 7, 8].includes(relativeHouse(pToH[p] ?? 0)),
  );
  mdChecks.push(mc3);

  return mdChecks;
};

// ============================================================================
// LIFE SPAN RANGE
// ============================================================================

/**
 * Get sign type for aayu calculation.
 * @param sign - Sign index (0-11)
 * @returns 0 for fixed, 1 for dual, 2 for movable
 */
const getSignType = (sign: number): number => {
  if (FIXED_SIGNS.includes(sign)) return 0;
  if (DUAL_SIGNS.includes(sign)) return 1;
  if (MOVABLE_SIGNS.includes(sign)) return 2;
  return 0;
};

/**
 * Get aayu category from two signs.
 * Alpayu(0), Madhyayu(1), Poornayu(2)
 *
 * Rules:
 * - Fixed + Fixed = Alpayu (0)
 * - Movable + Movable = Poornayu (2)
 * - Dual + Dual = Madhyayu (1)
 * - Fixed + Movable = Madhyayu (1)
 * - Dual + Movable = Alpayu (0)
 * - Fixed + Dual = Poornayu (2)
 */
export const getAayu = (sign1: number, sign2: number): number => {
  const isFixed1 = FIXED_SIGNS.includes(sign1);
  const isFixed2 = FIXED_SIGNS.includes(sign2);
  const isMovable1 = MOVABLE_SIGNS.includes(sign1);
  const isMovable2 = MOVABLE_SIGNS.includes(sign2);
  const isDual1 = DUAL_SIGNS.includes(sign1);
  const isDual2 = DUAL_SIGNS.includes(sign2);

  if (isFixed1 && isFixed2) return 0;
  if (isMovable1 && isMovable2) return 2;
  if (isDual1 && isDual2) return 1;
  if ((isFixed1 && isMovable2) || (isMovable1 && isFixed2)) return 1;
  if ((isDual1 && isMovable2) || (isMovable1 && isDual2)) return 0;
  if ((isFixed1 && isDual2) || (isDual1 && isFixed2)) return 2;

  return 0;
};

/**
 * Calculate life span range category.
 * @param planetPositions - Array of planet positions (including ascendant as planet -1)
 * @param horaLagna - Hora lagna sign index (0-11)
 * @returns Aayu type: 0=Alpayu, 1=Madhyayu, 2=Poornayu
 */
export const lifeSpanRange = (
  planetPositions: PlanetPositionEntry[],
  horaLagna: number,
): number => {
  const lagnaEntry = planetPositions.find(p => p.planet === -1);
  const ascHouse = lagnaEntry?.rasi ?? 0;
  const eighthHouse = (ascHouse + 7) % 12;
  const moonHouse = planetPositions.find(p => p.planet === 1)?.rasi ?? 0;

  const lagnaLord = getHouseOwnerFromPlanetPositions(planetPositions, ascHouse);
  const lagnaLordHouse = planetPositions.find(p => p.planet === lagnaLord)?.rasi ?? 0;

  const eighthLord = getHouseOwnerFromPlanetPositions(planetPositions, eighthHouse);
  const eighthLordHouse = planetPositions.find(p => p.planet === eighthLord)?.rasi ?? 0;

  const aayuGroup: number[] = [];
  aayuGroup.push(getAayu(lagnaLordHouse, eighthLordHouse));
  aayuGroup.push(getAayu(ascHouse, moonHouse));
  aayuGroup.push(getAayu(ascHouse, horaLagna));

  // Count occurrences
  const counts = new Map<number, number>();
  for (const a of aayuGroup) {
    counts.set(a, (counts.get(a) ?? 0) + 1);
  }

  if (counts.size === 1) {
    // All three are the same
    return aayuGroup[0];
  } else if (counts.size === 2) {
    // Two are the same - return the one with higher count
    let maxKey = 0;
    let maxCount = 0;
    for (const [key, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    }
    return maxKey;
  } else {
    // All three different - use hora lagna pair unless Moon conjunct/opposite ascendant
    let result = aayuGroup[2]; // hora lagna pair
    if (moonHouse === ascHouse || moonHouse === (ascHouse + 6) % 12) {
      result = aayuGroup[1]; // moon pair
    }
    return result;
  }
};
