/**
 * Ashtakoota (8-point) Marriage Compatibility System
 * Ported from PyJHora compatibility.py
 *
 * Supports both North Indian (36-point) and South Indian (10-point) methods.
 * All functions are pure-calc based on nakshatra and paadha numbers.
 */

// ============================================================================
// CONSTANTS & LOOKUP TABLES
// ============================================================================

/** Max score for North Indian method */
export const MAX_SCORE_NORTH = 36;
/** Max score for South Indian method */
export const MAX_SCORE_SOUTH = 10;

// --- Varna ---
// Python: vasiya_raasi_list = [1,3,2,0,1,3,2,0,1,3,2,0]
// 0=Brahmin, 1=Kshathirya, 2=Vaishya, 3=Shudra
const VARNA_FROM_RASI = [1, 3, 2, 0, 1, 3, 2, 0, 1, 3, 2, 0];
const VARNA_ARRAY = [
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [1, 1, 1, 0],
  [1, 1, 1, 1],
];
const VARNA_MAX = 1;

// --- Vasiya ---
const VASIYA_RASI_LIST = [1, 3, 2, 0, 1, 3, 2, 0, 1, 3, 2, 0];
// Saravali method: [Chathushpadha, Manava, Jalachara, Vanachara, Keeta]
// Python: VasiyaArray from Saravali.de — indexed as [girl][boy]
const VASIYA_ARRAY = [
  [2.0, 0.5, 1.0, 0.0, 2.0],
  [0.5, 2.0, 0.0, 0.0, 0.0],
  [1.0, 0.0, 2.0, 2.0, 2.0],
  [0.0, 0.0, 2.0, 2.0, 0.0],
  [1.0, 0.0, 1.0, 0.0, 2.0],
];
const VASIYA_MAX = 2.0;

// --- Gana ---
const GANA_NAKSHATRAS: Record<number, number[]> = {
  0: [1, 5, 7, 8, 13, 15, 17, 22, 27], // Deva
  1: [2, 4, 6, 11, 12, 20, 21, 25, 26], // Manushya
  2: [3, 9, 10, 14, 16, 18, 19, 23, 24], // Rakshasa
};
const GANA_ARRAY = [
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6],
];
const GANA_MAX = 6;

// --- Nakshatra/Tara/Dina ---
const NAKSHATRA_POSITIONS_SCORE: Record<number, number> = {
  3: 1.5, 5: 1.5, 7: 1.5, // Vipat, Pratyari, Vaadh → half score
};
const NAKSHATRA_MAX = 3.0;

// --- Yoni ---
const YONI_MAPPINGS = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
// Python: YoniArray — indexed as [girl_yoni][boy_yoni]
const YONI_ARRAY = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 1, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [1, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];
const YONI_MAX = 4;

// Python: yoni_enemies_south — 16 directed pairs (not symmetric; checked as exact match)
const YONI_ENEMIES_SOUTH: [number, number][] = [
  [0, 8], [1, 13], [2, 11], [3, 12], [3, 6], [4, 10], [5, 6],
  [6, 3], [6, 5], [7, 9], [8, 0], [9, 7], [10, 4], [11, 2], [12, 3], [13, 1],
];

// --- Raasi Adhipathi / Maitri ---
const RAASI_ADHIPATHI_MAPPINGS = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];
// Python: raasi_adhipathi_array — indexed as [girl_lord][boy_lord]
const RAASI_ADHIPATHI_ARRAY = [
  [5.0, 5.0, 5.0, 4.0, 5.0, 0.0, 0.0],
  [5.0, 5.0, 4.0, 1.0, 4.0, 0.5, 0.5],
  [5.0, 4.0, 5.0, 0.5, 5.0, 3.0, 0.5],
  [4.0, 1.0, 0.5, 5.0, 0.5, 5.0, 4.0],
  [5.0, 4.0, 5.0, 0.5, 5.0, 0.5, 3.0],
  [0.0, 0.5, 3.0, 5.0, 0.5, 5.0, 5.0],
  [0.0, 0.5, 0.5, 4.0, 3.0, 5.0, 5.0],
];
// Python: raasi_adhipathi_array_south — indexed as [girl_lord][boy_lord]
const RAASI_ADHIPATHI_ARRAY_SOUTH = [
  [0, 0, 0, 0, 1, 0, 0], // Sun has Jupiter as friend(s)
  [0, 0, 0, 1, 1, 0, 0], // Moon => Mercury and Jupiter
  [0, 0, 0, 1, 0, 1, 0], // Mars => Mercury, Venus
  [0, 1, 1, 0, 1, 1, 1], // Mercury => All but Sun
  [1, 1, 0, 1, 0, 1, 1], // Jupiter => All but Mars
  [0, 0, 1, 1, 1, 0, 1], // Venus => All but Sun/Moon
  [0, 0, 0, 1, 1, 1, 0], // Saturn => Mercury, Jupiter and Venus
];
const RAASI_ADHIPATHI_MAX = 5.0;

