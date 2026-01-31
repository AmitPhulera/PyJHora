/**
 * Ashtakavarga System
 * Ported from PyJHora ashtakavarga.py
 *
 * Calculates Binna Ashtaka Varga (BAV), Samudhaya Ashtaka Varga (SAV),
 * Prastara Ashtaka Varga, and Sodhaya Pindas.
 */

import { ASCENDANT_SYMBOL } from '../constants';

/**
 * Ashtakavarga contribution table
 * Keys: "0"-"7" representing Sun to Lagnam
 * Values: Array of 8 arrays (one per contributing planet/lagnam),
 *         each containing house positions (1-12) that give benefic points
 */
export const ASHTAKA_VARGA_DICT: Record<string, number[][]> = {
  "0": [ // Sun's BAV
    [1, 2, 4, 7, 8, 9, 10, 11],      // From Sun
    [3, 6, 10, 11],                   // From Moon
    [1, 2, 4, 7, 8, 9, 10, 11],      // From Mars
    [3, 5, 6, 9, 10, 11, 12],        // From Mercury
    [5, 6, 9, 11],                    // From Jupiter
    [6, 7, 12],                       // From Venus
    [1, 2, 4, 7, 8, 9, 10, 11],      // From Saturn
    [3, 4, 6, 10, 11, 12]            // From Lagnam
  ],
  "1": [ // Moon's BAV
    [3, 6, 7, 8, 10, 11],            // From Sun
    [1, 3, 6, 7, 9, 10, 11],         // From Moon
    [2, 3, 5, 6, 10, 11],            // From Mars
    [1, 3, 4, 5, 7, 8, 10, 11],      // From Mercury
    [1, 2, 4, 7, 8, 10, 11],         // From Jupiter
    [3, 4, 5, 7, 9, 10, 11],         // From Venus
    [3, 5, 6, 11],                    // From Saturn
    [3, 6, 10, 11]                   // From Lagnam
  ],
  "2": [ // Mars' BAV
    [3, 5, 6, 10, 11],               // From Sun
    [3, 6, 11],                       // From Moon
    [1, 2, 4, 7, 8, 10, 11],         // From Mars
    [3, 5, 6, 11],                    // From Mercury
    [6, 10, 11, 12],                  // From Jupiter
    [6, 8, 11, 12],                   // From Venus
    [1, 4, 7, 8, 9, 10, 11],         // From Saturn
    [1, 3, 6, 10, 11]                // From Lagnam
  ],
  "3": [ // Mercury's BAV
    [5, 6, 9, 11, 12],               // From Sun
    [2, 4, 6, 8, 10, 11],            // From Moon
    [1, 2, 4, 7, 8, 9, 10, 11],      // From Mars
    [1, 3, 5, 6, 9, 10, 11, 12],     // From Mercury
    [6, 8, 11, 12],                   // From Jupiter
    [1, 2, 3, 4, 5, 8, 9, 11],       // From Venus
    [1, 2, 4, 7, 8, 9, 10, 11],      // From Saturn
    [1, 2, 4, 6, 8, 10, 11]          // From Lagnam
  ],
  "4": [ // Jupiter's BAV
    [1, 2, 3, 4, 7, 8, 9, 10, 11],   // From Sun
    [2, 5, 7, 9, 11],                 // From Moon
    [1, 2, 4, 7, 8, 10, 11],         // From Mars
    [1, 2, 4, 5, 6, 9, 10, 11],      // From Mercury
    [1, 2, 3, 4, 7, 8, 10, 11],      // From Jupiter
    [2, 5, 6, 9, 10, 11],            // From Venus
    [3, 5, 6, 12],                    // From Saturn
    [1, 2, 4, 5, 6, 7, 9, 10, 11]   // From Lagnam
  ],
  "5": [ // Venus' BAV
    [8, 11, 12],                      // From Sun
    [1, 2, 3, 4, 5, 8, 9, 11, 12],   // From Moon
    [3, 4, 6, 9, 11, 12],            // From Mars
    [3, 5, 6, 9, 11],                 // From Mercury
    [5, 8, 9, 10, 11],                // From Jupiter
    [1, 2, 3, 4, 5, 8, 9, 10, 11],   // From Venus
    [3, 4, 5, 8, 9, 10, 11],         // From Saturn
    [1, 2, 3, 4, 5, 8, 9, 11]        // From Lagnam
  ],
  "6": [ // Saturn's BAV
    [1, 2, 4, 7, 8, 10, 11],         // From Sun
    [3, 6, 11],                       // From Moon
    [3, 5, 6, 10, 11, 12],           // From Mars
    [6, 8, 9, 10, 11, 12],           // From Mercury
    [5, 6, 11, 12],                   // From Jupiter
    [6, 11, 12],                      // From Venus
    [3, 5, 6, 11],                    // From Saturn
    [1, 3, 4, 6, 10, 11]             // From Lagnam
  ],
  "7": [ // Lagnam's BAV
    [3, 4, 6, 10, 11, 12],           // From Sun
    [3, 6, 10, 11, 12],              // From Moon
    [1, 3, 6, 10, 11],               // From Mars
    [1, 2, 4, 6, 8, 10, 11],         // From Mercury
    [1, 2, 4, 5, 6, 7, 9, 10, 11],   // From Jupiter
    [1, 2, 3, 4, 5, 8, 9],           // From Venus
    [1, 3, 4, 6, 10, 11],            // From Saturn
    [3, 6, 10, 11]                   // From Lagnam
  ]
};

