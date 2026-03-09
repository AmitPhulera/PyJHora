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
// Saravali method: [Chathushpadha, Manava, Jalachara, Vanachara, Keeta]
// Python: VasiyaArray from Saravali.de -- indexed as [girl][boy]
const VASIYA_ARRAY = [
  [2.0, 0.5, 1.0, 0.0, 2.0],
  [0.5, 2.0, 0.0, 0.0, 0.0],
  [1.0, 0.0, 2.0, 2.0, 2.0],
  [0.0, 0.0, 2.0, 2.0, 0.0],
  [1.0, 0.0, 1.0, 0.0, 2.0],
];
const VASIYA_MAX = 2.0;

// South Indian vasiya lookup: for each girl rasi (0-11), list of compatible boy rasis
const VASIYA_SOUTH_LIST: number[][] = [
  [4, 7],    // Mesha (Aries)
  [3, 6],    // Rishabha (Taurus)
  [5],       // Mithuna (Gemini)
  [7, 8],    // Kataka (Cancer)
  [6],       // Simha (Leo)
  [2, 11],   // Kanya (Virgo)
  [5, 9],    // Thula (Libra)
  [3],       // Vrischika (Scorpio)
  [11],      // Dhanus (Sagittarius)
  [0, 10],   // Makara (Capricorn)
  [0],       // Kumbha (Aquarius)
  [9],       // Meena (Pisces)
];

// --- Gana ---
// 0-indexed nakshatra for _find_gana (Python uses 0-indexed internally)
const GANA_DEVA_0IDX = [0, 4, 6, 7, 12, 14, 16, 21, 26];
const GANA_MANUSHYA_0IDX = [1, 3, 5, 10, 11, 19, 20, 24, 25];
const GANA_RAKSHASA_0IDX = [2, 8, 9, 13, 15, 17, 18, 22, 23];

// 1-indexed nakshatra for South Indian gana classification
const GANA_SOUTH_DEVA = [1, 5, 7, 8, 13, 15, 17, 22, 27];
const GANA_SOUTH_MANUSHYA = [2, 4, 6, 8, 11, 12, 20, 21, 25, 26];
const GANA_SOUTH_RAKSHASA = [3, 9, 10, 14, 16, 18, 19, 23, 24];
const GANA_THRESHOLD_SOUTH = 14;

const GANA_ARRAY = [
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6],
];
const GANA_MAX = 6;

// --- Nakshatra/Tara/Dina ---
const NAKSHATRA_MAX = 3.0;

// --- Yoni ---
const YONI_MAPPINGS = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
// Python: YoniArray -- indexed as [girl_yoni][boy_yoni]
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

// Python: yoni_enemies_south -- 16 directed pairs (not symmetric; checked as exact match)
const YONI_ENEMIES_SOUTH: [number, number][] = [
  [0, 8], [1, 13], [2, 11], [3, 12], [3, 6], [4, 10], [5, 6],
  [6, 3], [6, 5], [7, 9], [8, 0], [9, 7], [10, 4], [11, 2], [12, 3], [13, 1],
];

// --- Raasi Adhipathi / Maitri ---
const RAASI_ADHIPATHI_MAPPINGS = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];
// Python: raasi_adhipathi_array -- indexed as [girl_lord][boy_lord]
const RAASI_ADHIPATHI_ARRAY = [
  [5.0, 5.0, 5.0, 4.0, 5.0, 0.0, 0.0],
  [5.0, 5.0, 4.0, 1.0, 4.0, 0.5, 0.5],
  [5.0, 4.0, 5.0, 0.5, 5.0, 3.0, 0.5],
  [4.0, 1.0, 0.5, 5.0, 0.5, 5.0, 4.0],
  [5.0, 4.0, 5.0, 0.5, 5.0, 0.5, 3.0],
  [0.0, 0.5, 3.0, 5.0, 0.5, 5.0, 5.0],
  [0.0, 0.5, 0.5, 4.0, 3.0, 5.0, 5.0],
];
// Python: raasi_adhipathi_array_south -- indexed as [girl_lord][boy_lord]
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
// Python: raasi_array -- indexed as [girl_rasi][boy_rasi]
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
const RAASI_THRESHOLD_SOUTH = 6;

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
const NECK_AAROGA_RAJJU = [413, 22];  // Match Python's actual values (413 is unreachable)
const FOOT_AAROGA_RAJJU = [1, 10, 19];
const WAIST_AAROGA_RAJJU = [2, 11, 20];
const STOMACH_AAROGA_RAJJU = [3, 12, 21];
// Combined aaroga nakshatras (ascending rajju) -- matching Python concatenation
const ALL_AAROGA = [...NECK_AAROGA_RAJJU, ...FOOT_AAROGA_RAJJU, ...WAIST_AAROGA_RAJJU, ...STOMACH_AAROGA_RAJJU];

