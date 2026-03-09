/**
 * Tajaka (Annual/Monthly/Sixty-hour) transit calculations
 * Port of Python jhora/horoscope/transit/tajaka.py
 *
 * Calculates Tajaka aspects (trinal, sextile, square, opposition, conjunction),
 * muntha house, and deeptamsa/approaching checks for ithasala yogas.
 */

import { SIDEREAL_YEAR } from '../constants';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Year value used for Tajaka calculations */
export const YEAR_VALUE = SIDEREAL_YEAR;

/** Order of planets by speed: Saturn slowest, Moon fastest */
export const ORDER_OF_PLANETS_BY_SPEED = [6, 7, 8, 4, 2, 0, 5, 3, 1];

/** Deeptamsa of planets: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn */
export const DEEPTAMSA_OF_PLANETS = [15, 12, 8, 7, 9, 7, 9];

// ============================================================================
// TYPES
// ============================================================================

/**
 * House-planet chart: array of 12 strings where each string contains
 * planet IDs separated by '/', e.g. ['0', '1/5', '', 'L/3', ...]
 * Index 0 = Aries, Index 11 = Pisces.
 */
export type HousePlanetDict = string[];

/**
 * Planet position entry for tajaka calculations.
 * Index 0 is Lagna ('L'), index 1+ are planets (planet index + 1).
 * Each entry: [identifier, [rasi, longitude_within_rasi]]
 */
export type TajakaPlanetPosition = [string | number, [number, number]];

/** Result of aspect calculations: [aspected houses, aspected planets] */
export type AspectResult = [number[], string[]];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert house-planet chart to planet-to-house dictionary.
 * Python: utils.get_planet_to_house_dict_from_chart
 */
export const getPlanetToHouseDictFromChart = (
    chart: HousePlanetDict
): Record<string, number> => {
    const result: Record<string, number> = {};
    for (let h = 0; h < 12; h++) {
        if (chart[h] === '') continue;
        const planets = chart[h].split('/');
        for (const p of planets) {
            if (p.trim() !== '') {
                result[p.trim()] = h;
            }
        }
    }
    return result;
};

/**
 * Extract aspected planets from houses in the chart.
 */
const getAspectedPlanetsFromHouses = (
    housePlanetDict: HousePlanetDict,
    aspectedHouses: number[]
): string[] => {
    const aspectedPlanets: string[] = [];
    for (const h of aspectedHouses) {
        if (housePlanetDict[h] != null && housePlanetDict[h] !== '') {
            const parts = housePlanetDict[h].split('/');
            for (const p of parts) {
                if (p.trim() !== '') {
                    aspectedPlanets.push(p.trim());
                }
            }
        }
    }
    return aspectedPlanets;
};

/**
 * Get the deeptamsa range for a planet at a given longitude within rasi.
 * Python: utils.deeptaamsa_range_of_planet
 */
export const deeptamsaRangeOfPlanet = (
    planet: number,
    planetLongitudeWithinRasi: number
): [number, number] => {
    const d = DEEPTAMSA_OF_PLANETS[planet] ?? 0;
    return [
        planetLongitudeWithinRasi - d,
        planetLongitudeWithinRasi + d,
    ];
};

// ============================================================================
// KENDRA / PANAPARA / APOKLIMA
// ============================================================================

/** Kendras (1st, 4th, 7th, 10th from ascendant house) */
export const kendras = (ascHouse: number): number[] =>
    [1, 4, 7, 10].map(h => (ascHouse + h - 1) % 12);

/** Panaparas (2nd, 5th, 8th, 11th from ascendant house) */
export const panaparas = (ascHouse: number): number[] =>
    [2, 5, 8, 11].map(h => (ascHouse + h - 1) % 12);

/** Apoklimas (3rd, 6th, 9th, 12th from ascendant house) */
export const apoklimas = (ascHouse: number): number[] =>
    [3, 6, 9, 12].map(h => (ascHouse + h - 1) % 12);

