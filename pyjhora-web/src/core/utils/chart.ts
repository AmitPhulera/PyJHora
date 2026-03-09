/**
 * Chart utility functions ported from Python utils.py
 *
 * Functions for converting between planet-to-house and house-to-planet
 * representations, parivritti methods for divisional charts, and
 * chart data manipulation.
 */

// ============================================================================
// HOUSE / PLANET CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert planet-to-house dictionary to house-to-planet list.
 *
 * Python: get_house_to_planet_dict_from_planet_to_house_dict(planet_to_house_dict)
 *
 * @param planetToHouse - Map of planet index to rasi index
 * @returns Array of 12 strings, each containing planet indices separated by '/'
 *
 * @example
 * // Sun(0) in Aries(0), Moon(1) in Taurus(1), Mars(2) in Taurus(1)
 * houseToPlanetList({ 0: 0, 1: 1, 2: 1 })
 * // => ['0', '1/2', '', '', '', '', '', '', '', '', '', '']
 */
export function houseToPlanetList(planetToHouse: Record<number, number>): string[] {
  const h2p: string[] = Array.from({ length: 12 }, () => '');

  for (const [planet, house] of Object.entries(planetToHouse)) {
    if (h2p[house] !== undefined) {
      if (h2p[house]!.length > 0) {
        h2p[house] += '/' + planet;
      } else {
        h2p[house] = String(planet);
      }
    }
  }

  return h2p;
}

/**
 * Convert house-to-planet list to planet-to-house dictionary.
 * Handles planet indices 0-8 and the ascendant symbol 'L'.
 *
 * Python: get_planet_to_house_dict_from_chart(house_to_planet_list)
 *
 * @param houseChart - Array of 12 strings with planet indices separated by '/'
 * @param ascendantSymbol - Symbol used for ascendant (default 'L')
 * @returns Map of planet/symbol to house index
 *
 * @example
 * planetToHouseFromChart(['L/0', '1/2', '', '', '', '', '', '', '', '', '', ''])
 * // => { 0: 0, 1: 1, 2: 1, L: 0 }
 */
export function planetToHouseFromChart(
  houseChart: string[],
  ascendantSymbol = 'L',
): Record<string, number> {
  const p2h: Record<string, number> = {};
  const planetIds = [...Array.from({ length: 9 }, (_, i) => String(i)), ascendantSymbol];

  for (let house = 0; house < houseChart.length; house++) {
    const planets = houseChart[house];
    if (!planets) continue;

    for (const pid of planetIds) {
      if (planets.includes(pid)) {
        p2h[pid] = house;
      }
    }
  }

  return p2h;
}

/**
 * Get planet-to-house dictionary from planet positions array.
 *
 * Python: get_planet_house_dictionary_from_planet_positions(planet_positions)
 *
 * @param planetPositions - Array of [planetIndex, [rasiIndex, longitude]] tuples
 * @returns Map of planet index to house index
 */
export function planetToHouseFromPositions(
  planetPositions: Array<[number, [number, number]]>,
): Record<number, number> {
  const p2h: Record<number, number> = {};
  for (const [planet, [house]] of planetPositions) {
    p2h[planet] = house;
  }
  return p2h;
}

/**
 * Get house-to-planet list from planet positions array.
 *
 * Python: get_house_planet_list_from_planet_positions(planet_positions)
 *
 * @param planetPositions - Array of [planetIndex, [rasiIndex, longitude]] tuples
 * @returns Array of 12 strings with planet indices separated by '/'
 */
export function housePlanetListFromPositions(
  planetPositions: Array<[number, [number, number]]>,
): string[] {
  const h2p: string[] = Array.from({ length: 12 }, () => '');

  for (const [planet, [house]] of planetPositions) {
    if (h2p[house] !== undefined) {
      if (h2p[house]!.length > 0) {
        h2p[house] += '/' + String(planet);
      } else {
        h2p[house] = String(planet);
      }
    }
  }

  return h2p;
}

// ============================================================================
// PARIVRITTI METHODS (for divisional charts)
// ============================================================================

/** Parivritti tuple: [rasiSign, horaPortion, vargaSign] */
export type ParivrittiEntry = [number, number, number];

