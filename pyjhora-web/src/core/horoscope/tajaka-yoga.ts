/**
 * Tajaka Yoga calculations
 * Port of Python jhora/horoscope/transit/tajaka_yoga.py
 *
 * Implements Ishkavala, Induvara, Ithasala, Eesarpha, Nakta, Yamaya,
 * Manahoo, Kamboola, Radda, and Duhphali Kutta yogas.
 */

import {
    type HousePlanetDict,
    type TajakaPlanetPosition,
    type AspectResult,
    getPlanetToHouseDictFromChart,
    planetsHaveAspects,
    bothPlanetsWithinTheirDeeptamsa,
    bothPlanetsApproaching,
    aspectsOfThePlanet,
    beneficAspectsOfThePlanet,
    deeptamsaRangeOfPlanet,
    ORDER_OF_PLANETS_BY_SPEED,
} from './tajaka';

// ============================================================================
// HELPERS
// ============================================================================

/** Get relative house of a planet from asc_house (1-based) */
const getRelativeHouse = (ascHouse: number, planetHouse: number): number =>
    ((planetHouse - ascHouse + 12) % 12) + 1;

/**
 * Convert planet positions array to house-planet list (12 strings).
 * Python: utils.get_house_planet_list_from_planet_positions
 */
export const getHousePlanetListFromPositions = (
    positions: TajakaPlanetPosition[]
): HousePlanetDict => {
    const hToP: string[] = Array(12).fill('');
    for (const pos of positions) {
        const [id, [rasi]] = pos;
        const label = String(id);
        if (hToP[rasi] === '') {
            hToP[rasi] = label;
        } else {
            hToP[rasi] += '/' + label;
        }
    }
    return hToP;
};

/**
 * Convert planet positions to a planet-to-house dictionary.
 * Python: utils.get_planet_house_dictionary_from_planet_positions
 */
export const getPlanetHouseDictFromPositions = (
    positions: TajakaPlanetPosition[]
): Record<string, number> => {
    const dict: Record<string, number> = {};
    for (const pos of positions) {
        const [id, [rasi]] = pos;
        dict[String(id)] = rasi;
    }
    return dict;
};

/**
 * Generate all 2-element combinations from an array.
 */
const combinations2 = <T>(arr: T[]): [T, T][] => {
    const result: [T, T][] = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            result.push([arr[i], arr[j]]);
        }
    }
    return result;
};

// ============================================================================
// ISHKAVALA YOGA
// ============================================================================

/**
 * Ishkavala Yoga: If planets occupy only kendras and panaparas
 * (1,2,4,5,7,8,10,11) and apoklimas (3,6,9,12) are empty.
 * Gives wealth, happiness and good fortune.
 *
 * @param planetToHouseDict - Map from planet/L to house index
 * @returns true if yoga is present
 */
// @parity: py=ishkavala_yoga
export const ishkavalaYoga = (
    planetToHouseDict: Record<string, number>
): boolean => {
    const ascHouse = planetToHouseDict['L'];
    const allowedHouses = new Set(
        [1, 2, 4, 5, 7, 8, 10, 11].map(h => (ascHouse + h - 1) % 12)
    );
    const planetHouses = Object.entries(planetToHouseDict)
        .filter(([k]) => k !== 'L')
        .map(([, h]) => (getRelativeHouse(ascHouse, h) - 1));
    const uniqueHouses = [...new Set(planetHouses)];
    return uniqueHouses.every(h => allowedHouses.has(h));
};

// ============================================================================
// INDUVARA YOGA
// ============================================================================

/**
 * Induvara Yoga: If planets occupy only apoklimas (3,6,9,12) and
 * kendras and panaparas are empty.
 * Gives disappointments, worries and illnesses.
 *
 * @param planetToHouseDict - Map from planet/L to house index
 * @returns true if yoga is present
 */
