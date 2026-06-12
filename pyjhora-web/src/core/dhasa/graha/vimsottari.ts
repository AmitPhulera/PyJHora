/**
 * Vimsottari Dasha System
 * Ported from PyJHora vimsottari.py
 * 
 * The most widely used dasha system spanning 120 years
 */

import {
  MOON,
  PLANET_NAMES_EN,
  SIDEREAL_YEAR,
  VIMSOTTARI_LORDS,
  VIMSOTTARI_TOTAL_YEARS,
  VIMSOTTARI_YEARS
} from '../../constants';
import type { Place } from '../../types';
import { daysToYMD, julianDayToGregorian } from '../../utils/julian';
import {
  resolveStartingPlanetLongitude,
  resolveStartingPlanetLongitudeSync
} from './special-planet-helper';

// ============================================================================
// TYPES
// ============================================================================

export interface DashaBalance {
  years: number;
  months: number;
  days: number;
}

export interface DashaPeriod {
  lord: number;
  lordName: string;
  startJd: number;
  startDate: string;
  endJd: number;
  endDate: string;
  durationYears: number;
}

export interface BhuktiPeriod {
  dashaLord: number;
  bhuktiLord: number;
  bhuktiLordName: string;
  startJd: number;
  startDate: string;
}

export interface AntardhasaPeriod {
  dashaLord: number;
  bhuktiLord: number;
  antaraLord: number;
  antaraLordName: string;
  startJd: number;
  startDate: string;
}

export interface PratyantardashaPeriod {
  dashaLord: number;
  bhuktiLord: number;
  antaraLord: number;
  pratyantaraLord: number;
  pratyantaraLordName: string;
  startJd: number;
  startDate: string;
}