// --- Raasi ---
// Python: raasi_array — indexed as [girl_rasi][boy_rasi]
const RAASI_ARRAY = [
  [7, 0, 7, 7, 0, 0, 7, 0, 0, 7, 7, 0],
  [0, 7, 0, 7, 7, 0, 0, 7, 0, 0, 7, 7],
  [7, 0, 7, 0, 7, 7, 0, 0, 7, 0, 0, 7],
  [7, 7, 0, 7, 0, 7, 7, 0, 0, 7, 0, 0],
  [0, 7, 7, 0, 7, 0, 7, 7, 0, 0, 7, 0],
  [0, 0, 7, 7, 0, 7, 0, 7, 7, 0, 0, 7],
  [7, 0, 0, 7, 7, 0, 7, 0, 7, 7, 0, 0],
  [0, 7, 0, 0, 7, 7, 0, 7, 0, 7, 7, 0],
  [0, 0, 7, 0, 0, 7, 7, 0, 7, 0, 7, 7],
  [7, 0, 0, 7, 0, 0, 7, 7, 0, 7, 0, 7],
  [7, 7, 0, 7, 7, 0, 0, 7, 7, 0, 7, 0],
  [0, 7, 7, 0, 0, 7, 0, 0, 7, 7, 0, 7],
];
const RAASI_MAX = 7;

// --- Naadi ---
// Python: bvk = [0,1,2,2,1,0,0,1,2,2,1,0,0,1,2,2,1,0,0,1,2,2,1,0,0,1,2]
const NAADI_FROM_NAKSHATRA = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
const NAADI_ARRAY = [
  [0, 8, 8],
  [8, 0, 8],
  [8, 8, 0],
];
const NAADI_MAX = 8;

// --- Mahendra ---
const MAHENDRA_COUNTS = [4, 7, 10, 13, 16, 19, 22, 25];

// --- Vedha ---
const VEDHA_PAIR_SUMS = [19, 28, 37];

// --- Rajju ---
const HEAD_RAJJU = [5, 14, 23];
const NECK_RAJJU = [4, 6, 13, 15, 22, 24];
const STOMACH_RAJJU = [3, 7, 12, 16, 21, 25];
const WAIST_RAJJU = [2, 8, 11, 17, 20, 26];
const FOOT_RAJJU = [1, 9, 10, 18, 19, 27];

// --- South Indian Rajju: Aaroga (ascending) / Avaroga (descending) ---
// Python: neck_aaroga_rajju = [413,22] (typo in Python source: 413 should be 4,13 but we match Python behavior)
// The Python typo means nakshatra 4 and 13 are NOT in aaroga, only 22 is from neck aaroga.
const NECK_AAROGA_RAJJU = [413, 22];  // Match Python's actual values (413 is unreachable)
const FOOT_AAROGA_RAJJU = [1, 10, 19];
const WAIST_AAROGA_RAJJU = [2, 11, 20];
const STOMACH_AAROGA_RAJJU = [3, 12, 21];
// Combined aaroga nakshatras (ascending rajju) — matching Python concatenation
const ALL_AAROGA = [...NECK_AAROGA_RAJJU, ...FOOT_AAROGA_RAJJU, ...WAIST_AAROGA_RAJJU, ...STOMACH_AAROGA_RAJJU];

// --- Sthree Dheerga ---
const STHREE_DHEERGA_THRESHOLD_NORTH = 15;
const STHREE_DHEERGA_THRESHOLD_SOUTH = 7;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate rasi from nakshatra (1-27) and paadha (1-4).
 */
