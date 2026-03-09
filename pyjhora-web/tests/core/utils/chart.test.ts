/**
 * Tests for chart utility functions
 * Python reference: utils.py house/planet conversions, parivritti, search_replace
 */
import { describe, expect, it } from 'vitest';
import {
  houseToPlanetList,
  planetToHouseFromChart,
  planetToHouseFromPositions,
  housePlanetListFromPositions,
  parivrittiEvenReverse,
  parivrittiCyclic,
  parivrittiAlternate,
  searchReplace,
  convertTo2dChart,
  deeptaamsaRange,
  getFraction,
  countStars,
  cyclicCountStars,
  cyclicCountNumbers,
  closestElements,
  closestElement,
  flattenList,
  sortTuples,
  indexOf1d,
  indexOf2d,
} from '../../../src/core/utils/chart';

describe('House/Planet Conversions', () => {
  describe('houseToPlanetList', () => {
    it('should convert planet-to-house map to house chart', () => {
      // Sun(0) in Aries(0), Moon(1) in Taurus(1), Mars(2) in Taurus(1)
      const p2h = { 0: 0, 1: 1, 2: 1 };
      const result = houseToPlanetList(p2h);
      expect(result[0]).toBe('0');
      expect(result[1]).toBe('1/2');
      expect(result[2]).toBe('');
    });

    it('should handle all planets in one house', () => {
      const p2h = { 0: 5, 1: 5, 2: 5, 3: 5 };
      const result = houseToPlanetList(p2h);
      expect(result[5]).toBe('0/1/2/3');
      expect(result[0]).toBe('');
    });

    it('should handle empty input', () => {
      const result = houseToPlanetList({});
      expect(result).toHaveLength(12);
      expect(result.every((h) => h === '')).toBe(true);
    });
  });

  describe('planetToHouseFromChart', () => {
    it('should convert house chart to planet-to-house map', () => {
      const chart = ['L/0', '1/2', '', '', '', '', '', '', '', '', '', ''];
      const result = planetToHouseFromChart(chart);
      expect(result['0']).toBe(0);
      expect(result['1']).toBe(1);
      expect(result['2']).toBe(1);
      expect(result['L']).toBe(0);
    });

    it('should handle empty houses', () => {
      const chart = ['', '', '', '', '', '0', '', '', '', '', '', ''];
      const result = planetToHouseFromChart(chart);
      expect(result['0']).toBe(5);
    });
  });

  describe('planetToHouseFromPositions', () => {
    it('should extract planet-to-house mapping from positions', () => {
      const positions: Array<[number, [number, number]]> = [
        [0, [3, 15.5]],
        [1, [7, 22.3]],
      ];
      const result = planetToHouseFromPositions(positions);
      expect(result[0]).toBe(3);
      expect(result[1]).toBe(7);
    });
  });

  describe('housePlanetListFromPositions', () => {
    it('should build house chart from positions', () => {
      const positions: Array<[number, [number, number]]> = [
        [0, [3, 15.5]],
        [1, [3, 22.3]],
        [2, [7, 5.0]],
      ];
      const result = housePlanetListFromPositions(positions);
      expect(result[3]).toBe('0/1');
      expect(result[7]).toBe('2');
      expect(result[0]).toBe('');
    });
  });
});

describe('Parivritti Methods', () => {
  describe('parivrittiEvenReverse', () => {
    it('should generate correct number of entries for hora', () => {
      const result = parivrittiEvenReverse(2);
      // 12 rasis * 2 portions = 24 entries
      expect(result).toHaveLength(24);
    });

    it('should have increasing hora portions for odd rasis', () => {
      const result = parivrittiEvenReverse(3);
      // First rasi (0): hora portions should be 0, 1, 2
      expect(result[0]![1]).toBe(0);
      expect(result[1]![1]).toBe(1);
      expect(result[2]![1]).toBe(2);
    });

    it('should have decreasing hora portions for even rasis', () => {
      const result = parivrittiEvenReverse(3);
      // Second rasi (1): hora portions should be 2, 1, 0
      expect(result[3]![1]).toBe(2);
      expect(result[4]![1]).toBe(1);
      expect(result[5]![1]).toBe(0);
    });
  });

  describe('parivrittiCyclic', () => {
    it('should generate 12 entries', () => {
      const result = parivrittiCyclic(2);
      expect(result).toHaveLength(12);
    });

    it('should have correct varga signs for hora', () => {
      const result = parivrittiCyclic(2);
      // First rasi gets signs 0, 1
      expect(result[0]).toEqual([0, 1]);
      // Second rasi gets 2, 3
      expect(result[1]).toEqual([2, 3]);
    });
  });

  describe('parivrittiAlternate', () => {
    it('should generate 12 entries', () => {
      const result = parivrittiAlternate(2);
      expect(result).toHaveLength(12);
    });

    it('should have forward signs for odd rasis and backward for even', () => {
      const result = parivrittiAlternate(2);
      // First rasi (odd): starts from 0 forward
      expect(result[0]).toEqual([0, 1]);
      // Second rasi (even): starts from 11 backward
      expect(result[1]).toEqual([11, 10]);
    });
  });
});