// @parity: py=induvara_yoga
export const induvaraYoga = (
    planetToHouseDict: Record<string, number>
): boolean => {
    const ascHouse = planetToHouseDict['L'];
    const allowedHouses = new Set(
        [3, 6, 9, 12].map(h => (ascHouse + h - 1) % 12)
    );
    const planetHouses = Object.entries(planetToHouseDict)
        .filter(([k]) => k !== 'L')
        .map(([, h]) => (getRelativeHouse(ascHouse, h) - 1));
    const uniqueHouses = [...new Set(planetHouses)];
    return uniqueHouses.every(h => allowedHouses.has(h));
};

// ============================================================================
// ITHASALA YOGA
// ============================================================================

/**
 * Ithasala Yoga: Two planets have an aspect AND the faster moving planet
 * is less advanced in its rasi than the slower moving planet, AND
 * both are within their deeptamsa.
 *
 * @returns [yogaPresent, ithasalaType] where type is 1=Varthamaana, 2=Poorna, 3=Bhavishya
 */
// @parity: py=ithasala_yoga
export const ithasalaYoga = (
    planetPositions: TajakaPlanetPosition[],
    planet1: number,
    planet2: number
): [boolean, number | null] => {
    const housePlanetDict = getHousePlanetListFromPositions(planetPositions);
    const chk1 = planetsHaveAspects(housePlanetDict, planet1, planet2);
    const [chk2, ithasalaType] = bothPlanetsWithinTheirDeeptamsa(
        planetPositions, planet1, planet2
    );
    const chk3 = bothPlanetsApproaching(planetPositions, planet1, planet2);
    return [chk1 && chk2 && chk3, ithasalaType];
};

// ============================================================================
// EESARPHA YOGA
// ============================================================================

/**
 * Eesarpha Yoga: Same as ithasala but planets are moving AWAY
 * (not approaching).
 *
 * @returns true if yoga is present
 */
// @parity: py=eesarpha_yoga
export const eesarphaYoga = (
    planetPositions: TajakaPlanetPosition[],
    planet1: number,
    planet2: number
): boolean => {
    const housePlanetDict = getHousePlanetListFromPositions(planetPositions);
    const chk1 = planetsHaveAspects(housePlanetDict, planet1, planet2);
    const [chk2] = bothPlanetsWithinTheirDeeptamsa(
        planetPositions, planet1, planet2
    );
    const chk3 = bothPlanetsApproaching(planetPositions, planet1, planet2);
    return chk1 && chk2 && !chk3;
};

// ============================================================================
// NAKTA YOGA
// ============================================================================

/** Internal check for nakta yoga between two planets via a third */
const _checkNaktaYoga1 = (
    planetPositions: TajakaPlanetPosition[],
    planet1: string | number,
    planet2: string | number
): boolean => {
    const housePlanetDict = getHousePlanetListFromPositions(planetPositions);
    const excluded = ['L', '7', '8'];
    let yp = !excluded.includes(String(planet1)) &&
             !excluded.includes(String(planet2));
    if (!yp) return false;
    yp = yp && !ithasalaYoga(planetPositions, Number(planet1), Number(planet2))[0];
    if (!yp) return false;
    yp = yp && !eesarphaYoga(planetPositions, Number(planet1), Number(planet2));
    if (!yp) return false;
    const [, ap] = aspectsOfThePlanet(housePlanetDict, Number(planet2));
    yp = yp && !ap.includes(String(planet1));
    return yp;
};

/** Internal check for nakta yoga triple */
const _checkNaktaYoga = (
    planetPositions: TajakaPlanetPosition[],
    planet: number,
    p1: string | number,
    p2: string | number
): boolean => {
    const yp1 = _checkNaktaYoga1(planetPositions, p1, p2);
    if (!yp1) return false;
    const yp2 = ithasalaYoga(planetPositions, planet, Number(p1))[0];
    const yp3 = ithasalaYoga(planetPositions, planet, Number(p2))[0];
    return yp1 && yp2 && yp3;
};

