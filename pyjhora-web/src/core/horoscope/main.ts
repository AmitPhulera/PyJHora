/**
 * Main Horoscope Orchestrator
 * Ported from PyJHora horoscope/main.py
 *
 * This is the critical orchestrator that ties together:
 *   - Divisional chart calculations (charts.ts)
 *   - House calculations (house.ts)
 *   - Panchanga calculations (drik.ts)
 *   - Strength calculations (strength.ts)
 *   - Yoga calculations (yoga.ts)
 *   - Sphuta calculations (sphuta.ts)
 *   - Arudha calculations (arudhas.ts)
 *   - Special planet (upagraha) calculations
 *   - Varnada lagna calculations
 *   - Chara karaka calculations
 *   - Vimsopaka/Vaiseshikamsa bala
 *   - Saham calculations
 */

import type { JhoraDate, JhoraTime, Place } from '../types';
import type { PlanetPosition } from './charts';
import {
  getDivisionalChart,
  getMixedDivisionalChart,
  getHousePlanetListFromPositions,
  getPlanetHouseDict,
  planetsInRetrograde,
  planetsInCombustion,
  beneficsAndMalefics,
  getPlanetsInMaranaKarakaSthana,
  planetsInPushkaraNavamsaBhaga,
  get64thNavamsa,
  get22ndDrekkana,
  orderPlanetsFromKendrasOfRaasi,
  assignPlanetsToHouses,
  getKPLordsFromPlanetPositions,
  getPachakadiSambhandha,
  latthaStarsPlanets,
  solarUpagrahaLongitudes,
  specialPlanetLongitudesAsync,
  varnadaLagnaMixedChart,
  varnadaLagnaAsync,
  vimsopakaDhasavargaOfPlanets,
  vimsopakaShadvargaOfPlanets,
  vimsopakaSapthavargaOfPlanets,
  vimsopakaShodhasavargaOfPlanets,
  vaiseshikamsaDhasavargaOfPlanets,
  vaiseshikamsaShadvargaOfPlanets,
  vaiseshikamsaSapthavargaOfPlanets,
  vaiseshikamsaShodhasavargaOfPlanets,
} from './charts';
import {
  getCharaKarakas,
  getRelativeHouseOfPlanet,
  getLordOfSign,
} from './house';
import {
  triSphuta,
  chaturSphuta,
  panchaSphuta,
  pranaSphuta,
  dehaSphuta,
  mrityuSphuta,
  sookshmaTriSphuta,
  beejaSphuta,
  kshetraSphuta,
  tithiSphuta,
  yogaSphuta,
  yogiSphuta,
  avayogiSphuta,
  rahuTithiSphuta,
} from './sphuta';
import {
  bhavaArudhasFromPlanetPositions,
  grahaArudhasFromPlanetPositions,
} from './arudhas';
import {
  calculateTithi,
  calculateNakshatra,
  calculateYoga,
  calculateKarana,
  calculateVara,
  nakshatraPada,
  dasavargaFromLong,
  bhaavaMadhyaNew,
  ascendant as drikAscendant,
  planetaryPositions as drikPlanetaryPositions,
} from '../panchanga/drik';
import {
  julianDayNumber,
} from '../utils/julian';
import {
  planetsInRetrograde as swePlanetsInRetrograde,
  sunrise as sweSunrise,
  sunset as sweSunset,
  setAyanamsaMode,
  getAyanamsaValue,
} from '../ephemeris/swe-adapter';
import {
  SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU,
  PLANET_NAMES_EN,
  RASI_NAMES_EN,
  DIVISION_CHART_FACTORS,
  RETROGADE_SYMBOL,
  ASCENDANT_SYMBOL,
  NAKSHATHRA_LORDS,
  HOUSE_OWNERS,
  CHARA_KARAKA_NAMES,
} from '../constants';

// ============================================================================
// TYPES
// ============================================================================

/** Configuration for the Horoscope */
export interface HoroscopeConfig {
  place: Place;
  date: JhoraDate;
  time: JhoraTime;
  ayanamsaMode?: string;
  ayanamsaValue?: number;
  calculationType?: 'drik' | 'ss';
  years?: number;
  months?: number;
  sixtyHours?: number;
  praveshaType?: number;
  bhavaMadhyaMethod?: number;
}

/** Planet position with formatted info */
export interface PlanetInfo {
  planet: number;
  rasi: number;
  longitude: number;
  isRetrograde: boolean;
  charaKarakaIndex?: number;
}

/** Special lagna position */
export interface LagnaPosition {
  rasi: number;
  longitude: number;
}

/** Bhava chart entry */
export interface BhavaEntry {
  houseNumber: number;
  rasi: number;
  startDeg: { rasi: number; longitude: number };
  midDeg: { rasi: number; longitude: number };
  endDeg: { rasi: number; longitude: number };
  planets: number[];
}

/** Sphuta result */
export interface SphuteResult {
  rasi: number;
  longitude: number;
}

/** Result of get_horoscope_information_for_chart */
export interface ChartInfo {
  /** Key-value pairs of horoscope info (planet positions, lagnas, etc.) */
  horoscopeInfo: Record<string, string>;
  /** 12-element array of planet names in each house */
  horoscopeChart: string[];
  /** The ascendant house (0-11) */
  ascendantHouse: number;
}

