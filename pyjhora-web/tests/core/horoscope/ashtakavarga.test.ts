import { describe, expect, it } from 'vitest';
import {
  getAshtakavarga,
  getSodhayaPindas,
  getPlanetToHouseDictFromChart
} from '../../../src/core/horoscope/ashtakavarga';

describe('Ashtakavarga System', () => {

  describe('getPlanetToHouseDictFromChart', () => {
    it('should correctly parse planet positions from chart', () => {
      // Chart 7 from the book: ['6/1/7','','','','','','8/4','L','3/2','0','5','']
      const chart = ['6/1/7', '', '', '', '', '', '8/4', 'L', '3/2', '0', '5', ''];
      const pToH = getPlanetToHouseDictFromChart(chart);

      expect(pToH[0]).toBe(9);  // Sun in house 9 (Capricorn)
      expect(pToH[1]).toBe(0);  // Moon in house 0 (Aries)
      expect(pToH[2]).toBe(8);  // Mars in house 8 (Sagittarius)
      expect(pToH[3]).toBe(8);  // Mercury in house 8 (Sagittarius)
      expect(pToH[4]).toBe(6);  // Jupiter in house 6 (Libra)
      expect(pToH[5]).toBe(10); // Venus in house 10 (Aquarius)
      expect(pToH[6]).toBe(0);  // Saturn in house 0 (Aries)
      expect(pToH[7]).toBe(0);  // Rahu in house 0 (Aries)
      expect(pToH[8]).toBe(6);  // Ketu in house 6 (Libra)
      expect(pToH['L']).toBe(7); // Lagnam in house 7 (Scorpio)
    });
  });

  describe('getAshtakavarga', () => {
    // Test case from PyJHora: Chart 7 from Chapter 12.3
    const chart7 = ['6/1/7', '', '', '', '', '', '8/4', 'L', '3/2', '0', '5', ''];

    it('should calculate Binna Ashtaka Varga correctly', () => {
      const { binnaAshtakavarga } = getAshtakavarga(chart7);

      // Expected BAV from the Python tests (excluding Lagnam for comparison)
      const expectedBav = [
        [4, 2, 3, 4, 6, 5, 5, 3, 2, 6, 6, 2], // Sun
        [6, 3, 5, 3, 5, 5, 6, 3, 3, 4, 4, 2], // Moon
        [3, 2, 3, 4, 2, 5, 4, 3, 3, 4, 3, 3], // Mars
        [4, 6, 4, 3, 4, 7, 4, 5, 6, 3, 5, 3], // Mercury
        [4, 4, 3, 5, 6, 5, 6, 4, 6, 4, 3, 6], // Jupiter
        [3, 5, 5, 4, 6, 2, 3, 6, 5, 2, 7, 4], // Venus
        [3, 2, 2, 3, 5, 6, 3, 4, 1, 3, 6, 1]  // Saturn
      ];

      // Compare Sun to Saturn (indices 0-6)
      for (let p = 0; p < 7; p++) {
        expect(binnaAshtakavarga[p]).toEqual(expectedBav[p]);
      }
    });

    it('should calculate Samudhaya Ashtaka Varga correctly', () => {
      const { samudhayaAshtakavarga } = getAshtakavarga(chart7);

      const expectedSav = [27, 24, 25, 26, 34, 35, 31, 28, 26, 26, 34, 21];

      expect(samudhayaAshtakavarga).toEqual(expectedSav);
    });

    it('should handle empty chart positions', () => {
      // Chart with planets only in a few positions
      const sparseChart = ['0', '', '', 'L', '', '', '', '', '', '', '', '1'];
      const { binnaAshtakavarga, samudhayaAshtakavarga } = getAshtakavarga(sparseChart);

      // Should not throw and should return valid arrays
      expect(binnaAshtakavarga.length).toBe(8);
      expect(samudhayaAshtakavarga.length).toBe(12);

      // All values should be non-negative
      for (const row of binnaAshtakavarga) {
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('getSodhayaPindas', () => {
    const chart7 = ['6/1/7', '', '', '', '', '', '8/4', 'L', '3/2', '0', '5', ''];

    it('should calculate Sodhaya Pindas correctly', () => {
      const { binnaAshtakavarga } = getAshtakavarga(chart7);
      const { raasiPindas, grahaPindas, sodhyaPindas } = getSodhayaPindas(binnaAshtakavarga, chart7);

      // Expected values from PyJHora test
      // Note: There's a known discrepancy between code and book values for this chart
      const expectedRaasiPindas = [155, 92, 55, 99, 93, 154, 166];
      const expectedGrahaPindas = [81, 55, 43, 33, 56, 54, 63];
      const expectedSodhyaPindas = [236, 147, 98, 132, 149, 208, 229];

      expect(raasiPindas).toEqual(expectedRaasiPindas);
      expect(grahaPindas).toEqual(expectedGrahaPindas);
      expect(sodhyaPindas).toEqual(expectedSodhyaPindas);
    });

    it('should return arrays of length 7 (Sun to Saturn)', () => {
      const { binnaAshtakavarga } = getAshtakavarga(chart7);
      const { raasiPindas, grahaPindas, sodhyaPindas } = getSodhayaPindas(binnaAshtakavarga, chart7);

      expect(raasiPindas.length).toBe(7);
      expect(grahaPindas.length).toBe(7);
      expect(sodhyaPindas.length).toBe(7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle chart with all planets in one house', () => {
      const concentratedChart = ['0/1/2/3/4/5/6/7/8/L', '', '', '', '', '', '', '', '', '', '', ''];
      const { binnaAshtakavarga, samudhayaAshtakavarga } = getAshtakavarga(concentratedChart);

      expect(binnaAshtakavarga.length).toBe(8);
      expect(samudhayaAshtakavarga.length).toBe(12);
    });

    it('should handle chart with Lagnam only', () => {
      const lagnamOnlyChart = ['', '', '', '', '', '', 'L', '', '', '', '', ''];
      const { binnaAshtakavarga } = getAshtakavarga(lagnamOnlyChart);

      // Should still calculate Lagnam's contribution
      expect(binnaAshtakavarga[7]).toBeDefined();
      expect(binnaAshtakavarga[7].length).toBe(12);
    });
  });
});