export function rasiFromNakshatraPada(nakshatra: number, paadha: number): number {
  const totalPadas = (nakshatra - 1) * 4 + (paadha - 1);
  return Math.floor(totalPadas / 9) % 12;
}

function getGanaType(nakshatra: number): number {
  for (let g = 0; g < 3; g++) {
    if (GANA_NAKSHATRAS[g]!.includes(nakshatra)) return g;
  }
  return 1; // Default to Manushya
}

function getRajjuGroup(nakshatra: number): number {
  if (FOOT_RAJJU.includes(nakshatra)) return 0;
  if (WAIST_RAJJU.includes(nakshatra)) return 1;
  if (STOMACH_RAJJU.includes(nakshatra)) return 2;
  if (NECK_RAJJU.includes(nakshatra)) return 3;
  if (HEAD_RAJJU.includes(nakshatra)) return 4;
  return -1;
}

// ============================================================================
// PORUTHAM / KOOTA FUNCTIONS
// ============================================================================

export type Method = 'North' | 'South';

/**
 * Varna Porutham (1 point max in North, boolean in South).
 */
export function varnaPorutham(
  boyRasi: number,
  girlRasi: number,
  method: Method = 'North',
): number | boolean {
  // Python: bvk = vasiya_raasi_list[boy_raasi-1]; gvk = vasiya_raasi_list[girl_raasi-1]
  // Python: VarnaArray[gvk][bvk] — girl row, boy column
  const boyVarna = VARNA_FROM_RASI[boyRasi % 12]!;
  const girlVarna = VARNA_FROM_RASI[girlRasi % 12]!;
  const score = VARNA_ARRAY[girlVarna]![boyVarna]!;
  if (method === 'South') return score === 1;
  return score * VARNA_MAX;
}

/**
 * Vasiya Porutham (2 points max in North, boolean in South).
 */
export function vasiyaPorutham(
  boyRasi: number,
  girlRasi: number,
  method: Method = 'North',
): number | boolean {
  // Python: VasiyaArray[Gvkpoint][Bvkpoint] — girl row, boy column
  const boyVasiya = VASIYA_RASI_LIST[boyRasi % 12]!;
  const girlVasiya = VASIYA_RASI_LIST[girlRasi % 12]!;
  const score = VASIYA_ARRAY[girlVasiya]![boyVasiya]!;
  if (method === 'South') return score >= 1.0;
  return score;
}

/**
 * Gana Porutham (6 points max in North, boolean in South).
 */
export function ganaPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): number | boolean {
  // Python: gana_array[girl_gana][boy_gana] — girl row, boy column
  const boyGana = getGanaType(boyNakshatra);
  const girlGana = getGanaType(girlNakshatra);
  const score = GANA_ARRAY[girlGana]![boyGana]!;
  if (method === 'South') return score >= 5;
  return score;
}

/**
 * Nakshatra/Tara/Dina Porutham (3 points max).
 * Checks both directions and sums the scores.
 * Python: positions 3, 5, 7 (Kshem, Sadhak, Mitra) give 1.5 each.
 * Other positions give 0. Max = 1.5 + 1.5 = 3.0.
 */
export function nakshatraPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
): number {
  let res = 0.0;

  // Count from girl's star to boy's
  let countFromGirl = ((boyNakshatra - girlNakshatra + 27) % 27) || 27;
  if (countFromGirl <= 0) countFromGirl += 27;
  const posFromGirl = countFromGirl % 9;
  if ([3, 5, 7].includes(posFromGirl)) {
    res += 1.5;
  }

  // Count from boy's star to girl's
  let countFromBoy = ((girlNakshatra - boyNakshatra + 27) % 27) || 27;
  if (countFromBoy <= 0) countFromBoy += 27;
  const posFromBoy = countFromBoy % 9;
  if ([3, 5, 7].includes(posFromBoy)) {
    res += 1.5;
  }

  return res;
}

/**
 * Yoni Porutham (4 points max in North, boolean in South).
 */
