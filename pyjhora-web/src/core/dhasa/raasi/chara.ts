/**
 * Chara Dasha System
 * Ported from PyJHora chara.py
 *
 * chara_method = 1 => Parasara/PVN Rao Method with two cycles (default)
 * chara_method = 2 => KN Rao Single Cycle
 */

import {
    AQUARIUS,
    EVEN_FOOTED_SIGNS,
    HOUSE_OWNERS,
    HOUSE_STRENGTHS_OF_PLANETS,
    KETU,
    MARS,
    RAHU,
    RASI_NAMES_EN,
    SATURN,
    SCORPIO,
    SIDEREAL_YEAR,
    STRENGTH_DEBILITATED,
    STRENGTH_EXALTED
} from '../../constants';

import {
    getHouseOwnerFromPlanetPositions,
    getStrongerPlanetFromPositions,
    getPlanetToHouseDict
} from '../../horoscope/house';

import { getDivisionalChart, PlanetPosition } from '../../horoscope/charts';
import { getPlanetLongitude } from '../../panchanga/drik';
import { type Place } from '../../types';
import { julianDayToGregorian } from '../../utils/julian';

// ============================================================================
// CONSTANTS
// ============================================================================

const YEAR_DURATION = SIDEREAL_YEAR;

// Count Rasis inclusive
const countRasis = (fromHouse: number, toHouse: number): number => {
  return (toHouse - fromHouse + 12) % 12 + 1;
};

// ============================================================================
// DURATION FUNCTIONS
// ============================================================================

/**
 * Calculate duration of Chara Dasha for a sign (KN Rao Method)
 * Also used by Yogardha as chara component.
 */
// @parity: py=_dhasa_duration_knrao_method
export const getCharaDhasaDuration = (
  planetPositions: Array<{ planet: number; rasi: number; longitude: number }>,
  sign: number
): number => {
    const lordOfSign = getHouseOwnerFromPlanetPositions(planetPositions, sign, false);
    const pToH = getPlanetToHouseDict(planetPositions);
    const houseOfLord = pToH[lordOfSign];

    if (houseOfLord === undefined) return 12;

    let dhasaPeriod = 0;

    if (EVEN_FOOTED_SIGNS.includes(sign)) {
        dhasaPeriod = countRasis(houseOfLord, sign);
    } else {
        dhasaPeriod = countRasis(sign, houseOfLord);
    }

    dhasaPeriod -= 1;

    if (dhasaPeriod <= 0) {
        dhasaPeriod = 12;
    }

    const strength = HOUSE_STRENGTHS_OF_PLANETS[lordOfSign]?.[houseOfLord];
    if (strength === STRENGTH_EXALTED) {
        dhasaPeriod += 1;
    } else if (strength === STRENGTH_DEBILITATED) {
        dhasaPeriod -= 1;
    }

    return dhasaPeriod;
};

/**
 * Calculate duration of Chara Dasha for a sign (PVN Rao Method)
 * Python: _dhasa_duration_pvnrao_method
 *
 * Key differences from KN Rao:
 * - Special co-lordship handling for Scorpio (Mars/Ketu) and Aquarius (Saturn/Rahu)
 * - Uses const.house_owners for basic lord (no co-lordship resolution)
 * - No exalted/debilitated exceptions
 */