// ============================================================================
// MUNTHA HOUSE
// ============================================================================

/**
 * Muntha house at x years after birth is xth house from Lagna.
 * For example at 51st year, 50th house (i.e. 4x12+2 = 2nd house) from lagna.
 */
export const munthaHouse = (ascendantHouse: number, years: number): number =>
    (ascendantHouse + years) % 12;

// ============================================================================
// TAJAKA ASPECTS OF RAASI
// ============================================================================

/**
 * Trinal aspects of the raasi (5th and 9th houses from raasi).
 * Strong benefic aspect.
 */
export const trinalAspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const aspectedHouses = [(raasi + 5 - 1) % 12, (raasi + 9 - 1) % 12];
    const aspectedPlanets = getAspectedPlanetsFromHouses(housePlanetDict, aspectedHouses);
    return [aspectedHouses, aspectedPlanets];
};

/**
 * Trinal aspects of the planet (strong benefic aspect).
 */
export const trinalAspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const pToH = getPlanetToHouseDictFromChart(housePlanetDict);
    const planetHouse = pToH[String(planet)];
    if (planetHouse == null) return [[], []];
    return trinalAspectsOfTheRaasi(housePlanetDict, planetHouse);
};

/**
 * Sextile aspects of the raasi (3rd and 11th houses from raasi).
 * Weak benefic aspect.
 */
export const sextileAspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const aspectedHouses = [(raasi + 3 - 1) % 12, (raasi + 11 - 1) % 12];
    const aspectedPlanets = getAspectedPlanetsFromHouses(housePlanetDict, aspectedHouses);
    return [aspectedHouses, aspectedPlanets];
};

/**
 * Sextile aspects of the planet (weak benefic aspect).
 */
export const sextileAspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const pToH = getPlanetToHouseDictFromChart(housePlanetDict);
    const planetHouse = pToH[String(planet)];
    if (planetHouse == null) return [[], []];
    return sextileAspectsOfTheRaasi(housePlanetDict, planetHouse);
};

/**
 * Square aspects of the raasi (4th and 10th houses from raasi).
 * Weak malefic aspect.
 */
export const squareAspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const aspectedHouses = [(raasi + 4 - 1) % 12, (raasi + 10 - 1) % 12];
    const aspectedPlanets = getAspectedPlanetsFromHouses(housePlanetDict, aspectedHouses);
    return [aspectedHouses, aspectedPlanets];
};

/**
 * Square aspects of the planet (weak malefic aspect).
 */
export const squareAspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const pToH = getPlanetToHouseDictFromChart(housePlanetDict);
    const planetHouse = pToH[String(planet)];
    if (planetHouse == null) return [[], []];
    return squareAspectsOfTheRaasi(housePlanetDict, planetHouse);
};

// ============================================================================
// BENEFIC ASPECTS
// ============================================================================

/**
 * Benefic aspects of the raasi = trinal + sextile aspects.
 */
export const beneficAspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const [trH, trP] = trinalAspectsOfTheRaasi(housePlanetDict, raasi);
    const [sxH, sxP] = sextileAspectsOfTheRaasi(housePlanetDict, raasi);
    return [trH.concat(sxH), trP.concat(sxP)];
};

/**
 * Benefic aspects of the planet = trinal + sextile aspects.
 */
export const beneficAspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const [trH, trP] = trinalAspectsOfThePlanet(housePlanetDict, planet);
    const [sxH, sxP] = sextileAspectsOfThePlanet(housePlanetDict, planet);
    return [trH.concat(sxH), trP.concat(sxP)];
};

/**
 * Return true if planet has benefic aspect on the given house.
 */
export const planetHasBeneficAspectOnHouse = (
    housePlanetDict: HousePlanetDict,
    planet: string | number,
    house: number
): boolean => {
    const [bh] = beneficAspectsOfThePlanet(housePlanetDict, planet);
    return bh.includes(house);
};

// ============================================================================
// SEMI-SEXTILE / NEUTRAL ASPECTS
// ============================================================================

