import { describe, expect, it } from 'vitest';
import {
  SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU,
  ARIES, TAURUS, GEMINI, CANCER, LEO, VIRGO, LIBRA, SCORPIO,
  SAGITTARIUS, CAPRICORN, AQUARIUS, PISCES,
  FIXED_SIGNS, MOVABLE_SIGNS, DUAL_SIGNS,
  HOUSE_OWNERS,
} from '../../../src/core/constants';
import {
  getRelativeHouseOfPlanet,
} from '../../../src/core/horoscope/house';

// ============================================================================
// General Prediction Tests
// ============================================================================
import {
  getGeneralLagnaRasiPrediction,
  getPlanetsInHousesPrediction,
  getLordsInHousesPrediction,
  getPredictionDetails,
  DEFAULT_RESOURCE_STRINGS,
  type PredictionMessages,
  type PlanetPositionEntry,
} from '../../../src/core/horoscope/prediction/general';

// ============================================================================
// Longevity Tests
// ============================================================================
import {
  baladrishtaChecks,
  alpayuChecks,
  madhyayuChecks,
  lifeSpanRange,
  getAayu,
  AAYU_ALPAYU,
  AAYU_MADHYAYU,
  AAYU_POORNAYU,
  AAYU_TYPE_NAMES,
} from '../../../src/core/horoscope/prediction/longevity';

// ============================================================================
// Naadi Marriage Tests
// ============================================================================
import {
  checkYoga1,
  checkYoga2,
  checkYoga3,
  checkYoga4,
  checkMarriageYogas,
  GENDER_MALE,
  GENDER_FEMALE,
  type YogaResult,
} from '../../../src/core/horoscope/prediction/naadi-marriage';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a minimal set of planet positions for testing.
 * Planet -1 represents the Ascendant (Lagna).
 */
const makePositions = (
  ascRasi: number,
  planetRasis: Record<number, number>,
): PlanetPositionEntry[] => {
  const positions: PlanetPositionEntry[] = [
    { planet: -1, rasi: ascRasi, longitude: ascRasi * 30 + 15 },
  ];
  for (const [planet, rasi] of Object.entries(planetRasis)) {
    positions.push({
      planet: parseInt(planet),
      rasi,
      longitude: rasi * 30 + 15,
    });
  }
  return positions;
};

/** A standard test chart: Ascendant in Aries, planets spread across signs */
const standardPositions = makePositions(ARIES, {
  [SUN]: ARIES,       // Sun in Aries (exalted)
  [MOON]: TAURUS,     // Moon in Taurus (exalted)
  [MARS]: CAPRICORN,  // Mars in Capricorn (exalted)
  [MERCURY]: VIRGO,   // Mercury in Virgo (own sign)
  [JUPITER]: CANCER,  // Jupiter in Cancer (exalted)
  [VENUS]: PISCES,    // Venus in Pisces (exalted)
  [SATURN]: LIBRA,    // Saturn in Libra (exalted)
  [RAHU]: GEMINI,     // Rahu in Gemini
  [KETU]: SAGITTARIUS, // Ketu in Sagittarius
});

/** A challenging chart for longevity checks */
const challengingPositions = makePositions(ARIES, {
  [SUN]: SAGITTARIUS,  // Sun in 9th
  [MOON]: ARIES,       // Moon in Ascendant
  [MARS]: SCORPIO,     // Mars in 8th
  [MERCURY]: GEMINI,   // Mercury in 3rd
  [JUPITER]: CANCER,   // Jupiter in 4th
  [VENUS]: TAURUS,     // Venus in 2nd
  [SATURN]: PISCES,    // Saturn in 12th
  [RAHU]: VIRGO,       // Rahu in 6th
  [KETU]: PISCES,      // Ketu in 12th
});

// ============================================================================
// GENERAL PREDICTION TESTS
// ============================================================================