describe('searchReplace', () => {
  it('should replace in 1D array', () => {
    const result = searchReplace(['L(Su)', 'Mo', 'Ma'], 'L(Su)', 'L');
    expect(result).toEqual(['L', 'Mo', 'Ma']);
  });

  it('should replace in 2D array', () => {
    const result = searchReplace(
      [
        ['L(Su)', 'Mo'],
        ['Ma', 'Ju'],
      ],
      'L(Su)',
      'L',
    );
    expect(result).toEqual([
      ['L', 'Mo'],
      ['Ma', 'Ju'],
    ]);
  });

  it('should not modify elements without the search string', () => {
    const result = searchReplace(['abc', 'def', 'ghi'], 'xyz', 'replaced');
    expect(result).toEqual(['abc', 'def', 'ghi']);
  });
});

describe('convertTo2dChart', () => {
  it('should convert to south indian layout', () => {
    const rasi1d = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const result = convertTo2dChart(rasi1d, 'south_indian');
    expect(result).toHaveLength(4);
    expect(result[0]).toHaveLength(4);
    // Top-left should be rasi 11 = 'L'
    expect(result[0]![0]).toBe('L');
    // Top row: [11, 0, 1, 2] = [L, A, B, C]
    expect(result[0]).toEqual(['L', 'A', 'B', 'C']);
  });
});

describe('deeptaamsaRange', () => {
  it('should return correct range', () => {
    const [min, max] = deeptaamsaRange(7, 15);
    expect(min).toBe(8);
    expect(max).toBe(22);
  });
});

describe('getFraction', () => {
  it('should return fraction of period remaining', () => {
    // Period 6-18, birth at 12 => (18-12)/(18-6) = 0.5
    expect(getFraction(6, 18, 12)).toBeCloseTo(0.5);
  });

  it('should cap at 1.0', () => {
    expect(getFraction(6, 18, 0)).toBe(1.0);
  });

  it('should handle negative start time', () => {
    // start=-2, end=10, birth=4 => duration = (1*24 + 10 - 2) = 32, frac = (10-4)/32
    const result = getFraction(-2, 10, 4);
    expect(result).toBeCloseTo(6 / 32);
  });
});

describe('Cyclic Counting', () => {
  describe('countStars', () => {
    it('should count forward', () => {
      expect(countStars(0, 0)).toBe(1);
      expect(countStars(0, 1)).toBe(2);
      expect(countStars(0, 26)).toBe(27);
    });

    it('should count backward', () => {
      expect(countStars(5, 3, -1)).toBe(3);
      expect(countStars(0, 0, -1)).toBe(1);
    });
  });

  describe('cyclicCountStars', () => {
    it('should cycle through 27 nakshatras', () => {
      expect(cyclicCountStars(1, 1, 1, 27)).toBe(1);
      expect(cyclicCountStars(27, 2, 1, 27)).toBe(1);
    });

    it('should go backward', () => {
      expect(cyclicCountStars(1, 2, -1, 27)).toBe(27);
    });
  });

  describe('cyclicCountNumbers', () => {
    it('should cycle through 30', () => {
      expect(cyclicCountNumbers(1, 1)).toBe(1);
      expect(cyclicCountNumbers(30, 2)).toBe(1);
    });
  });
});

describe('Closest Elements', () => {
  describe('closestElements', () => {
    it('should find closest pair', () => {
      const result = closestElements([1, 5, 10], [3, 7, 12]);
      expect(result).not.toBeNull();
      // Closest pair should be (5, 3) with diff 2, or (1, 3) with diff 2
      const diff = Math.abs(result![0] - result![1]);
      expect(diff).toBe(2);
    });

    it('should return null for empty arrays', () => {
      expect(closestElements([], [1, 2, 3])).toBeNull();
    });
  });

  describe('closestElement', () => {
    it('should find closest value', () => {
      expect(closestElement([1, 5, 10, 20], 7)).toBe(5);
      expect(closestElement([1, 5, 10, 20], 11)).toBe(10);
    });
  });
});

describe('List Utilities', () => {
  describe('flattenList', () => {
    it('should flatten nested arrays', () => {
      expect(flattenList([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty arrays', () => {
      expect(flattenList([])).toEqual([]);
      expect(flattenList([[]])).toEqual([]);
    });
  });

  describe('sortTuples', () => {
    it('should sort by given index', () => {
      const data: [string, number][] = [
        ['c', 3],
        ['a', 1],
        ['b', 2],
      ];
      const result = sortTuples(data, 1);
      expect(result[0]![1]).toBe(1);
      expect(result[2]![1]).toBe(3);
    });

    it('should sort in reverse', () => {
      const data: [string, number][] = [
        ['a', 1],
        ['b', 2],
      ];
      const result = sortTuples(data, 1, true);
      expect(result[0]![1]).toBe(2);
    });
  });

  describe('indexOf1d', () => {
    it('should find exact match', () => {
      expect(indexOf1d(['abc', 'def', 'ghi'], 'def')).toBe(1);
    });

    it('should find substring match', () => {
      expect(indexOf1d(['abc', 'def', 'ghi'], 'ef', true)).toBe(1);
    });

    it('should return -1 when not found', () => {
      expect(indexOf1d(['abc', 'def'], 'xyz')).toBe(-1);
    });
  });

  describe('indexOf2d', () => {
    it('should find element in 2D array', () => {
      const matrix = [
        ['a', 'b'],
        ['c', 'd'],
      ];
      expect(indexOf2d(matrix, 'd')).toEqual([1, 1]);
    });

    it('should return null when not found', () => {
      expect(indexOf2d([['a']], 'z')).toBeNull();
    });
  });
});