/**
 * Nakta yoga for a single planet.
 * @returns [yogaPresent, list of pair combinations]
 */
// @parity: py=nakta_yoga
export const naktaYoga = (
    planetPositions: TajakaPlanetPosition[],
    planet: number
): [boolean, [number, number][]] => {
    const housePlanetDict = getHousePlanetListFromPositions(planetPositions);
    const [, ap] = aspectsOfThePlanet(housePlanetDict, planet);
    const com = combinations2(ap);
    const com1: [number, number][] = [];
    for (const [p1, p2] of com) {
        if (_checkNaktaYoga(planetPositions, planet, p1, p2)) {
            com1.push([Number(p1), Number(p2)]);
        }
    }
    return [com1.length > 0, com1];
};

// ============================================================================
// ITHASALA / EESARPHA PLANET PAIRS
// ============================================================================

/** Get triples from ithasala pairs for nakta/yamaya analysis */
const _getNakataTriples = (
    ithasalaPairs: [number, number, number | null][]
): [number, [number, number][]][] => {
    // Group by first element
    const byFirst = new Map<number, number[]>();
    for (const [k, v] of ithasalaPairs) {
        if (!byFirst.has(k)) byFirst.set(k, []);
        byFirst.get(k)!.push(v);
    }
    const result: [number, [number, number][]][] = [];
    for (const [k, lst] of byFirst) {
        if (lst.length > 1) {
            result.push([k, combinations2(lst)]);
        }
    }

    // Group by second element
    const bySecond = new Map<number, number[]>();
    for (const [k, v] of ithasalaPairs) {
        if (!bySecond.has(v)) bySecond.set(v, []);
        bySecond.get(v)!.push(k);
    }
    for (const [k, lst] of bySecond) {
        if (lst.length > 1) {
            result.push([k, combinations2(lst)]);
        }
    }

    return result;
};

/**
 * Get all ithasala yoga planet pairs.
 * @returns Array of [planet1, planet2, ithasalaType] triples
 */
// @parity: py=get_ithasala_yoga_planet_pairs
export const getIthasalaYogaPlanetPairs = (
    planetPositions: TajakaPlanetPosition[]
): [number, number, number | null][] => {
    const pairs: [number, number, number | null][] = [];
    const range7 = [0, 1, 2, 3, 4, 5, 6];
    for (const [p1, p2] of combinations2(range7)) {
        const [iy, iyt] = ithasalaYoga(planetPositions, p1, p2);
        if (iy) {
            pairs.push([p1, p2, iyt]);
        }
    }
    return pairs;
};

/**
 * Get all eesarpha yoga planet pairs.
 * @returns Array of [planet1, planet2] pairs
 */
// @parity: py=get_eesarpha_yoga_planet_pairs
export const getEesarphaYogaPlanetPairs = (
    planetPositions: TajakaPlanetPosition[]
): [number, number][] => {
    const pairs: [number, number][] = [];
    const range7 = [0, 1, 2, 3, 4, 5, 6];
    for (const [p1, p2] of combinations2(range7)) {
        if (eesarphaYoga(planetPositions, p1, p2)) {
            pairs.push([p1, p2]);
        }
    }
    return pairs;
};

// ============================================================================
// NAKTA YOGA TRIPLES
// ============================================================================

/**
 * Get nakta yoga planet triples.
 * Nakta yoga between p2 and p3 if p1 & p2 and p1 & p3 have ithasala yoga
 * but p2 and p3 have no aspects.
 * The mediating planet must be less advanced than both others.
 */