/**
 * Semi-sextile aspects of the raasi (2nd and 12th houses from raasi).
 */
export const semiSextileAspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const aspectedHouses = [(raasi + 2 - 1) % 12, (raasi + 12 - 1) % 12];
    const aspectedPlanets = getAspectedPlanetsFromHouses(housePlanetDict, aspectedHouses);
    return [aspectedHouses, aspectedPlanets];
};

/**
 * Semi-sextile aspects of the planet (neutral aspect).
 */
export const semiSextileAspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const pToH = getPlanetToHouseDictFromChart(housePlanetDict);
    const planetHouse = pToH[String(planet)];
    if (planetHouse == null) return [[], []];
    return semiSextileAspectsOfTheRaasi(housePlanetDict, planetHouse);
};

/**
 * Neutral aspects of the raasi (same as semi-sextile).
 */
export const neutralAspectsOfTheRaasi = semiSextileAspectsOfTheRaasi;

/**
 * Neutral aspects of the planet (same as semi-sextile).
 */
export const neutralAspectsOfThePlanet = semiSextileAspectsOfThePlanet;

// ============================================================================
// OPPOSITION ASPECTS
// ============================================================================

/**
 * Opposition aspects of the raasi (7th house from raasi).
 * Strong malefic aspect.
 */
export const oppositionAspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const aspectedHouses = [(raasi + 7 - 1) % 12];
    const aspectedPlanets = getAspectedPlanetsFromHouses(housePlanetDict, aspectedHouses);
    return [aspectedHouses, aspectedPlanets];
};

/**
 * Opposition aspects of the planet (strong malefic aspect).
 */
export const oppositionAspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const pToH = getPlanetToHouseDictFromChart(housePlanetDict);
    const planetHouse = pToH[String(planet)];
    if (planetHouse == null) return [[], []];
    return oppositionAspectsOfTheRaasi(housePlanetDict, planetHouse);
};

// ============================================================================
// CONJUNCTION ASPECTS
// ============================================================================

/**
 * Conjunction aspects of the raasi (same house, excluding the planet itself).
 */
export const conjunctionAspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const pToH = getPlanetToHouseDictFromChart(housePlanetDict);
    // Find the first planet in this raasi
    const planet = Object.keys(pToH).find(k => pToH[k] === raasi) ?? '';
    const aspectedHouses = [raasi];
    const aspectedPlanets: string[] = [];
    if (housePlanetDict[raasi] !== '') {
        const parts = housePlanetDict[raasi].replace(String(planet), '').split('/');
        for (const p of parts) {
            if (p.trim() !== '') {
                aspectedPlanets.push(p.trim());
            }
        }
    }
    return [aspectedHouses, aspectedPlanets];
};

/**
 * Conjunction aspects of the planet (same house, strong malefic aspect).
 */
export const conjunctionAspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const pToH = getPlanetToHouseDictFromChart(housePlanetDict);
    const planetHouse = pToH[String(planet)];
    if (planetHouse == null) return [[], []];
    // Same logic but exclude this specific planet
    const aspectedHouses = [planetHouse];
    const aspectedPlanets: string[] = [];
    if (housePlanetDict[planetHouse] !== '') {
        const parts = housePlanetDict[planetHouse]
            .replace(String(planet), '')
            .split('/');
        for (const p of parts) {
            if (p.trim() !== '') {
                aspectedPlanets.push(p.trim());
            }
        }
    }
    return [aspectedHouses, aspectedPlanets];
};

// ============================================================================
// MALEFIC ASPECTS
// ============================================================================

/**
 * Malefic aspects of the raasi = square + conjunction + opposition.
 */
export const maleficAspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const [sqH, sqP] = squareAspectsOfTheRaasi(housePlanetDict, raasi);
    const [coH, coP] = conjunctionAspectsOfTheRaasi(housePlanetDict, raasi);
    const [opH, opP] = oppositionAspectsOfTheRaasi(housePlanetDict, raasi);
    return [
        sqH.concat(coH, opH),
        sqP.concat(coP, opP),
    ];
};

