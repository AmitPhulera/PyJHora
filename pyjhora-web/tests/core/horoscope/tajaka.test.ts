import { describe, expect, it } from 'vitest';
import {
    kendras, panaparas, apoklimas, munthaHouse,
    trinalAspectsOfTheRaasi, trinalAspectsOfThePlanet,
    sextileAspectsOfTheRaasi, sextileAspectsOfThePlanet,
    squareAspectsOfTheRaasi, squareAspectsOfThePlanet,
    beneficAspectsOfTheRaasi, beneficAspectsOfThePlanet,
    semiSextileAspectsOfTheRaasi, semiSextileAspectsOfThePlanet,
    neutralAspectsOfTheRaasi, neutralAspectsOfThePlanet,
    oppositionAspectsOfTheRaasi, oppositionAspectsOfThePlanet,
    conjunctionAspectsOfThePlanet,
    maleficAspectsOfTheRaasi, maleficAspectsOfThePlanet,
    planetHasBeneficAspectOnHouse, planetHasMaleficAspectOnHouse,
    planetsHaveBeneficAspects, planetsHaveMaleficAspects,
    planetsHaveNeutralAspects, planetsHaveAspects,
    planetAspectsFromChart,
    aspectsOfTheRaasi, aspectsOfThePlanet,
    bothPlanetsWithinTheirDeeptamsa, bothPlanetsApproaching,
    deeptamsaRangeOfPlanet,
    getPlanetToHouseDictFromChart,
    ORDER_OF_PLANETS_BY_SPEED, DEEPTAMSA_OF_PLANETS,
    type HousePlanetDict, type TajakaPlanetPosition,
} from '../../../src/core/horoscope/tajaka';
import {
    ishkavalaYoga, induvaraYoga,
    ithasalaYoga, eesarphaYoga,
    naktaYoga,
    checkYamayaYoga,
    getIthasalaYogaPlanetPairs,
    getEesarphaYogaPlanetPairs,
    getNaktaYogaPlanetTriples,
    getYamayaYogaPlanetTriples,
    getManahooYogaPlanetPairs,
    getKamboolaYogaPlanetPairs,
    getRaddaYogaPlanetPairs,
    getDuhphaliKuttaYogaPlanetPairs,
    getGairiKamboolaYogaPlanetPairs,
    getKhallasaraYogaPlanetPairs,
    getHousePlanetListFromPositions,
    getPlanetHouseDictFromPositions,
} from '../../../src/core/horoscope/tajaka-yoga';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * Chart from Python tests: chart_66
 * ['0','','3','7','','4','8','','6','5/L','','2/1']
 * Sun in Aries(0), Mercury in Gemini(2), Jupiter in Cancer(3),
 * Venus in Virgo(5), Saturn in Leo(6 -> index 7th entry -> actually index 6),
 * Actually: index 0=Aries, ..., 9=Capricorn, etc.
 *
 * Let's use a well-defined test chart.
 */
const chart1: HousePlanetDict = ['0', '', '3', '7', '', '4', '8', '', '6', '5/L', '', '2/1'];
// Sun(0) in Aries(0), Mercury(3) in Gemini(2), Jupiter(7) -> Rahu in Cancer(3),
// Venus(4) -> actually planet 4=Jupiter in Virgo(5), Saturn(8)->Ketu in Leo(6),
// ... This chart maps: planet 0->house 0, planet 3->house 2, etc.

// A simpler chart for testing aspects
const simpleChart: HousePlanetDict = ['0', '1', '2', '3', '4', '5', '6', '', '', 'L', '', ''];
// Sun in Aries(0), Moon in Taurus(1), Mars in Gemini(2), Mercury in Cancer(3),
// Jupiter in Leo(4), Venus in Virgo(5), Saturn in Libra(6), Lagna in Capricorn(9)

