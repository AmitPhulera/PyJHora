/**
 * Dosha (Affliction) Calculations
 * Ported from PyJHora dosha.py
 *
 * Provides checks for common doshas in Vedic astrology:
 * Kala Sarpa, Manglik, Pitru, Guru Chandala, Kalathra, Ganda Moola, Ghata, Shrapit
 */

import type { HouseChart } from '@core/types';
import type { PlanetPosition } from './charts';
import {
  getHouseToPlanetList,
  getPlanetToHouseDict,
  getRelativeHouseOfPlanet,
  getHouseOwnerFromPlanetPositions,
  getAssociationsOfThePlanet,
} from './house';
import { planetsInRetrograde, planetsInCombustion } from './charts';
import {
  HOUSE_STRENGTHS_OF_PLANETS,
  JUPITER,
  KETU,
  LEO,
  AQUARIUS,
  MARS,
  MOON,
  VENUS,
  NATURAL_MALEFICS,
  RAHU,
  SATURN,
  SUN,
  STRENGTH_FRIEND,
  MOVABLE_SIGNS,
  GEMINI,
  VIRGO,
  ARIES,
  SCORPIO,
  CANCER,
  CAPRICORN,
  SAGITTARIUS,
  PISCES,
  TAURUS,
  LIBRA,
} from '@core/constants';

// ============================================================================
// GANDA MOOLA STARS (1-indexed nakshatra numbers)
// ============================================================================

/** Nakshatras that constitute Ganda Moola dosha */
const GANDA_MOOLA_STARS = [1, 9, 10, 18, 19, 27];

// ============================================================================
// HELPER: Parse HouseChart to planet-to-house dictionary
// ============================================================================

/**
 * Convert a HouseChart (string[12]) to a planet-to-house dictionary.
 * HouseChart entries contain planet IDs separated by '/' and 'L' for Lagna.
 * @param chart - HouseChart array of 12 strings
 * @returns Record mapping planet ID (or 'L') to house index (0-11)
 */
const parsePlanetToHouseFromChart = (
  chart: HouseChart
): Record<string, number> => {
  const result: Record<string, number> = {};
  for (let h = 0; h < 12; h++) {
    const entry = chart[h];
    if (!entry || entry.trim() === '') continue;
    const parts = entry.split('/');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed === 'L') {
        result['L'] = h;
      } else {
        const planetId = parseInt(trimmed, 10);
        if (!isNaN(planetId)) {
          result[String(planetId)] = h;
        }
      }
    }
  }
  return result;
};

// ============================================================================
// KALA SARPA DOSHA
// ============================================================================

/**
 * Check for Kala Sarpa Dosha.
 * All 7 planets (Sun=0 to Saturn=6) must be within one half (7 consecutive
 * houses) from either Rahu or Ketu.
 *
 * @param chart - HouseChart (string[12]) with planet placements
 * @returns true if Kala Sarpa Dosha is present
 */