export function yoniPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): number | boolean {
  // Python: YoniArray[yoni_mappings[girl-1]][yoni_mappings[boy-1]] — girl row, boy column
  const boyYoni = YONI_MAPPINGS[(boyNakshatra - 1) % 27]!;
  const girlYoni = YONI_MAPPINGS[(girlNakshatra - 1) % 27]!;

  if (method === 'South') {
    // Python: not any([(ga,ba)==(a,e) for a,e in yoni_enemies_south])
    // ga = girl yoni, ba = boy yoni — exact directional match, not symmetric
    for (const [a, e] of YONI_ENEMIES_SOUTH) {
      if (girlYoni === a && boyYoni === e) {
        return false;
      }
    }
    return true;
  }

  return YONI_ARRAY[girlYoni]![boyYoni]!;
}

/**
 * Raasi Adhipathi / Maitri Porutham (5 points max in North, boolean in South).
 */
export function rasiAdhipathiPorutham(
  boyRasi: number,
  girlRasi: number,
  method: Method = 'North',
): number | boolean {
  // Python: raasi_adhipathi_array[girl_lord][boy_lord] — girl row, boy column
  const boyLord = RAASI_ADHIPATHI_MAPPINGS[boyRasi % 12]!;
  const girlLord = RAASI_ADHIPATHI_MAPPINGS[girlRasi % 12]!;

  if (method === 'South') {
    return RAASI_ADHIPATHI_ARRAY_SOUTH[girlLord]![boyLord]! === 1;
  }

  return RAASI_ADHIPATHI_ARRAY[girlLord]![boyLord]!;
}

/** Alias for rasiAdhipathiPorutham */
export const maitriPorutham = rasiAdhipathiPorutham;

/**
 * Raasi / Bahut Porutham (7 points max in North, boolean in South).
 */
export function rasiPorutham(
  boyRasi: number,
  girlRasi: number,
  method: Method = 'North',
): number | boolean {
  // Python: raasi_array[girl_raasi-1][boy_raasi-1] — girl row, boy column
  const score = RAASI_ARRAY[girlRasi % 12]![boyRasi % 12]!;
  if (method === 'South') return score > 0;
  return score;
}

/** Alias for rasiPorutham */
export const bahutPorutham = rasiPorutham;

/**
 * Naadi Porutham (8 points max).
 */
export function naadiPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
): number {
  const boyNaadi = NAADI_FROM_NAKSHATRA[(boyNakshatra - 1) % 27]!;
  const girlNaadi = NAADI_FROM_NAKSHATRA[(girlNakshatra - 1) % 27]!;
  return NAADI_ARRAY[boyNaadi]![girlNaadi]!;
}

/**
 * Mahendra Porutham (boolean).
 * Good if boy's count from girl is in allowed list.
 */
export function mahendraPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
): boolean {
  const count = ((boyNakshatra - girlNakshatra + 27) % 27) || 27;
  return MAHENDRA_COUNTS.includes(count);
}

/**
 * Vedha Porutham (boolean).
 * Good if boy+girl nakshatra sum is NOT in vedha pair sums.
 */
export function vedhaPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
): boolean {
  const sum = boyNakshatra + girlNakshatra;
  return !VEDHA_PAIR_SUMS.includes(sum);
}

/**
 * Rajju Porutham (boolean).
 * North: Good if boy and girl are not in the same rajju group.
 * South: Uses aaroga (ascending) / avaroga (descending) classification.
 *   If one is aaroga and the other is not, they are compatible (return true).
 *   Otherwise, fall back to the standard same-body-part check.
 */
export function rajjuPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): boolean {
  if (method === 'South') {
    // Python: rajju_porutham_south()
    const bnAaroga = ALL_AAROGA.includes(boyNakshatra);
    const gnAaroga = ALL_AAROGA.includes(girlNakshatra);
    // If one is ascending and the other is descending/head, compatible
    if ((bnAaroga && !gnAaroga) || (gnAaroga && !bnAaroga)) return true;
    // Fall through to standard same-body-part check
  }

  const boyGroup = getRajjuGroup(boyNakshatra);
  const girlGroup = getRajjuGroup(girlNakshatra);
  if (boyGroup === -1 || girlGroup === -1) return true;
  return boyGroup !== girlGroup;
}

/**
 * Sthree Dheerga Porutham (boolean).
 * Good if boy's count from girl exceeds threshold.
 */