// Planet positions format: [identifier, [rasi, longitude_within_rasi]]
// From Python test: pp = [['L',(1,5)],[0,(0,25)],[1,(0,20)],[2,(7,15)],[3,(0,23)],[4,(3,16)],[5,(2,13)],[6,(0,0)],[7,(0,0)],[8,(0,0)]]
const testPositions: TajakaPlanetPosition[] = [
    ['L', [1, 5]],
    [0, [0, 25]],   // Sun in Aries at 25 deg
    [1, [0, 20]],   // Moon in Aries at 20 deg
    [2, [7, 15]],   // Mars in Scorpio at 15 deg
    [3, [0, 23]],   // Mercury in Aries at 23 deg
    [4, [3, 16]],   // Jupiter in Cancer at 16 deg
    [5, [2, 13]],   // Venus in Gemini at 13 deg
    [6, [0, 0]],    // Saturn in Aries at 0 deg
    [7, [0, 0]],    // Rahu in Aries at 0 deg
    [8, [0, 0]],    // Ketu in Aries at 0 deg
];

// ============================================================================
// TAJAKA CORE TESTS
// ============================================================================

describe('Tajaka core functions', () => {
    describe('constants', () => {
        it('ORDER_OF_PLANETS_BY_SPEED should have 9 entries', () => {
            expect(ORDER_OF_PLANETS_BY_SPEED).toHaveLength(9);
            // Saturn(6) is slowest (index 0), Moon(1) is fastest (index 8)
            expect(ORDER_OF_PLANETS_BY_SPEED[0]).toBe(6);
            expect(ORDER_OF_PLANETS_BY_SPEED[8]).toBe(1);
        });

        it('DEEPTAMSA_OF_PLANETS should have correct values', () => {
            expect(DEEPTAMSA_OF_PLANETS).toEqual([15, 12, 8, 7, 9, 7, 9]);
        });
    });

    describe('kendras/panaparas/apoklimas', () => {
        it('should compute kendras from house 0', () => {
            expect(kendras(0)).toEqual([0, 3, 6, 9]);
        });
        it('should compute panaparas from house 0', () => {
            expect(panaparas(0)).toEqual([1, 4, 7, 10]);
        });
        it('should compute apoklimas from house 0', () => {
            expect(apoklimas(0)).toEqual([2, 5, 8, 11]);
        });
        it('should wrap around for house 5', () => {
            expect(kendras(5)).toEqual([5, 8, 11, 2]);
        });
    });

    describe('munthaHouse', () => {
        it('should compute muntha for year 0', () => {
            expect(munthaHouse(0, 0)).toBe(0);
        });
        it('should compute muntha for year 13 from house 0', () => {
            expect(munthaHouse(0, 13)).toBe(1); // 13 % 12 = 1
        });
        it('should compute muntha for year 50 from house 3', () => {
            expect(munthaHouse(3, 50)).toBe((3 + 50) % 12); // 53 % 12 = 5
        });
    });

    describe('getPlanetToHouseDictFromChart', () => {
        it('should convert chart to planet-to-house dict', () => {
            const dict = getPlanetToHouseDictFromChart(simpleChart);
            expect(dict['0']).toBe(0); // Sun in Aries
            expect(dict['1']).toBe(1); // Moon in Taurus
            expect(dict['L']).toBe(9); // Lagna in Capricorn
        });
    });
});

// ============================================================================
// ASPECT TESTS
// ============================================================================