// @parity: py=get_nakta_yoga_planet_triples
export const getNaktaYogaPlanetTriples = (
    planetPositions: TajakaPlanetPosition[]
): [number, [number, number]][] => {
    const housePlanetDict = getHousePlanetListFromPositions(planetPositions);
    const iyPairs = getIthasalaYogaPlanetPairs(planetPositions);
    const naktaTriples = _getNakataTriples(iyPairs);
    const nt: [number, [number, number]][] = [];
    for (const [planet, pList] of naktaTriples) {
        const pLong = planetPositions[planet + 1][1][1];
        for (const [p1, p2] of pList) {
            const p1Long = planetPositions[p1 + 1][1][1];
            const p2Long = planetPositions[p2 + 1][1][1];
            if (!planetsHaveAspects(housePlanetDict, p1, p2) &&
                pLong < p1Long && pLong < p2Long) {
                nt.push([planet, [p1, p2]]);
            }
        }
    }
    return nt;
};

// ============================================================================
// YAMAYA YOGA
// ============================================================================

/**
 * Check Yamaya yoga for a specific triple.
 */
// @parity: py=check_yamaya_yoga
export const checkYamayaYoga = (
    planet: number,
    planet1: number,
    planet2: number,
    planetPositions: TajakaPlanetPosition[]
): boolean => {
    const housePlanetList = getHousePlanetListFromPositions(planetPositions);

    // Step 1: planet1 and planet2 have no aspects
    const chk1 = !planetsHaveAspects(housePlanetList, planet1, planet2);
    if (!chk1) return false;

    // Step 2: planet has aspect with both planet1 and planet2
    const chk2_1 = planetsHaveAspects(housePlanetList, planet, planet1);
    const chk2_2 = planetsHaveAspects(housePlanetList, planet, planet2);
    if (!chk2_1 || !chk2_2) return false;

    // Step 3: planet forms ithasala pair with both
    const chk3_1 = ithasalaYoga(planetPositions, planet, planet1)[0];
    const chk3_2 = ithasalaYoga(planetPositions, planet, planet2)[0];
    if (!chk3_1 || !chk3_2) return false;

    // Step 4: planet has higher longitude than both
    const pLong = planetPositions[planet + 1][1][1];
    const p1Long = planetPositions[planet1 + 1][1][1];
    const p2Long = planetPositions[planet2 + 1][1][1];
    return pLong > p1Long && pLong > p2Long;
};

/**
 * Get yamaya yoga planet triples.
 * Same structure as nakta but mediating planet must be MORE advanced.
 */
// @parity: py=get_yamaya_yoga_planet_triples
export const getYamayaYogaPlanetTriples = (
    planetPositions: TajakaPlanetPosition[]
): [number, [number, number]][] => {
    const housePlanetDict = getHousePlanetListFromPositions(planetPositions);
    const iyPairs = getIthasalaYogaPlanetPairs(planetPositions);
    const yamayaTriples = _getNakataTriples(iyPairs);
    const nt: [number, [number, number]][] = [];
    for (const [planet, pList] of yamayaTriples) {
        const pLong = planetPositions[planet + 1][1][1];
        for (const [p1, p2] of pList) {
            const p1Long = planetPositions[p1 + 1][1][1];
            const p2Long = planetPositions[p2 + 1][1][1];
            if (!planetsHaveAspects(housePlanetDict, p1, p2) &&
                pLong > p1Long && pLong > p2Long) {
                nt.push([planet, [p1, p2]]);
            }
        }
    }
    return nt;
};

// ============================================================================
// MANAHOO YOGA
// ============================================================================

/**
 * Get manahoo yoga planet pairs.
 * If Mars or Saturn is in the same house as the faster planet in an ithasala pair
 * and within its deeptamsa range.
 */
