/**
 * General prediction module
 * Ported from PyJHora horoscope/prediction/general.py
 *
 * Provides general astrological predictions based on:
 * - Janma Rasi (birth moon sign)
 * - Planets in houses
 * - Lords of houses in other houses
 */

import {
  HOUSE_OWNERS,
  PLANET_NAMES_EN,
  SUN_TO_KETU,
} from '../../constants';
import {
  buildHouseChart,
  getHouseOwnerFromPlanetPositions,
  getPlanetToHouseDict,
  getRelativeHouseOfPlanet,
} from '../house';

// ============================================================================
// TYPES
// ============================================================================

/** Prediction messages loaded from a resource file */
export interface PredictionMessages {
  general_prediction_caution?: string;
  janma_raasi_1?: Record<string, Record<string, string> | string>;
  janma_raasi_2?: Record<string, Record<string, string> | string>;
  planets_in_houses?: Record<string, string[]>;
  lord_of_a_house_joining_lord_of_another_house?: Record<string, string[]>;
  [key: string]: unknown;
}

/** Resource strings for UI labels */
export interface ResourceStrings {
  janma_rasi_str: string;
  general_prediction_str: string;
  planets_str: string;
  houses_str: string;
  house_str: string;
}

/** Planet position entry (simplified for prediction use) */
export interface PlanetPositionEntry {
  planet: number;
  rasi: number;
  longitude: number;
}

// ============================================================================
// DEFAULT RESOURCE STRINGS
// ============================================================================

export const DEFAULT_RESOURCE_STRINGS: ResourceStrings = {
  janma_rasi_str: 'Janma Rasi',
  general_prediction_str: 'General Prediction',
  planets_str: 'Planets',
  houses_str: 'Houses',
  house_str: 'House',
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get general lagna rasi prediction based on janma rasi (birth moon sign).
 * @param janmaRasi - Moon sign index (0-11)
 * @param predictionMsgs - Prediction messages dictionary
 * @param resourceStrings - UI label strings
 * @returns Record of prediction key to HTML string
 */
export const getGeneralLagnaRasiPrediction = (
  janmaRasi: number,
  predictionMsgs: PredictionMessages,
  resourceStrings: ResourceStrings = DEFAULT_RESOURCE_STRINGS,
): Record<string, string> => {
  const results: Record<string, string> = {};
  const sourceCount = 2;

  for (let s = 0; s < sourceCount; s++) {
    const ks = `${resourceStrings.janma_rasi_str}_${s + 1}`;
    let html = `<html><b>${resourceStrings.general_prediction_str}</b><br>`;

    const sourceKey = `janma_raasi_${s + 1}` as keyof PredictionMessages;
    const sourceData = predictionMsgs[sourceKey] as Record<string, Record<string, string> | string> | undefined;

    if (sourceData) {
      const source = sourceData['source'] as string ?? '';
      html += `<b>${source}</b><br>`;

      const rasiKey = String(janmaRasi + 1);
      const pdict = sourceData[rasiKey] as Record<string, string> | undefined;

      if (pdict && typeof pdict === 'object') {
        for (const [k, v] of Object.entries(pdict)) {
          html += `<b>${k}</b><br>${v}<br>`;
        }
      }
    }

    results[ks] = html;
  }

  return results;
};

/**
 * Get predictions for planets in houses.
 * @param planetPositions - Array of planet positions
 * @param predictionMsgs - Prediction messages dictionary
 * @param resourceStrings - UI label strings
 * @returns Record of prediction key to HTML string
 */
export const getPlanetsInHousesPrediction = (
  planetPositions: PlanetPositionEntry[],
  predictionMsgs: PredictionMessages,
  resourceStrings: ResourceStrings = DEFAULT_RESOURCE_STRINGS,
): Record<string, string> => {
  const pToH = getPlanetToHouseDict(planetPositions);
  // Ascendant house: planet -1 represents 'L'
  const lagnaEntry = planetPositions.find(p => p.planet === -1);
  const lagnaHouse = lagnaEntry?.rasi ?? 0;

  const ks = resourceStrings.planets_str;
  const results: Record<string, string> = {};
  let html = '<html>';

  const planetMsgs = predictionMsgs.planets_in_houses;
  if (!planetMsgs) {
    results[ks] = html;
    return results;
  }

  for (const planet of SUN_TO_KETU) {
    const planetHouse = getRelativeHouseOfPlanet(lagnaHouse, pToH[planet] ?? 0);
    const houseMessages = planetMsgs[String(planetHouse)];
    const plMsg = houseMessages?.[planet] ?? '';
    const key = `${PLANET_NAMES_EN[planet]}-${resourceStrings.house_str}#${planetHouse}:`;
    html += `<b>${key}</b><br>${plMsg}<br>`;
  }

  results[ks] = html;
  return results;
};

/**
 * Get predictions for lords of houses in other houses.
 * @param planetPositions - Array of planet positions
 * @param predictionMsgs - Prediction messages dictionary
 * @param resourceStrings - UI label strings
 * @returns Record of prediction key to HTML string
 */
export const getLordsInHousesPrediction = (
  planetPositions: PlanetPositionEntry[],
  predictionMsgs: PredictionMessages,
  resourceStrings: ResourceStrings = DEFAULT_RESOURCE_STRINGS,
): Record<string, string> => {
  const pToH = getPlanetToHouseDict(planetPositions);
  const lagnaEntry = planetPositions.find(p => p.planet === -1);
  const lagnaHouse = lagnaEntry?.rasi ?? 0;

  const ks = resourceStrings.houses_str;
  const results: Record<string, string> = {};
  let html = '<html>';

  const planetMsgs = predictionMsgs.lord_of_a_house_joining_lord_of_another_house;
  if (!planetMsgs) {
    results[ks] = html;
    return results;
  }

  for (let h = 0; h < 12; h++) {
    const lord = HOUSE_OWNERS[(h + lagnaHouse) % 12];
    const houseOfLord = getRelativeHouseOfPlanet(lagnaHouse, pToH[lord] ?? 0);
    const key = `Lord of House#${h + 1} in house#${houseOfLord}`;
    const houseMessages = planetMsgs[String(h + 1)];
    const plMsg = houseMessages?.[houseOfLord - 1] ?? '';
    html += `<b>${key}</b><br>${plMsg}<br>`;
  }

  results[ks] = html;
  return results;
};

/**
 * Get complete prediction details combining all prediction types.
 * @param planetPositions - Array of planet positions (including ascendant as planet -1)
 * @param janmaRasi - Birth moon sign index (0-11)
 * @param predictionMsgs - Prediction messages dictionary
 * @param resourceStrings - UI label strings
 * @returns Combined prediction results as Record<string, string>
 */
export const getPredictionDetails = (
  planetPositions: PlanetPositionEntry[],
  janmaRasi: number,
  predictionMsgs: PredictionMessages,
  resourceStrings: ResourceStrings = DEFAULT_RESOURCE_STRINGS,
): Record<string, string> => {
  const results: Record<string, string> = {};

  const results1 = getGeneralLagnaRasiPrediction(janmaRasi, predictionMsgs, resourceStrings);
  Object.assign(results, results1);

  const results2 = getPlanetsInHousesPrediction(planetPositions, predictionMsgs, resourceStrings);
  Object.assign(results, results2);

  const results3 = getLordsInHousesPrediction(planetPositions, predictionMsgs, resourceStrings);
  Object.assign(results, results3);

  return results;
};