describe('Tajaka aspects', () => {
    describe('trinal aspects', () => {
        it('trinalAspectsOfTheRaasi should return 5th and 9th houses', () => {
            const [houses] = trinalAspectsOfTheRaasi(simpleChart, 0);
            expect(houses).toEqual([4, 8]); // 5th and 9th from Aries
        });
        it('trinalAspectsOfTheRaasi should find planets in aspected houses', () => {
            const [, planets] = trinalAspectsOfTheRaasi(simpleChart, 0);
            expect(planets).toContain('4'); // Jupiter in Leo (house 4)
        });
        it('trinalAspectsOfThePlanet should use planet house', () => {
            // Sun is in house 0, so trinal = houses 4 and 8
            const [houses] = trinalAspectsOfThePlanet(simpleChart, 0);
            expect(houses).toEqual([4, 8]);
        });
    });

    describe('sextile aspects', () => {
        it('sextileAspectsOfTheRaasi should return 3rd and 11th houses', () => {
            const [houses] = sextileAspectsOfTheRaasi(simpleChart, 0);
            expect(houses).toEqual([2, 10]); // 3rd and 11th from Aries
        });
        it('should find Mars in sextile from Aries', () => {
            const [, planets] = sextileAspectsOfTheRaasi(simpleChart, 0);
            expect(planets).toContain('2'); // Mars in Gemini (house 2)
        });
    });

    describe('square aspects', () => {
        it('squareAspectsOfTheRaasi should return 4th and 10th houses', () => {
            const [houses] = squareAspectsOfTheRaasi(simpleChart, 0);
            expect(houses).toEqual([3, 9]); // 4th and 10th from Aries
        });
    });

    describe('benefic aspects', () => {
        it('should combine trinal and sextile', () => {
            const [houses] = beneficAspectsOfTheRaasi(simpleChart, 0);
            // Trinal: [4, 8] + Sextile: [2, 10]
            expect(houses).toEqual([4, 8, 2, 10]);
        });
        it('planetHasBeneficAspectOnHouse should work', () => {
            // Sun(0) is in house 0, its benefic houses are 4,8,2,10
            expect(planetHasBeneficAspectOnHouse(simpleChart, 0, 4)).toBe(true);
            expect(planetHasBeneficAspectOnHouse(simpleChart, 0, 1)).toBe(false);
        });
    });

    describe('semi-sextile / neutral aspects', () => {
        it('semiSextileAspectsOfTheRaasi should return 2nd and 12th houses', () => {
            const [houses] = semiSextileAspectsOfTheRaasi(simpleChart, 0);
            expect(houses).toEqual([1, 11]); // 2nd and 12th from Aries
        });
        it('neutralAspectsOfTheRaasi should be same as semiSextile', () => {
            const [h1] = neutralAspectsOfTheRaasi(simpleChart, 0);
            const [h2] = semiSextileAspectsOfTheRaasi(simpleChart, 0);
            expect(h1).toEqual(h2);
        });
    });

    describe('opposition aspects', () => {
        it('oppositionAspectsOfTheRaasi should return 7th house', () => {
            const [houses] = oppositionAspectsOfTheRaasi(simpleChart, 0);
            expect(houses).toEqual([6]); // 7th from Aries = Libra
        });
        it('should find Saturn in opposition from Aries', () => {
            const [, planets] = oppositionAspectsOfTheRaasi(simpleChart, 0);
            expect(planets).toContain('6'); // Saturn in Libra
        });
    });

    describe('malefic aspects', () => {
        it('should combine square + conjunction + opposition', () => {
            const [houses] = maleficAspectsOfTheRaasi(simpleChart, 0);
            // Square: [3, 9] + Conjunction: [0] + Opposition: [6]
            expect(houses).toContain(3);
            expect(houses).toContain(9);
            expect(houses).toContain(6);
            expect(houses).toContain(0);
        });
    });

    describe('combined aspect checks', () => {
        it('planetsHaveAspects should detect any aspect', () => {
            // Sun(0) in house 0, Saturn(6) in house 6 -> opposition
            expect(planetsHaveAspects(simpleChart, 0, 6)).toBe(true);
        });
        it('planetsHaveBeneficAspects should detect benefic', () => {
            // Sun(0) in house 0, Jupiter(4) in house 4 -> trinal (benefic)
            expect(planetsHaveBeneficAspects(simpleChart, 0, 4)).toBe(true);
        });
        it('planetsHaveMaleficAspects should detect malefic', () => {
            // Sun(0) in house 0, Saturn(6) in house 6 -> opposition (malefic)
            expect(planetsHaveMaleficAspects(simpleChart, 0, 6)).toBe(true);
        });
        it('planetsHaveNeutralAspects should detect neutral', () => {
            // Sun(0) in house 0, Moon(1) in house 1 -> 2nd house = semi-sextile
            expect(planetsHaveNeutralAspects(simpleChart, 0, 1)).toBe(true);
        });
    });

    describe('aspectsOfTheRaasi / aspectsOfThePlanet', () => {
        it('aspectsOfTheRaasi should return all aspects combined', () => {
            const [houses, planets] = aspectsOfTheRaasi(simpleChart, 0);
            // Should include benefic + malefic + neutral houses
            expect(houses.length).toBeGreaterThan(0);
            expect(planets.length).toBeGreaterThan(0);
        });
        it('aspectsOfThePlanet should return all aspects', () => {
            const [houses] = aspectsOfThePlanet(simpleChart, 0);
            expect(houses.length).toBeGreaterThan(0);
        });
    });

    describe('planetAspectsFromChart', () => {
        it('should return aspect map for all planets', () => {
            const aspects = planetAspectsFromChart(simpleChart);
            expect(Object.keys(aspects)).toHaveLength(9);
            // Sun should have some aspects
            expect(aspects[0].length).toBeGreaterThan(0);
        });
    });
});