// @parity: py=get_manahoo_yoga_planet_pairs
export const getManahooYogaPlanetPairs = (
    planetPositions: TajakaPlanetPosition[]
): [number, number, number][] => {
    const iyPairs = getIthasalaYogaPlanetPairs(planetPositions);
    const my: [number, number, number][] = [];
    // Mars (index 2+1=3) and Saturn (index 6+1=7) houses
    const marsOrSaturnHouses = [
        planetPositions[3 + 1][1][0],
        planetPositions[6 + 1][1][0],
    ];

    for (const [p1, p2] of iyPairs) {
        const p1Long = planetPositions[p1 + 1][1][1];
        const p2Long = planetPositions[p2 + 1][1][1];
        let fasterPlanet = p1;
        let fasterPlanetLong = p1Long;
        if (p2Long < p1Long) {
            fasterPlanet = p2;
            fasterPlanetLong = p2Long;
        }
        const fasterPlanetHouse = planetPositions[fasterPlanet + 1][1][0];
        const [dpStart, dpEnd] = deeptamsaRangeOfPlanet(fasterPlanet, fasterPlanetLong);

        if (marsOrSaturnHouses.includes(fasterPlanetHouse)) {
            const msIndex = marsOrSaturnHouses.indexOf(fasterPlanetHouse);
            const msLong = planetPositions[msIndex + 1][1][1];
            if (msLong > dpStart && msLong < dpEnd) {
                my.push([p1, p2, marsOrSaturnHouses[msIndex]]);
            }
        }
    }
    return my;
};

// ============================================================================
// KAMBOOLA YOGA
// ============================================================================

/**
 * Get kamboola yoga planet pairs.
 * Checks for ithasala pairs involving Moon (planet index 1).
 * @returns [hasKamboola, moonPairs, extendedPairs]
 */
// @parity: py=get_kamboola_yoga_planet_pairs
export const getKamboolaYogaPlanetPairs = (
    planetPositions: TajakaPlanetPosition[]
): [boolean, [number, number][], [number, number][]] => {
    const iyPairs = getIthasalaYogaPlanetPairs(planetPositions);
    const iyPairsSimple: [number, number][] = iyPairs.map(([x, y]) => [x, y]);

    // Pairs that include Moon (index 1)
    const kyPairs: [number, number][] = iyPairsSimple.filter(
        ([x, y]) => x === 1 || y === 1
    );

    // Planets paired with Moon
    const kyPlanets: number[] = [
        ...iyPairsSimple.filter(([x]) => x === 1).map(([, y]) => y),
        ...iyPairsSimple.filter(([, y]) => y === 1).map(([x]) => x),
    ];

    // Extended pairs: ithasala pairs that include any moon-paired planet
    const iyKyPairs: [number, number][] = [];
    for (const kyp of kyPlanets) {
        for (const [x, y] of iyPairsSimple) {
            if (kyp === x || kyp === y) {
                iyKyPairs.push([x, y]);
            }
        }
    }

    const kyCheck = kyPlanets.some(kyp =>
        iyPairsSimple.some(([x, y]) => kyp === x || kyp === y)
    );

    return [kyCheck, kyPairs, iyKyPairs];
};

// ============================================================================
// GAIRI KAMBOOLA / KHALLASARA (TODO)
// ============================================================================

/** Get gairi kamboola yoga planet pairs (not yet implemented). */
// @parity: py=get_gairi_kamboola_yoga_planet_pairs
export const getGairiKamboolaYogaPlanetPairs = (
    _planetPositions: TajakaPlanetPosition[]
): null => null;

/** Get khallasara yoga planet pairs (not yet implemented). */
// @parity: py=get_khallasara_yoga_planet_pairs
export const getKhallasaraYogaPlanetPairs = (
    _planetPositions: TajakaPlanetPosition[]
): null => null;

// ============================================================================
// RADDA YOGA
// ============================================================================

/** House strength constants (mirroring Python const values) */
const _NEUTRAL_SAMAM = 2;