/** Planet list for Ashtakavarga (Sun to Lagnam) */
export const ASHTAKAVARGA_PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'lagnam'];

/** Rasi list in Tamil (for reference) */
export const RASI_LIST = ['Mesham', 'Rishabam', 'Mithunam', 'Katakam', 'Simmam', 'Kanni',
                          'Thulaam', 'Vrichigam', 'Dhanusu', 'Makaram', 'Kumbam', 'Meenam'];

/** Result type for Ashtakavarga calculation */
export interface AshtakavargaResult {
  binnaAshtakavarga: number[][];      // [8][12] - BAV for each planet across 12 rasis
  samudhayaAshtakavarga: number[];    // [12] - SAV for each rasi
  prastaraAshtakavarga: number[][][]; // [8][9][12] - Detailed contribution matrix
}

/** Result type for Sodhaya Pindas */
export interface SodhayaPindasResult {
  raasiPindas: number[];  // [7] - Rasi pindas for Sun to Saturn
  grahaPindas: number[];  // [7] - Graha pindas for Sun to Saturn
  sodhyaPindas: number[]; // [7] - Sodhya pindas for Sun to Saturn
}

/**
 * Convert house_to_planet_list (string array) to planet_to_house dictionary
 * @param houseToPlanetList - Array of 12 strings, each containing planet IDs separated by '/'
 *        Example: ['6/1/7','','','','','','8/4','L','3/2','0','5','']
 * @returns Dictionary mapping planet ID (or 'L' for Lagnam) to house index
 */
export const getPlanetToHouseDictFromChart = (
  houseToPlanetList: string[]
): Record<number | string, number> => {
  const pToH: Record<number | string, number> = {};

  for (let h = 0; h < houseToPlanetList.length; h++) {
    const planets = houseToPlanetList[h];
    if (!planets) continue;

    // Check for each planet ID (0-8) and Lagnam symbol
    for (let p = 0; p <= 8; p++) {
      if (planets.includes(String(p))) {
        pToH[p] = h;
      }
    }
    // Check for Lagnam
    if (planets.includes(ASCENDANT_SYMBOL)) {
      pToH[ASCENDANT_SYMBOL] = h;
    }
  }

  return pToH;
};

/**
 * Calculate Binna, Samudhaya and Prastara Ashtaka Varga
 * @param houseToPlanetList - 1D array [0..11] with planets in each rasi
 *        Example: ['','','','','2','7','1/5','0','3/4','L','','6/8']
 * @returns AshtakavargaResult containing BAV, SAV, and PAV
 */