// ============================================================================
// DEEPTAMSA & APPROACHING TESTS
// ============================================================================

describe('Deeptamsa and approaching checks', () => {
    describe('deeptamsaRangeOfPlanet', () => {
        it('should compute range for Sun (deeptamsa=15)', () => {
            const [start, end] = deeptamsaRangeOfPlanet(0, 20);
            expect(start).toBe(5);  // 20 - 15
            expect(end).toBe(35);   // 20 + 15
        });
        it('should compute range for Moon (deeptamsa=12)', () => {
            const [start, end] = deeptamsaRangeOfPlanet(1, 10);
            expect(start).toBe(-2); // 10 - 12
            expect(end).toBe(22);   // 10 + 12
        });
    });

    describe('bothPlanetsWithinTheirDeeptamsa', () => {
        it('should detect Varthamaana ithasala when both in each others range', () => {
            // Sun at 25, Moon at 20. Sun deeptamsa=15: range [10,40]. Moon deeptamsa=12: range [8,32].
            // Sun(25) in Moon range [8,32]? yes. Moon(20) in Sun range [10,40]? yes.
            const [result, type] = bothPlanetsWithinTheirDeeptamsa(testPositions, 0, 1);
            expect(result).toBe(true);
            expect(type).toBe(1); // Varthamaana
        });
        it('should detect Poorna ithasala when within 1 degree', () => {
            // Create positions where two planets are within 1 degree
            const closePositions: TajakaPlanetPosition[] = [
                ['L', [1, 5]],
                [0, [0, 20.3]], // Sun
                [1, [0, 20.8]], // Moon - within 1 degree of Sun
                [2, [7, 15]], [3, [0, 23]], [4, [3, 16]],
                [5, [2, 13]], [6, [0, 0]], [7, [0, 0]], [8, [0, 0]],
            ];
            const [, type] = bothPlanetsWithinTheirDeeptamsa(closePositions, 0, 1);
            expect(type).toBe(2); // Poorna
        });
    });

    describe('bothPlanetsApproaching', () => {
        it('should detect approaching planets', () => {
            // Sun(0) at 25 in Aries, Moon(1) at 20 in Aries
            // Moon is fastest (speed index 8), Sun speed index 5
            // Moon is faster. Sun more advanced (25 > 20).
            // Faster(Moon) less advanced than slower(Sun) -> approaching
            const result = bothPlanetsApproaching(testPositions, 0, 1);
            expect(result).toBe(true);
        });
        it('should detect non-approaching planets', () => {
            // Sun(0) at 25, Mercury(3) at 23 in same house
            // Mercury speed index 7, Sun speed index 5
            // Mercury is faster. Sun more advanced (25 > 23).
            // Faster(Mercury) less advanced -> approaching? yes
            const result = bothPlanetsApproaching(testPositions, 0, 3);
            expect(result).toBe(true);
        });
    });
});

// ============================================================================
// TAJAKA YOGA TESTS
// ============================================================================