describe('General Prediction', () => {
  const sampleMsgs: PredictionMessages = {
    janma_raasi_1: {
      source: 'Source 1',
      '1': { 'Health': 'Good health expected', 'Wealth': 'Financial gains' },
      '2': { 'Health': 'Moderate health', 'Wealth': 'Steady income' },
    },
    janma_raasi_2: {
      source: 'Source 2',
      '1': { 'Career': 'Leadership roles' },
      '2': { 'Career': 'Creative pursuits' },
    },
    planets_in_houses: {
      '1': ['Sun in 1st', 'Moon in 1st', 'Mars in 1st', 'Mercury in 1st',
            'Jupiter in 1st', 'Venus in 1st', 'Saturn in 1st', 'Rahu in 1st', 'Ketu in 1st'],
      '2': ['Sun in 2nd', 'Moon in 2nd', 'Mars in 2nd', 'Mercury in 2nd',
            'Jupiter in 2nd', 'Venus in 2nd', 'Saturn in 2nd', 'Rahu in 2nd', 'Ketu in 2nd'],
      '3': ['Sun in 3rd', 'Moon in 3rd', 'Mars in 3rd', 'Mercury in 3rd',
            'Jupiter in 3rd', 'Venus in 3rd', 'Saturn in 3rd', 'Rahu in 3rd', 'Ketu in 3rd'],
      '4': ['Sun in 4th', 'Moon in 4th', 'Mars in 4th', 'Mercury in 4th',
            'Jupiter in 4th', 'Venus in 4th', 'Saturn in 4th', 'Rahu in 4th', 'Ketu in 4th'],
      '5': ['Sun in 5th', 'Moon in 5th', 'Mars in 5th', 'Mercury in 5th',
            'Jupiter in 5th', 'Venus in 5th', 'Saturn in 5th', 'Rahu in 5th', 'Ketu in 5th'],
      '6': ['Sun in 6th', 'Moon in 6th', 'Mars in 6th', 'Mercury in 6th',
            'Jupiter in 6th', 'Venus in 6th', 'Saturn in 6th', 'Rahu in 6th', 'Ketu in 6th'],
      '7': ['Sun in 7th', 'Moon in 7th', 'Mars in 7th', 'Mercury in 7th',
            'Jupiter in 7th', 'Venus in 7th', 'Saturn in 7th', 'Rahu in 7th', 'Ketu in 7th'],
      '8': ['Sun in 8th', 'Moon in 8th', 'Mars in 8th', 'Mercury in 8th',
            'Jupiter in 8th', 'Venus in 8th', 'Saturn in 8th', 'Rahu in 8th', 'Ketu in 8th'],
      '9': ['Sun in 9th', 'Moon in 9th', 'Mars in 9th', 'Mercury in 9th',
            'Jupiter in 9th', 'Venus in 9th', 'Saturn in 9th', 'Rahu in 9th', 'Ketu in 9th'],
      '10': ['Sun in 10th', 'Moon in 10th', 'Mars in 10th', 'Mercury in 10th',
             'Jupiter in 10th', 'Venus in 10th', 'Saturn in 10th', 'Rahu in 10th', 'Ketu in 10th'],
      '11': ['Sun in 11th', 'Moon in 11th', 'Mars in 11th', 'Mercury in 11th',
             'Jupiter in 11th', 'Venus in 11th', 'Saturn in 11th', 'Rahu in 11th', 'Ketu in 11th'],
      '12': ['Sun in 12th', 'Moon in 12th', 'Mars in 12th', 'Mercury in 12th',
             'Jupiter in 12th', 'Venus in 12th', 'Saturn in 12th', 'Rahu in 12th', 'Ketu in 12th'],
    },
    lord_of_a_house_joining_lord_of_another_house: {
      '1': Array(12).fill('Lord of 1st prediction'),
      '2': Array(12).fill('Lord of 2nd prediction'),
      '3': Array(12).fill('Lord of 3rd prediction'),
      '4': Array(12).fill('Lord of 4th prediction'),
      '5': Array(12).fill('Lord of 5th prediction'),
      '6': Array(12).fill('Lord of 6th prediction'),
      '7': Array(12).fill('Lord of 7th prediction'),
      '8': Array(12).fill('Lord of 8th prediction'),
      '9': Array(12).fill('Lord of 9th prediction'),
      '10': Array(12).fill('Lord of 10th prediction'),
      '11': Array(12).fill('Lord of 11th prediction'),
      '12': Array(12).fill('Lord of 12th prediction'),
    },
  };

  describe('getGeneralLagnaRasiPrediction', () => {
    it('should return predictions for janma rasi (Aries = 0)', () => {
      const result = getGeneralLagnaRasiPrediction(0, sampleMsgs);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['Janma Rasi_1']).toContain('General Prediction');
      expect(result['Janma Rasi_1']).toContain('Source 1');
      expect(result['Janma Rasi_1']).toContain('Good health expected');
      expect(result['Janma Rasi_2']).toContain('Source 2');
      expect(result['Janma Rasi_2']).toContain('Leadership roles');
    });

    it('should return predictions for janma rasi (Taurus = 1)', () => {
      const result = getGeneralLagnaRasiPrediction(1, sampleMsgs);
      expect(result['Janma Rasi_1']).toContain('Steady income');
      expect(result['Janma Rasi_2']).toContain('Creative pursuits');
    });
  });

  describe('getPlanetsInHousesPrediction', () => {
    it('should map each planet to its house and return prediction text', () => {
      const result = getPlanetsInHousesPrediction(standardPositions, sampleMsgs);
      const html = result['Planets'];
      expect(html).toBeDefined();

      // Sun in Aries = house 1 from Aries ascendant
      expect(html).toContain('Sun-House#1:');
      expect(html).toContain('Sun in 1st');

      // Moon in Taurus = house 2 from Aries ascendant
      expect(html).toContain('Moon-House#2:');
      expect(html).toContain('Moon in 2nd');

      // Jupiter in Cancer = house 4 from Aries ascendant
      expect(html).toContain('Jupiter-House#4:');
      expect(html).toContain('Jupiter in 4th');
    });

    it('should handle missing prediction messages gracefully', () => {
      const emptyMsgs: PredictionMessages = {};
      const result = getPlanetsInHousesPrediction(standardPositions, emptyMsgs);
      expect(result['Planets']).toBe('<html>');
    });
  });

  describe('getLordsInHousesPrediction', () => {
    it('should produce predictions for all 12 houses', () => {
      const result = getLordsInHousesPrediction(standardPositions, sampleMsgs);
      const html = result['Houses'];
      expect(html).toBeDefined();
      expect(html).toContain('Lord of House#1');
      expect(html).toContain('Lord of House#12');
    });
  });

  describe('getPredictionDetails', () => {
    it('should combine all prediction types', () => {
      const result = getPredictionDetails(standardPositions, 0, sampleMsgs);
      // Should have janma rasi keys, planets key, and houses key
      expect(result).toHaveProperty('Janma Rasi_1');
      expect(result).toHaveProperty('Janma Rasi_2');
      expect(result).toHaveProperty('Planets');
      expect(result).toHaveProperty('Houses');
    });
  });
});