/**
 * Generate parivritti even-reverse tuple.
 * For odd rasis, hora portions increase; for even rasis, they decrease.
 *
 * Python: parivritti_even_reverse(dcf, dirn=1)
 *
 * @param dcf - Divisional chart factor (e.g., 2 for Hora, 3 for Drekkana)
 * @param dirn - Direction: 1 for forward, -1 for backward
 * @returns Array of [rasiSign, horaPortion, vargaSign] tuples
 */
export function parivrittiEvenReverse(dcf: number, dirn = 1): ParivrittiEntry[] {
  const pc: ParivrittiEntry[] = [];
  let hs = 0;

  for (let r = 0; r < 12; r += 2) {
    // Odd rasi: increasing hora portions
    for (let h = 0; h < dcf; h++) {
      pc.push([r, h, hs]);
      hs = ((hs + dirn) % 12 + 12) % 12;
    }
    // Even rasi: decreasing hora portions
    for (let h = dcf - 1; h >= 0; h--) {
      pc.push([r + 1, h, hs]);
      hs = ((hs + dirn) % 12 + 12) % 12;
    }
  }

  return pc;
}

/**
 * Generate parivritti cyclic tuple.
 * Each hora portion gets zodiac order of the rasis.
 *
 * Python: parivritti_cyclic(dcf, dirn=1)
 *
 * @param dcf - Divisional chart factor
 * @param dirn - Direction
 * @returns Array of tuples, one per rasi, each containing dcf varga signs
 */
export function parivrittiCyclic(dcf: number, dirn = 1): number[][] {
  const pc: number[][] = [];
  let hs = 0;

  for (let r = 0; r < 12; r++) {
    const t: number[] = [];
    for (let h = 0; h < dcf; h++) {
      t.push(hs % 12);
      hs = ((hs + dirn) % 12 + 12) % 12;
    }
    pc.push(t);
  }

  return pc;
}

/**
 * Generate alternate parivritti tuple (Somanatha method).
 * Odd rasis get increasing rasis from Aries.
 * Even rasis get decreasing rasis from Pisces.
 *
 * Python: parivritti_alternate(dcf, dirn=1)
 *
 * @param dcf - Divisional chart factor
 * @param dirn - Direction
 * @returns Array of tuples, one per rasi
 */
export function parivrittiAlternate(dcf: number, dirn = 1): number[][] {
  const pc: number[][] = [];
  let hs1 = 0;
  let hs2 = 11;

  for (let r = 0; r < 12; r += 2) {
    const t1: number[] = [];
    const t2: number[] = [];
    for (let h = 0; h < dcf; h++) {
      t1.push(hs1 % 12);
      hs1 = ((hs1 + dirn) % 12 + 12) % 12;
      t2.push(hs2 % 12);
      hs2 = ((hs2 - dirn) % 12 + 12) % 12;
    }
    pc.push(t1);
    pc.push(t2);
  }

  return pc;
}

// ============================================================================
// SEARCH AND REPLACE
// ============================================================================

/**
 * Search and replace a string within elements of a 1D or 2D string array.
 *
 * Python: search_replace(input_list, s1, s2)
 *
 * @param list - 1D or 2D string array
 * @param search - String to search for
 * @param replace - Replacement string
 * @returns New array with replacements applied
 */
export function searchReplace(list: string[], search: string, replace: string): string[];
export function searchReplace(list: string[][], search: string, replace: string): string[][];
export function searchReplace(
  list: string[] | string[][],
  search: string,
  replace: string,
): string[] | string[][] {
  if (list.length === 0) return list;

  if (Array.isArray(list[0])) {
    // 2D array
    return (list as string[][]).map((row) =>
      row.map((element) => (element.includes(search) ? element.replace(search, replace) : element)),
    );
  }

  // 1D array
  return (list as string[]).map((element) =>
    element.includes(search) ? element.replace(search, replace) : element,
  );
}

// ============================================================================
// 1D TO 2D CHART CONVERSION
// ============================================================================

/** Map for South Indian chart layout (4x4 grid) */
const SOUTH_INDIAN_MAP = [
  [11, 0, 1, 2],
  [10, -1, -1, 3],
  [9, -1, -1, 4],
  [8, 7, 6, 5],
];