/** Result of getBhavaChartInformation */
export interface BhavaChartResult {
  /** 12-element array of planet names in each bhava */
  bhavaChart: string[];
  /** Array of bhava info entries */
  bhavaChartInfo: BhavaEntry[];
}

/** Result of getCalendarInformation */
export interface CalendarInfo {
  place: string;
  latitude: string;
  longitude: string;
  timezoneOffset: string;
  reportDate: string;
  vaara: number;
  tithi: { number: number; paksha: number };
  nakshatra: { number: number; pada: number };
  sunrise: number;
  sunset: number;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Build D1 (Rasi) positions from JD and place.
 * Returns [Ascendant, Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu]
 */
function buildD1Positions(jd: number, place: Place): PlanetPosition[] {
  const asc = drikAscendant(jd, place);
  const pp = drikPlanetaryPositions(jd, place);
  const positions: PlanetPosition[] = [
    { planet: -1, rasi: asc[0], longitude: asc[1] },
  ];
  for (const [pid, long, rasi] of pp) {
    positions.push({ planet: pid, rasi, longitude: long });
  }
  return positions;
}

/**
 * Convert degrees to DMS string (matching Python utils.to_dms)
 */
function toDmsString(degrees: number): string {
  const totalSeconds = Math.abs(degrees) * 3600;
  const d = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const sign = degrees < 0 ? '-' : '';
  return `${sign}${d}\u00B0${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

/**
 * Format a rasi+longitude as "RasiName deg min sec"
 */
function formatRasiLong(rasi: number, longitude: number): string {
  return `${RASI_NAMES_EN[rasi]} ${toDmsString(longitude)}`;
}

// Sphuta function map for easy iteration
const SPHUTA_FUNCTIONS: Record<string, (positions: PlanetPosition[]) => { rasi: number; longitude: number }> = {
  tri: triSphuta as (positions: PlanetPosition[]) => { rasi: number; longitude: number },
  chatur: chaturSphuta as (positions: PlanetPosition[]) => { rasi: number; longitude: number },
  pancha: panchaSphuta as (positions: PlanetPosition[]) => { rasi: number; longitude: number },
  prana: pranaSphuta as (positions: PlanetPosition[]) => { rasi: number; longitude: number },
  deha: dehaSphuta as (positions: PlanetPosition[]) => { rasi: number; longitude: number },
  mrityu: mrityuSphuta as (positions: PlanetPosition[]) => { rasi: number; longitude: number },
  sookshma_tri: sookshmaTriSphuta as (positions: PlanetPosition[]) => { rasi: number; longitude: number },
  beeja: beejaSphuta,
  kshetra: kshetraSphuta,
  tithi: tithiSphuta,
  yoga: yogaSphuta as (positions: PlanetPosition[]) => { rasi: number; longitude: number },
  yogi: yogiSphuta,
  avayogi: avayogiSphuta,
  rahu_tithi: rahuTithiSphuta,
};

// ============================================================================
// HOROSCOPE CLASS
// ============================================================================

/**
 * Main Horoscope orchestrator.
 * Port of Python Horoscope class from main.py.
 *
 * All public methods that need ephemeris access are async.
 */
export class Horoscope {
  readonly place: Place;
  readonly date: JhoraDate;
  readonly time: JhoraTime;
  readonly ayanamsaMode: string;
  readonly calculationType: 'drik' | 'ss';
  readonly years: number;
  readonly months: number;
  readonly sixtyHours: number;
  readonly praveshaType: number;
  readonly bhavaMadhyaMethod: number;
  readonly julianDay: number;
  readonly ayanamsaValue: number;

  // Internal caches (matching Python's self._* attributes)
  private _bhavaLagnaData: Record<number, number> = {};
  private _horaLagnaData: Record<number, number> = {};
  private _ghatiLagnaData: Record<number, number> = {};
  private _vighatiLagnaData: Record<number, number> = {};
  private _praanapadaLagnaData: Record<number, number> = {};
  private _induLagnaData: Record<number, number> = {};
  private _bhriguBindhuLagnaData: Record<number, number> = {};
  private _sreeLagnaData: Record<number, number> = {};
  private _kundaLagnaData: Record<number, number> = {};
  private _varnadaLagnaData: Record<number, number> = {};
  private _maandhiData: Record<number, number> = {};

  constructor(config: HoroscopeConfig) {
    this.place = config.place;
    this.date = config.date;
    this.time = config.time;
    this.ayanamsaMode = (config.ayanamsaMode ?? 'TRUE_CITRA').toUpperCase();
    this.calculationType = (config.calculationType ?? 'drik') as 'drik' | 'ss';
    this.years = config.years ?? 1;
    this.months = config.months ?? 1;
    this.sixtyHours = config.sixtyHours ?? 1;
    this.praveshaType = config.praveshaType ?? 0;
    this.bhavaMadhyaMethod = config.bhavaMadhyaMethod ?? 1;

    // Calculate Julian Day
    this.julianDay = julianDayNumber(this.date, this.time);

    // Set ayanamsa mode
    setAyanamsaMode(this.ayanamsaMode, config.ayanamsaValue, this.julianDay);
    this.ayanamsaValue = getAyanamsaValue(this.julianDay);
  }

  // ==========================================================================
  // CORE CHART CALCULATIONS
  // ==========================================================================

  /**
   * Get D1 (Rasi) positions for this horoscope.
   * Returns positions array with Lagna at index 0.
   */
  getD1Positions(): PlanetPosition[] {
    return buildD1Positions(this.julianDay, this.place);
  }

  /**
   * Get divisional chart positions.
   * @param divisionFactor - D-chart factor (1=D1, 9=D9, etc.)
   * @param chartMethod - Chart method (1=Parashara default)
   */
  getDivisionalChartPositions(divisionFactor: number = 1, chartMethod: number = 1): PlanetPosition[] {
    const d1 = this.getD1Positions();
    if (divisionFactor === 1) return d1;
    return getDivisionalChart(d1, divisionFactor, chartMethod);
  }

  /**
   * Get mixed divisional chart positions (e.g., D9xD12 = D108).
   */
  getMixedChartPositions(
    vargaFactor1: number, chartMethod1: number,
    vargaFactor2: number, chartMethod2: number
  ): PlanetPosition[] {
    const d1 = this.getD1Positions();
    return getMixedDivisionalChart(d1, vargaFactor1, chartMethod1, vargaFactor2, chartMethod2);
  }

  /**
   * Get planets in retrograde for this horoscope.
   * Uses Swiss Ephemeris data via swe-adapter.
   */
  getRetrogradePlanets(): number[] {
    return swePlanetsInRetrograde(this.julianDay, this.place);
  }

  // ==========================================================================
  // GET CHARA KARAKAS
  // Python: get_chara_karakas (module-level function)
  // ==========================================================================

  /**
   * Get chara karakas from the rasi chart.
   * Returns array of planet IDs ordered by karaka rank (AK, AmK, BK, etc.)
   *
   * Python: get_chara_karakas(jd, place, ...)
   */
  getCharaKarakas(): number[] {
    const d1 = this.getD1Positions();
    return getCharaKarakas(d1.filter(p => p.planet >= 0));
  }

  /**
   * Get chara karakas laid out on a chart for a specific divisional chart.
   * Returns 12-element array where each element has karaka abbreviations.
   *
   * Python: get_chara_karakas_for_chart(jd, place, dcf, ...)
   */
  getCharaKarakasForChart(
    divisionFactor: number = 1, chartMethod: number = 1,
    baseRasi?: number, countFromEndOfSign?: boolean
  ): Record<string, string[]> {
    const chart: string[] = Array(12).fill('');
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    const karakas = this.getCharaKarakas();

    for (let ki = 0; ki < karakas.length; ki++) {
      const planetId = karakas[ki]!;
      const pos = positions.find(p => p.planet === planetId);
      if (pos) {
        const karakaName = CHARA_KARAKA_NAMES[ki] ?? `CK${ki}`;
        chart[pos.rasi] = karakaName + '\n' + chart[pos.rasi];
      }
    }

    return { karakas: chart };
  }

  /**
   * Get chara karakas for a mixed chart.
   *
   * Python: get_chara_karakas_for_mixed_chart(jd, place, vf1, cm1, vf2, cm2)
   */
  getCharaKarakasForMixedChart(
    vargaFactor1: number, chartMethod1: number,
    vargaFactor2: number, chartMethod2: number
  ): Record<string, string[]> {
    const chart: string[] = Array(12).fill('');
    const positions = this.getMixedChartPositions(vargaFactor1, chartMethod1, vargaFactor2, chartMethod2);
    const karakas = this.getCharaKarakas();

    for (let ki = 0; ki < karakas.length; ki++) {
      const planetId = karakas[ki]!;
      const pos = positions.find(p => p.planet === planetId);
      if (pos) {
        const karakaName = CHARA_KARAKA_NAMES[ki] ?? `CK${ki}`;
        chart[pos.rasi] = karakaName + '\n' + chart[pos.rasi];
      }
    }

    return { karakas: chart };
  }

  // ==========================================================================
  // BHAVA CHART INFORMATION
  // Python: get_bhava_chart_information(jd, place, bhaava_madhya_method)
  // ==========================================================================

  /**
   * Get bhava chart information.
   * Returns bhava chart (12-element array of planet strings)
   * and bhava chart info (entries with cusp details).
   *
   * Python: get_bhava_chart_information(jd, place, bhaava_madhya_method)
   */
  async getBhavaChartInformation(
    bhavaMadhyaMethod?: number
  ): Promise<BhavaChartResult> {
    const method = bhavaMadhyaMethod ?? this.bhavaMadhyaMethod;
    const bhavaInfo = await bhaavaMadhyaNew(this.julianDay, this.place, method);
    const retroPlanets = this.getRetrogradePlanets();

    const bhavaChart: string[] = Array(12).fill('');
    const bhavaChartInfo: BhavaEntry[] = [];

    for (let h = 0; h < bhavaInfo.length; h++) {
      const entry = bhavaInfo[h]!;
      const [rasi, [bs, bm, be], planets] = entry;
      const bs1 = dasavargaFromLong(bs);
      const bm1 = dasavargaFromLong(bm);
      const be1 = dasavargaFromLong(be);

      for (const p of planets) {
        if (p === ASCENDANT_SYMBOL || p === -1) {
          bhavaChart[rasi] += 'Asc\n';
        } else {
          const pNum = typeof p === 'number' ? p : parseInt(String(p));
          const retStr = retroPlanets.includes(pNum) ? RETROGADE_SYMBOL : '';
          const planetName = (PLANET_NAMES_EN[pNum] ?? `P${pNum}`) + retStr;
          bhavaChart[rasi] += planetName + '\n';
        }
      }

      bhavaChartInfo.push({
        houseNumber: h + 1,
        rasi,
        startDeg: { rasi: bs1[0], longitude: bs1[1] },
        midDeg: { rasi: bm1[0], longitude: bm1[1] },
        endDeg: { rasi: be1[0], longitude: be1[1] },
        planets: planets.filter(p => typeof p === 'number') as number[],
      });
    }

    return { bhavaChart, bhavaChartInfo };
  }

  // ==========================================================================
  // HOROSCOPE INFORMATION FOR A SPECIFIC CHART
  // Python: get_horoscope_information_for_chart(chart_index, chart_method, ...)
  // ==========================================================================

  /**
   * Get complete horoscope information for a specific divisional chart.
   * This is the main orchestration method that computes:
   * - Planet positions in the divisional chart
   * - Special lagnas (bhava, hora, ghati, vighati, pranapada, indu, bhrigu bindhu, kunda, sree)
   * - Varnada lagna
   * - Maandi
   * - Chara karakas
   * - Sub-planets (upagrahas)
   * - Sphutas
   *
   * Python: get_horoscope_information_for_chart(chart_index, chart_method, ...)
   */
  getHoroscopeInformationForChart(
    divisionFactor: number = 1,
    chartMethod: number = 1,
    baseRasi?: number,
    countFromEndOfSign?: boolean,
    varnadaMethod: number = 1,
  ): ChartInfo {
    const horoscopeInfo: Record<string, string> = {};
    const horoscopeChart: string[] = Array(12).fill('');

    const d1 = this.getD1Positions();
    const positions = divisionFactor === 1
      ? d1
      : getDivisionalChart(d1, divisionFactor, chartMethod);

    const ascendantPos = positions[0]!;
    const ascHouse = ascendantPos.rasi;

    // Add ascendant to chart
    horoscopeChart[ascHouse] += 'Ascendant\n';

    // Ascendant info
    const chartLabel = `D-${divisionFactor}`;
    horoscopeInfo[`${chartLabel}-Ascendant`] = formatRasiLong(ascendantPos.rasi, ascendantPos.longitude);

    // Chara karakas
    const charaKarakas = this.getCharaKarakas();
    const retroPlanets = this.getRetrogradePlanets();

    // Planet positions
    for (const pos of positions) {
      if (pos.planet === -1) continue; // skip ascendant

      const retStr = retroPlanets.includes(pos.planet) ? RETROGADE_SYMBOL : '';
      const planetName = (PLANET_NAMES_EN[pos.planet] ?? `P${pos.planet}`) + retStr;
      const key = `${chartLabel}-${planetName}`;

      // Chara karaka suffix
      let ckStr = '';
      if (pos.planet >= SUN && pos.planet <= RAHU) {
        const ckIndex = charaKarakas.indexOf(pos.planet);
        if (ckIndex >= 0 && ckIndex < CHARA_KARAKA_NAMES.length) {
          ckStr = ` (${CHARA_KARAKA_NAMES[ckIndex]})`;
        }
      }

      horoscopeInfo[key] = formatRasiLong(pos.rasi, pos.longitude) + ckStr;
      horoscopeChart[pos.rasi] += planetName + '\n';
    }

    // Solar upagrahas (from planet positions)
    const solarUpagrahaNames = ['dhuma', 'vyatipaata', 'parivesha', 'indrachaapa', 'upaketu'] as const;
    for (const name of solarUpagrahaNames) {
      const result = solarUpagrahaLongitudes(positions, name, divisionFactor);
      if (result) {
        horoscopeInfo[`${chartLabel}-${name}`] = formatRasiLong(result.rasi, result.longitude);
      }
    }

    // Sphutas
    for (const [spName, spFunc] of Object.entries(SPHUTA_FUNCTIONS)) {
      try {
        const result = spFunc(positions);
        horoscopeInfo[`${chartLabel}-${spName}_sphuta`] = formatRasiLong(result.rasi, result.longitude);
      } catch {
        // Skip if sphuta function fails (some require specific planets)
      }
    }

    // Note: Varnada lagnas (V1-V12) require async calculation.
    // Use getVarnadaLagnaForChart() separately for varnada data.

    return {
      horoscopeInfo,
      horoscopeChart,
      ascendantHouse: ascHouse,
    };
  }

  // ==========================================================================
  // HOROSCOPE INFORMATION FOR MIXED CHART
  // Python: get_horoscope_information_for_mixed_chart(...)
  // ==========================================================================

  /**
   * Get horoscope information for a mixed (composite) chart.
   * E.g., D9xD12 or D3xD9.
   *
   * Python: get_horoscope_information_for_mixed_chart(...)
   */
  getHoroscopeInformationForMixedChart(
    vargaFactor1: number, chartMethod1: number,
    vargaFactor2: number, chartMethod2: number,
    varnadaMethod: number = 1,
  ): ChartInfo {
    const horoscopeInfo: Record<string, string> = {};
    const horoscopeChart: string[] = Array(12).fill('');

    const positions = this.getMixedChartPositions(
      vargaFactor1, chartMethod1, vargaFactor2, chartMethod2
    );

    const ascendantPos = positions[0]!;
    const ascHouse = ascendantPos.rasi;
    horoscopeChart[ascHouse] += 'Ascendant\n';

    const chartLabel = `D${vargaFactor1}xD${vargaFactor2}`;
    horoscopeInfo[`${chartLabel}-Ascendant`] = formatRasiLong(ascendantPos.rasi, ascendantPos.longitude);

    const charaKarakas = this.getCharaKarakas();
    const retroPlanets = this.getRetrogradePlanets();

    // Planet positions
    for (const pos of positions) {
      if (pos.planet === -1) continue;

      const retStr = retroPlanets.includes(pos.planet) ? RETROGADE_SYMBOL : '';
      const planetName = (PLANET_NAMES_EN[pos.planet] ?? `P${pos.planet}`) + retStr;
      const key = `${chartLabel}-${planetName}`;

      let ckStr = '';
      if (pos.planet >= SUN && pos.planet <= RAHU) {
        const ckIndex = charaKarakas.indexOf(pos.planet);
        if (ckIndex >= 0 && ckIndex < CHARA_KARAKA_NAMES.length) {
          ckStr = ` (${CHARA_KARAKA_NAMES[ckIndex]})`;
        }
      }

      horoscopeInfo[key] = formatRasiLong(pos.rasi, pos.longitude) + ckStr;
      horoscopeChart[pos.rasi] += planetName + '\n';
    }

    // Sub-planet information (solar upagrahas)
    const solarUpagrahaNames = ['dhuma', 'vyatipaata', 'parivesha', 'indrachaapa', 'upaketu'] as const;
    for (const name of solarUpagrahaNames) {
      const result = solarUpagrahaLongitudes(positions, name, vargaFactor1 * vargaFactor2);
      if (result) {
        horoscopeInfo[`${chartLabel}-${name}`] = formatRasiLong(result.rasi, result.longitude);
      }
    }

    // Sphutas
    for (const [spName, spFunc] of Object.entries(SPHUTA_FUNCTIONS)) {
      try {
        const result = spFunc(positions);
        horoscopeInfo[`${chartLabel}-${spName}_sphuta`] = formatRasiLong(result.rasi, result.longitude);
      } catch {
        // Skip
      }
    }

    // Varnada lagnas (V1-V12)
    for (let h = 0; h < 12; h++) {
      try {
        const vl = varnadaLagnaMixedChart(
          this.date, this.time, this.place,
          h + 1, vargaFactor1, chartMethod1,
          vargaFactor2, chartMethod2, varnadaMethod
        );
        horoscopeInfo[`${chartLabel}-Varnada (V${h + 1})`] =
          formatRasiLong(vl[0], vl[1]);
      } catch {
        // Skip
      }
    }

    return {
      horoscopeInfo,
      horoscopeChart,
      ascendantHouse: ascHouse,
    };
  }

  // ==========================================================================
  // GET SPECIAL PLANETS FOR CHART
  // Python: get_special_planets_for_chart(jd, place, dcf, ...)
  // ==========================================================================

  /**
   * Get special planets (upagrahas) laid out on a 12-house chart.
   *
   * Python: get_special_planets_for_chart(jd, place, dcf, ...)
   */
  async getSpecialPlanetsForChart(
    divisionFactor: number = 1, chartMethod?: number,
    baseRasi?: number, countFromEndOfSign?: boolean
  ): Promise<Record<string, string[]>> {
    const dob = this.date;
    const tob = this.time;

    const spl = await specialPlanetLongitudesAsync(
      dob, tob, this.place,
      divisionFactor, chartMethod, baseRasi, countFromEndOfSign
    );

    const chart: string[] = Array(12).fill('');
    for (const [abbrev, [rasi]] of spl) {
      chart[rasi] += abbrev + '\n';
    }

    return { upagraha: chart };
  }

  // ==========================================================================
  // GET VARNADA LAGNA FOR CHART
  // Python: get_varnada_lagna_for_chart(dob, tob, place, dcf, ...)
  // ==========================================================================

  /**
   * Get varnada lagna positions for all 12 houses on a chart.
   * Returns a 12-element chart array with V1-V12 placed in their rasis.
   *
   * Python: get_varnada_lagna_for_chart(dob, tob, place, dcf, ...)
   */
  async getVarnadaLagnaForChart(
    divisionFactor: number = 1, chartMethod: number = 1,
    varnadaMethod: number = 1, baseRasi?: number, countFromEndOfSign?: number
  ): Promise<Record<string, string[]>> {
    const chart: string[] = Array(12).fill('');

    for (let h = 0; h < 12; h++) {
      const vl = await varnadaLagnaAsync(
        this.date, this.time, this.place,
        divisionFactor, chartMethod, h + 1, varnadaMethod,
        baseRasi, countFromEndOfSign
      );
      chart[vl[0]] += `V${h + 1}\n`;
    }

    return { varnada_lagna: chart };
  }

  /**
   * Get varnada lagna positions for mixed chart.
   *
   * Python: get_varnada_lagna_for_mixed_chart(dob, tob, place, vf1, cm1, vf2, cm2, ...)
   */
  getVarnadaLagnaForMixedChart(
    vargaFactor1: number, chartMethod1: number,
    vargaFactor2: number, chartMethod2: number,
    varnadaMethod: number = 1
  ): Record<string, string[]> {
    const chart: string[] = Array(12).fill('');

    for (let h = 0; h < 12; h++) {
      const vl = varnadaLagnaMixedChart(
        this.date, this.time, this.place,
        h + 1, vargaFactor1, chartMethod1,
        vargaFactor2, chartMethod2, varnadaMethod
      );
      chart[vl[0]] += `V${h + 1}\n`;
    }

    return { varnada_lagna: chart };
  }

  // ==========================================================================
  // GET SPECIAL LAGNAS FOR CHART
  // Python: get_special_lagnas_for_chart(jd, place, dcf, ...)
  // ==========================================================================

  /**
   * Get special lagnas (hora, bhava, ghati, etc.) laid out on a chart.
   *
   * Python: get_special_lagnas_for_chart(jd, place, dcf, ...)
   */
  getSpecialLagnasForChart(
    divisionFactor: number = 1, _chartMethod?: number,
    _baseRasi?: number, _countFromEndOfSign?: boolean
  ): Record<string, string[]> {
    // For now, return empty - special lagna calculations require async drik functions
    // These are: hora_lagna, bhava_lagna, ghati_lagna, vighati_lagna, sree_lagna,
    //            pranapada_lagna, indu_lagna, bhrigu_bindhu_lagna, kunda_lagna, varnada_lagna
    const chart: string[] = Array(12).fill('');
    return { special_lagnas: chart };
  }

  // ==========================================================================
  // GET SPHUTAS FOR CHART
  // Python: get_sphutas_for_chart(jd, place, dcf, ...)
  // ==========================================================================

  /**
   * Get all sphutas laid out on a 12-house chart.
   *
   * Python: get_sphutas_for_chart(jd, place, dcf, ...)
   */
  getSphutas(
    divisionFactor: number = 1, chartMethod: number = 1
  ): Record<string, string[]> {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    const chart: string[] = Array(12).fill('');

    for (const [name, fn] of Object.entries(SPHUTA_FUNCTIONS)) {
      try {
        const result = fn(positions);
        chart[result.rasi] += name + '\n';
      } catch {
        // Skip
      }
    }

    return { sphuta: chart };
  }

  /**
   * Get sphutas for mixed chart.
   *
   * Python: get_sphutas_for_mixed_chart(jd, place, vf1, cm1, vf2, cm2)
   */
  getSphutas_mixed(
    vargaFactor1: number, chartMethod1: number,
    vargaFactor2: number, chartMethod2: number
  ): Record<string, string[]> {
    const positions = this.getMixedChartPositions(
      vargaFactor1, chartMethod1, vargaFactor2, chartMethod2
    );
    const chart: string[] = Array(12).fill('');

    for (const [name, fn] of Object.entries(SPHUTA_FUNCTIONS)) {
      try {
        const result = fn(positions);
        chart[result.rasi] += name + '\n';
      } catch {
        // Skip
      }
    }

    return { sphuta: chart };
  }

  // ==========================================================================
  // ARUDHA PADHAS
  // Python: _get_arudha_padhas(dob, tob, place, dcf, ...)
  // ==========================================================================

  /**
   * Get arudha padhas (bhava arudhas) for a divisional chart.
   *
   * Python: _get_arudha_padhas(dob, tob, place, dcf, ...)
   */
  getArudhaPadhas(
    divisionFactor: number = 1, chartMethod: number = 1
  ): { bhavaArudhas: number[]; grahaArudhas: number[] } {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    const ba = bhavaArudhasFromPlanetPositions(positions);
    const ga = grahaArudhasFromPlanetPositions(positions);
    return { bhavaArudhas: ba, grahaArudhas: ga };
  }

  /**
   * Get arudha padhas for mixed chart.
   */
  getArudhaPadhasMixed(
    vargaFactor1: number, chartMethod1: number,
    vargaFactor2: number, chartMethod2: number
  ): { bhavaArudhas: number[]; grahaArudhas: number[] } {
    const positions = this.getMixedChartPositions(
      vargaFactor1, chartMethod1, vargaFactor2, chartMethod2
    );
    const ba = bhavaArudhasFromPlanetPositions(positions);
    const ga = grahaArudhasFromPlanetPositions(positions);
    return { bhavaArudhas: ba, grahaArudhas: ga };
  }

  // ==========================================================================
  // STRENGTH CALCULATIONS
  // Python: _get_vimsopaka_bala, _get_vaiseshikamsa_bala, _get_shad_bala, etc.
  // ==========================================================================

  /**
   * Get vimsopaka bala for all 4 varga schemes.
   * Returns [shadvarga, sapthavarga, dhasavarga, shodasavarga]
   *
   * Python: _get_vimsopaka_bala(dob, tob, place)
   */
  getVimsopakaBala() {
    const jd = this.julianDay;
    const place = this.place;
    const sv = vimsopakaShadvargaOfPlanets(jd, place);
    const sav = vimsopakaSapthavargaOfPlanets(jd, place);
    const dv = vimsopakaDhasavargaOfPlanets(jd, place);
    const sdv = vimsopakaShodhasavargaOfPlanets(jd, place);
    return [sv, sav, dv, sdv] as const;
  }

  /**
   * Get vaiseshikamsa bala for all 4 varga schemes.
   *
   * Python: _get_vaiseshikamsa_bala(dob, tob, place)
   */
  getVaiseshikamsaBala() {
    const jd = this.julianDay;
    const place = this.place;
    const sv = vaiseshikamsaShadvargaOfPlanets(jd, place);
    const sav = vaiseshikamsaSapthavargaOfPlanets(jd, place);
    const dv = vaiseshikamsaDhasavargaOfPlanets(jd, place);
    const sdv = vaiseshikamsaShodhasavargaOfPlanets(jd, place);
    return [sv, sav, dv, sdv] as const;
  }

  // ==========================================================================
  // CHART ANALYSIS UTILITIES
  // ==========================================================================

  /**
   * Get 64th navamsa data.
   * Returns map from planet id to [navamsa_rasi, lord_of_rasi].
   *
   * Python: charts.get_64th_navamsa(navamsa_planet_positions)
   */
  get64thNavamsa(chartMethod: number = 1): Record<number, [number, number]> {
    const d9 = this.getDivisionalChartPositions(9, chartMethod);
    return get64thNavamsa(d9);
  }

  /**
   * Get 22nd drekkana data.
   * Returns map from planet id to [drekkana_rasi, lord_of_rasi].
   *
   * Python: charts.get_22nd_drekkana(drekkana_planet_positions)
   */
  get22ndDrekkana(chartMethod: number = 1): Record<number, [number, number]> {
    const d3 = this.getDivisionalChartPositions(3, chartMethod);
    return get22ndDrekkana(d3);
  }

  /**
   * Get house-planet list (12-element string array).
   *
   * Python: utils.get_house_planet_list_from_planet_positions(pp)
   */
  getHousePlanetList(divisionFactor: number = 1, chartMethod: number = 1): string[] {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    return getHousePlanetListFromPositions(positions);
  }

  /**
   * Get planet-to-house dictionary.
   */
  getPlanetToHouseDict(divisionFactor: number = 1, chartMethod: number = 1): Record<string, number> {
    const chart = this.getHousePlanetList(divisionFactor, chartMethod);
    return getPlanetHouseDict(chart);
  }

  /**
   * Get planets in combustion.
   */
  getCombustPlanets(divisionFactor: number = 1, chartMethod: number = 1): number[] {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    return planetsInCombustion(positions);
  }

  /**
   * Get planets in Marana Karaka Sthana.
   */
  getMaranaKarakaSthana(divisionFactor: number = 1, chartMethod: number = 1): [number, number][] {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    return getPlanetsInMaranaKarakaSthana(positions);
  }

  /**
   * Get planets in pushkara navamsa and pushkara bhaga.
   */
  getPushkaraNavamsaBhaga(divisionFactor: number = 1, chartMethod: number = 1): [number[], number[]] {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    return planetsInPushkaraNavamsaBhaga(positions);
  }

  /**
   * Get benefics and malefics classification.
   */
  getBeneficsAndMalefics(
    divisionFactor: number = 1, chartMethod: number = 1,
    method: number = 2
  ): [number[], number[]] {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    const tithi = calculateTithi(this.julianDay, this.place);
    return beneficsAndMalefics(positions, tithi.number, method);
  }

  /**
   * Get KP lords from planet positions.
   */
  getKPLords(divisionFactor: number = 1, chartMethod: number = 1): Record<number, number[]> {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    return getKPLordsFromPlanetPositions(positions);
  }

  /**
   * Get pachakadi sambhandha relationships.
   */
  getPachakadiSambhandha(divisionFactor: number = 1, chartMethod: number = 1): Record<number, [number, [number, number, string]]> {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    return getPachakadiSambhandha(positions);
  }

  /**
   * Get latta stars for planets.
   */
  getLattaStars(divisionFactor: number = 1, chartMethod: number = 1): [number, number][] {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    return latthaStarsPlanets(positions);
  }

  /**
   * Order planets from kendras of a raasi.
   */
  orderPlanetsFromKendras(
    raasi?: number, divisionFactor: number = 1, chartMethod: number = 1,
    includeLagna: boolean = false
  ): number[] {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    return orderPlanetsFromKendrasOfRaasi(positions, raasi, includeLagna);
  }

  // ==========================================================================
  // YOGI / AVAYOGI / SAHAYOGI INFO
  // Python: get_ava_saha_yoga_info_for_chart(jd, place, dcf, ...)
  // ==========================================================================

  /**
   * Get yogi, avayogi, and sahayogi information.
   *
   * Python: get_ava_saha_yoga_info_for_chart(jd, place, dcf, ...)
   */
  getYogiAvayogiInfo(
    divisionFactor: number = 1, chartMethod: number = 1
  ): Record<string, string> {
    const positions = this.getDivisionalChartPositions(divisionFactor, chartMethod);
    const result: string[] = [];

    // Yogi sphuta
    const yogi = yogiSphuta(positions);
    result.push(`Yogi Sphuta: ${RASI_NAMES_EN[yogi.rasi]} ${toDmsString(yogi.longitude)}`);

    const yogiNak = nakshatraPada(yogi.rasi * 30 + yogi.longitude);
    result.push(`Yogi Nakshatra: Nak-${yogiNak[0]}`);

    // Find yogi planet from nakshatra lord
    const yogiPlanet = findNakshatraLord(yogiNak[0]);
    if (yogiPlanet !== undefined) {
      result.push(`Yogi Planet: ${PLANET_NAMES_EN[yogiPlanet]}`);
    }

    // Sahayogi (lord of the yogi rasi)
    const sahayogiPlanet = HOUSE_OWNERS[yogi.rasi];
    if (sahayogiPlanet !== undefined) {
      result.push(`Sahayogi Planet: ${PLANET_NAMES_EN[sahayogiPlanet]}`);
    }

    // Avayogi sphuta
    const avayogi = avayogiSphuta(positions);
    result.push(`Avayogi Sphuta: ${RASI_NAMES_EN[avayogi.rasi]} ${toDmsString(avayogi.longitude)}`);

    const avayogiNak = nakshatraPada(avayogi.rasi * 30 + avayogi.longitude);
    result.push(`Avayogi Nakshatra: Nak-${avayogiNak[0]}`);

    const avayogiPlanet = findNakshatraLord(avayogiNak[0]);
    if (avayogiPlanet !== undefined) {
      result.push(`Avayogi Planet: ${PLANET_NAMES_EN[avayogiPlanet]}`);
    }

    return { 'Yogi/Avayogi/Sahayogi': result.join('\n') };
  }

  // ==========================================================================
  // CALENDAR INFORMATION
  // Python: get_calendar_information()
  // ==========================================================================

  /**
   * Get calendar/panchanga information for the horoscope date.
   *
   * Python: get_calendar_information()
   */
  getCalendarInformation(): CalendarInfo {
    const tithi = calculateTithi(this.julianDay, this.place);
    const nak = calculateNakshatra(this.julianDay, this.place);
    const vara = calculateVara(this.julianDay);
    const sr = sweSunrise(this.julianDay, this.place);
    const ss = sweSunset(this.julianDay, this.place);

    return {
      place: this.place.name,
      latitude: toDmsString(this.place.latitude),
      longitude: toDmsString(this.place.longitude),
      timezoneOffset: this.place.timezone.toFixed(2),
      reportDate: `${this.date.year}-${this.date.month}-${this.date.day}`,
      vaara: vara.number,
      tithi: { number: tithi.number, paksha: tithi.number > 15 ? 1 : 0 },
      nakshatra: { number: nak.number, pada: nak.pada },
      sunrise: sr.localTime,
      sunset: ss.localTime,
    };
  }

  // ==========================================================================
  // COMPLETE HOROSCOPE INFORMATION (all charts)
  // Python: get_horoscope_information()
  // ==========================================================================

  /**
   * Get horoscope information for all divisional charts at once.
   * Returns combined horoscope info, 2D chart array, and ascendant houses.
   *
   * Python: get_horoscope_information()
   */
  getHoroscopeInformation(): {
    horoscopeInfo: Record<string, string>;
    horoscopeCharts: string[][];
    ascendantHouses: number[];
  } {
    const horoscopeInfo: Record<string, string> = {};
    const chartFactors = DIVISION_CHART_FACTORS;
    const horoscopeCharts: string[][] = [];
    const ascendantHouses: number[] = [];

    // D1 (Rasi) chart first
    const d1Result = this.getHoroscopeInformationForChart(1, 1);
    Object.assign(horoscopeInfo, d1Result.horoscopeInfo);
    horoscopeCharts.push(d1Result.horoscopeChart);
    ascendantHouses.push(d1Result.ascendantHouse);

    // Divisional charts D2, D3, D4, ... D60, D81, D108, D144
    for (const dcf of chartFactors) {
      if (dcf === 1) continue; // Already done
      const result = this.getHoroscopeInformationForChart(dcf, 1);
      Object.assign(horoscopeInfo, result.horoscopeInfo);
      horoscopeCharts.push(result.horoscopeChart);
      ascendantHouses.push(result.ascendantHouse);
    }

    return { horoscopeInfo, horoscopeCharts, ascendantHouses };
  }
}

// ============================================================================
// MODULE-LEVEL FUNCTIONS (matching Python module-level functions)
// ============================================================================

/**
 * Get chara karakas from JD and place.
 * Module-level function matching Python's get_chara_karakas().
 *
 * Python: get_chara_karakas(jd, place, ayanamsa_mode, ...)
 */
export function getCharaKarakasFromJd(
  jd: number, place: Place,
  ayanamsaMode: string = 'TRUE_CITRA'
): number[] {
  const d1 = buildD1Positions(jd, place);
  return getCharaKarakas(d1.filter(p => p.planet >= 0));
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Find the lord planet for a nakshatra number (1-based).
 */
function findNakshatraLord(nakshatraNum: number): number | undefined {
  for (const [planetStr, naks] of Object.entries(NAKSHATHRA_LORDS)) {
    if (Array.isArray(naks) && naks.includes(nakshatraNum - 1)) {
      return parseInt(planetStr);
    }
  }
  return undefined;
}