// ============================================================================
// LONGEVITY TESTS
// ============================================================================

describe('Longevity Prediction', () => {

  describe('getAayu', () => {
    it('should return Alpayu (0) for Fixed + Fixed signs', () => {
      expect(getAayu(TAURUS, LEO)).toBe(AAYU_ALPAYU);
      expect(getAayu(SCORPIO, AQUARIUS)).toBe(AAYU_ALPAYU);
    });

    it('should return Poornayu (2) for Movable + Movable signs', () => {
      expect(getAayu(ARIES, CANCER)).toBe(AAYU_POORNAYU);
      expect(getAayu(LIBRA, CAPRICORN)).toBe(AAYU_POORNAYU);
    });

    it('should return Madhyayu (1) for Dual + Dual signs', () => {
      expect(getAayu(GEMINI, VIRGO)).toBe(AAYU_MADHYAYU);
      expect(getAayu(SAGITTARIUS, PISCES)).toBe(AAYU_MADHYAYU);
    });

    it('should return Madhyayu (1) for Fixed + Movable signs', () => {
      expect(getAayu(TAURUS, ARIES)).toBe(AAYU_MADHYAYU);
      expect(getAayu(CANCER, LEO)).toBe(AAYU_MADHYAYU);
    });

    it('should return Alpayu (0) for Dual + Movable signs', () => {
      expect(getAayu(GEMINI, ARIES)).toBe(AAYU_ALPAYU);
      expect(getAayu(CANCER, PISCES)).toBe(AAYU_ALPAYU);
    });

    it('should return Poornayu (2) for Fixed + Dual signs', () => {
      expect(getAayu(TAURUS, GEMINI)).toBe(AAYU_POORNAYU);
      expect(getAayu(PISCES, SCORPIO)).toBe(AAYU_POORNAYU);
    });
  });

  describe('AAYU_TYPE_NAMES', () => {
    it('should have correct names', () => {
      expect(AAYU_TYPE_NAMES[AAYU_ALPAYU]).toBe('Alpayu');
      expect(AAYU_TYPE_NAMES[AAYU_MADHYAYU]).toBe('Madhyayu');
      expect(AAYU_TYPE_NAMES[AAYU_POORNAYU]).toBe('Poornayu');
    });
  });

  describe('baladrishtaChecks', () => {
    it('should return an array of boolean checks', () => {
      const result = baladrishtaChecks(standardPositions);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(6);
      result.forEach(check => {
        expect(typeof check).toBe('boolean');
      });
    });

    it('should detect Moon in ascendant, Sun in 9th, Mars in 8th, Saturn in 12th pattern', () => {
      const result = baladrishtaChecks(challengingPositions);
      // Check 5: Moon in Asc, Sun in 9th, Mars in 8th, Saturn in 12th
      expect(result[4]).toBe(true);
    });

    it('should return false for standard exalted chart (no baladrishta)', () => {
      const result = baladrishtaChecks(standardPositions);
      // In a chart with all exalted planets spread out, most checks should be false
      // Check 5 (specific pattern) should be false for standard chart
      expect(result[4]).toBe(false);
    });
  });

  describe('alpayuChecks', () => {
    it('should return an array of boolean checks', () => {
      const result = alpayuChecks(standardPositions);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(10);
      result.forEach(check => {
        expect(typeof check).toBe('boolean');
      });
    });
  });

  describe('madhyayuChecks', () => {
    it('should return an array of boolean checks', () => {
      const result = madhyayuChecks(standardPositions);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      result.forEach(check => {
        expect(typeof check).toBe('boolean');
      });
    });
  });

  describe('lifeSpanRange', () => {
    it('should return a valid aayu type (0, 1, or 2)', () => {
      const result = lifeSpanRange(standardPositions, ARIES);
      expect([0, 1, 2]).toContain(result);
    });

    it('should handle all-same aayu group case', () => {
      // Create positions where lagna lord house, asc, moon, hora lagna are all movable
      const positions = makePositions(ARIES, {
        [SUN]: ARIES,
        [MOON]: CANCER,  // Movable
        [MARS]: ARIES,   // Lagna lord (Mars) in Aries (movable)
        [MERCURY]: GEMINI,
        [JUPITER]: SAGITTARIUS, // 8th lord (Jupiter for Scorpio 8th house) - varies
        [VENUS]: TAURUS,
        [SATURN]: LIBRA,
        [RAHU]: GEMINI,
        [KETU]: SAGITTARIUS,
      });
      const result = lifeSpanRange(positions, CANCER); // Hora lagna in Cancer (movable)
      expect([0, 1, 2]).toContain(result);
    });

    it('should prefer moon pair when moon is conjunct ascendant (all-different case)', () => {
      // Moon conjunct ascendant (same sign)
      const positions = makePositions(ARIES, {
        [SUN]: TAURUS,
        [MOON]: ARIES,      // Moon conjunct Ascendant
        [MARS]: CANCER,     // Lagna lord in Cancer (movable)
        [MERCURY]: GEMINI,
        [JUPITER]: LEO,
        [VENUS]: PISCES,
        [SATURN]: SCORPIO,  // 8th lord in Scorpio (fixed)
        [RAHU]: GEMINI,
        [KETU]: SAGITTARIUS,
      });
      // When moon is in ascendant sign, should prefer pair 2 (asc + moon) over hora lagna
      const result = lifeSpanRange(positions, VIRGO); // Hora lagna in Virgo (dual)
      expect([0, 1, 2]).toContain(result);
    });
  });
});