// @parity: py=_dhasa_duration_pvnrao_method
export const getCharaDhasaDurationPvnRao = (
    planetPositions: Array<{ planet: number; rasi: number; longitude: number }>,
    sign: number
): number => {
    const pToH = getPlanetToHouseDict(planetPositions);

    let houseOfLord: number;

    if (sign === SCORPIO) {
        // Scorpio: Mars(2)/Ketu(8) co-lords
        const marsHouse = pToH[MARS];
        const ketuHouse = pToH[KETU];
        if (marsHouse === sign && ketuHouse === sign) {
            return 12;
        } else if (marsHouse === sign && ketuHouse !== sign) {
            houseOfLord = ketuHouse ?? 0;
        } else if (ketuHouse === sign && marsHouse !== sign) {
            houseOfLord = marsHouse ?? 0;
        } else {
            const lordOfSign = getHouseOwnerFromPlanetPositions(planetPositions, sign, false);
            houseOfLord = pToH[lordOfSign] ?? 0;
        }
    } else if (sign === AQUARIUS) {
        // Aquarius: Saturn(6)/Rahu(7) co-lords
        const saturnHouse = pToH[SATURN];
        const rahuHouse = pToH[RAHU];
        if (saturnHouse === sign && rahuHouse === sign) {
            return 12;
        } else if (saturnHouse === sign && rahuHouse !== sign) {
            houseOfLord = rahuHouse ?? 0;
        } else if (rahuHouse === sign && saturnHouse !== sign) {
            houseOfLord = saturnHouse ?? 0;
        } else {
            const lordOfSign = getHouseOwnerFromPlanetPositions(planetPositions, sign, false);
            houseOfLord = pToH[lordOfSign] ?? 0;
        }
    } else {
        const lordOfSign = HOUSE_OWNERS[sign]!;
        houseOfLord = pToH[lordOfSign] ?? 0;
    }

    let dhasaPeriod: number;

    if (EVEN_FOOTED_SIGNS.includes(sign)) {
        // Counting backward
        if (houseOfLord < sign) {
            dhasaPeriod = sign + 1 - houseOfLord;
        } else {
            dhasaPeriod = sign + 13 - houseOfLord;
        }
    } else {
        // Counting forward
        if (houseOfLord < sign) {
            dhasaPeriod = houseOfLord + 13 - sign;
        } else {
            dhasaPeriod = houseOfLord + 1 - sign;
        }
    }

    dhasaPeriod -= 1;

    if (dhasaPeriod <= 0) {
        dhasaPeriod = 12;
        // No exalted/debilitated exceptions for PVN Rao
    }

    return dhasaPeriod;
};

// ============================================================================
// PROGRESSION FUNCTIONS
// ============================================================================

/**
 * KN Rao progression: from ascendant, direction based on 9th house footedness
 */
// @parity: py=_dhasa_progression_knrao_method
export const getCharaDhasaProgression = (ascendantRasi: number): number[] => {
    const seedHouse = ascendantRasi;
    const ninthHouse = (seedHouse + 8) % 12;

    if (EVEN_FOOTED_SIGNS.includes(ninthHouse)) {
        return Array.from({ length: 12 }, (_, h) => (seedHouse + 12 - h) % 12);
    } else {
        return Array.from({ length: 12 }, (_, h) => (seedHouse + h) % 12);
    }
};

/**
 * PVN Rao progression (Python default):
 * Takes Sun, Moon, Asc houses - finds strongest lord among them.
 * Seed = house of strongest lord. Direction based on 9th house footedness.
 */
function getPvnRaoProgression(
    planetPositions: Array<{ planet: number; rasi: number; longitude: number }>
): number[] {
    // Sun=0, Moon=1 in planet indices; Asc uses planetPositions[0] (Sun as proxy)
    const sunHouse = planetPositions.find(p => p.planet === 0)?.rasi ?? 0;
    const ascHouse = sunHouse; // Using Sun as Lagna proxy
    const moonHouse = planetPositions.find(p => p.planet === 1)?.rasi ?? 0;

    const sunHouseLord = getHouseOwnerFromPlanetPositions(planetPositions, sunHouse, false);
    const ascHouseLord = getHouseOwnerFromPlanetPositions(planetPositions, ascHouse, false);
    const moonHouseLord = getHouseOwnerFromPlanetPositions(planetPositions, moonHouse, false);

    // Find strongest lord among asc, sun, moon house lords
    const sh = getStrongerPlanetFromPositions(planetPositions, sunHouseLord, ascHouseLord);
    let seedHouse = sh === ascHouseLord ? ascHouse : sunHouse;

    const strongerLord = getStrongerPlanetFromPositions(planetPositions, sh, moonHouseLord);
    if (moonHouseLord === strongerLord) {
        seedHouse = moonHouse;
    }

    const ninthHouse = (seedHouse + 8) % 12;
    if (EVEN_FOOTED_SIGNS.includes(ninthHouse)) {
        return Array.from({ length: 12 }, (_, h) => (seedHouse + 12 - h) % 12);
    } else {
        return Array.from({ length: 12 }, (_, h) => (seedHouse + h) % 12);
    }
}

/**
 * Antardhasa: rotate dasha progression list by 1 (KN Rao method)
 * Python: _antardhasas = dhasas[1:]+[dhasas[0]]
 */
// @parity: py=_antardhasa
export function getCharaAntardhasa(dhasaProgression: number[]): number[] {
    if (dhasaProgression.length <= 1) return [...dhasaProgression];
    return [...dhasaProgression.slice(1), dhasaProgression[0]!];
}

// ============================================================================
// HELPERS
// ============================================================================