// --- Sthree Dheerga ---
// Python const.py: sthree_dheerga_threshold = 13
const STHREE_DHEERGA_THRESHOLD_NORTH = 13;
const STHREE_DHEERGA_THRESHOLD_SOUTH = 7;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Count stars from one nakshatra to another (1-based, inclusive).
 * Matches Python: count_stars = lambda from_star,to_star: ((to_star + 27 - from_star) % 27) + 1
 */
export function countStars(fromStar: number, toStar: number): number {
  return ((toStar + 27 - fromStar) % 27) + 1;
}

/**
 * Count rasis from one rasi to another (1-based).
 * Matches Python: count_rasis = lambda from_rasi,to_rasi: ((to_rasi + 12 - from_rasi) % 12) + 1
 * Note: Python rasis are 1-based in compatibility.py. TS rasis are 0-based.
 * This function takes 0-based rasis and returns the 1-based count.
 */
export function countRasis(fromRasi: number, toRasi: number): number {
  return ((toRasi + 12 - fromRasi) % 12) + 1;
}

/**
 * Calculate rasi (0-based) from nakshatra (1-27) and paadha (1-4).
 * Matches Python _raasi_from_nakshatra_pada but returns 0-based instead of 1-based.
 */
export function rasiFromNakshatraPada(nakshatra: number, paadha: number): number {
  const totalPadas = (nakshatra - 1) * 4 + (paadha - 1);
  return Math.floor(totalPadas / 9) % 12;
}

/**
 * Find gana type from 0-indexed nakshatra.
 * Matches Python _find_gana which takes 0-indexed nakshatra.
 */
function findGana(nak0: number): number {
  if (GANA_DEVA_0IDX.includes(nak0)) return 0;
  if (GANA_MANUSHYA_0IDX.includes(nak0)) return 1;
  if (GANA_RAKSHASA_0IDX.includes(nak0)) return 2;
  return -1;
}

function getRajjuGroup(nakshatra: number): number {
  if (FOOT_RAJJU.includes(nakshatra)) return 0;
  if (WAIST_RAJJU.includes(nakshatra)) return 1;
  if (STOMACH_RAJJU.includes(nakshatra)) return 2;
  if (NECK_RAJJU.includes(nakshatra)) return 3;
  if (HEAD_RAJJU.includes(nakshatra)) return 4;
  return -1;
}

/**
 * Determine vasiya category for North Indian method.
 * 0=Chatushpada, 1=Manava, 2=Jalachara, 3=Vanachara, 4=Keeta
 * Python vasiya_porutham uses rasi (1-based) and paadham (1-based).
 * Our rasi is 0-based, so we add 1 for classification.
 */
function getVasiyaCategory(rasi0: number, paadham: number): number {
  const r = rasi0 + 1; // Convert to 1-based for Python parity
  const p = paadham;
  // Chatushpada: rasi 1,2 or (rasi 9, pada 3,4) or (rasi 10, pada 1,2)
  if (r === 1 || r === 2 || (r === 9 && (p === 3 || p === 4)) || (r === 10 && (p === 1 || p === 2))) return 0;
  // Manava: rasi 3,6,7,11 or (rasi 9, pada 1,2)
  if (r === 3 || r === 6 || r === 7 || r === 11 || (r === 9 && (p === 1 || p === 2))) return 1;
  // Jalachara: rasi 4,12 or (rasi 10, pada 3,4)
  if (r === 4 || r === 12 || (r === 10 && (p === 3 || p === 4))) return 2;
  // Vanachara: rasi 5
  if (r === 5) return 3;
  // Keeta: rasi 8
  return 4;
}

// ============================================================================
// PORUTHAM / KOOTA FUNCTIONS
// ============================================================================

