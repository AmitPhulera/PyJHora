/**
 * Arudha Pada Calculations
 * Ported from PyJHora arudhas.py
 *
 * Arudhas are calculated reflection points in Jyotish. There are two main types:
 * 1. Bhava Arudhas (A1-A12) - Reflection of houses based on house lord positions
 * 2. Graha Arudhas - Reflection of planets based on their sign ownership
 */

import {
  HOUSE_LORDS_DICT,
  PLANETS_UPTO_KETU,
  PP_COUNT_UPTO_KETU,
  SIGN_LORDS
} from '../constants';

import {
  getHouseOwnerFromPlanetPositions,
  getHouseToPlanetList,
  getPlanetToHouseDict,
  getStrongerRasi
} from './house';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Count the number of rasis (signs) from one rasi to another
 * @param fromRasi - Starting rasi (0-11)
 * @param toRasi - Ending rasi (0-11)
 * @returns Count of signs (1-12)
 */
export const countRasis = (fromRasi: number, toRasi: number): number => {
  return ((toRasi + 12 - fromRasi) % 12) + 1;
};

// ============================================================================
// BHAVA ARUDHAS (A1-A12)
// ============================================================================

/**
 * Arudha base constants
 */
export const ARUDHA_BASE = {
  LAGNA: 0,
  SUN: 1,
  MOON: 2,
  MARS: 3,
  MERCURY: 4,
  JUPITER: 5,
  VENUS: 6,
  SATURN: 7,
  RAHU: 8,
  KETU: 9
} as const;

/**
 * Calculate Bhava Arudhas (A1-A12) from planet positions
 *
 * Bhava Arudhas are calculated as follows:
 * 1. Find the lord of each house
 * 2. Count signs from house to lord's position
 * 3. Add same count from lord's position to get Arudha
 * 4. If Arudha falls in 1st or 7th from house, move it to 10th from there
 *
 * @param planetPositions - Array of planet positions in format:
 *   [{ planet: 0, rasi: 3, longitude: 98.5 }, ...]
 *   First element (planet: 0) represents Lagna/Ascendant
 * @param arudhaBase - Base for calculation:
 *   0 = Lagna (returns A1, A2, ... A12)
 *   1 = Sun (returns Surya Arudhas S1, S2, ... S12)
 *   2 = Moon (returns Chandra Arudhas M1, M2, ... M12)
 * @returns Array of 12 rasi indices representing Bhava Arudhas
 */
export const getBhavaArudhasFromPlanetPositions = (
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>,
  arudhaBase: number = 0
): number[] => {
  // Restrict to planets up to Ketu (exclude Uranus/Neptune/Pluto)
  const positions = planetPositions.slice(0, PP_COUNT_UPTO_KETU);

  const houseToPlanet = getHouseToPlanetList(positions);
  const planetToHouse = getPlanetToHouseDict(positions);

  // Get base house from the arudha base (Lagna, Sun, Moon, etc.)
  const baseHouse = positions[arudhaBase]?.rasi ?? 0;

  // Generate 12 houses starting from base
  const houses = Array.from({ length: 12 }, (_, h) => (h + baseHouse) % 12);

  const bhavaArudhas: number[] = [];

  for (const house of houses) {
    // Find lord of the house
    const lordOfHouse = getHouseOwnerFromPlanetPositions(positions, house, false);

    // Find which house the lord occupies
    const houseOfLord = planetToHouse[lordOfHouse] ?? 0;

    // Count signs from house to lord's position
    const signsBetween = countRasis(house, houseOfLord);

    // Calculate initial Bhava Arudha position
    let bhavaArudha = (houseOfLord + signsBetween - 1) % 12;

    // Check if arudha falls in 1st or 7th from the house
    const signsFromHouse = countRasis(house, bhavaArudha);

    // If in 1st (1) or 7th (7), shift to 10th from that position
    if (signsFromHouse === 1 || signsFromHouse === 7) {
      bhavaArudha = (bhavaArudha + 10 - 1) % 12;
    }

    bhavaArudhas.push(bhavaArudha);
  }

  return bhavaArudhas;
};

/**
 * Calculate Surya (Sun) Arudhas (S1-S12)
 * Houses are counted from Sun's position
 *
 * @param planetPositions - Array of planet positions
 * @returns Array of 12 rasi indices representing Surya Arudhas
 */
export const getSuryaArudhasFromPlanetPositions = (
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>
): number[] => {
  return getBhavaArudhasFromPlanetPositions(planetPositions, ARUDHA_BASE.SUN);
};

/**
 * Calculate Chandra (Moon) Arudhas (M1-M12)
 * Houses are counted from Moon's position
 *
 * @param planetPositions - Array of planet positions
 * @returns Array of 12 rasi indices representing Chandra Arudhas
 */
export const getChandraArudhasFromPlanetPositions = (
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>
): number[] => {
  return getBhavaArudhasFromPlanetPositions(planetPositions, ARUDHA_BASE.MOON);
};

// ============================================================================
// GRAHA ARUDHAS (GRAHA PADHA)
// ============================================================================