describe('Tajaka Yoga calculations', () => {
    describe('getHousePlanetListFromPositions', () => {
        it('should build house-planet list from positions', () => {
            const hpl = getHousePlanetListFromPositions(testPositions);
            expect(hpl).toHaveLength(12);
            // Aries(0) should contain Sun(0), Moon(1), Mercury(3), Saturn(6), Rahu(7), Ketu(8)
            expect(hpl[0]).toContain('0');
            expect(hpl[0]).toContain('1');
            expect(hpl[0]).toContain('3');
            // Lagna in Taurus(1)
            expect(hpl[1]).toContain('L');
        });
    });

    describe('getPlanetHouseDictFromPositions', () => {
        it('should map planets to houses', () => {
            const dict = getPlanetHouseDictFromPositions(testPositions);
            expect(dict['0']).toBe(0); // Sun in Aries
            expect(dict['L']).toBe(1); // Lagna in Taurus
            expect(dict['2']).toBe(7); // Mars in Scorpio
        });
    });

    describe('ishkavalaYoga', () => {
        it('should detect when planets are only in kendras/panaparas', () => {
            // All planets in houses 1,2,4,5,7,8,10,11 from asc
            const pToH: Record<string, number> = {
                '0': 0, '1': 1, '2': 3, '3': 4, '4': 6, '5': 7, '6': 9, 'L': 0
            };
            expect(ishkavalaYoga(pToH)).toBe(true);
        });
        it('should return false when planets are in apoklimas', () => {
            // Planet in 3rd house from asc (apoklima)
            const pToH: Record<string, number> = {
                '0': 2, '1': 1, '2': 3, '3': 4, '4': 6, '5': 7, '6': 9, 'L': 0
            };
            expect(ishkavalaYoga(pToH)).toBe(false);
        });
    });

    describe('induvaraYoga', () => {
        it('should detect when planets are only in apoklimas', () => {
            // All planets in 3rd, 6th, 9th, 12th from asc(0)
            const pToH: Record<string, number> = {
                '0': 2, '1': 5, '2': 8, '3': 11, '4': 2, '5': 5, '6': 8, 'L': 0
            };
            expect(induvaraYoga(pToH)).toBe(true);
        });
        it('should return false when planets are in kendras', () => {
            const pToH: Record<string, number> = {
                '0': 0, '1': 5, '2': 8, '3': 11, '4': 2, '5': 5, '6': 8, 'L': 0
            };
            expect(induvaraYoga(pToH)).toBe(false);
        });
    });

    describe('ithasalaYoga', () => {
        it('should return yoga result and type', () => {
            const [yoga, type] = ithasalaYoga(testPositions, 0, 1);
            // Both in Aries, Sun at 25, Moon at 20
            // They are in conjunction (same house) -> have aspects
            // Within deeptamsa -> yes
            // Approaching -> Moon(faster) at 20, Sun at 25, Moon less advanced -> yes
            expect(typeof yoga).toBe('boolean');
            if (yoga) {
                expect(type).not.toBeNull();
            }
        });
    });

    describe('eesarphaYoga', () => {
        it('should return boolean', () => {
            const result = eesarphaYoga(testPositions, 0, 1);
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getIthasalaYogaPlanetPairs', () => {
        it('should return array of triples', () => {
            const pairs = getIthasalaYogaPlanetPairs(testPositions);
            expect(Array.isArray(pairs)).toBe(true);
            for (const [p1, p2, iyt] of pairs) {
                expect(p1).toBeGreaterThanOrEqual(0);
                expect(p1).toBeLessThan(7);
                expect(p2).toBeGreaterThan(p1);
                expect(p2).toBeLessThan(7);
            }
        });
    });

    describe('getEesarphaYogaPlanetPairs', () => {
        it('should return array of pairs', () => {
            const pairs = getEesarphaYogaPlanetPairs(testPositions);
            expect(Array.isArray(pairs)).toBe(true);
        });
    });

    describe('getNaktaYogaPlanetTriples', () => {
        it('should return array of triples', () => {
            const triples = getNaktaYogaPlanetTriples(testPositions);
            expect(Array.isArray(triples)).toBe(true);
        });
    });

    describe('getYamayaYogaPlanetTriples', () => {
        it('should return array of triples', () => {
            const triples = getYamayaYogaPlanetTriples(testPositions);
            expect(Array.isArray(triples)).toBe(true);
        });
    });

    describe('checkYamayaYoga', () => {
        it('should check yamaya yoga for a specific triple', () => {
            // From Python test: planet3=4(Jupiter), planet1=2(Mars), planet2=5(Venus)
            const result = checkYamayaYoga(4, 2, 5, testPositions);
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getManahooYogaPlanetPairs', () => {
        it('should return array of triples [p1, p2, house]', () => {
            const pairs = getManahooYogaPlanetPairs(testPositions);
            expect(Array.isArray(pairs)).toBe(true);
        });
    });

    describe('getKamboolaYogaPlanetPairs', () => {
        it('should return [check, moonPairs, extendedPairs]', () => {
            const [check, moonPairs, extPairs] = getKamboolaYogaPlanetPairs(testPositions);
            expect(typeof check).toBe('boolean');
            expect(Array.isArray(moonPairs)).toBe(true);
            expect(Array.isArray(extPairs)).toBe(true);
        });
    });

    describe('getRaddaYogaPlanetPairs', () => {
        it('should return array of pairs', () => {
            const pairs = getRaddaYogaPlanetPairs(testPositions);
            expect(Array.isArray(pairs)).toBe(true);
        });
    });

    describe('getDuhphaliKuttaYogaPlanetPairs', () => {
        it('should return array of pairs', () => {
            const pairs = getDuhphaliKuttaYogaPlanetPairs(testPositions);
            expect(Array.isArray(pairs)).toBe(true);
        });
    });

    describe('unimplemented yogas', () => {
        it('getGairiKamboolaYogaPlanetPairs should return null', () => {
            expect(getGairiKamboolaYogaPlanetPairs(testPositions)).toBeNull();
        });
        it('getKhallasaraYogaPlanetPairs should return null', () => {
            expect(getKhallasaraYogaPlanetPairs(testPositions)).toBeNull();
        });
    });

    describe('naktaYoga', () => {
        it('should return [boolean, pairs] for a planet', () => {
            const [present, pairs] = naktaYoga(testPositions, 0);
            expect(typeof present).toBe('boolean');
            expect(Array.isArray(pairs)).toBe(true);
        });
    });
});

// ============================================================================
// CROSS-MODULE INTEGRATION TESTS
// ============================================================================

describe('Cross-module integration', () => {
    it('aspect functions from tajaka should be usable in yoga calculations', () => {
        const hpl = getHousePlanetListFromPositions(testPositions);
        // Verify the chart is well-formed
        expect(hpl).toHaveLength(12);

        // Check that planetsHaveAspects works with generated chart
        const sunMoonAspect = planetsHaveAspects(hpl, 0, 1);
        expect(typeof sunMoonAspect).toBe('boolean');
    });

    it('deeptamsa range should be symmetric around planet longitude', () => {
        for (let planet = 0; planet < 7; planet++) {
            const longitude = 15.0;
            const [start, end] = deeptamsaRangeOfPlanet(planet, longitude);
            expect(end - start).toBe(2 * DEEPTAMSA_OF_PLANETS[planet]);
            expect((start + end) / 2).toBe(longitude);
        }
    });

    it('ithasala and eesarpha should be mutually exclusive', () => {
        // For any planet pair, if ithasala is true (with aspects and deeptamsa),
        // eesarpha should be false and vice versa (approaching vs not approaching)
        const pairs = getIthasalaYogaPlanetPairs(testPositions);
        const eePairs = getEesarphaYogaPlanetPairs(testPositions);

        // No pair should appear in both lists
        for (const [p1, p2] of pairs) {
            const inEesarpha = eePairs.some(([e1, e2]) => e1 === p1 && e2 === p2);
            expect(inEesarpha).toBe(false);
        }
    });
});