export type Method = 'North' | 'South';

/**
 * Varna Porutham (1 point max in North, boolean in South).
 * Python: VarnaArray[gvk][bvk] where gvk/bvk = vasiya_raasi_list[rasi-1]
 * boyRasi/girlRasi are 0-based.
 */
export function varnaPorutham(
  boyRasi: number,
  girlRasi: number,
  method: Method = 'North',
): number | boolean {
  const boyVarna = VARNA_FROM_RASI[boyRasi % 12]!;
  const girlVarna = VARNA_FROM_RASI[girlRasi % 12]!;
  const score = VARNA_ARRAY[girlVarna]![boyVarna]!;
  if (method === 'South') return score === 1;
  return score * VARNA_MAX;
}

/**
 * Vasiya Porutham (2 points max in North, boolean in South).
 *
 * North: Uses rasi + paadham to classify into vasiya categories
 * (Chatushpada/Manava/Jalachara/Vanachara/Keeta), then looks up VASIYA_ARRAY.
 *
 * South: Uses a direct rasi-to-rasi compatibility list.
 *
 * boyRasi/girlRasi are 0-based.
 */
export function vasiyaPorutham(
  boyRasi: number,
  girlRasi: number,
  method: Method = 'North',
  boyPaadham: number = 1,
  girlPaadham: number = 1,
): number | boolean {
  if (method === 'South') {
    // Python: vasiya_porutham_south() checks if boy_raasi-1 is in vasiya_list[girl_raasi-1]
    // Both are 0-based in our code
    return VASIYA_SOUTH_LIST[girlRasi % 12]!.includes(boyRasi % 12);
  }
  // North: classify by rasi+paadham
  const boyCategory = getVasiyaCategory(boyRasi, boyPaadham);
  const girlCategory = getVasiyaCategory(girlRasi, girlPaadham);
  return VASIYA_ARRAY[girlCategory]![boyCategory]!;
}

/**
 * Gana Porutham (6 points max in North, boolean in South).
 * North: gana_array[girl_gana][boy_gana] using 0-indexed nakshatra classification.
 * South: Uses specific gana membership lists and threshold.
 */
export function ganaPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): number | boolean {
  if (method === 'South') {
    // Python gana_porutham_south: complex boolean logic
    const bn = boyNakshatra;
    const gn = girlNakshatra;
    if (
      (GANA_SOUTH_DEVA.includes(bn) && GANA_SOUTH_DEVA.includes(gn)) ||
      (GANA_SOUTH_MANUSHYA.includes(bn) && GANA_SOUTH_MANUSHYA.includes(gn)) ||
      (GANA_SOUTH_DEVA.includes(bn) && GANA_SOUTH_MANUSHYA.includes(gn)) ||
      (GANA_SOUTH_MANUSHYA.includes(bn) && GANA_SOUTH_DEVA.includes(gn)) ||
      (GANA_SOUTH_RAKSHASA.includes(bn) && GANA_SOUTH_RAKSHASA.includes(gn) && gn > GANA_THRESHOLD_SOUTH)
    ) {
      return true;
    }
    return false;
  }
  // North: use _find_gana (0-indexed nakshatra)
  const boyGana = findGana(boyNakshatra - 1);
  const girlGana = findGana(girlNakshatra - 1);
  return GANA_ARRAY[girlGana]![boyGana]!;
}

/**
 * Nakshatra/Tara/Dina Porutham (3 points max for North).
 * North: Checks both directions and sums the scores.
 * South: Uses completely different dina_porutham_south logic (returns boolean).
 *
 * Python: positions 3, 5, 7 give 1.5 each direction (count_stars is 1-based).
 */
export function nakshatraPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
  boyPaadham: number = 1,
  girlPaadham: number = 1,
): number | boolean {
  if (method === 'South') {
    return dinaPoruthamSouth(boyNakshatra, girlNakshatra, boyPaadham, girlPaadham);
  }

  let res = 0.0;

  // Python: count_from_girl = count_stars(girl, boy)
  const countFromGirl = countStars(girlNakshatra, boyNakshatra);
  const posFromGirl = countFromGirl % 9;
  if (posFromGirl === 3 || posFromGirl === 5 || posFromGirl === 7) {
    res += 1.5;
  }

  // Python: count_from_boy = count_stars(boy, girl)
  const countFromBoy = countStars(boyNakshatra, girlNakshatra);
  const posFromBoy = countFromBoy % 9;
  if (posFromBoy === 3 || posFromBoy === 5 || posFromBoy === 7) {
    res += 1.5;
  }

  return res;
}