function getPositions(jd: number, place: Place, divFactor: number = 1): PlanetPosition[] {
    const d1: PlanetPosition[] = [];
    for (let i = 0; i <= 8; i++) {
        const l = getPlanetLongitude(jd, place, i);
        d1.push({ planet: i, rasi: Math.floor(l / 30), longitude: l % 30 });
    }
    if (divFactor > 1) return getDivisionalChart(d1, divFactor);
    return d1;
}

function formatJdAsDate(jd: number): string {
    const { date, time } = julianDayToGregorian(jd);
    const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
    const hour12 = time.hour % 12 || 12;
    const ampm = time.hour < 12 ? 'AM' : 'PM';
    const yearStr = date.year < 0 ? `${Math.abs(date.year)} BC` : date.year.toString();
    return `${yearStr}-${pad(date.month)}-${pad(date.day)} ${pad(hour12)}:${pad(time.minute)}:${pad(time.second)} ${ampm}`;
}

// Keep legacy function for backward compatibility
export const calculateCharaDasha = (
    planetPositions: Array<{ planet: number; rasi: number; longitude: number }>,
    ascendantRasi: number,
    dob: Date
): Array<{ sign: number; start: Date; end: Date; duration: number }> => {
    const progression = getCharaDhasaProgression(ascendantRasi);
    const periods: Array<{ sign: number; start: Date; end: Date; duration: number }> = [];

    let currentStart = new Date(dob);

    for (const sign of progression) {
        const duration = getCharaDhasaDuration(planetPositions, sign);
        const end = new Date(currentStart);
        end.setFullYear(end.getFullYear() + duration);

        periods.push({
            sign,
            start: new Date(currentStart),
            end: new Date(end),
            duration
        });

        currentStart = end;
    }

    return periods;
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Get Chara Dasha periods (PVN Rao method by default, matching Python)
 *
 * chara_method=1 (default): PVN Rao progression, KN Rao duration, 2 cycles
 * chara_method=2: KN Rao single cycle
 */
// @parity: py=get_dhasa_antardhasa
export function getCharaDashaBhukti(
    jd: number,
    place: Place,
    options: {
        divisionalChartFactor?: number;
        includeBhuktis?: boolean;
        charaMethod?: number;
    } = {}
): { mahadashas: any[]; bhuktis?: any[] } {
    const {
        divisionalChartFactor = 1,
        includeBhuktis = true,
        charaMethod = 1
    } = options;

    const positions = getPositions(jd, place, divisionalChartFactor);

    // PVN Rao progression is always used (matching Python line 235)
    const dhasaProgression = getPvnRaoProgression(positions);

    const dhasaCycles = charaMethod === 2 ? 1 : 2;

    const mahadashas: any[] = [];
    const bhuktis: any[] = [];
    let startJd = jd;
    const firstCycleDurations: number[] = [];

    for (let dc = 0; dc < dhasaCycles; dc++) {
        for (let i = 0; i < dhasaProgression.length; i++) {
            const lord = dhasaProgression[i]!;

            let dd: number;
            if (dc === 0) {
                // charaMethod=1: KN Rao duration, charaMethod=2: PVN Rao duration
                dd = charaMethod === 1
                    ? getCharaDhasaDuration(positions, lord)
                    : getCharaDhasaDurationPvnRao(positions, lord);
                firstCycleDurations.push(dd);
            } else {
                // Second cycle: 12 - first cycle duration
                dd = 12.0 - (firstCycleDurations[i] ?? 0);
            }

            const rasiName = RASI_NAMES_EN[lord] ?? `Rasi ${lord}`;
            mahadashas.push({
                rasi: lord,
                rasiName,
                startJd,
                startDate: formatJdAsDate(startJd),
                durationYears: dd
            });

            if (includeBhuktis) {
                const bhuktiLords = getCharaAntardhasa(dhasaProgression);
                const ddb = dd / 12;
                let bhuktiStartJd = startJd;

                for (const bhukthi of bhuktiLords) {
                    bhuktis.push({
                        dashaRasi: lord,
                        bhuktiRasi: bhukthi,
                        bhuktiRasiName: RASI_NAMES_EN[bhukthi] ?? `Rasi ${bhukthi}`,
                        startJd: bhuktiStartJd,
                        startDate: formatJdAsDate(bhuktiStartJd),
                        durationYears: ddb
                    });
                    bhuktiStartJd += ddb * YEAR_DURATION;
                }
            }

            startJd += dd * YEAR_DURATION;
        }
    }

    return includeBhuktis ? { mahadashas, bhuktis } : { mahadashas };
}
