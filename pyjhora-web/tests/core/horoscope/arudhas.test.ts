/**
 * Tests for Arudha Pada calculations
 * Ported from PyJHora arudhas.py test cases
 */

import { describe, it, expect } from 'vitest';
import {
  getBhavaArudhasFromPlanetPositions,
  getSuryaArudhasFromPlanetPositions,
  getChandraArudhasFromPlanetPositions,
  getGrahaArudhasFromPlanetPositions,
  bhavaArudhasToChart,
  grahaArudhasToChart,
  countRasis,
  getArudhaLagna,
  getUpaLagna,
  ARUDHA_BASE
} from '../../../src/core/horoscope/arudhas';

// Test data based on PyJHora example: DOB 7 Dec 1996, 10:34, Chennai
// Planet positions from divisional chart factor 1 (Rasi)
const testPlanetPositions = [
  { planet: 0, rasi: 7, longitude: 232.5 },   // Lagna in Scorpio
  { planet: 1, rasi: 10, longitude: 321.2 },  // Sun in Aquarius (approx - using test values)
  { planet: 2, rasi: 7, longitude: 235.8 },   // Moon in Scorpio
  { planet: 3, rasi: 6, longitude: 195.4 },   // Mars in Libra
  { planet: 4, rasi: 9, longitude: 280.1 },   // Mercury in Capricorn
  { planet: 5, rasi: 10, longitude: 313.7 },  // Jupiter in Aquarius
  { planet: 6, rasi: 8, longitude: 248.5 },   // Venus in Sagittarius
  { planet: 7, rasi: 8, longitude: 260.3 },   // Saturn in Sagittarius
  { planet: 8, rasi: 6, longitude: 188.2 },   // Rahu in Libra
  { planet: 9, rasi: 0, longitude: 8.2 }      // Ketu in Aries
];

// Simple test positions for predictable calculations
const simplePlanetPositions = [
  { planet: 0, rasi: 0, longitude: 15.0 },   // Lagna in Aries
  { planet: 1, rasi: 4, longitude: 130.5 },  // Sun in Leo (own sign)
  { planet: 2, rasi: 3, longitude: 95.2 },   // Moon in Cancer (own sign)
  { planet: 3, rasi: 0, longitude: 12.5 },   // Mars in Aries (own sign)
  { planet: 4, rasi: 2, longitude: 75.8 },   // Mercury in Gemini (own sign)
  { planet: 5, rasi: 8, longitude: 258.3 },  // Jupiter in Sagittarius (own sign)
  { planet: 6, rasi: 1, longitude: 42.1 },   // Venus in Taurus (own sign)
  { planet: 7, rasi: 9, longitude: 285.6 },  // Saturn in Capricorn (own sign)
  { planet: 8, rasi: 10, longitude: 310.4 }, // Rahu in Aquarius
  { planet: 9, rasi: 4, longitude: 130.4 }   // Ketu in Leo
];

describe('countRasis utility', () => {
  it('should count 1 for same rasi', () => {
    expect(countRasis(0, 0)).toBe(1);
    expect(countRasis(5, 5)).toBe(1);
    expect(countRasis(11, 11)).toBe(1);
  });

  it('should count correctly forward', () => {
    expect(countRasis(0, 1)).toBe(2);  // Aries to Taurus = 2
    expect(countRasis(0, 6)).toBe(7);  // Aries to Libra = 7
    expect(countRasis(0, 11)).toBe(12); // Aries to Pisces = 12
  });

  it('should wrap around correctly', () => {
    expect(countRasis(11, 0)).toBe(2);  // Pisces to Aries = 2
    expect(countRasis(10, 2)).toBe(5);  // Aquarius to Gemini = 5
  });
});

describe('Bhava Arudhas (A1-A12)', () => {
  it('should return array of 12 elements', () => {
    const arudhas = getBhavaArudhasFromPlanetPositions(testPlanetPositions);
    expect(arudhas).toHaveLength(12);
  });

  it('should return valid rasi indices (0-11)', () => {
    const arudhas = getBhavaArudhasFromPlanetPositions(testPlanetPositions);
    arudhas.forEach(rasi => {
      expect(rasi).toBeGreaterThanOrEqual(0);
      expect(rasi).toBeLessThanOrEqual(11);
    });
  });

  it('should calculate from different arudha bases', () => {
    const lagnaArudhas = getBhavaArudhasFromPlanetPositions(testPlanetPositions, ARUDHA_BASE.LAGNA);
    const sunArudhas = getBhavaArudhasFromPlanetPositions(testPlanetPositions, ARUDHA_BASE.SUN);
    const moonArudhas = getBhavaArudhasFromPlanetPositions(testPlanetPositions, ARUDHA_BASE.MOON);

    // All should return valid 12-element arrays
    expect(lagnaArudhas).toHaveLength(12);
    expect(sunArudhas).toHaveLength(12);
    expect(moonArudhas).toHaveLength(12);

    // Sun arudhas should differ from Lagna arudhas (Sun is in different sign)
    // Note: Lagna and Moon may be equal if in same sign
    expect(lagnaArudhas).not.toEqual(sunArudhas);
  });

  it('should handle simple positions with planets in own signs', () => {
    const arudhas = getBhavaArudhasFromPlanetPositions(simplePlanetPositions);
    expect(arudhas).toHaveLength(12);

    // When a planet is in its own sign, the arudha calculation follows specific rules
    // Each result should be a valid rasi
    arudhas.forEach(rasi => {
      expect(rasi).toBeGreaterThanOrEqual(0);
      expect(rasi).toBeLessThanOrEqual(11);
    });
  });
});