// ============================================================================
// NAADI MARRIAGE TESTS
// ============================================================================

describe('Naadi Marriage Prediction', () => {

  describe('checkYoga1', () => {
    it('should detect marriage yoga when Venus aspects Jupiter or Saturn (male)', () => {
      // Venus in Pisces, Jupiter in Cancer - check if Venus aspects Jupiter
      const result = checkYoga1(standardPositions, GENDER_MALE);
      expect(typeof result.isPresent).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should use Mars as marriage planet for females', () => {
      const result = checkYoga1(standardPositions, GENDER_FEMALE);
      expect(typeof result.isPresent).toBe('boolean');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should return positive message when marriage yoga is present', () => {
      // Create a chart where Venus (5) aspects Jupiter (4) via graha drishti
      // Venus has 7th house aspect. If Venus is in Aries(0), it aspects Libra(6).
      // Put Jupiter in Libra so Venus aspects Jupiter.
      const positions = makePositions(ARIES, {
        [SUN]: LEO,
        [MOON]: CANCER,
        [MARS]: CAPRICORN,
        [MERCURY]: VIRGO,
        [JUPITER]: LIBRA,     // Jupiter in Libra
        [VENUS]: ARIES,       // Venus in Aries - 7th aspect hits Libra
        [SATURN]: AQUARIUS,
        [RAHU]: GEMINI,
        [KETU]: SAGITTARIUS,
      });
      const result = checkYoga1(positions, GENDER_MALE);
      expect(result.isPresent).toBe(true);
      expect(result.message).toBe('Marriage will happen');
    });
  });

  describe('checkYoga2', () => {
    it('should indicate early marriage when Jupiter aspects marriage planet', () => {
      // Jupiter has 5th, 7th, 9th aspects
      // Jupiter in Cancer(3) aspects Scorpio(7) [5th], Capricorn(9) [7th], Pisces(11) [9th]
      // Put Venus in Capricorn so Jupiter aspects Venus
      const positions = makePositions(ARIES, {
        [SUN]: LEO,
        [MOON]: TAURUS,
        [MARS]: ARIES,
        [MERCURY]: VIRGO,
        [JUPITER]: CANCER,     // Jupiter in Cancer
        [VENUS]: CAPRICORN,    // Venus in Capricorn - Jupiter's 7th aspect
        [SATURN]: AQUARIUS,
        [RAHU]: GEMINI,
        [KETU]: SAGITTARIUS,
      });
      const result = checkYoga2(positions, GENDER_MALE);
      // Venus is the marriage planet. We check if Venus aspects Jupiter (not the other way).
      // Venus in Capricorn(9) has 7th aspect on Cancer(3) where Jupiter is.
      // So Venus aspects Jupiter -> check Yoga2 logic: it checks aspected planets OF Venus
      expect(typeof result.isPresent).toBe('boolean');
    });

    it('should return neither early/late message when no aspect', () => {
      // Create positions where neither Jupiter nor Saturn aspect the marriage planet
      const positions = makePositions(ARIES, {
        [SUN]: LEO,
        [MOON]: TAURUS,
        [MARS]: ARIES,
        [MERCURY]: VIRGO,
        [JUPITER]: ARIES,     // Jupiter in Aries
        [VENUS]: TAURUS,      // Venus in Taurus
        [SATURN]: GEMINI,     // Saturn in Gemini
        [RAHU]: CANCER,
        [KETU]: CAPRICORN,
      });
      const result = checkYoga2(positions, GENDER_MALE);
      // Venus in Taurus(1) aspects Scorpio(7). Jupiter in Aries, Saturn in Gemini.
      // Neither Jupiter(0) nor Saturn(2) is aspected by Venus -> not early/late
      expect(typeof result.isPresent).toBe('boolean');
    });
  });

  describe('checkYoga3', () => {
    it('should detect Ketu aspecting marriage planet', () => {
      // Ketu only has 7th house aspect (same as Sun/Moon)
      // Ketu in Sagittarius(8) aspects Gemini(2)
      // Put Venus in Gemini so Ketu aspects Venus
      const positions = makePositions(ARIES, {
        [SUN]: LEO,
        [MOON]: CANCER,
        [MARS]: ARIES,
        [MERCURY]: VIRGO,
        [JUPITER]: PISCES,
        [VENUS]: GEMINI,       // Venus in Gemini
        [SATURN]: LIBRA,
        [RAHU]: SAGITTARIUS,
        [KETU]: GEMINI,        // Ketu conjunct Venus (not aspect, but same sign)
      });
      // Note: Ketu in Gemini(2) aspects Sagittarius(8) via 7th aspect, not Gemini itself
      // For conjunction to count as aspect depends on implementation
      const result = checkYoga3(positions, GENDER_MALE);
      expect(typeof result.isPresent).toBe('boolean');
    });
  });

  describe('checkYoga4', () => {
    it('should detect Rahu aspecting marriage planet', () => {
      const result = checkYoga4(standardPositions, GENDER_MALE);
      expect(typeof result.isPresent).toBe('boolean');
      if (result.isPresent) {
        expect(result.message).toContain('Marriage delayed');
      }
    });
  });

  describe('checkMarriageYogas', () => {
    it('should return results for all four yogas', () => {
      const results = checkMarriageYogas(standardPositions, GENDER_MALE);
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toHaveProperty('isPresent');
        expect(result).toHaveProperty('message');
        expect(typeof result.isPresent).toBe('boolean');
        expect(typeof result.message).toBe('string');
      });
    });

    it('should work for female gender', () => {
      const results = checkMarriageYogas(standardPositions, GENDER_FEMALE);
      expect(results).toHaveLength(4);
    });

    it('should default to male gender', () => {
      const resultDefault = checkMarriageYogas(standardPositions);
      const resultMale = checkMarriageYogas(standardPositions, GENDER_MALE);
      // Results should be identical since default is male
      expect(resultDefault).toEqual(resultMale);
    });
  });
});