export interface VimsottariResult {
  balance: DashaBalance;
  mahadashas: DashaPeriod[];
  bhuktis?: BhuktiPeriod[];
  antardashas?: AntardhasaPeriod[];
  pratyantardashas?: PratyantardashaPeriod[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Year duration in days (sidereal year) */
const YEAR_DURATION = SIDEREAL_YEAR;

/** Nakshatra lords in Vimsottari order */
const ADHIPATI_LIST = VIMSOTTARI_LORDS;

/** Dasha periods for each planet */
const DASHA_YEARS = VIMSOTTARI_YEARS;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the Vimsottari adhipati (lord) for a nakshatra
 * @param nakshatra - Nakshatra number (0-26)
 * @param seedStar - Seed star index (default 3 = Krittika)
 * @returns Planet index of the lord
 */
export function getVimsottariAdhipati(nakshatra: number, seedStar = 3): number {
  const index = ((nakshatra - seedStar + 3) % 9 + 9) % 9;
  return ADHIPATI_LIST[index]!;
}

/**
 * Get the next adhipati in the sequence
 * @param lord - Current lord
 * @param direction - 1 for forward, -1 for backward
 * @returns Next lord
 */
// @parity: py=vimsottari_next_adhipati
export function getNextAdhipati(lord: number, direction = 1): number {
  const currentIndex = ADHIPATI_LIST.indexOf(lord);
  if (currentIndex === -1) {
    throw new Error(`Invalid Vimsottari lord: ${lord}`);
  }
  const nextIndex = ((currentIndex + direction) % 9 + 9) % 9;
  return ADHIPATI_LIST[nextIndex]!;
}

/**
 * Format Julian Day as date string
 */
function formatJdAsDate(jd: number): string {
  const { date, time } = julianDayToGregorian(jd);
  const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? 'AM' : 'PM';
  const yearStr = date.year < 0 ? `${Math.abs(date.year)} BC` : date.year.toString();
  return `${yearStr}-${pad(date.month)}-${pad(date.day)} ${pad(hour12)}:${pad(time.minute)}:${pad(time.second)} ${ampm}`;
}

// ============================================================================
// DASHA START DATE CALCULATION
// ============================================================================

/**
 * Calculate the start date of the mahadasha at birth
 * @param jd - Julian Day Number (birth time)
 * @param place - Place data
 * @param starPositionFromMoon - Which nakshatra to use (1=moon, 4=kshema, 5=utpanna, 8=adhana)
 * @param seedStar - Seed star for calculation (default 3)
 * @param startingPlanet - Planet to calculate from (default Moon). 0-8 for planets, 'L' for Lagna.
 * @param divisionalChartFactor - Divisional chart factor (default 1 = Rasi)
 * @param dhasaStartingPlanet - Extended starting planet: 0-8, 'L', 'M', 'G', 'B', 'I', 'P', 'T'
 *   If provided, overrides startingPlanet. For M/G/B/I/P/T use the async version.
 * @returns [lord, startDate JD]
 */
// @parity: py=vimsottari_dasha_start_date
export function vimsottariDashaStartDate(
  jd: number,
  place: Place,
  starPositionFromMoon = 1,
  seedStar = 3,
  startingPlanet: number | string = MOON,
  divisionalChartFactor = 1
): [number, number] {
  const oneStar = 360 / 27; // 13°20'

  // Use the sync helper to resolve planet longitude
  const planetLong = resolveStartingPlanetLongitudeSync(
    startingPlanet, jd, place, divisionalChartFactor, 1, starPositionFromMoon
  );

  // Calculate nakshatra and position within it
  const nakIndex = Math.floor(planetLong / oneStar);
  const remainder = planetLong % oneStar;

  // Get the lord of this nakshatra
  const lord = getVimsottariAdhipati(nakIndex, seedStar);

  // Get the total period for this lord
  const period = DASHA_YEARS[lord] ?? 0;

  // Calculate how much of the period has elapsed
  const periodElapsedYears = (remainder / oneStar) * period;
  const periodElapsedDays = periodElapsedYears * YEAR_DURATION;

  // Start date is that many days before birth
  const startDate = jd - periodElapsedDays;

  return [lord, startDate];
}

/**
 * Async version of vimsottariDashaStartDate that supports special starting planets (M/G/B/I/P/T)
 */
export async function vimsottariDashaStartDateAsync(
  jd: number,
  place: Place,
  starPositionFromMoon = 1,
  seedStar = 3,
  startingPlanet: number | string = MOON,
  divisionalChartFactor = 1,
  chartMethod = 1
): Promise<[number, number]> {
  const oneStar = 360 / 27;

  const planetLong = await resolveStartingPlanetLongitude(
    startingPlanet, jd, place, divisionalChartFactor, chartMethod, starPositionFromMoon
  );

  const nakIndex = Math.floor(planetLong / oneStar);
  const remainder = planetLong % oneStar;
  const lord = getVimsottariAdhipati(nakIndex, seedStar);
  const period = DASHA_YEARS[lord] ?? 0;
  const periodElapsedYears = (remainder / oneStar) * period;
  const periodElapsedDays = periodElapsedYears * YEAR_DURATION;
  const startDate = jd - periodElapsedDays;

  return [lord, startDate];
}

// ============================================================================
// MAHADASHA CALCULATION
// ============================================================================

/**
 * Calculate all 9 mahadashas
 * @param jd - Julian Day Number
 * @param place - Place data
 * @param starPositionFromMoon - Which nakshatra to use
 * @param seedStar - Seed star
 * @param startingPlanet - Starting planet
 * @returns Map of lord to start date
 */
// @parity: py=vimsottari_mahadasa
export function vimsottariMahadasha(
  jd: number,
  place: Place,
  starPositionFromMoon = 1,
  seedStar = 3,
  startingPlanet: number | string = MOON,
  divisionalChartFactor = 1
): Map<number, number> {
  let [lord, startDate] = vimsottariDashaStartDate(
    jd, place, starPositionFromMoon, seedStar, startingPlanet, divisionalChartFactor
  );
  
  const dashas = new Map<number, number>();
  
  for (let i = 0; i < 9; i++) {
    dashas.set(lord, startDate);
    const periodYears = DASHA_YEARS[lord] ?? 0;
    startDate += periodYears * YEAR_DURATION;
    lord = getNextAdhipati(lord);
  }
  
  return dashas;
}

// ============================================================================
// BHUKTI CALCULATION
// ============================================================================

/**
 * Calculate bhuktis (sub-periods) for a mahadasha
 * @param mahaLord - Mahadasha lord
 * @param startDate - Start date of mahadasha
 * @param antardashaOption - Variation option (1-6)
 * @returns Map of bhukti lord to start date
 */
// @parity: py=_vimsottari_bhukti
export function vimsottariBhukti(
  mahaLord: number,
  startDate: number,
  antardashaOption = 1
): Map<number, number> {
  let lord = mahaLord;
  
  // Adjust starting lord based on option
  if (antardashaOption === 3 || antardashaOption === 4) {
    lord = getNextAdhipati(lord, 1);
  } else if (antardashaOption === 5 || antardashaOption === 6) {
    lord = getNextAdhipati(lord, -1);
  }
  
  // Direction
  const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;
  
  const bhuktis = new Map<number, number>();
  
  for (let i = 0; i < 9; i++) {
    bhuktis.set(lord, startDate);
    
    // Bhukti duration = (maha period * bhukti period) / total cycle
    const mahaYears = DASHA_YEARS[mahaLord] ?? 0;
    const bhuktiYears = DASHA_YEARS[lord] ?? 0;
    const factor = (mahaYears * bhuktiYears) / VIMSOTTARI_TOTAL_YEARS;
    
    startDate += factor * YEAR_DURATION;
    lord = getNextAdhipati(lord, direction);
  }
  
  return bhuktis;
}

// ============================================================================
// ANTARDASHA CALCULATION (Level 3)
// ============================================================================

/**
 * Calculate antardashas (sub-sub-periods) for a bhukti
 * @param mahaLord - Mahadasha lord
 * @param bhuktiLord - Bhukti lord
 * @param startDate - Start date of bhukti
 * @param antardashaOption - Variation option
 * @returns Map of antara lord to start date
 */
// @parity: py=_vimsottari_antara
export function vimsottariAntardasha(
  mahaLord: number,
  bhuktiLord: number,
  startDate: number,
  antardashaOption = 1
): Map<number, number> {
  let lord = bhuktiLord; // Normal Vimsottari starts sub-periods with the period lord

  // For options 2, 4, 6 (reverse), Antardashas might also need to reverse, 
  // but standard practice usually keeps nested levels consistent with the main system.
  // Using same logic as bhukti for starting lord adjustment if needed, but standard is starts with self.

  // Direction
  const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;
  if (direction === -1) {
    // If running backwards, do we start from self and go backwards?
    // Python implementation doesn't explicitly have separate antardasha function, it uses recursion.
    // Assuming standard behavior: starts with self, goes in direction.
  }

  const antardashas = new Map<number, number>();

  for (let i = 0; i < 9; i++) {
    antardashas.set(lord, startDate);

    // Antara duration = (maha * bhukti * antara) / (120 * 120)
    const mahaYears = DASHA_YEARS[mahaLord] ?? 0;
    const bhuktiYears = DASHA_YEARS[bhuktiLord] ?? 0;
    const antaraYears = DASHA_YEARS[lord] ?? 0;

    // factor in years
    const factor = (mahaYears * bhuktiYears * antaraYears) / (VIMSOTTARI_TOTAL_YEARS * VIMSOTTARI_TOTAL_YEARS);

    startDate += factor * YEAR_DURATION;
    lord = getNextAdhipati(lord, direction);
  }

  return antardashas;
}

// ============================================================================
// PRATYANTARDASHA CALCULATION (Level 4)
// ============================================================================

/**
 * Calculate pratyantardashas (sub-sub-sub-periods) for an antardasha
 * @param mahaLord - Mahadasha lord
 * @param bhuktiLord - Bhukti lord
 * @param antaraLord - Antardasha lord
 * @param startDate - Start date of antardasha
 * @param antardashaOption - Variation option
 * @returns Map of pratyantara lord to start date
 */
export function vimsottariPratyantardasha(
  mahaLord: number,
  bhuktiLord: number,
  antaraLord: number,
  startDate: number,
  antardashaOption = 1
): Map<number, number> {
  let lord = antaraLord;
  const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;

  const pratyantardashas = new Map<number, number>();

  for (let i = 0; i < 9; i++) {
    pratyantardashas.set(lord, startDate);

    const mahaYears = DASHA_YEARS[mahaLord] ?? 0;
    const bhuktiYears = DASHA_YEARS[bhuktiLord] ?? 0;
    const antaraYears = DASHA_YEARS[antaraLord] ?? 0;
    const pratyantaraYears = DASHA_YEARS[lord] ?? 0;

    // factor in years
    const factor = (mahaYears * bhuktiYears * antaraYears * pratyantaraYears) / Math.pow(VIMSOTTARI_TOTAL_YEARS, 3);

    startDate += factor * YEAR_DURATION;
    lord = getNextAdhipati(lord, direction);
  }

  return pratyantardashas;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Get complete Vimsottari dasha-bhukti data
 * @param jd - Julian Day Number (birth time)
 * @param place - Place data
 * @param options - Calculation options
 * @returns Vimsottari result with balance and periods
 */
// @parity: py=get_vimsottari_dhasa_bhukthi
export function getVimsottariDashaBhukti(
  jd: number,
  place: Place,
  options: {
    starPositionFromMoon?: number;
    seedStar?: number;
    startingPlanet?: number | string;
    includeBhuktis?: boolean;
    includeAntardashas?: boolean;
    includePratyantardashas?: boolean;
    antardashaOption?: number;
    divisionalChartFactor?: number;
    useTribhagiVariation?: boolean;
    dhasaStartingPlanet?: number | string;
  } = {}
): VimsottariResult {
  const {
    starPositionFromMoon = 1,
    seedStar = 3,
    includeBhuktis = true,
    includeAntardashas = false,
    includePratyantardashas = false,
    antardashaOption = 1,
    divisionalChartFactor = 1,
    useTribhagiVariation = false
  } = options;
  // dhasaStartingPlanet takes precedence over startingPlanet
  const startingPlanet: number | string = options.dhasaStartingPlanet ?? options.startingPlanet ?? MOON;

  // Tribhagi variation: divide each dasha by 3, run 3 cycles
  const tribhagiFactor = useTribhagiVariation ? 1 / 3 : 1;
  const dhasaCycles = useTribhagiVariation ? 3 : 1;

  // Get initial dasha lord and start date
  let [initialLord, initialStartJd] = vimsottariDashaStartDate(
    jd, place, starPositionFromMoon, seedStar, startingPlanet, divisionalChartFactor
  );

  // Build mahadashas with tribhagi support (multiple cycles)
  const mahadashas: DashaPeriod[] = [];
  let currentLord = initialLord;
  let currentStartJd = initialStartJd;

  for (let cycle = 0; cycle < dhasaCycles; cycle++) {
    if (cycle > 0) {
      // Reset lord to initial lord for subsequent cycles
      currentLord = initialLord;
    }
    for (let i = 0; i < 9; i++) {
      const periodYears = (DASHA_YEARS[currentLord] ?? 0) * tribhagiFactor;
      const endJd = currentStartJd + periodYears * YEAR_DURATION;

      mahadashas.push({
        lord: currentLord,
        lordName: PLANET_NAMES_EN[currentLord] ?? `Planet ${currentLord}`,
        startJd: currentStartJd,
        startDate: formatJdAsDate(currentStartJd),
        endJd,
        endDate: formatJdAsDate(endJd),
        durationYears: periodYears
      });

      currentStartJd = endJd;
      currentLord = getNextAdhipati(currentLord);
    }
  }

  // Calculate balance at birth
  const firstDasha = mahadashas[0]!;
  const secondDashaStart = mahadashas[1]?.startJd ?? (firstDasha.startJd + firstDasha.durationYears * YEAR_DURATION);
  const daysToSecondDasha = secondDashaStart - jd;
  const balance = daysToYMD(daysToSecondDasha);

  if (!includeBhuktis) {
    return {
      balance,
      mahadashas
    };
  }

  // Adjusted life span for tribhagi (used in bhukti calculation)
  const adjustedLifeSpan = VIMSOTTARI_TOTAL_YEARS * tribhagiFactor;

  // Calculate bhuktis and deeper levels
  const bhuktis: BhuktiPeriod[] = [];
  const antardashas: AntardhasaPeriod[] = [];
  const pratyantardashas: PratyantardashaPeriod[] = [];

  for (const dasha of mahadashas) {
    // Compute bhuktis manually with tribhagi-adjusted durations
    let bhuktiLord = dasha.lord;

    // Adjust starting lord based on antardasha option
    if (antardashaOption === 3 || antardashaOption === 4) {
      bhuktiLord = getNextAdhipati(bhuktiLord, 1);
    } else if (antardashaOption === 5 || antardashaOption === 6) {
      bhuktiLord = getNextAdhipati(bhuktiLord, -1);
    }

    const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;
    let bhuktiStartJd = dasha.startJd;

    for (let j = 0; j < 9; j++) {
      const mahaYears = DASHA_YEARS[dasha.lord] ?? 0;
      const bhuktiYears = DASHA_YEARS[bhuktiLord] ?? 0;
      const factor = (mahaYears * bhuktiYears) / VIMSOTTARI_TOTAL_YEARS * tribhagiFactor;

      bhuktis.push({
        dashaLord: dasha.lord,
        bhuktiLord,
        bhuktiLordName: PLANET_NAMES_EN[bhuktiLord] ?? `Planet ${bhuktiLord}`,
        startJd: bhuktiStartJd,
        startDate: formatJdAsDate(bhuktiStartJd)
      });

      if (includeAntardashas || includePratyantardashas) {
        // Antardasha calculation with tribhagi factor
        let antaraLord = bhuktiLord;
        let antaraStartJd = bhuktiStartJd;

        for (let k = 0; k < 9; k++) {
          const antaraYears = DASHA_YEARS[antaraLord] ?? 0;
          const antaraFactor = (mahaYears * bhuktiYears * antaraYears) /
            (VIMSOTTARI_TOTAL_YEARS * VIMSOTTARI_TOTAL_YEARS) * tribhagiFactor;

          antardashas.push({
            dashaLord: dasha.lord,
            bhuktiLord,
            antaraLord,
            antaraLordName: PLANET_NAMES_EN[antaraLord] ?? `Planet ${antaraLord}`,
            startJd: antaraStartJd,
            startDate: formatJdAsDate(antaraStartJd)
          });

          if (includePratyantardashas) {
            let pratyantaraLord = antaraLord;
            let pratyantaraStartJd = antaraStartJd;

            for (let l = 0; l < 9; l++) {
              const pratyantaraYears = DASHA_YEARS[pratyantaraLord] ?? 0;
              const pratyantaraFactor = (mahaYears * bhuktiYears * antaraYears * pratyantaraYears) /
                Math.pow(VIMSOTTARI_TOTAL_YEARS, 3) * tribhagiFactor;

              pratyantardashas.push({
                dashaLord: dasha.lord,
                bhuktiLord,
                antaraLord,
                pratyantaraLord,
                pratyantaraLordName: PLANET_NAMES_EN[pratyantaraLord] ?? `Planet ${pratyantaraLord}`,
                startJd: pratyantaraStartJd,
                startDate: formatJdAsDate(pratyantaraStartJd)
              });

              pratyantaraStartJd += pratyantaraFactor * YEAR_DURATION;
              pratyantaraLord = getNextAdhipati(pratyantaraLord, direction);
            }
          }

          antaraStartJd += antaraFactor * YEAR_DURATION;
          antaraLord = getNextAdhipati(antaraLord, direction);
        }
      }

      bhuktiStartJd += factor * YEAR_DURATION;
      bhuktiLord = getNextAdhipati(bhuktiLord, direction);
    }
  }

  const result: VimsottariResult = {
    balance,
    mahadashas,
    bhuktis
  };

  if (includeAntardashas) result.antardashas = antardashas;
  if (includePratyantardashas) result.pratyantardashas = pratyantardashas;

  return result;
}

// ============================================================================
// ASYNC VERSION (supports M/G/B/I/P/T special starting planets)
// ============================================================================

/**
 * Async version of getVimsottariDashaBhukti that supports special starting planets.
 * Use this when dhasaStartingPlanet is 'M', 'G', 'B', 'I', 'P', or 'T'.
 */
export async function getVimsottariDashaBhuktiAsync(
  jd: number,
  place: Place,
  options: {
    starPositionFromMoon?: number;
    seedStar?: number;
    startingPlanet?: number | string;
    includeBhuktis?: boolean;
    includeAntardashas?: boolean;
    includePratyantardashas?: boolean;
    antardashaOption?: number;
    divisionalChartFactor?: number;
    useTribhagiVariation?: boolean;
    dhasaStartingPlanet?: number | string;
    chartMethod?: number;
  } = {}
): Promise<VimsottariResult> {
  const {
    starPositionFromMoon = 1,
    seedStar = 3,
    divisionalChartFactor = 1,
    chartMethod = 1
  } = options;
  const startingPlanet: number | string = options.dhasaStartingPlanet ?? options.startingPlanet ?? MOON;

  // Get initial lord and start date via async (supports special planets)
  const [initialLord, initialStartJd] = await vimsottariDashaStartDateAsync(
    jd, place, starPositionFromMoon, seedStar, startingPlanet, divisionalChartFactor, chartMethod
  );

  // Delegate to the sync function with the resolved start data
  // Build a temporary options object that uses a regular planet
  // since we already resolved the start date
  return _buildVimsottariResult(jd, initialLord, initialStartJd, options);
}

/**
 * Internal helper: build VimsottariResult from resolved initial lord and start date.
 * Shared between sync and async paths.
 */
function _buildVimsottariResult(
  jd: number,
  initialLord: number,
  initialStartJd: number,
  options: {
    includeBhuktis?: boolean;
    includeAntardashas?: boolean;
    includePratyantardashas?: boolean;
    antardashaOption?: number;
    useTribhagiVariation?: boolean;
  }
): VimsottariResult {
  const {
    includeBhuktis = true,
    includeAntardashas = false,
    includePratyantardashas = false,
    antardashaOption = 1,
    useTribhagiVariation = false
  } = options;

  const tribhagiFactor = useTribhagiVariation ? 1 / 3 : 1;
  const dhasaCycles = useTribhagiVariation ? 3 : 1;

  const mahadashas: DashaPeriod[] = [];
  let currentLord = initialLord;
  let currentStartJd = initialStartJd;

  for (let cycle = 0; cycle < dhasaCycles; cycle++) {
    if (cycle > 0) currentLord = initialLord;
    for (let i = 0; i < 9; i++) {
      const periodYears = (DASHA_YEARS[currentLord] ?? 0) * tribhagiFactor;
      const endJd = currentStartJd + periodYears * YEAR_DURATION;
      mahadashas.push({
        lord: currentLord,
        lordName: PLANET_NAMES_EN[currentLord] ?? `Planet ${currentLord}`,
        startJd: currentStartJd,
        startDate: formatJdAsDate(currentStartJd),
        endJd,
        endDate: formatJdAsDate(endJd),
        durationYears: periodYears
      });
      currentStartJd = endJd;
      currentLord = getNextAdhipati(currentLord);
    }
  }

  const firstDasha = mahadashas[0]!;
  const secondDashaStart = mahadashas[1]?.startJd ?? (firstDasha.startJd + firstDasha.durationYears * YEAR_DURATION);
  const balance = daysToYMD(secondDashaStart - jd);

  if (!includeBhuktis) return { balance, mahadashas };

  const bhuktis: BhuktiPeriod[] = [];
  const antardashas: AntardhasaPeriod[] = [];
  const pratyantardashas: PratyantardashaPeriod[] = [];

  for (const dasha of mahadashas) {
    let bhuktiLord = dasha.lord;
    if (antardashaOption === 3 || antardashaOption === 4) bhuktiLord = getNextAdhipati(bhuktiLord, 1);
    else if (antardashaOption === 5 || antardashaOption === 6) bhuktiLord = getNextAdhipati(bhuktiLord, -1);
    const direction = (antardashaOption === 1 || antardashaOption === 3 || antardashaOption === 5) ? 1 : -1;
    let bhuktiStartJd = dasha.startJd;

    for (let j = 0; j < 9; j++) {
      const mahaYears = DASHA_YEARS[dasha.lord] ?? 0;
      const bhuktiYears = DASHA_YEARS[bhuktiLord] ?? 0;
      const factor = (mahaYears * bhuktiYears) / VIMSOTTARI_TOTAL_YEARS * tribhagiFactor;
      bhuktis.push({
        dashaLord: dasha.lord, bhuktiLord,
        bhuktiLordName: PLANET_NAMES_EN[bhuktiLord] ?? `Planet ${bhuktiLord}`,
        startJd: bhuktiStartJd, startDate: formatJdAsDate(bhuktiStartJd)
      });

      if (includeAntardashas || includePratyantardashas) {
        let antaraLord = bhuktiLord;
        let antaraStartJd = bhuktiStartJd;
        for (let k = 0; k < 9; k++) {
          const antaraYears = DASHA_YEARS[antaraLord] ?? 0;
          const antaraFactor = (mahaYears * bhuktiYears * antaraYears) /
            (VIMSOTTARI_TOTAL_YEARS * VIMSOTTARI_TOTAL_YEARS) * tribhagiFactor;
          antardashas.push({
            dashaLord: dasha.lord, bhuktiLord, antaraLord,
            antaraLordName: PLANET_NAMES_EN[antaraLord] ?? `Planet ${antaraLord}`,
            startJd: antaraStartJd, startDate: formatJdAsDate(antaraStartJd)
          });
          if (includePratyantardashas) {
            let pratyantaraLord = antaraLord;
            let pratyantaraStartJd = antaraStartJd;
            for (let l = 0; l < 9; l++) {
              const pratyantaraYears = DASHA_YEARS[pratyantaraLord] ?? 0;
              const pratyantaraFactor = (mahaYears * bhuktiYears * antaraYears * pratyantaraYears) /
                Math.pow(VIMSOTTARI_TOTAL_YEARS, 3) * tribhagiFactor;
              pratyantardashas.push({
                dashaLord: dasha.lord, bhuktiLord, antaraLord, pratyantaraLord,
                pratyantaraLordName: PLANET_NAMES_EN[pratyantaraLord] ?? `Planet ${pratyantaraLord}`,
                startJd: pratyantaraStartJd, startDate: formatJdAsDate(pratyantaraStartJd)
              });
              pratyantaraStartJd += pratyantaraFactor * YEAR_DURATION;
              pratyantaraLord = getNextAdhipati(pratyantaraLord, direction);
            }
          }
          antaraStartJd += antaraFactor * YEAR_DURATION;
          antaraLord = getNextAdhipati(antaraLord, direction);
        }
      }
      bhuktiStartJd += factor * YEAR_DURATION;
      bhuktiLord = getNextAdhipati(bhuktiLord, direction);
    }
  }

  const result: VimsottariResult = { balance, mahadashas, bhuktis };
  if (includeAntardashas) result.antardashas = antardashas;
  if (includePratyantardashas) result.pratyantardashas = pratyantardashas;
  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Find which dasha period a given date falls into
 * @param jd - Julian Day to check
 * @param mahadashas - List of mahadasha periods
 * @returns The mahadasha period or undefined
 */
export function findDashaPeriodForDate(jd: number, mahadashas: DashaPeriod[]): DashaPeriod | undefined {
  for (let i = mahadashas.length - 1; i >= 0; i--) {
    if (mahadashas[i]!.startJd <= jd) {
      return mahadashas[i];
    }
  }
  return undefined;
}