export const kalaSarpa = (chart: HouseChart): boolean => {
  const pToH = parsePlanetToHouseFromChart(chart);

  const rahuHouseStr = pToH['7'];
  const ketuHouseStr = pToH['8'];

  if (rahuHouseStr === undefined || ketuHouseStr === undefined) return false;

  const rahuHouse = rahuHouseStr;
  const ketuHouse = ketuHouseStr;

  // Check if all planets 0-6 are within 7 consecutive houses from Rahu
  const checkFromNode = (nodeHouse: number): boolean => {
    for (let p = 0; p <= 6; p++) {
      const pHouse = pToH[String(p)];
      if (pHouse === undefined) return false;
      let found = false;
      for (let offset = 0; offset < 7; offset++) {
        if (pHouse === (nodeHouse + offset) % 12) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  };

  return checkFromNode(rahuHouse) || checkFromNode(ketuHouse);
};

// ============================================================================
// MANGLIK DOSHA
// ============================================================================

/** Rasi sandhi duration in degrees (planet near sign boundary) */
const RASI_SANDHI_DURATION = 1.0;

/**
 * Check for Manglik Dosha (Kuja Dosha).
 * Mars in houses 2, 4, 7, 8, or 12 from the reference planet/lagna
 * indicates Manglik dosha.
 *
 * BV Raman exceptions (17 total):
 * 1. Mars in Leo or Aquarius sign
 * 2. Mars in 2nd house AND in Gemini/Virgo
 * 3. Mars in 4th house AND in Aries/Scorpio
 * 4. Mars in 7th house AND in Cancer/Capricorn
 * 5. Mars in 8th house AND in Sagittarius/Pisces
 * 6. Mars in 12th house AND in Taurus/Libra
 * 7. Mars associated/aspected by Jupiter or Saturn
 * 8. Retrograde Mars
 * 9. Mars is weak (combust or in Rasi Sandhi)
 * 10. Mars is lagna lord
 * 11. Dispositor of Mars conditions (not implemented)
 * 12. Mars in own/exalted/friend sign
 * 13. Mars in movable sign
 * 14. Dispositor of Mars in Quad/Trine (not implemented)
 * 15. Lagna in Cancer or Leo (Mars becomes yoga karaka)
 * 16. Mars conjunct Jupiter or Moon
 * 17. Jupiter or Venus in Lagna
 *
 * @param positions - Array of PlanetPosition (planet -1=Lagna, 0=Sun, ..., 8=Ketu)
 * @param referencePlanet - Planet ID or 'L' for Lagna (default: 'L')
 * @param includeLagnaHouse - Include house 1 as manglik house (default: false)
 * @param include2ndHouse - Include house 2 as manglik house (default: true)
 * @param applyExceptions - Apply BV Raman exceptions (default: true)
 * @returns [isManglik, hasExceptions, exceptionIndices]
 */
export const manglik = (
  positions: PlanetPosition[],
  referencePlanet: number | 'L' = 'L',
  includeLagnaHouse: boolean = false,
  include2ndHouse: boolean = true,
  applyExceptions: boolean = true
): [boolean, boolean, number[]] => {
  let manglikHouses = [4, 7, 8, 12];
  if (include2ndHouse) manglikHouses = [2, ...manglikHouses];
  if (includeLagnaHouse) manglikHouses = [1, ...manglikHouses];

  // Get reference house
  let refHouse: number;
  if (referencePlanet === 'L') {
    const lagna = positions.find((p) => p.planet === -1);
    if (!lagna) return [false, false, []];
    refHouse = lagna.rasi;
  } else {
    const refPos = positions.find((p) => p.planet === referencePlanet);
    if (!refPos) return [false, false, []];
    refHouse = refPos.rasi;
  }

  // Get Mars position
  const marsPos = positions.find((p) => p.planet === MARS);
  if (!marsPos) return [false, false, []];
  const marsHouse = marsPos.rasi;
  const marsLong = marsPos.longitude;

  // Get Lagna house (needed for exceptions)
  const lagnaPos = positions.find((p) => p.planet === -1);
  const lagnaHouse = lagnaPos ? lagnaPos.rasi : refHouse;

  // Calculate relative house of Mars from reference
  const marsRelative = getRelativeHouseOfPlanet(refHouse, marsHouse);
  const marsFromLagna = getRelativeHouseOfPlanet(lagnaHouse, marsHouse);

  const isManglik = manglikHouses.includes(marsRelative);

  if (!isManglik) {
    return [false, false, []];
  }

  if (!applyExceptions) {
    return [true, false, []];
  }

  // Build planet-to-house dict for exception checks
  const pToH: Record<number, number> = {};
  for (const p of positions) {
    pToH[p.planet] = p.rasi;
  }

  const exceptions: boolean[] = [];

  // Exception 1: Mars in Leo (4) or Aquarius (10)
  exceptions.push(marsHouse === LEO || marsHouse === AQUARIUS);

  // Exception 2: Mars in 2nd house AND in Gemini/Virgo
  exceptions.push(marsFromLagna === 2 && (marsHouse === GEMINI || marsHouse === VIRGO));

  // Exception 3: Mars in 4th house AND in Aries/Scorpio
  exceptions.push(marsFromLagna === 4 && (marsHouse === ARIES || marsHouse === SCORPIO));

  // Exception 4: Mars in 7th house AND in Cancer/Capricorn
  exceptions.push(marsFromLagna === 7 && (marsHouse === CANCER || marsHouse === CAPRICORN));

  // Exception 5: Mars in 8th house AND in Sagittarius/Pisces
  exceptions.push(marsFromLagna === 8 && (marsHouse === SAGITTARIUS || marsHouse === PISCES));

  // Exception 6: Mars in 12th house AND in Taurus/Libra
  exceptions.push(marsFromLagna === 12 && (marsHouse === TAURUS || marsHouse === LIBRA));

  // Exception 7: Mars associated/aspected by Jupiter or Saturn
  const associations = getAssociationsOfThePlanet(positions, MARS);
  exceptions.push(associations.length > 0);

  // Exception 8: Retrograde Mars
  const retroPlanets = planetsInRetrograde(positions);
  exceptions.push(retroPlanets.includes(MARS));

  // Exception 9: Mars is weak (combust or in Rasi Sandhi)
  const combustPlanets = planetsInCombustion(positions);
  const isCombust = combustPlanets.includes(MARS);
  const isRasiSandhi = marsLong < RASI_SANDHI_DURATION || marsLong > (30.0 - RASI_SANDHI_DURATION);
  exceptions.push(isCombust || isRasiSandhi);

  // Exception 10: Mars is lagna lord
  const lagnaLord = getHouseOwnerFromPlanetPositions(positions, lagnaHouse);
  exceptions.push(lagnaLord === MARS);

  // Exception 11: Dispositor of Mars is neecha + strong benefic (not implemented)
  exceptions.push(false);

  // Exception 12: Mars in own/exalted/friend sign (strength >= FRIEND)
  const marsStrength = HOUSE_STRENGTHS_OF_PLANETS[MARS]?.[marsHouse] ?? 0;
  exceptions.push(marsStrength >= STRENGTH_FRIEND);

  // Exception 13: Mars in movable sign
  exceptions.push(MOVABLE_SIGNS.includes(marsHouse));

  // Exception 14: Dispositor of Mars in Quad/Trine (not implemented)
  exceptions.push(false);

  // Exception 15: Lagna in Cancer or Leo (Mars becomes yoga karaka)
  exceptions.push(lagnaHouse === CANCER || lagnaHouse === LEO);

  // Exception 16: Mars conjunct Jupiter or Venus
  // Note: Python comment says "Jupiter or moon" but code uses p_to_h[4] (Jupiter) and p_to_h[5] (Venus).
  // We follow the Python code, which checks Venus not Moon.
  exceptions.push(
    pToH[JUPITER] === marsHouse || pToH[VENUS] === marsHouse
  );

  // Exception 17: Jupiter or Venus in Lagna
  exceptions.push(
    pToH[JUPITER] === lagnaHouse || pToH[VENUS] === lagnaHouse
  );

  const exceptionIndices: number[] = [];
  for (let i = 0; i < exceptions.length; i++) {
    if (exceptions[i]) exceptionIndices.push(i + 1);
  }

  const hasExceptions = exceptionIndices.length > 0;
  return [true, hasExceptions, exceptionIndices];
};

// ============================================================================
// PITRU DOSHA
// ============================================================================

/**
 * Check for Pitru (Pitra) Dosha.
 *
 * Conditions checked:
 * 1. Sun, Moon, or Rahu in 9th house from Lagna
 * 2. Ketu in 4th house from Lagna
 * 3. Mars or Saturn afflicting (same house as) Sun/Moon/Rahu/Ketu
 * 4. Two or more of Mercury, Venus, Rahu in houses 2, 5, 9, or 12 from Lagna
 * 5. Sun or Moon conjunct Rahu or Ketu
 *
 * @param positions - Array of PlanetPosition (planet -1=Lagna, 0=Sun, ..., 8=Ketu)
 * @returns [hasPitruDosha, conditionIndices]
 */
export const pitruDosha = (
  positions: PlanetPosition[]
): [boolean, number[]] => {
  const pToH = getPlanetToHouseDict(
    positions.map((p) => ({
      planet: p.planet,
      rasi: p.rasi,
      longitude: p.longitude,
    }))
  );

  // Get Lagna house
  const lagnaPos = positions.find((p) => p.planet === -1);
  if (!lagnaPos) return [false, []];
  const lagnaHouse = lagnaPos.rasi;

  const ninthHouse = (lagnaHouse + 8) % 12;
  const fourthHouse = (lagnaHouse + 3) % 12;

  const conditions: boolean[] = [];

  // Condition 1: Sun, Moon, or Rahu in 9th house from Lagna
  const sunH = pToH[SUN];
  const moonH = pToH[1]; // MOON
  const rahuH = pToH[RAHU];
  const pd1 =
    sunH === ninthHouse || moonH === ninthHouse || rahuH === ninthHouse;
  conditions.push(pd1);

  // Condition 2: Ketu in 4th house from Lagna
  const ketuH = pToH[KETU];
  const pd2 = ketuH === fourthHouse;
  conditions.push(pd2);

  // Condition 3: Mars or Saturn afflicting (same house as) Sun/Moon/Rahu/Ketu
  const marsH = pToH[MARS];
  const saturnH = pToH[SATURN];
  const targetPlanets = [SUN, 1, RAHU, KETU]; // Sun, Moon, Rahu, Ketu
  const pd3 = targetPlanets.some((tp) => {
    const tpH = pToH[tp];
    if (tpH === undefined) return false;
    return (marsH !== undefined && marsH === tpH) || (saturnH !== undefined && saturnH === tpH);
  });
  conditions.push(pd3);

  // Condition 4: Two or more of Mercury(3), Venus(5), Rahu(7) in houses 2,5,9,12 from Lagna
  const checkPlanets = [3, 5, 7]; // Mercury, Venus, Rahu
  const checkHouseOffsets = [2, 5, 9, 12]; // 1-based house numbers
  const pd4 = checkHouseOffsets.some((h) => {
    const targetSign = (lagnaHouse + h - 1) % 12;
    const count = checkPlanets.filter((cp) => pToH[cp] === targetSign).length;
    return count > 1;
  });
  conditions.push(pd4);

  // Condition 5: Sun or Moon conjunct Rahu or Ketu
  const pd5 = [SUN, 1].some((p1) => {
    const p1H = pToH[p1];
    return p1H !== undefined && (p1H === rahuH || p1H === ketuH);
  });
  conditions.push(pd5);

  const hasPitruDosha = conditions.some((c) => c);
  if (hasPitruDosha) {
    const indices = conditions
      .map((c, i) => (c ? i + 1 : -1))
      .filter((i) => i > 0);
    return [true, indices];
  }
  return [false, []];
};

// ============================================================================
// GURU CHANDALA DOSHA
// ============================================================================

/**
 * Check for Guru Chandala Dosha.
 * Jupiter conjunct Rahu or Ketu (same house).
 *
 * @param positions - Array of PlanetPosition
 * @returns [hasDosha, jupiterIsStronger]
 */
export const guruChandalaDosha = (
  positions: PlanetPosition[]
): [boolean, boolean] => {
  const jupiterPos = positions.find((p) => p.planet === JUPITER);
  const rahuPos = positions.find((p) => p.planet === RAHU);
  const ketuPos = positions.find((p) => p.planet === KETU);

  if (!jupiterPos) return [false, false];

  if (rahuPos && jupiterPos.rasi === rahuPos.rasi) {
    // Jupiter conjunct Rahu - compare longitudes within the sign
    const jupiterIsStronger = jupiterPos.longitude >= rahuPos.longitude;
    return [true, jupiterIsStronger];
  }

  if (ketuPos && jupiterPos.rasi === ketuPos.rasi) {
    // Jupiter conjunct Ketu - compare longitudes within the sign
    const jupiterIsStronger = jupiterPos.longitude >= ketuPos.longitude;
    return [true, jupiterIsStronger];
  }

  return [false, false];
};

// ============================================================================
// KALATHRA DOSHA
// ============================================================================

/**
 * Check for Kalathra Dosha.
 * ALL natural malefics (Sun, Mars, Saturn, Rahu, Ketu) must be in
 * houses 1, 2, 4, 7, 8, or 12 from the 7th house of the reference.
 *
 * In Python: reference_house = (lagna_rasi + 6) % 12 (i.e. 7th house from Lagna)
 * Then checks all malefics are in houses 1,2,4,7,8,12 from that reference_house.
 *
 * @param positions - Array of PlanetPosition
 * @param referencePlanet - Planet ID or 'L' for Lagna (default: 'L')
 * @returns true if Kalathra Dosha is present
 */
export const kalathra = (
  positions: PlanetPosition[],
  referencePlanet: number | 'L' = 'L'
): boolean => {
  // Determine the reference house (7th from Lagna or 7th from Moon)
  let referenceHouse: number;
  if (referencePlanet === 'L') {
    const lagna = positions.find((p) => p.planet === -1);
    if (!lagna) return false;
    referenceHouse = (lagna.rasi + 6) % 12;
  } else if (referencePlanet === 1) {
    // Moon reference: 7th from Moon
    const moonPos = positions.find((p) => p.planet === 1);
    if (!moonPos) return false;
    referenceHouse = (moonPos.rasi + 6) % 12;
  } else {
    const refPos = positions.find((p) => p.planet === referencePlanet);
    if (!refPos) return false;
    referenceHouse = (refPos.rasi + 6) % 12;
  }

  const kalathraHouses = [1, 2, 4, 7, 8, 12];

  // Check if ALL natural malefics are in the specified houses from reference
  return NATURAL_MALEFICS.every((malefic) => {
    const maleficPos = positions.find((p) => p.planet === malefic);
    if (!maleficPos) return false;
    const relHouse = getRelativeHouseOfPlanet(referenceHouse, maleficPos.rasi);
    return kalathraHouses.includes(relHouse);
  });
};

// ============================================================================
// GANDA MOOLA DOSHA
// ============================================================================

/**
 * Check for Ganda Moola Dosha based on Moon's nakshatra.
 *
 * @param moonStar - 1-indexed nakshatra number of the Moon
 * @returns true if the nakshatra is a Ganda Moola nakshatra
 */
export const gandaMoola = (moonStar: number): boolean => {
  return GANDA_MOOLA_STARS.includes(moonStar);
};

// ============================================================================
// GHATA DOSHA
// ============================================================================

/**
 * Check for Ghata Dosha.
 * Mars and Saturn conjunction (same house/rasi).
 *
 * In Python: planet_positions[3][1][0] == planet_positions[7][1][0]
 * where index 3 = Mars, index 7 = Saturn in Python's 0-indexed (after Lagna).
 *
 * @param positions - Array of PlanetPosition
 * @returns true if Ghata Dosha is present
 */
export const ghata = (positions: PlanetPosition[]): boolean => {
  const marsPos = positions.find((p) => p.planet === MARS);
  const saturnPos = positions.find((p) => p.planet === SATURN);

  if (!marsPos || !saturnPos) return false;
  return marsPos.rasi === saturnPos.rasi;
};

// ============================================================================
// SHRAPIT DOSHA
// ============================================================================

/**
 * Check for Shrapit Dosha.
 * Rahu and Saturn conjunction (same house/rasi).
 *
 * In Python: planet_positions[8][1][0] == planet_positions[7][1][0]
 * where index 8 = Rahu, index 7 = Saturn in Python's 0-indexed (after Lagna).
 *
 * @param positions - Array of PlanetPosition
 * @returns true if Shrapit Dosha is present
 */
export const shrapit = (positions: PlanetPosition[]): boolean => {
  const rahuPos = positions.find((p) => p.planet === RAHU);
  const saturnPos = positions.find((p) => p.planet === SATURN);

  if (!rahuPos || !saturnPos) return false;
  return rahuPos.rasi === saturnPos.rasi;
};

// ============================================================================
// GET DOSHA DETAILS (Top-level wrapper)
// ============================================================================

/**
 * Result type for all dosha checks.
 */
export interface DoshaDetails {
  kalaSarpa: boolean;
  manglik: {
    isManglik: boolean;
    hasExceptions: boolean;
    exceptionIndices: number[];
  };
  pitru: {
    hasDosha: boolean;
    conditionIndices: number[];
  };
  guruChandala: {
    hasDosha: boolean;
    jupiterStronger: boolean;
  };
  kalathra: boolean;
  gandaMoola: boolean;
  ghata: boolean;
  shrapit: boolean;
}

/**
 * Get all dosha details for a given chart.
 * Ported from Python get_dosha_details. Unlike the Python version which
 * requires jd/place for language resources and generates HTML strings,
 * this TS version returns structured data from pre-computed positions.
 *
 * @param chart - HouseChart (string[12]) for kala sarpa check
 * @param positions - Array of PlanetPosition for other dosha checks
 * @param moonStar - 1-indexed nakshatra number of the Moon for ganda moola check
 * @param referencePlanet - Reference planet for manglik/kalathra (default: 'L')
 * @returns DoshaDetails with all dosha findings
 */
export const getDoshaDetails = (
  chart: HouseChart,
  positions: PlanetPosition[],
  moonStar: number,
  referencePlanet: number | 'L' = 'L'
): DoshaDetails => {
  const ksResult = kalaSarpa(chart);

  const [isManglik, hasExceptions, exceptionIndices] = manglik(
    positions, referencePlanet
  );

  const [hasPitru, pitruConditions] = pitruDosha(positions);

  const [hasGuru, jupiterStronger] = guruChandalaDosha(positions);

  const kalathraResult = kalathra(positions, referencePlanet);

  const gandaMoolaResult = gandaMoola(moonStar);

  const ghataResult = ghata(positions);

  const shrapitResult = shrapit(positions);

  return {
    kalaSarpa: ksResult,
    manglik: { isManglik, hasExceptions, exceptionIndices },
    pitru: { hasDosha: hasPitru, conditionIndices: pitruConditions },
    guruChandala: { hasDosha: hasGuru, jupiterStronger },
    kalathra: kalathraResult,
    gandaMoola: gandaMoolaResult,
    ghata: ghataResult,
    shrapit: shrapitResult,
  };
};

// ============================================================================
// DOSHA MESSAGE STRINGS (English defaults)
// Ported from dosha_msgs_en.json
// ============================================================================

/** Kala Sarpa dosha messages. Index 0 = no dosha, 1-12 = type by Rahu house, 13 = general description */
const KALA_SARPA_MSGS: string[] = [
  'There is no Kala Sarpa Dosha in this horoscope.',
  'Ananta Kala Sarpa Dosha- Rahu in 1st House and Ketu in 7th House. In this Dosha, Rahu is placed in the 1st house and Ketu in the 7th house in the horoscope. All planets are placed between Rahu-Ketu from the 1st house to the 7th house. This alignment can make a person ill-tempered and bring health issues. There would be problems in marital relationships, and, if in business, there would be a lack of support from partners.',
  'Kulik Kala Sarpa Dosha- Rahu in 2nd House and Ketu in 8th House. This Dosha is formed when Rahu is in the 2nd house and Ketu is in the 8th house, and all planets are between them. The individual afflicted may be vile-tongued and lead a life without the support of relatives. Monetary problems might surface, and savings might not be possible. The afflicted native may undergo surgery or accidents. There may be a possibility of unnatural death.',
  'Vasuki Kala Sarpa Dosha- Rahu in 3rd House and Ketu in 9th House. This Dosha is formed in the horoscope when Rahu and Ketu are in the 3rd, and 9th houses, respectively, and the remaining planets are hemmed between them. The afflicted individual may be timid in disposition and unable to fight for self-esteem. Relationships with younger siblings might not be good. Tide will go against the individual who may be unable to overcome adversity. The native can lack interest in religion, and luck may not favor them.',
  'Shankapal Kala Sarpa Dosha- Rahu in 4th House and Ketu in 10th House. This Dosha is formed when all planets are between Rahu and Ketu, which are placed from the 4th house to the 10th house. This alignment causes the native to have a bad relationship with the mother. The individual might not have mental peace and face professional problems.',
  'Padma Kala Sarpa Dosha- Rahu in 5th House and Ketu in 11th House. The axis of Rahu-Ketu from the 5th house to the 11th house and all planets within this axis cause this Dosha. The afflicted individual can face an issue with childbirth and education. They may have problems earning and may get into conflict with elder siblings.',
  'Mahapadma Kala Sarpa Dosha- Rahu in 6th House and Ketu in 12th House. The alignment of all planets in the Rahu-Ketu axis of the 6th house to the 12th house causes this Dosha. The afflicted individual can be dominated by enemies and lose money and property. The native could waste money, be unpopular, and have conflicts with in-laws.',
  'Takshak Kala Sarpa Dosha- Rahu in 7th House and Ketu in 1st House. The placement of all planets in the axis of Rahu-Ketu from the 7th house to the 1st house cause this Dosha. The afflicted may not go through marriage. If married, then the marriage might not go well. This Dosha can create a rift between the couple, leading to separation.',
  'Karakotak Kala Sarpa Dosha- Rahu in 8th House and Ketu in 2nd House. The placement of Rahu in the 8th house and Ketu in the 2nd house and the remaining planets in between them can cause this Dosha. The afflicted native might be ill-tempered and befriend anti-social elements. The native might have enemies and not be granted paternal wealth.',
  'Shankachood Kala Sarpa Dosha- Rahu in 9th House and Ketu in 3rd House. When Rahu is placed in the 9th house, Ketu in the 3rd house and all planets are between Rahu and Ketu; this Dosha is created in the horoscope. An afflicted individual might struggle a lot in life, and luck may never favor them. The individual may develop a habit of lying constantly and could be short-tempered.',
  'Ghatak Kala Sarpa Dosha- Rahu in 10th House and Ketu in 4th House. This Dosha is formed when Rahu is placed in the 10th house, Ketu in the 4th house, and all the planets are between the 10th to 4th houses. The afflicted individual may face many hurdles in his profession and conflicts with superiors at work. The individual may lack focus and face criticism. Relationships with family members may be poor. There may be debts and bad habits.',
  'Vishdhar Kala Sarpa Dosha- Rahu in 11th House and Ketu in 5th House. This Dosha is formed when Rahu is placed in the 11th house and Ketu is placed in the 5th house, and all planets are hemmed between Rahu and Ketu. There would be financial stress and issues regarding children when this Dosha is present in the horoscope.',
  'Sheshang Kala Sarpa Dosha- Rahu in 12th House and Ketu in 6th House. When Rahu is in the 12th house and Ketu is in the 6th house, and all planets are hemmed between them, this Dosha is formed in the horoscope. The native might not be satisfied in life. There may be hidden enemies, and one may face trouble with authorities. There might be frequent health issues.',
  'Kala Sarpa Dosha is considered to be the main reason for the demotion of an individual from a high position. When all the major planets are placed between Rahu and Ketu, Kaal Sarpa Dosha is created. It brings along a lot of struggles, unhappiness, and disturbances. It can cause many difficulties like failure in business, physical and mental weakness, delayed or unhappy marriage, etc.',
];

/** Manglik dosha messages. Index 0 = no dosha, 1-12 = by Mars house, 13 = general description */
const MANGLIK_MSGS: string[] = [
  'There is no Manglik/Mars dosha in this horoscope.',
  'The 1st House is the Lagna or the Ascendant, and that represents the person or the self itself. When Mars gets placed in this House, the natives can become impulsive, short-tempered, and even violent. This can lead to conflicts between partners, and throw their life out of gears, and result in separations, too.',
  'The 2nd is the House denoting family and joy, and placement of Mars here can make the native devoid of mercy, and contribute to poverty and strains in marital life. At times, this can end up in breakups too.',
  'There is no Manglik/Mars dosha in this horoscope.',
  'Placement of Mars in the 4th House, which represents comforts, can cause problems in profession and money-matters. This can also result in diseases and disturbed family life.',
  'There is no Manglik/Mars dosha in this horoscope.',
  'There is no Manglik/Mars dosha in this horoscope.',
  'The 7th is the Kalathra Sthana, which directly represents marriage. The placement of Mars here can make the natives aggressive and dominating and may lead to differences of opinion between spouses, sufferings, and sorrow.',
  'The 8th House represents the Suhaag bhava, the longevity of marriage. While planet Mars here can make the person highly temperamental, sexually aggressive, accident-prone, and unlucky, this can also spell doom for the long life of either of the spouses and thus of the marriage itself.',
  'There is no Manglik/Mars dosha in this horoscope.',
  'There is no Manglik/Mars dosha in this horoscope.',
  'There is no Manglik/Mars dosha in this horoscope.',
  '12th is the House of conjugal bliss and joy. When Mars gets placed in this House, the native can become restless and aggressive, and suffer the loss of self-esteem. In the process, the peace and happiness of their marital bond will get hit, and life may turn miserable.',
  'According to Vedic Astrology, When Mars occupies the 2nd house, 4th house, 7th house, 8th house, or 12th house, from Ascendant (1st house), Moon, and Venus in the birth chart or horoscope, the cosmic alignment creates Manglik Dosha. South Indian astrology considers Mars in the 2nd House for Mangal Dosha. It is called Chevvai (Sevvai) Dosham in Tamil.',
];

/** Manglik exception messages. Index 0 = no exceptions, 1-17 = exception details, 18 = general */
const MANGLIK_EXCEPTION_MSGS: string[] = [
  'There are no exceptions that are applicable.',
  'Mars in Leo or Aquarious',
  'Mars in 2nd house and in signs of Gemini or Virgo',
  'Mars in 4th house and in signs of Aries or Scorpio',
  'Mars in 7th house and in signs of Cancer or Capricorn',
  'Mars in 8th house and in signs of Sagitarius or Pisces',
  'Mars in 12th house and in signs of Taurus or Libra',
  'Mars is in association or aspected by Jupiter or Saturn',
  'Mars is retrograde',
  'Mars is weak (combust, Rasi Sandhi etc)',
  'Mars is lagna lord.',
  'ruler of the sign of Mars is neecham or associated with strong benefic planet',
  'When Mars is in own house, uccham or in friend\'s house leads to reduced effects',
  'When Mars is in movable house, it reduces effects',
  'Ruler of the sign of Mars is in Quadrants or Trines of the rasi',
  'If Lagnam is in Cancer or Leo, then Mars is yoga karaka and therefore will not cause dosha.',
  'Since Mars cojoins with Jupiter or moon, it reduces the dosha',
  'When Jupiter or Venus is in Lagna it reduces dosha',
  'Though there is Mars dosha- due to following exceptions- Mars dosha is ineffective.',
];

/** Pitru dosha messages. Index 0 = no dosha, 1-5 = condition details, 6 = general description */
const PITRU_MSGS: string[] = [
  'There is no pitru dosha in this horoscope.',
  'Either sun, moon or Rahu is in ninth house.',
  'Ketu is in the fourth house.',
  'Either sun, moon, rahu or ketu has been afflicted by malefic planets like Mars or Saturn',
  'Venus, Mercury, Rahu or any of these two planets are in one of the 2nd, 5th, 9th or 12th house.',
  'Sun or Moon is in conjunction with Rahu or Ketu.',
  'Pitru Dosha is a planetary flaw that means a karmic debt of the ancestors, which is to be paid by the person afflicted with Pitru Dosha in the Kundli. It is formed when your forefathers have committed any mistakes, crimes, or sins in their life journey. There is pitru dosha in this horoscope for the following reasons:',
];

/** Kalathra dosha messages. Index 0 = no dosha, 1 = unused, 2 = general description */
const KALATHRA_MSGS: string[] = [
  'There is no kalathra dosha in this horoscope.',
  '',
  'Kalathra Dosha is an affliction that affects marriage and brings troubles to marriage. In Vedic astrology, the 7th house represents relationships; in Sanskrit, it is called Kalathra Sthana, the house of Spouse.',
];

/** Guru Chandal dosha messages. Index 0 = no dosha, 1-12 = by Jupiter house, 13 = general description */
const GURU_CHANDAL_MSGS: string[] = [
  'There is no Guru Chandal dosha on this horoscope.',
  'Jupiter and Rahu or Ketu in the 1st house gives auspicious results and you are learned and well-versed and the positive conjunction can give you intellectual wisdom where you can become good spiritual teacher & mentor.',
  'Jupiter and Rahu or Ketu in the 2nd house gives you rashness in speech due to the effect of Rahu and it brings a separation from family and loved ones.',
  'Jupiter and Rahu or Ketu in the 3rd house gives beneficial results due to travel where many opportunities will give you success in ventures with fewer efforts due to blessings of Jupiter.',
  'Jupiter and Rahu or Ketu in the 4th house will bless you with unique creative ability, affection for mother but your life revolves around your mother, and this may affect your other relationships negatively.',
  'Jupiter and Rahu or Ketu in the 5th house will make you involved in the creative way of life or doing things with an expertise in your field but you may get addicted to bad habits due to your high profile.',
  'Jupiter and Rahu or Ketu in the 6th house may bring you big success in speculative business but may affect your health.',
  'Jupiter and Rahu or Ketu in the 7th house gives delay in marriage, issues in marital and professional partnership and lack of happiness in marriage.',
  'Jupiter and Rahu or Ketu in 8th house can give a fascination for deeper learning of the mystic fields, research works as scientists but will give rivals and challenges in your success.',
  'Jupiter and Rahu or Ketu in 9th house brings auspicious results with a refined religious inclination along with an unaffected generous nature despite successful designation.',
  'Jupiter and Rahu or Ketu in the 10th house can give an unsuccessful career but can make you a good and enthusiastic learner.',
  'Jupiter and Rahu or Ketu in the 11th house will give you a good social image, affection towards children but you will run after wealth all your life.',
  'Jupiter and Rahu or Ketu in the 12th house can give success in career abroad and away from family but is liable to give mental and physical health issues.',
  'There is Guru Chandal dosha in this horoscope. In the birth chart, Chandal Dosha occurs when the planet Jupiter is in conjunction with the malefic planets Rahu or Ketu.',
];

/** Ganda Moola dosha messages. Index 0 = no dosha, 1-6 = by nakshatra, 7 = general description */
const GANDA_MOOLA_MSGS: string[] = [
  'There is no ganda moola dosha in this horoscope.',
  'A person born in the first stage of Ashwini Nakshatra might have to face a lot of obstacles in life.',
  'Ashlesha Nakshatra stays in Cancer sign from 16 degrees 40 minutes to 30 degrees.',
  'The beginning of Leo sign marks the beginning of Magha Nakshatra.',
  'Jyeshtha Nakshatra stays in Scorpio sign from 16 degrees and 40 minutes to 30 degrees.',
  'If Moon is in Sagittarius sign from 0 degrees to 13 degrees and 20 minutes at the time of birth, the native is said to be born in Gandmool Nakshatra.',
  'Rewati Nakshatra stays in Pisces sign from 16 degrees and 40 minutes to 30 degrees.',
  'Ganda Moola Dosha occurs when the Moon is present in any of the six Ganda Moola Nakshatras at the time of birth.',
];

/** Ghata dosha messages. Index 0 = no dosha, 1-12 = by Mars house, 13 = general description */
const GHATA_MSGS: string[] = [
  'There is no ghata dosha in this horoscope.',
  'Mars-Saturn Conjunction in 1st house indicates it can make you dominating in relationships with an inflexible attitude.',
  'Mars-Saturn Conjunction in 2nd house brings contradiction in the family relations along with good money.',
  'Mars-Saturn Conjunction in 3rd house indicates good initiative and courage which can give you more monetary gains.',
  'Mars-Saturn Conjunction in 4th house indicates stability in the sentiments and expression of domestic happiness.',
  'Mars-Saturn Conjunction in 5th house indicates a malefic effect on matters related with children, speculation in money matters.',
  'Mars-Saturn Conjunction in 6th house indicates the courage to win over your rivals, good health and vitality.',
  'Mars-Saturn Conjunction in 7th house indicates less progressive attitude in married life and relationships.',
  'Mars-Saturn Conjunction in 8th house gives you good wealth with name & fame and long life but it will affect your health.',
  'Mars-Saturn Conjunction in 9th house indicates the rise in your religious inclination.',
  'Mars-Saturn Conjunction in 10th house success in business with government policies but good competition from rivals.',
  'Mars-Saturn Conjunction in 11th house can give gains through many sources due to hard work.',
  'Mars-Saturn Conjunction in 12th house can bring lot of setbacks in your endeavors.',
  'Ghat Dosha occurs when there is Saturn-Mars conjunction in a horoscope.',
];

/** Shrapit dosha messages. Index 0 = no dosha, 1-12 = by Saturn house, 13 = general description */
const SHRAPIT_MSGS: string[] = [
  'There is no shrapit dosha in this horoscope',
  'Saturn-Rahu in the 1st house indicates you will always be worried, ruled with negative thoughts.',
  'Saturn-Rahu in the 2nd house indicates problems in speech, disputes in family relations.',
  'Saturn-Rahu in the 3rd house can give you fluctuations in life due to less initiative for progress.',
  'Saturn-Rahu in 4th house is not a very progressive placement in the house of happiness and stability.',
  'Saturn-Rahu in the 5th house will make you prone to negative thoughts with the difficulty of completing your education.',
  'Saturn-Rahu in 6th house may affect your health due to health concerns.',
  'Saturn-Rahu in the 7th house may give the conflicts with professional partners and coworkers.',
  'Saturn-Rahu in the 8th house indicates bad health, dire relationships.',
  'Saturn-Rahu in the 9th house gives a low luck quotient to you.',
  'Saturn-Rahu in the 10th house gives personal and professional setbacks.',
  'Saturn-Rahu in 11th house gains are visible through gambling or betting.',
  'Saturn-Rahu in 12th house gives low health prospects, immoral relationships.',
  'Shrapit Dosha occurs in a natal chart when Saturn and Rahu are placed in a single sign.',
];

/** Guru stronger than node messages */
const GURU_STRONGER_THAN_RAHU = 'In your horoscope, Jupiter is stronger than Rahu. So it becomes Guru-Chandal-Yoga for you.';
const GURU_STRONGER_THAN_KETU = 'In your horoscope, Jupiter is stronger than Ketu. So it becomes Guru-Chandal-Yoga for you.';

// ============================================================================
// DETAIL COMPOSER: _get_kala_sarpa_results
// ============================================================================

/**
 * Format Kala Sarpa Dosha results into a human-readable HTML string.
 * Ported from Python's _get_kala_sarpa_results.
 *
 * @param positions - Array of PlanetPosition
 * @param keyStr - Label/key string (default: 'Kala Sarpa Dosha')
 * @returns Record with the key mapping to the HTML result string
 */
export const getKalaSarpaResults = (
  positions: PlanetPosition[],
  keyStr: string = 'Kala Sarpa Dosha'
): Record<string, string> => {
  const chart = buildChartFromPositions(positions);
  const nextLine = '<br><br>';

  const kpd = kalaSarpa(chart);
  let resultStr = '<html>' + KALA_SARPA_MSGS[0] + nextLine;

  if (kpd) {
    resultStr = '<html>' + KALA_SARPA_MSGS[KALA_SARPA_MSGS.length - 1] + nextLine;
    // Get Rahu's house relative to Lagna
    const lagnaPos = positions.find(p => p.planet === -1);
    const rahuPos = positions.find(p => p.planet === RAHU);
    if (lagnaPos && rahuPos) {
      const rahuHouse = getRelativeHouseOfPlanet(lagnaPos.rasi, rahuPos.rasi);
      if (rahuHouse >= 1 && rahuHouse <= 12 && KALA_SARPA_MSGS[rahuHouse]) {
        resultStr += KALA_SARPA_MSGS[rahuHouse] + nextLine;
      }
    }
  }

  resultStr += '</html>';
  return { [keyStr]: resultStr };
};

// ============================================================================
// DETAIL COMPOSER: _get_manglik_results
// ============================================================================

/**
 * Format Manglik Dosha results into a human-readable HTML string.
 * Ported from Python's _get_manglik_results.
 *
 * @param positions - Array of PlanetPosition
 * @param keyStr - Label/key string (default: 'Manglik Dosha')
 * @returns Record with the key mapping to the HTML result string
 */
export const getManglikResults = (
  positions: PlanetPosition[],
  keyStr: string = 'Manglik Dosha'
): Record<string, string> => {
  const nextLine = '<br><br>';
  const manglikResult = manglik(positions);

  let resultStr = '<html>' + MANGLIK_MSGS[0] + nextLine;

  if (manglikResult[0]) {
    resultStr = '<html>' + MANGLIK_MSGS[MANGLIK_MSGS.length - 1] + nextLine;
    // Get Mars house relative to Lagna
    const lagnaPos = positions.find(p => p.planet === -1);
    const marsPos = positions.find(p => p.planet === MARS);
    if (lagnaPos && marsPos) {
      const marsHouse = getRelativeHouseOfPlanet(lagnaPos.rasi, marsPos.rasi);
      if (marsHouse >= 1 && marsHouse <= 12 && MANGLIK_MSGS[marsHouse]) {
        resultStr += MANGLIK_MSGS[marsHouse] + nextLine;
      }
    }

    // Check exceptions
    let expStr = MANGLIK_EXCEPTION_MSGS[0];
    if (manglikResult[1]) {
      expStr = MANGLIK_EXCEPTION_MSGS[MANGLIK_EXCEPTION_MSGS.length - 1] + nextLine;
      for (const meIdx of manglikResult[2]) {
        if (meIdx >= 1 && meIdx < MANGLIK_EXCEPTION_MSGS.length - 1) {
          expStr += '\t' + MANGLIK_EXCEPTION_MSGS[meIdx] + nextLine;
        }
      }
    }
    resultStr += expStr;
  }

  resultStr += '</html>';
  return { [keyStr]: resultStr };
};

// ============================================================================
// DETAIL COMPOSER: _get_pitru_results
// ============================================================================

/**
 * Format Pitru Dosha results into a human-readable HTML string.
 * Ported from Python's _get_pitru_results.
 *
 * @param positions - Array of PlanetPosition
 * @param keyStr - Label/key string (default: 'Pitru Dosha')
 * @returns Record with the key mapping to the HTML result string
 */
export const getPitruResults = (
  positions: PlanetPosition[],
  keyStr: string = 'Pitru Dosha'
): Record<string, string> => {
  const nextLine = '<br><br>';

  const kpd = pitruDosha(positions);
  let resultStr = '<html>' + PITRU_MSGS[0] + nextLine;

  if (kpd[0]) {
    resultStr = '<html>' + PITRU_MSGS[PITRU_MSGS.length - 1] + nextLine;
    for (const m of kpd[1]) {
      if (m >= 1 && m < PITRU_MSGS.length - 1) {
        resultStr += PITRU_MSGS[m] + nextLine;
      }
    }
  }

  resultStr += '</html>';
  return { [keyStr]: resultStr };
};

// ============================================================================
// DETAIL COMPOSER: _get_guru_chandala_results
// ============================================================================

/**
 * Format Guru Chandala Dosha results into a human-readable HTML string.
 * Ported from Python's _get_guru_chandala_results.
 *
 * @param positions - Array of PlanetPosition
 * @param keyStr - Label/key string (default: 'Guru Chandala Dosha')
 * @returns Record with the key mapping to the HTML result string
 */
export const getGuruChandalaResults = (
  positions: PlanetPosition[],
  keyStr: string = 'Guru Chandala Dosha'
): Record<string, string> => {
  const nextLine = '<br><br>';

  const jupiterPos = positions.find(p => p.planet === JUPITER);
  const rahuPos = positions.find(p => p.planet === RAHU);
  const ketuPos = positions.find(p => p.planet === KETU);

  const gc = guruChandalaDosha(positions);

  let resultStr = '<html>' + GURU_CHANDAL_MSGS[0] + nextLine;

  if (gc[0]) {
    resultStr = '<html>' + GURU_CHANDAL_MSGS[GURU_CHANDAL_MSGS.length - 1] + nextLine;
    if (gc[1]) {
      // Jupiter is stronger
      if (jupiterPos && rahuPos && jupiterPos.rasi === rahuPos.rasi) {
        resultStr += GURU_STRONGER_THAN_RAHU + nextLine;
      } else if (jupiterPos && ketuPos && jupiterPos.rasi === ketuPos.rasi) {
        resultStr += GURU_STRONGER_THAN_KETU + nextLine;
      }
      // Add house-specific message based on Jupiter's absolute rasi (Python: m_msgs[planet_positions[5][1][0]+1])
      if (jupiterPos) {
        const jupiterHouseIdx = jupiterPos.rasi + 1; // 1-indexed from absolute rasi
        if (jupiterHouseIdx >= 1 && jupiterHouseIdx <= 12) {
          resultStr += GURU_CHANDAL_MSGS[jupiterHouseIdx] + nextLine;
        }
      }
    }
  }

  resultStr += '</html>';
  return { [keyStr]: resultStr };
};

// ============================================================================
// DETAIL COMPOSER: _get_gandamoola_results
// ============================================================================

/**
 * Format Ganda Moola Dosha results into a human-readable HTML string.
 * Ported from Python's _get_ganda_moola_results.
 *
 * Note: The Python version calls drik.nakshatra() to get moon_star from jd/place.
 * This TS version requires the moonStar to be pre-computed and passed in.
 *
 * @param moonStar - 1-indexed nakshatra number of the Moon
 * @param keyStr - Label/key string (default: 'Ganda Moola Dosha')
 * @returns Record with the key mapping to the HTML result string
 */
export const getGandaMoolaResults = (
  moonStar: number,
  keyStr: string = 'Ganda Moola Dosha'
): Record<string, string> => {
  const nextLine = '<br><br>';

  const gm = gandaMoola(moonStar);
  let resultStr = '<html>' + GANDA_MOOLA_MSGS[0] + nextLine;

  if (gm) {
    resultStr = GANDA_MOOLA_MSGS[GANDA_MOOLA_MSGS.length - 1] + nextLine;
    // Add nakshatra-specific message
    const gmIdx = GANDA_MOOLA_STARS.indexOf(moonStar);
    if (gmIdx >= 0 && gmIdx + 1 < GANDA_MOOLA_MSGS.length - 1) {
      resultStr += GANDA_MOOLA_MSGS[gmIdx + 1];
    }
  }

  return { [keyStr]: resultStr };
};

// ============================================================================
// DETAIL COMPOSER: _get_kalathra_results
// ============================================================================

/**
 * Format Kalathra Dosha results into a human-readable HTML string.
 * Ported from Python's _get_kalathra_results.
 *
 * @param positions - Array of PlanetPosition
 * @param keyStr - Label/key string (default: 'Kalathra Dosha')
 * @param referencePlanet - Reference planet for kalathra check (default: 'L')
 * @returns Record with the key mapping to the HTML result string
 */
export const getKalathraResults = (
  positions: PlanetPosition[],
  keyStr: string = 'Kalathra Dosha',
  referencePlanet: number | 'L' = 'L'
): Record<string, string> => {
  const nextLine = '<br><br>';

  const kpd = kalathra(positions, referencePlanet);
  let resultStr = '<html>' + KALATHRA_MSGS[0] + nextLine;

  if (kpd) {
    resultStr = '<html>' + KALATHRA_MSGS[KALATHRA_MSGS.length - 1] + nextLine;
  }

  resultStr += '</html>';
  return { [keyStr]: resultStr };
};

// ============================================================================
// DETAIL COMPOSER: _get_ghata_results
// ============================================================================

/**
 * Format Ghata Dosha results into a human-readable HTML string.
 * Ported from Python's _get_ghata_results.
 *
 * @param positions - Array of PlanetPosition
 * @param keyStr - Label/key string (default: 'Ghata Dosha')
 * @returns Record with the key mapping to the HTML result string
 */
export const getGhataResults = (
  positions: PlanetPosition[],
  keyStr: string = 'Ghata Dosha'
): Record<string, string> => {
  const nextLine = '<br><br>';

  const kpd = ghata(positions);
  let resultStr = '<html>' + GHATA_MSGS[0] + nextLine;

  if (kpd) {
    resultStr = '<html>' + GHATA_MSGS[GHATA_MSGS.length - 1] + nextLine;
    // Get Mars house relative to Lagna
    const lagnaPos = positions.find(p => p.planet === -1);
    const marsPos = positions.find(p => p.planet === MARS);
    if (lagnaPos && marsPos) {
      const marsHouse = getRelativeHouseOfPlanet(lagnaPos.rasi, marsPos.rasi);
      if (marsHouse >= 1 && marsHouse <= 12 && GHATA_MSGS[marsHouse]) {
        resultStr += GHATA_MSGS[marsHouse] + nextLine;
      }
    }
  }

  resultStr += '</html>';
  return { [keyStr]: resultStr };
};

// ============================================================================
// DETAIL COMPOSER: _get_shrapit_results
// ============================================================================

/**
 * Format Shrapit Dosha results into a human-readable HTML string.
 * Ported from Python's _get_shrapit_results.
 *
 * @param positions - Array of PlanetPosition
 * @param keyStr - Label/key string (default: 'Shrapit Dosha')
 * @returns Record with the key mapping to the HTML result string
 */
export const getShrapitResults = (
  positions: PlanetPosition[],
  keyStr: string = 'Shrapit Dosha'
): Record<string, string> => {
  const nextLine = '<br><br>';

  const kpd = shrapit(positions);
  let resultStr = '<html>' + SHRAPIT_MSGS[0] + nextLine;

  if (kpd) {
    resultStr = '<html>' + SHRAPIT_MSGS[SHRAPIT_MSGS.length - 1] + nextLine;
    // Get Saturn house relative to Lagna
    const lagnaPos = positions.find(p => p.planet === -1);
    const saturnPos = positions.find(p => p.planet === SATURN);
    if (lagnaPos && saturnPos) {
      const saturnHouse = getRelativeHouseOfPlanet(lagnaPos.rasi, saturnPos.rasi);
      if (saturnHouse >= 1 && saturnHouse <= 12 && SHRAPIT_MSGS[saturnHouse]) {
        resultStr += SHRAPIT_MSGS[saturnHouse] + nextLine;
      }
    }
  }

  resultStr += '</html>';
  return { [keyStr]: resultStr };
};

// ============================================================================
// GET DOSHA DETAILS WITH RESULTS (Top-level wrapper with formatted strings)
// ============================================================================

/**
 * Result type for all dosha checks with formatted HTML result strings.
 */
export interface DoshaDetailsWithResults extends DoshaDetails {
  /** Formatted HTML result strings keyed by dosha name */
  results: Record<string, string>;
}

/**
 * Get all dosha details with formatted HTML result strings.
 * Ported from Python's get_dosha_details which returns a dict of HTML strings.
 *
 * @param positions - Array of PlanetPosition for dosha checks
 * @param moonStar - 1-indexed nakshatra number of the Moon for ganda moola check
 * @param referencePlanet - Reference planet for manglik/kalathra (default: 'L')
 * @returns DoshaDetailsWithResults combining structured data and formatted HTML strings
 */
export const getDoshaDetailsWithResults = (
  positions: PlanetPosition[],
  moonStar: number,
  referencePlanet: number | 'L' = 'L'
): DoshaDetailsWithResults => {
  const chart = buildChartFromPositions(positions);
  const details = getDoshaDetails(chart, positions, moonStar, referencePlanet);

  const results: Record<string, string> = {};

  // Kala Sarpa
  Object.assign(results, getKalaSarpaResults(positions, 'Kala Sarpa Dosha'));

  // Manglik
  Object.assign(results, getManglikResults(positions, 'Manglik Dosha'));

  // Pitru
  Object.assign(results, getPitruResults(positions, 'Pitru Dosha'));

  // Guru Chandala
  Object.assign(results, getGuruChandalaResults(positions, 'Guru Chandala Dosha'));

  // Ganda Moola
  Object.assign(results, getGandaMoolaResults(moonStar, 'Ganda Moola Dosha'));

  // Kalathra
  Object.assign(results, getKalathraResults(positions, 'Kalathra Dosha', referencePlanet));

  // Ghata
  Object.assign(results, getGhataResults(positions, 'Ghata Dosha'));

  // Shrapit
  Object.assign(results, getShrapitResults(positions, 'Shrapit Dosha'));

  return { ...details, results };
};

// ============================================================================
// HELPER: Build chart from positions (needed by detail composers)
// ============================================================================

/**
 * Build a HouseChart (string[12]) from PlanetPosition[].
 * @param positions - Array of PlanetPosition
 * @returns HouseChart array
 */
const buildChartFromPositions = (positions: PlanetPosition[]): HouseChart => {
  const chart: string[] = Array(12).fill('');
  for (const pos of positions) {
    const key = pos.planet === -1 ? 'L' : String(pos.planet);
    if (chart[pos.rasi] === '') {
      chart[pos.rasi] = key;
    } else {
      chart[pos.rasi] += '/' + key;
    }
  }
  return chart;
};