/** Map for East Indian chart layout (3x3 grid) */
const EAST_INDIAN_MAP = [
  ['2/1', '0', '11/10'],
  ['3', '', '9'],
  ['4/5', '6', '7/8'],
];

/**
 * Convert a 1D house chart (12 elements) to a 2D grid for display.
 *
 * Python: _convert_1d_house_data_to_2d(rasi_1d, chart_type)
 *
 * @param rasi1d - Array of 12 strings (house chart)
 * @param chartType - 'south_indian' or 'east_indian'
 * @returns 2D string array for chart rendering
 */
export function convertTo2dChart(
  rasi1d: string[],
  chartType: 'south_indian' | 'east_indian' = 'south_indian',
): string[][] {
  const separator = '/';

  if (chartType === 'south_indian') {
    const grid: string[][] = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ''));

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const rasi = SOUTH_INDIAN_MAP[i]![j]!;
        if (rasi >= 0 && rasi < 12) {
          grid[i]![j] = rasi1d[rasi] ?? '';
        }
      }
    }

    return grid;
  }

  // East Indian
  const grid: string[][] = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ''));

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const cellRasis = EAST_INDIAN_MAP[i]![j]!;
      if (!cellRasis) continue;

      const rasiIndices = cellRasis.split(separator).map(Number);
      const values = rasiIndices
        .map((r) => rasi1d[r] ?? '')
        .filter((v) => v.length > 0);
      grid[i]![j] = values.join(separator);
    }
  }

  return grid;
}

// ============================================================================
// DEEPTAAMSA RANGE
// ============================================================================

/**
 * Get deeptaamsa range of a planet.
 *
 * Python: deeptaamsa_range_of_planet(planet, planet_longitude_within_raasi)
 *
 * @param deeptaamsa - Deeptaamsa value for the planet (from const.deeptaamsa_of_planets)
 * @param longitudeInRasi - Planet longitude within the rasi (0-30)
 * @returns [minimum, maximum] of deeptaamsa range
 */
export function deeptaamsaRange(
  deeptaamsa: number,
  longitudeInRasi: number,
): [number, number] {
  return [longitudeInRasi - deeptaamsa, longitudeInRasi + deeptaamsa];
}

// ============================================================================
// TIME FRACTION
// ============================================================================

/**
 * Calculate the fraction of time remaining in a period.
 * Used for tithi fraction, nakshatra fraction, etc.
 *
 * Python: get_fraction(start_time_hrs, end_time_hrs, birth_time_hrs)
 *
 * @param startTime - Start time in hours
 * @param endTime - End time in hours
 * @param birthTime - Birth time in hours
 * @returns Fraction of the period remaining (0 to 1)
 */
export function getFraction(startTime: number, endTime: number, birthTime: number): number {
  let duration = endTime - startTime;

  if (startTime < 0) {
    duration = Math.floor(Math.abs(startTime) / 24 + 1) * 24 + endTime - Math.abs(startTime);
  }

  return Math.min((endTime - birthTime) / duration, 1.0);
}

// ============================================================================
// CYCLIC COUNTING
// ============================================================================

/**
 * Count nakshatras (stars) between two positions (inclusive).
 *
 * Python: count_stars = lambda from_star, to_star, dir=1, total=27
 *
 * @param fromStar - Starting nakshatra (0-26)
 * @param toStar - Ending nakshatra (0-26)
 * @param dir - Direction: 1 for forward, -1 for backward
 * @param total - Total number of nakshatras (default 27)
 * @returns Inclusive count (1 to total)
 */
export function countStars(fromStar: number, toStar: number, dir: 1 | -1 = 1, total = 27): number {
  if (dir === 1) {
    return ((toStar + total - fromStar) % total) + 1;
  }
  return ((fromStar + total - toStar) % total) + 1;
}

/**
 * Cyclic counting of stars with Abhijit (28 nakshatras).
 *
 * Python: cyclic_count_of_stars_with_abhijit
 *
 * @param fromStar - Starting star (1-based)
 * @param count - Number of steps
 * @param direction - 1 for forward, -1 for backward
 * @param starCount - Total stars (default 28, use 27 without Abhijit)
 * @returns Resulting star number (1-based)
 */
export function cyclicCountStars(
  fromStar: number,
  count: number,
  direction = 1,
  starCount = 27,
): number {
  return ((fromStar - 1 + (count - 1) * direction) % starCount + starCount) % starCount + 1;
}