/**
 * Calculate Graha Arudhas (Graha Padhas) for each planet
 *
 * Graha Arudha shows where a planet's influence manifests materially.
 * Calculation:
 * 1. Find the stronger sign owned by the planet
 * 2. Count from planet's position to its owned sign
 * 3. Add same count from planet's position to get Graha Arudha
 * 4. If result is 1st or 7th from planet, add 9 signs
 *
 * @param planetPositions - Array of planet positions
 * @returns Array of rasi indices:
 *   Index 0 = Lagna's position (reference)
 *   Index 1-9 = Graha Padhas for Sun through Ketu
 */
export const getGrahaArudhasFromPlanetPositions = (
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>
): number[] => {
  const houseToPlanet = getHouseToPlanetList(planetPositions);
  const planetToHouse = getPlanetToHouseDict(planetPositions);

  // First element is Lagna position
  const lagnaPosition = planetPositions[0]?.rasi ?? 0;
  const grahaArudhas: number[] = [lagnaPosition];

  // Calculate Graha Arudha for each planet (Sun=0 through Ketu=8)
  for (let p = 0; p < PLANETS_UPTO_KETU; p++) {
    const houseOfPlanet = planetToHouse[p] ?? 0;

    // Get signs owned by this planet
    let signOwnedByPlanet = HOUSE_LORDS_DICT[p];

    if (!signOwnedByPlanet || signOwnedByPlanet.length === 0) {
      // Fallback: use SIGN_LORDS to find owned sign
      const ownedSigns = SIGN_LORDS.map((lord, idx) => lord === p ? idx : -1).filter(x => x >= 0);
      signOwnedByPlanet = ownedSigns.length > 0 ? ownedSigns : [0];
    }

    // If planet owns multiple signs, find the stronger one
    let strongerSign: number;
    if (signOwnedByPlanet.length > 1) {
      strongerSign = getStrongerRasi(
        planetPositions,
        signOwnedByPlanet[0],
        signOwnedByPlanet[1]
      );
    } else {
      strongerSign = signOwnedByPlanet[0];
    }

    // Count from planet's house to its stronger owned sign
    const countToStrong = (strongerSign + 1 + 12 - houseOfPlanet) % 12;

    // Calculate Graha Arudha position
    let countToArudha = (houseOfPlanet + 2 * (countToStrong - 1)) % 12;

    // Check position relative to planet's house
    const countFromHouse = (houseOfPlanet + 12 - countToArudha) % 12;

    // If Arudha falls in same house (0) or 7th (6), add 9 signs
    if (countFromHouse === 0 || countFromHouse === 6) {
      countToArudha = (countToArudha + 9) % 12;
    }

    grahaArudhas.push(countToArudha);
  }

  return grahaArudhas;
};

// ============================================================================
// ARUDHA CHART HELPERS
// ============================================================================

/**
 * Convert Bhava Arudhas array to chart format
 *
 * @param bhavaArudhas - Array of 12 rasi indices for A1-A12
 * @param prefix - Prefix for arudha labels (e.g., 'A', 'Su', 'Mo')
 * @returns Chart array with arudha labels in each house
 */
export const bhavaArudhasToChart = (
  bhavaArudhas: number[],
  prefix: string = 'A'
): string[] => {
  const chart: string[] = Array(12).fill('');

  bhavaArudhas.forEach((rasi, index) => {
    const label = `${prefix}${index + 1}`;
    if (chart[rasi]) {
      chart[rasi] += `/${label}`;
    } else {
      chart[rasi] = label;
    }
  });

  return chart;
};

/**
 * Convert Graha Arudhas array to chart format
 *
 * @param grahaArudhas - Array of rasi indices (first is Lagna, then Sun-Ketu)
 * @returns Chart array with graha arudha labels in each house
 */
export const grahaArudhasToChart = (grahaArudhas: number[]): string[] => {
  const chart: string[] = Array(12).fill('');

  // Planet labels for Graha Arudhas
  const labels = ['L', 'Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];

  grahaArudhas.forEach((rasi, index) => {
    if (index < labels.length) {
      const label = labels[index];
      if (chart[rasi]) {
        chart[rasi] += `/${label}`;
      } else {
        chart[rasi] = label;
      }
    }
  });

  return chart;
};

/**
 * Get Arudha Lagna (A1) specifically
 *
 * @param planetPositions - Array of planet positions
 * @returns Rasi index of Arudha Lagna
 */
export const getArudhaLagna = (
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>
): number => {
  const bhavaArudhas = getBhavaArudhasFromPlanetPositions(planetPositions);
  return bhavaArudhas[0];
};

/**
 * Get Upa Lagna (A12) specifically
 *
 * @param planetPositions - Array of planet positions
 * @returns Rasi index of Upa Lagna
 */
export const getUpaLagna = (
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>
): number => {
  const bhavaArudhas = getBhavaArudhasFromPlanetPositions(planetPositions);
  return bhavaArudhas[11];
};

/**
 * Arudha names for display
 */
export const ARUDHA_NAMES: Record<number, string> = {
  1: 'Arudha Lagna (AL)',
  2: 'Dhana Pada (A2)',
  3: 'Vikrama Pada (A3)',
  4: 'Matri Pada (A4)',
  5: 'Mantra Pada (A5)',
  6: 'Roga Pada (A6)',
  7: 'Dara Pada (A7)',
  8: 'Mrityu Pada (A8)',
  9: 'Pitri Pada (A9)',
  10: 'Karma Pada (A10)',
  11: 'Labha Pada (A11)',
  12: 'Upa Pada (UL/A12)'
};