/** House strengths of planets (per house 0-11) - Python: const.house_strengths_of_planets */
const HOUSE_STRENGTHS_OF_PLANETS: number[][] = [
    // Sun
    [3, 1, 2, 1, 4, 2, 0, 1, 2, 1, 3, 2],
    // Moon
    [3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    // Mars
    [4, 2, 2, 1, 2, 2, 0, 3, 2, 3, 2, 2],
    // Mercury
    [2, 2, 3, 2, 2, 4, 2, 2, 2, 2, 2, 2],
    // Jupiter
    [2, 2, 2, 4, 2, 2, 0, 2, 3, 2, 2, 2],
    // Venus
    [2, 4, 2, 2, 2, 2, 3, 2, 2, 2, 2, 0],
    // Saturn
    [2, 2, 2, 2, 2, 2, 3, 2, 2, 4, 0, 2],
];

/**
 * Get radda yoga planet pairs.
 * A radda yoga occurs when an ithasala pair has a planet in combustion,
 * retrograde, or debilitated.
 *
 * NOTE: This is a simplified version. The Python version uses numpy and
 * external chart functions for combustion/retrograde detection.
 * This version checks house strength weakness only.
 */
// @parity-skip: Python get_radda_yoga_planet_pairs is broken (NameError: 'charts' not imported)
export const getRaddaYogaPlanetPairs = (
    planetPositions: TajakaPlanetPosition[]
): [number, number][] => {
    const pToH = getPlanetHouseDictFromPositions(planetPositions);
    const iyPairs = getIthasalaYogaPlanetPairs(planetPositions);
    const iyPairsSimple: [number, number][] = iyPairs.map(([x, y]) => [x, y]);

    const ryPairs: [number, number][] = [];
    for (const [x, y] of iyPairsSimple) {
        const xHouse = pToH[String(x)];
        const yHouse = pToH[String(y)];
        // Check if either planet is weak (strength < NEUTRAL)
        const xWeak = x < 7 && HOUSE_STRENGTHS_OF_PLANETS[x][xHouse] < _NEUTRAL_SAMAM;
        const yWeak = y < 7 && HOUSE_STRENGTHS_OF_PLANETS[y][yHouse] < _NEUTRAL_SAMAM;
        if (xWeak || yWeak) {
            ryPairs.push([x, y]);
        }
    }
    return ryPairs;
};

// ============================================================================
// DUHPHALI KUTTA YOGA
// ============================================================================

/** Exalted strength threshold */
const _EXALTED_UCCHAM = 4;
const _FRIEND = 3;
const PANCHA_VARGEEYA_BALA_STRENGTH_THRESHOLD = 10;

/**
 * Get duhphali kutta yoga planet pairs (simplified).
 *
 * In the full Python implementation this requires pancha_vargeeya_bala
 * and combustion checks which depend on full chart calculation.
 * This is a structural port that checks house strengths.
 */
// @parity-skip: Python get_duhphali_kutta_yoga_planet_pairs is broken (NameError: 'charts' not imported)
export const getDuhphaliKuttaYogaPlanetPairs = (
    planetPositions: TajakaPlanetPosition[]
): [number, number][] => {
    const pToH = getPlanetHouseDictFromPositions(planetPositions);
    const iyPairs = getIthasalaYogaPlanetPairs(planetPositions);
    const iyPairsSimple: [number, number][] = iyPairs.map(([x, y]) => [x, y]);

    const dkyPairs: [number, number][] = [];
    for (const [x, y] of iyPairsSimple) {
        let fasterPlanet = x;
        let slowerPlanet = y;
        if (ORDER_OF_PLANETS_BY_SPEED.indexOf(x) <
            ORDER_OF_PLANETS_BY_SPEED.indexOf(y)) {
            fasterPlanet = y;
            slowerPlanet = x;
        }

        const fasterHouse = pToH[String(fasterPlanet)];
        const slowerHouse = pToH[String(slowerPlanet)];

        // Faster planet must be strong (> FRIEND)
        if (fasterPlanet >= 7) continue;
        if (HOUSE_STRENGTHS_OF_PLANETS[fasterPlanet][fasterHouse] <= _FRIEND) continue;

        // Slower planet must be weak (< EXALTED)
        if (slowerPlanet >= 7) continue;
        if (HOUSE_STRENGTHS_OF_PLANETS[slowerPlanet][slowerHouse] >= _EXALTED_UCCHAM) continue;

        dkyPairs.push([x, y]);
    }
    return dkyPairs;
};