describe('Surya and Chandra Arudhas', () => {
  it('should calculate Surya Arudhas correctly', () => {
    const suryaArudhas = getSuryaArudhasFromPlanetPositions(testPlanetPositions);
    const manualSurya = getBhavaArudhasFromPlanetPositions(testPlanetPositions, ARUDHA_BASE.SUN);

    expect(suryaArudhas).toEqual(manualSurya);
  });

  it('should calculate Chandra Arudhas correctly', () => {
    const chandraArudhas = getChandraArudhasFromPlanetPositions(testPlanetPositions);
    const manualChandra = getBhavaArudhasFromPlanetPositions(testPlanetPositions, ARUDHA_BASE.MOON);

    expect(chandraArudhas).toEqual(manualChandra);
  });
});

describe('Graha Arudhas', () => {
  it('should return array of 10 elements (Lagna + 9 planets)', () => {
    const grahaArudhas = getGrahaArudhasFromPlanetPositions(testPlanetPositions);
    expect(grahaArudhas).toHaveLength(10);
  });

  it('should have first element as Lagna position', () => {
    const grahaArudhas = getGrahaArudhasFromPlanetPositions(testPlanetPositions);
    expect(grahaArudhas[0]).toBe(testPlanetPositions[0].rasi);
  });

  it('should return valid rasi indices (0-11)', () => {
    const grahaArudhas = getGrahaArudhasFromPlanetPositions(testPlanetPositions);
    grahaArudhas.forEach(rasi => {
      expect(rasi).toBeGreaterThanOrEqual(0);
      expect(rasi).toBeLessThanOrEqual(11);
    });
  });

  it('should handle planets in own signs', () => {
    const grahaArudhas = getGrahaArudhasFromPlanetPositions(simplePlanetPositions);
    expect(grahaArudhas).toHaveLength(10);

    // First element should be Lagna's rasi (Aries = 0)
    expect(grahaArudhas[0]).toBe(0);
  });
});

describe('Chart conversion helpers', () => {
  it('should convert Bhava Arudhas to chart format', () => {
    const arudhas = [0, 3, 5, 2, 0, 8, 6, 11, 3, 7, 10, 1];
    const chart = bhavaArudhasToChart(arudhas, 'A');

    expect(chart).toHaveLength(12);
    expect(chart[0]).toContain('A1');  // A1 is in Aries (0)
    expect(chart[0]).toContain('A5');  // A5 is also in Aries (0)
    expect(chart[3]).toContain('A2');  // A2 is in Cancer (3)
    expect(chart[3]).toContain('A9');  // A9 is also in Cancer (3)
  });

  it('should convert Graha Arudhas to chart format', () => {
    const grahaArudhas = [0, 4, 3, 0, 2, 8, 1, 9, 10, 4];
    const chart = grahaArudhasToChart(grahaArudhas);

    expect(chart).toHaveLength(12);
    expect(chart[0]).toContain('L');   // Lagna at 0
    expect(chart[0]).toContain('Ma');  // Mars at 0
    expect(chart[4]).toContain('Su');  // Sun at 4
    expect(chart[4]).toContain('Ke');  // Ketu at 4
  });

  it('should use slash separator for multiple arudhas in same house', () => {
    const arudhas = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];  // All in Aries
    const chart = bhavaArudhasToChart(arudhas);

    expect(chart[0]).toBe('A1/A2/A3/A4/A5/A6/A7/A8/A9/A10/A11/A12');
    for (let i = 1; i < 12; i++) {
      expect(chart[i]).toBe('');
    }
  });
});

describe('Arudha Lagna and Upa Pada', () => {
  it('should get Arudha Lagna (A1)', () => {
    const arudhas = getBhavaArudhasFromPlanetPositions(testPlanetPositions);
    const al = getArudhaLagna(testPlanetPositions);

    expect(al).toBe(arudhas[0]);
    expect(al).toBeGreaterThanOrEqual(0);
    expect(al).toBeLessThanOrEqual(11);
  });

  it('should get Upa Pada (A12)', () => {
    const arudhas = getBhavaArudhasFromPlanetPositions(testPlanetPositions);
    const ul = getUpaLagna(testPlanetPositions);

    expect(ul).toBe(arudhas[11]);
    expect(ul).toBeGreaterThanOrEqual(0);
    expect(ul).toBeLessThanOrEqual(11);
  });
});

describe('Edge cases', () => {
  it('should handle empty planet positions gracefully', () => {
    const arudhas = getBhavaArudhasFromPlanetPositions([]);
    expect(arudhas).toHaveLength(12);
  });

  it('should handle partial planet positions', () => {
    const partialPositions = testPlanetPositions.slice(0, 5);
    const arudhas = getBhavaArudhasFromPlanetPositions(partialPositions);
    expect(arudhas).toHaveLength(12);
  });

  it('should exclude outer planets (Uranus, Neptune, Pluto)', () => {
    const positionsWithOuter = [
      ...testPlanetPositions,
      { planet: 10, rasi: 5, longitude: 160.0 },  // Uranus
      { planet: 11, rasi: 8, longitude: 250.0 },  // Neptune
      { planet: 12, rasi: 7, longitude: 220.0 }   // Pluto
    ];

    const arudhas = getBhavaArudhasFromPlanetPositions(positionsWithOuter);
    expect(arudhas).toHaveLength(12);

    // Should produce same result as without outer planets
    const arudhasBase = getBhavaArudhasFromPlanetPositions(testPlanetPositions);
    expect(arudhas).toEqual(arudhasBase);
  });
});