/**
 * Malefic aspects of the planet = square + conjunction + opposition.
 */
export const maleficAspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const [sqH, sqP] = squareAspectsOfThePlanet(housePlanetDict, planet);
    const [coH, coP] = conjunctionAspectsOfThePlanet(housePlanetDict, planet);
    const [opH, opP] = oppositionAspectsOfThePlanet(housePlanetDict, planet);
    return [
        sqH.concat(coH, opH),
        sqP.concat(coP, opP),
    ];
};

/**
 * Return true if planet has malefic aspect on the given house.
 */
export const planetHasMaleficAspectOnHouse = (
    housePlanetDict: HousePlanetDict,
    planet: string | number,
    house: number
): boolean => {
    const [bh] = maleficAspectsOfThePlanet(housePlanetDict, planet);
    return bh.includes(house);
};

// ============================================================================
// COMBINED ASPECT CHECKS
// ============================================================================

/**
 * Return true if planet1 and planet2 have benefic aspects on each other.
 */
export const planetsHaveBeneficAspects = (
    housePlanetDict: HousePlanetDict,
    planet1: number,
    planet2: number
): boolean => {
    return beneficAspectsOfThePlanet(housePlanetDict, planet1)[1]
        .includes(String(planet2));
};

/**
 * Return true if planet1 and planet2 have malefic aspects on each other.
 */
export const planetsHaveMaleficAspects = (
    housePlanetDict: HousePlanetDict,
    planet1: number,
    planet2: number
): boolean => {
    return maleficAspectsOfThePlanet(housePlanetDict, planet1)[1]
        .includes(String(planet2));
};

/**
 * Return true if planet1 and planet2 have neutral aspects on each other.
 */
export const planetsHaveNeutralAspects = (
    housePlanetDict: HousePlanetDict,
    planet1: number,
    planet2: number
): boolean => {
    return neutralAspectsOfThePlanet(housePlanetDict, planet1)[1]
        .includes(String(planet2));
};

/**
 * Return true if planet1 and planet2 have ANY aspect on each other.
 */
export const planetsHaveAspects = (
    housePlanetDict: HousePlanetDict,
    planet1: number,
    planet2: number
): boolean => {
    const chk1 = planetsHaveBeneficAspects(housePlanetDict, planet1, planet2);
    const chk2 = planetsHaveMaleficAspects(housePlanetDict, planet1, planet2);
    const chk3 = planetsHaveNeutralAspects(housePlanetDict, planet1, planet2);
    return chk1 || chk2 || chk3;
};

/**
 * Get all aspect pairs from a chart. Returns map of planet -> list of aspected planets.
 */
export const planetAspectsFromChart = (
    chart: HousePlanetDict
): Record<number, number[]> => {
    const planetAspects: Record<number, number[]> = {};
    for (let k = 0; k < 9; k++) {
        planetAspects[k] = [];
    }
    for (let planet1 = 0; planet1 < 9; planet1++) {
        for (let planet2 = 0; planet2 < 9; planet2++) {
            if (planetsHaveAspects(chart, planet1, planet2)) {
                planetAspects[planet1].push(planet2);
            }
        }
    }
    return planetAspects;
};

// ============================================================================
// ALL ASPECTS
// ============================================================================

/**
 * Return all (benefic, malefic, neutral) aspected houses and planets of the raasi.
 */
export const aspectsOfTheRaasi = (
    housePlanetDict: HousePlanetDict,
    raasi: number
): AspectResult => {
    const [baH, baP] = beneficAspectsOfTheRaasi(housePlanetDict, raasi);
    const [maH, maP] = maleficAspectsOfTheRaasi(housePlanetDict, raasi);
    const [naH, naP] = neutralAspectsOfTheRaasi(housePlanetDict, raasi);
    return [
        baH.concat(maH, naH),
        baP.concat(maP, naP),
    ];
};