export const getAshtakavarga = (houseToPlanetList: string[]): AshtakavargaResult => {
  const pToH = getPlanetToHouseDictFromChart(houseToPlanetList);

  // Initialize matrices
  const raasiAshtaka: number[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 12 }, () => 0)
  );

  const prastaraAshtakavarga: number[][][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 10 }, () =>
      Array.from({ length: 12 }, () => 0)
    )
  );

  // Calculate Ashtakavarga
  for (const key of Object.keys(ASHTAKA_VARGA_DICT)) {
    const p = parseInt(key);
    const planetRaasiList = ASHTAKA_VARGA_DICT[key];

    for (let op = 0; op < planetRaasiList.length; op++) {
      const otherPlanet = planetRaasiList[op];
      let pr: number;

      if (op === 7) {
        // Lagnam
        pr = pToH[ASCENDANT_SYMBOL] ?? 0;
      } else {
        pr = pToH[op] ?? 0;
      }

      for (const raasi of otherPlanet) {
        const r = (raasi - 1 + pr) % 12;
        raasiAshtaka[p][r] += 1;
        prastaraAshtakavarga[p][op][r] = 1;
        prastaraAshtakavarga[p][prastaraAshtakavarga[p].length - 1][r] += 1;
      }
    }
  }

  // Extract results
  const binnaAshtakavarga = raasiAshtaka.slice(0, 8).map(row => [...row]);
  const prastaraResult = prastaraAshtakavarga.slice(0, 8).map(planet =>
    planet.slice(0, 9).map(row => [...row])
  );

  // Calculate Samudhaya (sum of BAV for Sun to Saturn, excluding Lagnam)
  const samudhayaAshtakavarga: number[] = Array.from({ length: 12 }, () => 0);
  for (let r = 0; r < 12; r++) {
    for (let p = 0; p < 7; p++) {  // Exclude Lagnam (index 7)
      samudhayaAshtakavarga[r] += binnaAshtakavarga[p][r];
    }
  }

  return {
    binnaAshtakavarga,
    samudhayaAshtakavarga,
    prastaraAshtakavarga: prastaraResult
  };
};

/**
 * Trikona Sodhana - First reduction step
 * Rule 1: If at least one rasi in a trikona has zero, no reduction
 * Rule 2: If all three rasis have same value, make them zero
 * Rule 3: Subtract minimum value from all three
 * @param binnaAshtakavarga - BAV matrix [8][12]
 * @returns Reduced BAV after Trikona Sodhana
 */
const trikonaSodhana = (binnaAshtakavarga: number[][]): number[][] => {
  const bav = binnaAshtakavarga.map(row => [...row]);

  for (let p = 0; p < 7; p++) {  // Sun to Saturn only
    for (let r = 0; r < 4; r++) {
      const val0 = bav[p][r];
      const val1 = bav[p][r + 4];
      const val2 = bav[p][r + 8];

      // Rule 1: If at least one rasi has zero, no reduction
      if (val0 === 0 || val1 === 0 || val2 === 0) {
        continue;
      }
      // Rule 2: If all three have same value, make them zero
      else if (val0 === val1 && val1 === val2) {
        bav[p][r] = 0;
        bav[p][r + 4] = 0;
        bav[p][r + 8] = 0;
      }
      // Rule 3: Subtract minimum from all
      else {
        const minValue = Math.min(val0, val1, val2);
        bav[p][r] -= minValue;
        bav[p][r + 4] -= minValue;
        bav[p][r + 8] -= minValue;
      }
    }
  }

  return bav;
};

/**
 * Ekadhipatya Sodhana - Second reduction step
 * Handles dual-owned signs (Mars, Mercury, Jupiter, Venus, Saturn)
 * @param bavAfterTrikona - BAV after Trikona Sodhana
 * @param chart1d - Original chart array
 * @returns Reduced BAV after Ekadhipatya Sodhana (Sodhita Ashtakavarga)
 */
const ekadhipatyaSodhana = (
  bavAfterTrikona: number[][],
  chart1d: string[]
): number[][] => {
  const bav = bavAfterTrikona.map(row => [...row]);

  // Rasi owners: [Sun's sign (Leo=4), Moon's sign (Cancer=3),
  //               Mars (Aries=0, Scorpio=7), Mercury (Gemini=2, Virgo=5),
  //               Jupiter (Sagittarius=8, Pisces=11), Venus (Taurus=1, Libra=6),
  //               Saturn (Capricorn=9, Aquarius=10)]
  const rasiOwners: (number | [number, number])[] = [4, 3, [0, 7], [2, 5], [8, 11], [1, 6], [9, 10]];

  // Process only dual-sign owners (Mars to Saturn, indices 2-6)
  for (let p = 2; p < 7; p++) {
    const [r1, r2] = rasiOwners[p] as [number, number];

    const r1Occupied = chart1d[r1]?.trim() !== '';
    const r2Occupied = chart1d[r2]?.trim() !== '';

    // Rule 1: If either BAV is 0, or Rule 2: Both rasis are occupied
    if ((bav[p][r1] === 0 || bav[p][r2] === 0) || (r1Occupied && r2Occupied)) {
      continue;
    }
    // Rule 4: Both rasis are empty
    else if (!r1Occupied && !r2Occupied) {
      if (bav[p][r1] !== bav[p][r2]) {
        // Rule 4(b): Different values - replace both with lower
        const minValue = Math.min(bav[p][r1], bav[p][r2]);
        bav[p][r1] = minValue;
        bav[p][r2] = minValue;
      } else {
        // Rule 4(a): Same values - make both zero
        bav[p][r1] = 0;
        bav[p][r2] = 0;
      }
    }
    // Rule 3: One rasi is occupied, other is empty
    else {
      if (r1Occupied) {
        // r2 is empty
        if (bav[p][r2] < bav[p][r1]) {
          // Rule 3(a): Empty rasi has lower value - make it zero
          bav[p][r2] = 0;
        } else {
          // Rule 3(b): Empty rasi has higher value - replace with occupied rasi value
          bav[p][r2] = bav[p][r1];
        }
      } else {
        // r1 is empty
        if (bav[p][r1] < bav[p][r2]) {
          // Rule 3(a): Empty rasi has lower value - make it zero
          bav[p][r1] = 0;
        } else {
          // Rule 3(b): Empty rasi has higher value - replace with occupied rasi value
          bav[p][r1] = bav[p][r2];
        }
      }
    }
  }

  return bav;
};