/**
 * Cyclic counting of generic numbers.
 *
 * Python: cyclic_count_of_numbers
 *
 * @param fromNumber - Starting number (1-based)
 * @param toNumber - Step count
 * @param dir - Direction
 * @param numberCount - Total count (default 30)
 * @returns Resulting number (1-based)
 */
export function cyclicCountNumbers(
  fromNumber: number,
  toNumber: number,
  dir = 1,
  numberCount = 30,
): number {
  return (
    ((fromNumber - 1 + (toNumber - 1) * dir) % numberCount + numberCount) % numberCount + 1
  );
}

// ============================================================================
// CLOSEST ELEMENTS
// ============================================================================

/**
 * Find the closest pair of elements between two arrays.
 *
 * Python: closest_elements(arr1, arr2)
 *
 * @param arr1 - First array of numbers
 * @param arr2 - Second array of numbers
 * @returns The pair [a1, a2] with minimum absolute difference
 */
export function closestElements(arr1: number[], arr2: number[]): [number, number] | null {
  if (arr1.length === 0 || arr2.length === 0) return null;

  let bestPair: [number, number] = [arr1[0]!, arr2[0]!];
  let bestDiff = Infinity;

  for (const a1 of arr1) {
    for (const a2 of arr2) {
      if (a1 !== a2) {
        const diff = Math.abs(a1 - a2);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestPair = a1 > a2 ? [a1, a2] : [a1, a2];
        }
      }
    }
  }

  return bestPair;
}

/**
 * Find the element in the array closest to the given value.
 *
 * Python: closest_element_from_list
 *
 * @param arr - Array of numbers
 * @param value - Target value
 * @returns Closest element from the array
 */
export function closestElement(arr: number[], value: number): number {
  if (arr.length === 0) throw new Error('Array is empty');
  let closest = arr[0]!;
  let minDiff = Math.abs(closest - value);

  for (let i = 1; i < arr.length; i++) {
    const diff = Math.abs(arr[i]! - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = arr[i]!;
    }
  }

  return closest;
}

// ============================================================================
// LIST UTILITIES
// ============================================================================

/**
 * Flatten a list of lists.
 *
 * Python: flatten_list = lambda list: [item for sublist in list for item in sublist]
 *
 * @param list - Array of arrays
 * @returns Flattened array
 */
export function flattenList<T>(list: T[][]): T[] {
  return list.flat();
}

/**
 * Sort an array of tuples by a specific index.
 *
 * Python: sort_tuple = lambda tup, tup_index, reverse=False
 *
 * @param tuples - Array of arrays (tuples)
 * @param index - Index to sort by
 * @param reverse - Sort in descending order
 * @returns Sorted array
 */
export function sortTuples<T extends unknown[]>(
  tuples: T[],
  index: number,
  reverse = false,
): T[] {
  const sorted = [...tuples].sort((a, b) => {
    const va = a[index] as number;
    const vb = b[index] as number;
    return va - vb;
  });
  if (reverse) sorted.reverse();
  return sorted;
}

/**
 * Find the index of an element containing a substring in a 1D list.
 *
 * Python: get_1d_list_index
 *
 * @param list - Array of strings
 * @param search - String to search for
 * @param containsInElement - If true, uses 'includes'; otherwise exact match
 * @returns Index or -1 if not found
 */
export function indexOf1d(
  list: string[],
  search: string,
  containsInElement = false,
): number {
  for (let i = 0; i < list.length; i++) {
    if (containsInElement ? list[i]!.includes(search) : list[i] === search) {
      return i;
    }
  }
  return -1;
}

/**
 * Find the [row, col] index of an element in a 2D list.
 *
 * Python: get_2d_list_index
 *
 * @param matrix - 2D array of strings
 * @param search - String to search for
 * @param containsInElement - If true, uses 'includes'; otherwise exact match
 * @returns [row, col] or null if not found
 */
export function indexOf2d(
  matrix: string[][],
  search: string,
  containsInElement = false,
): [number, number] | null {
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!;
    for (let j = 0; j < row.length; j++) {
      if (containsInElement ? row[j]!.includes(search) : row[j] === search) {
        return [i, j];
      }
    }
  }
  return null;
}