export function sthreeDheergaPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): boolean {
  const count = ((boyNakshatra - girlNakshatra + 27) % 27) || 27;
  const threshold = method === 'South' ? STHREE_DHEERGA_THRESHOLD_SOUTH : STHREE_DHEERGA_THRESHOLD_NORTH;
  return count > threshold;
}

// ============================================================================
// AGGREGATION
// ============================================================================

export interface CompatibilityResult {
  varna: number;
  vasiya: number;
  gana: number;
  dina: number;
  yoni: number;
  rasiAdhipathi: number;
  rasi: number;
  naadi: number;
  totalScore: number;
  maxScore: number;
  mahendra: boolean;
  vedha: boolean;
  rajju: boolean;
  sthreeDheerga: boolean;
}

/**
 * Calculate complete compatibility score.
 * @param boyNakshatra - Boy's nakshatra number (1-27)
 * @param boyPaadha - Boy's paadha number (1-4)
 * @param girlNakshatra - Girl's nakshatra number (1-27)
 * @param girlPaadha - Girl's paadha number (1-4)
 * @param method - 'North' (36-point) or 'South' (10-point)
 */
export function compatibilityScore(
  boyNakshatra: number,
  boyPaadha: number,
  girlNakshatra: number,
  girlPaadha: number,
  method: Method = 'North',
): CompatibilityResult {
  const boyRasi = rasiFromNakshatraPada(boyNakshatra, boyPaadha);
  const girlRasi = rasiFromNakshatraPada(girlNakshatra, girlPaadha);

  const mahendra = mahendraPorutham(boyNakshatra, girlNakshatra);
  const vedha = vedhaPorutham(boyNakshatra, girlNakshatra);
  const rajju = rajjuPorutham(boyNakshatra, girlNakshatra, method);
  const sthreeDheerga = sthreeDheergaPorutham(boyNakshatra, girlNakshatra, method);

  if (method === 'South') {
    const varna = varnaPorutham(boyRasi, girlRasi, 'South') ? 1 : 0;
    const vasiya = vasiyaPorutham(boyRasi, girlRasi, 'South') ? 1 : 0;
    const gana = ganaPorutham(boyNakshatra, girlNakshatra, 'South') ? 1 : 0;
    const dina = nakshatraPorutham(boyNakshatra, girlNakshatra) >= 1.5 ? 1 : 0;
    const yoni = yoniPorutham(boyNakshatra, girlNakshatra, 'South') ? 1 : 0;
    const rasiAdhi = rasiAdhipathiPorutham(boyRasi, girlRasi, 'South') ? 1 : 0;
    const rasi = rasiPorutham(boyRasi, girlRasi, 'South') ? 1 : 0;
    const naadi = naadiPorutham(boyNakshatra, girlNakshatra) > 0 ? 1 : 0;
    const total = varna + vasiya + gana + dina + yoni + rasiAdhi + rasi + naadi +
      (mahendra ? 1 : 0) + (sthreeDheerga ? 1 : 0);

    return {
      varna, vasiya, gana, dina, yoni,
      rasiAdhipathi: rasiAdhi, rasi, naadi,
      totalScore: total, maxScore: MAX_SCORE_SOUTH,
      mahendra, vedha, rajju, sthreeDheerga,
    };
  }

  // North Indian method
  const varna = varnaPorutham(boyRasi, girlRasi, 'North') as number;
  const vasiya = vasiyaPorutham(boyRasi, girlRasi, 'North') as number;
  const gana = ganaPorutham(boyNakshatra, girlNakshatra, 'North') as number;
  const dina = nakshatraPorutham(boyNakshatra, girlNakshatra);
  const yoni = yoniPorutham(boyNakshatra, girlNakshatra, 'North') as number;
  const rasiAdhi = rasiAdhipathiPorutham(boyRasi, girlRasi, 'North') as number;
  const rasi = rasiPorutham(boyRasi, girlRasi, 'North') as number;
  const naadi = naadiPorutham(boyNakshatra, girlNakshatra);
  const total = varna + vasiya + gana + dina + yoni + rasiAdhi + rasi + naadi;

  return {
    varna, vasiya, gana, dina, yoni,
    rasiAdhipathi: rasiAdhi, rasi, naadi,
    totalScore: total, maxScore: MAX_SCORE_NORTH,
    mahendra, vedha, rajju, sthreeDheerga,
  };
}