/**
 * Calculate Sodhya Pindas from BAV after Ekadhipatya Sodhana
 * @param bavAfterEkadhipatya - BAV after both sodhanas
 * @param chart1d - Original chart array
 * @returns Rasi Pindas, Graha Pindas, and Sodhya Pindas
 */
const calculateSodhyaPindas = (
  bavAfterEkadhipatya: number[][],
  chart1d: string[]
): SodhayaPindasResult => {
  const rasimanaMultipliers = [7, 10, 8, 4, 10, 6, 7, 8, 9, 5, 11, 12];
  const grahamanaMultipliers = [5, 5, 8, 5, 10, 7, 5];

  const bav = bavAfterEkadhipatya;
  const raasiPindas: number[] = Array(7).fill(0);
  const grahaPindas: number[] = Array(7).fill(0);
  const sodhyaPindas: number[] = Array(7).fill(0);

  // Calculate Rasi Pindas
  for (let p = 0; p < 7; p++) {
    let sum = 0;
    for (let r = 0; r < 12; r++) {
      sum += bav[p][r] * rasimanaMultipliers[r];
    }
    raasiPindas[p] = sum;
  }

  // Get planet houses (Sun to Saturn only)
  const pToH = getPlanetToHouseDictFromChart(chart1d);
  const planetHouses: number[] = [];
  for (let p = 0; p < 7; p++) {
    planetHouses.push(pToH[p] ?? 0);
  }

  // Calculate Graha Pindas and Sodhya Pindas
  for (let p = 0; p < 7; p++) {
    let grahaSum = 0;
    for (let i = 0; i < 7; i++) {
      const pr = planetHouses[i];
      grahaSum += grahamanaMultipliers[i] * bav[p][pr];
    }
    grahaPindas[p] = grahaSum;
    sodhyaPindas[p] = raasiPindas[p] + grahaPindas[p];
  }

  return { raasiPindas, grahaPindas, sodhyaPindas };
};

/**
 * Get Sodhaya Pindas from Binna Ashtaka Varga
 * @param binnaAshtakavarga - 2D array [8][12] of BAV values
 * @param houseToPlanetChart - Original chart array
 * @returns Rasi Pindas, Graha Pindas, and Sodhya Pindas for Sun to Saturn
 */
export const getSodhayaPindas = (
  binnaAshtakavarga: number[][],
  houseToPlanetChart: string[]
): SodhayaPindasResult => {
  const bavAfterTrikona = trikonaSodhana(binnaAshtakavarga);
  const bavAfterEkadhipatya = ekadhipatyaSodhana(bavAfterTrikona, houseToPlanetChart);
  // bavAfterEkadhipatya is called Sodhita Ashtakavarga

  return calculateSodhyaPindas(bavAfterEkadhipatya, houseToPlanetChart);
};

/**
 * Get Sodhita Ashtakavarga (BAV after both sodhanas)
 * @param binnaAshtakavarga - Original BAV
 * @param houseToPlanetChart - Original chart array
 * @returns Sodhita Ashtakavarga matrix
 */
export const getSodhitaAshtakavarga = (
  binnaAshtakavarga: number[][],
  houseToPlanetChart: string[]
): number[][] => {
  const bavAfterTrikona = trikonaSodhana(binnaAshtakavarga);
  return ekadhipatyaSodhana(bavAfterTrikona, houseToPlanetChart);
};