/**
 * South Indian Dina Porutham (boolean).
 * Ported from Python dina_porutham_south().
 * count is count_from_boy = count_stars(boy, girl).
 */
function dinaPoruthamSouth(
  boyNakshatra: number,
  girlNakshatra: number,
  boyPaadham: number = 1,
  girlPaadham: number = 1,
): boolean {
  const boyRasi = rasiFromNakshatraPada(boyNakshatra, boyPaadham);
  const girlRasi = rasiFromNakshatraPada(girlNakshatra, girlPaadham);
  const count = countStars(boyNakshatra, girlNakshatra);

  if ([2, 4, 6, 8, 9, 11, 13, 15, 17, 18, 20, 21, 24, 25, 26].includes(count)) return true;

  // Exception dict: girl nakshatra -> allowed girl paadham values
  const exceptionDict: Record<number, number[]> = {
    12: [2, 3, 4],
    14: [1, 2, 3],
    16: [1, 2, 4],
  };
  for (const [k, vl] of Object.entries(exceptionDict)) {
    if (girlNakshatra === parseInt(k) && vl.includes(girlPaadham)) {
      return true;
    }
  }

  if (girlNakshatra === boyNakshatra) {
    if ([1, 3, 5, 10, 13, 15, 20, 23].includes(girlNakshatra) &&
        (girlRasi < boyRasi || girlPaadham < boyPaadham)) {
      return true;
    } else if (girlRasi !== boyRasi && boyRasi < girlRasi) {
      return true;
    }
  }

  if (girlRasi === boyRasi && boyNakshatra < girlNakshatra) {
    return true;
  }

  const exception22List: [number, number][] = [
    [4, 25], [7, 1], [8, 2], [10, 4], [12, 6], [13, 7],
    [14, 8], [17, 11], [21, 15], [25, 19], [26, 20], [27, 21],
  ];
  for (const [bn, gn] of exception22List) {
    if (boyNakshatra === bn && girlNakshatra === gn) return true;
  }

  return false;
}

/**
 * Yoni Porutham (4 points max in North, boolean in South).
 */