/**
 * Return all (benefic, malefic, neutral) aspected houses and planets of the planet.
 */
export const aspectsOfThePlanet = (
    housePlanetDict: HousePlanetDict,
    planet: string | number
): AspectResult => {
    const [baH, baP] = beneficAspectsOfThePlanet(housePlanetDict, planet);
    const [maH, maP] = maleficAspectsOfThePlanet(housePlanetDict, planet);
    const [naH, naP] = neutralAspectsOfThePlanet(housePlanetDict, planet);
    return [
        baH.concat(maH, naH),
        baP.concat(maP, naP),
    ];
};

// ============================================================================
// DEEPTAMSA & APPROACHING CHECKS
// ============================================================================

/**
 * Check if two planets are within their deeptamsa.
 * @returns [isWithin, ithasalaType] where ithasalaType:
 *   1 = Varthamaana ithasala
 *   2 = Poorna ithasala
 *   3 = Bhavishya ithasala
 */
export const bothPlanetsWithinTheirDeeptamsa = (
    planetPositions: TajakaPlanetPosition[],
    planet1: number,
    planet2: number
): [boolean, number | null] => {
    const planet1Long = planetPositions[planet1 + 1][1][1];
    const planet2Long = planetPositions[planet2 + 1][1][1];
    let ithasalaType: number | null = null;

    const [p1Start, p1End] = deeptamsaRangeOfPlanet(planet1, planet1Long);
    const [p2Start, p2End] = deeptamsaRangeOfPlanet(planet2, planet2Long);

    // Check if planet1 is within planet2's deeptamsa range
    let chk1 = planet1Long >= p2Start && planet1Long <= p2End;
    let chk1_1 = false;
    if (!chk1) {
        // Check for bhavishya ithasala
        chk1_1 = Math.abs(planet1Long - p2Start) <= 1.0 ||
                 Math.abs(planet1Long - p2End) <= 1.0;
    }

    // Check if planet2 is within planet1's deeptamsa range
    let chk2 = planet2Long >= p1Start && planet2Long <= p1End;
    let chk2_1 = false;
    if (!chk2) {
        // Check for bhavishya ithasala
        chk2_1 = Math.abs(planet2Long - p1Start) <= 1.0 ||
                 Math.abs(planet2Long - p1End) <= 1.0;
    }

    let ithasala = chk1 && chk2;
    if (ithasala) {
        ithasalaType = 1; // Varthamaana
    } else if ((chk1 && chk2_1) || (chk2 && chk1_1)) {
        ithasalaType = 3; // Bhavishya
        ithasala = true;
    }

    if (Math.abs(planet1Long - planet2Long) <= 1.0) {
        ithasalaType = 2; // Poorna ithasala
    }

    return [ithasala, ithasalaType];
};

/**
 * Check if two planets are approaching each other.
 * The faster planet should be less advanced (lower longitude in rasi).
 */
export const bothPlanetsApproaching = (
    planetPositions: TajakaPlanetPosition[],
    planet1: number,
    planet2: number
): boolean => {
    const planet1Long = planetPositions[planet1 + 1][1][1];
    const planet2Long = planetPositions[planet2 + 1][1][1];

    // Determine which planet is faster by speed order
    let fasterPlanet = planet1;
    if (ORDER_OF_PLANETS_BY_SPEED.indexOf(planet1) <
        ORDER_OF_PLANETS_BY_SPEED.indexOf(planet2)) {
        fasterPlanet = planet2;
    }

    // Determine which planet is more advanced (higher longitude within rasi)
    let advancedPlanet = planet1;
    if (planet1Long < planet2Long) {
        advancedPlanet = planet2;
    }

    // Approaching if: faster planet is less advanced than the other
    const chk3_1 = (advancedPlanet === planet2) && (fasterPlanet === planet1);
    const chk3_2 = (advancedPlanet === planet1) && (fasterPlanet === planet2);
    return chk3_1 || chk3_2;
};