export function yoniPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): number | boolean {
  const boyYoni = YONI_MAPPINGS[(boyNakshatra - 1) % 27]!;
  const girlYoni = YONI_MAPPINGS[(girlNakshatra - 1) % 27]!;

  if (method === 'South') {
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
 * North: raasi_array lookup.
 * South: count_rasis(girl_rasi, boy_rasi) > raasi_threshold_south (6).
 * Note: Python rasis are 1-based; our rasis are 0-based.
 */
export function rasiPorutham(
  boyRasi: number,
  girlRasi: number,
  method: Method = 'North',
): number | boolean {
  if (method === 'South') {
    // Python: count_rasis(self.girl_raasi_number, self.boy_raasi_number) > const.raasi_threshold_south
    // Python rasis are 1-based. count_rasis(from, to) = ((to + 12 - from) % 12) + 1
    // With 0-based rasis, we need to add 1 to each before calling, or just use the formula directly.
    // Actually our countRasis already handles 0-based rasis and returns 1-based count.
    const count = countRasis(girlRasi, boyRasi);
    return count > RAASI_THRESHOLD_SOUTH;
  }
  const score = RAASI_ARRAY[girlRasi % 12]![boyRasi % 12]!;
  return score;
}

/** Alias for rasiPorutham */
export const bahutPorutham = rasiPorutham;

/**
 * Naadi Porutham (8 points max in North, boolean in South).
 */
export function naadiPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): number | boolean {
  const boyNaadi = NAADI_FROM_NAKSHATRA[(boyNakshatra - 1) % 27]!;
  const girlNaadi = NAADI_FROM_NAKSHATRA[(girlNakshatra - 1) % 27]!;
  const score = NAADI_ARRAY[boyNaadi]![girlNaadi]!;
  if (method === 'South') return score === 8;
  return score;
}

/**
 * Mahendra Porutham (boolean).
 * Good if boy's count from girl is in allowed list.
 * Python: rem = count_stars(girl, boy); rem in mahendra_porutham_array
 */
export function mahendraPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
): boolean {
  const count = countStars(girlNakshatra, boyNakshatra);
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
 */
export function rajjuPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): boolean {
  if (method === 'South') {
    const bnAaroga = ALL_AAROGA.includes(boyNakshatra);
    const gnAaroga = ALL_AAROGA.includes(girlNakshatra);
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
 * Python: count_from_girl = count_stars(girl, boy)
 */
export function sthreeDheergaPorutham(
  boyNakshatra: number,
  girlNakshatra: number,
  method: Method = 'North',
): boolean {
  const count = countStars(girlNakshatra, boyNakshatra);
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
  /** Only present for South method: whether minimum Tamil porutham criteria are met */
  minimumPorutham?: boolean;
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
    // Python South: varna = self.varna_porutham() which returns boolean
    const varnaVal = varnaPorutham(boyRasi, girlRasi, 'South') as boolean;
    const vasiyaVal = vasiyaPorutham(boyRasi, girlRasi, 'South') as boolean;
    const ganaVal = ganaPorutham(boyNakshatra, girlNakshatra, 'South') as boolean;
    const dinaVal = nakshatraPorutham(boyNakshatra, girlNakshatra, 'South', boyPaadha, girlPaadha) as boolean;
    const yoniVal = yoniPorutham(boyNakshatra, girlNakshatra, 'South') as boolean;
    const rasiAdhiVal = rasiAdhipathiPorutham(boyRasi, girlRasi, 'South') as boolean;
    const rasiVal = rasiPorutham(boyRasi, girlRasi, 'South') as boolean;
    const naadiVal = naadiPorutham(boyNakshatra, girlNakshatra, 'South') as boolean;

    // Python: compatibility_score = sum([dina,gana,mahendra,sthreeDheerga,yoni,raasi,raasi_adhipathi,vasiya,rajju,vedha])
    const total = [dinaVal, ganaVal, mahendra, sthreeDheerga, yoniVal, rasiVal, rasiAdhiVal, vasiyaVal, rajju, vedha]
      .filter(Boolean).length;

    // Python: _is_there_minimum_tamil_porutham (skip_varna_checking=True by default)
    // When skip_varna_checking: rajju AND dina AND gana AND raasi AND yoni
    const minimumPorutham = rajju && dinaVal && ganaVal && rasiVal && yoniVal;

    return {
      varna: varnaVal ? 1 : 0,
      vasiya: vasiyaVal ? 1 : 0,
      gana: ganaVal ? 1 : 0,
      dina: dinaVal ? 1 : 0,
      yoni: yoniVal ? 1 : 0,
      rasiAdhipathi: rasiAdhiVal ? 1 : 0,
      rasi: rasiVal ? 1 : 0,
      naadi: naadiVal ? 1 : 0,
      totalScore: total,
      maxScore: MAX_SCORE_SOUTH,
      mahendra, vedha, rajju, sthreeDheerga,
      minimumPorutham,
    };
  }

  // North Indian method
  const varna = varnaPorutham(boyRasi, girlRasi, 'North') as number;
  const vasiyaVal = vasiyaPorutham(boyRasi, girlRasi, 'North', boyPaadha, girlPaadha) as number;
  const gana = ganaPorutham(boyNakshatra, girlNakshatra, 'North') as number;
  const dina = nakshatraPorutham(boyNakshatra, girlNakshatra, 'North') as number;
  const yoni = yoniPorutham(boyNakshatra, girlNakshatra, 'North') as number;
  const rasiAdhi = rasiAdhipathiPorutham(boyRasi, girlRasi, 'North') as number;
  const rasi = rasiPorutham(boyRasi, girlRasi, 'North') as number;
  const naadi = naadiPorutham(boyNakshatra, girlNakshatra, 'North') as number;
  const total = varna + vasiyaVal + gana + dina + yoni + rasiAdhi + rasi + naadi;

  return {
    varna, vasiya: vasiyaVal, gana, dina, yoni,
    rasiAdhipathi: rasiAdhi, rasi, naadi,
    totalScore: total, maxScore: MAX_SCORE_NORTH,
    mahendra, vedha, rajju, sthreeDheerga,
  };
}
