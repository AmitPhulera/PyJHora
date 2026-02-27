/**
 * useHoroscope — encapsulates all Swiss Ephemeris / panchanga calculation logic
 * extracted from App.tsx.
 */
import { useEffect, useState } from 'react';
import SwissEph from 'swisseph-wasm';

import { getAshtottariDashaBhukti } from '../core/dhasa/graha/ashtottari';
import { getChaturaseethiDashaBhukti } from '../core/dhasa/graha/chaturaseethi';
import { getDwadasottariDashaBhukti } from '../core/dhasa/graha/dwadasottari';
import { getDwisatpathiDashaBhukti } from '../core/dhasa/graha/dwisatpathi';
import { getNaisargikaDashaBhukti } from '../core/dhasa/graha/naisargika';
import { getPanchottariDashaBhukti } from '../core/dhasa/graha/panchottari';
import { getSaptharishiDashaBhukti } from '../core/dhasa/graha/saptharishi';
import { getSataabdikaDashaBhukti } from '../core/dhasa/graha/sataabdika';
import { getShastihayaniDashaBhukti } from '../core/dhasa/graha/shastihayani';
import { getShattrimsaDashaBhukti } from '../core/dhasa/graha/shattrimsa';
import { getShodasottariDashaBhukti } from '../core/dhasa/graha/shodasottari';
import { getTaraDashaBhukti } from '../core/dhasa/graha/tara';
import { getVimsottariDashaBhukti } from '../core/dhasa/graha/vimsottari';
import { getYoginiDashaBhukti } from '../core/dhasa/graha/yogini';
import {
  getChakraDashaBhukti,
  getCharaDashaBhukti,
  getDrigDashaBhukti,
  getKendradhiDashaBhukti,
  getLagnamsakaDashaBhukti,
  getMandookaDashaBhukti,
  getMoolaDashaBhukti,
  getNarayanaDashaBhukti,
  getNavamsaDashaBhukti,
  getNirayanaShoolaDashaBhukti,
  getShoolaDashaBhukti,
  getTrikonaDashaBhukti,
  getYogardhaDashaBhukti,
} from '../core/dhasa/raasi';
import {
  calculateKarana,
  calculateNakshatra,
  calculateTithi,
  calculateVara,
  calculateYoga,
} from '../core/panchanga/drik';
import type { Place } from '../core/types';
import { gregorianToJulianDay } from '../core/utils/julian';

// ============================================================================
// Public types (re-exported from HoroscopeContext too)
// ============================================================================

export interface BirthData {
  date: string;       // "YYYY-MM-DD"
  time: string;       // "HH:MM"
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: number;
}

export interface HoroscopeData {
  jd: number;
  place: Place;
  panchanga: {
    tithi: { number: number; name: string; paksha: 'shukla' | 'krishna' };
    nakshatra: { number: number; name: string; pada: number };
    yoga: { number: number; name: string };
    karana: { number: number; name: string };
    vara: { number: number; name: string };
  };
  planets: Array<{ planet: number; rasi: number; longitude: number; isRetrograde?: boolean }>;
  ascendantRasi: number;
  ascendantLongitude: number;
}

export interface DashaResult {
  mahadashas: Array<{
    lord: number;
    lordName: string;
    startDate: string;
    durationYears: number;
  }>;
  bhuktis?: Array<{
    dashaLord: number;
    bhuktiLord: number;
    bhuktiLordName: string;
    startDate: string;
  }>;
  balance?: {
    years: number;
    months: number;
    days: number;
  };
}

// ============================================================================
// Dasha systems registry
// ============================================================================

export const DASHA_SYSTEMS = [
  // GRAHA DASHAS
  { id: 'vimsottari', name: 'Vimsottari (120y)', description: 'Classic Nakshatra Dasha', type: 'graha' },
  { id: 'ashtottari', name: 'Ashtottari (108y)', description: '8 lords', type: 'graha' },
  { id: 'yogini', name: 'Yogini (36y x 3)', description: '8 Yoginis', type: 'graha' },
  { id: 'shodasottari', name: 'Shodasottari (116y)', description: '8 lords', type: 'graha' },
  { id: 'dwadasottari', name: 'Dwadasottari (112y)', description: '8 lords', type: 'graha' },
  { id: 'panchottari', name: 'Panchottari (105y)', description: '7 lords', type: 'graha' },
  { id: 'sataabdika', name: 'Sataabdika (100y)', description: '7 lords', type: 'graha' },
  { id: 'chaturaseethi', name: 'Chaturaseethi (84y)', description: '7 lords', type: 'graha' },
  { id: 'dwisatpathi', name: 'Dwisatpathi (144y)', description: '8 lords', type: 'graha' },
  { id: 'shattrimsa', name: 'Shattrimsa (108y)', description: '8 lords', type: 'graha' },
  { id: 'shastihayani', name: 'Shastihayani (60y)', description: '8 lords', type: 'graha' },
  { id: 'saptharishi', name: 'Saptharishi (100y)', description: 'Nakshatra lords', type: 'graha' },
  { id: 'naisargika', name: 'Naisargika (132y)', description: 'Age-based', type: 'graha' },
  { id: 'tara', name: 'Tara (120y)', description: '9 lords', type: 'graha' },
  // RAASI DASHAS
  { id: 'narayana', name: 'Narayana Dasha', description: 'Major Rasi Dasha', type: 'rasi' },
  { id: 'chara', name: 'Chara Dasha (K.N. Rao)', description: 'Jaimini Rasi Dasha', type: 'rasi' },
  { id: 'lagnamsaka', name: 'Lagnamsaka Dasha', description: 'Based on D-9 Lagna', type: 'rasi' },
  { id: 'navamsa', name: 'Navamsa Dasha', description: 'Rasi Dasha in D-9 (Fixed)', type: 'rasi' },
  { id: 'moola', name: 'Moola Dasha', description: 'Past Karma', type: 'rasi' },
  { id: 'kendradhi', name: 'Kendradhi Rasi Dasha', description: 'Uses Kendras from Stronger of Asc/7th', type: 'rasi' },
  { id: 'mandooka', name: 'Mandooka Dasha', description: 'Frog Jump progression', type: 'rasi' },
  { id: 'shoola', name: 'Shoola Dasha', description: 'For death/suffering (Fixed 9y)', type: 'rasi' },
  { id: 'nirayana', name: 'Nirayana Shoola Dasha', description: 'For longevity', type: 'rasi' },
  { id: 'drig', name: 'Drig Dasha', description: 'Aspect-based', type: 'rasi' },
  { id: 'trikona', name: 'Trikona Dasha', description: 'Trines-based', type: 'rasi' },
  { id: 'chakra', name: 'Chakra Dasha', description: 'Fixed 10y per sign', type: 'rasi' },
  { id: 'yogardha', name: 'Yogardha Dasha', description: 'Combines Chara/Sthira', type: 'rasi' },
] as const;

export type DashaSystemId = (typeof DASHA_SYSTEMS)[number]['id'];

// ============================================================================
// Swiss Ephemeris helpers (module-scoped singleton)
// ============================================================================

const PYJHORA_TO_SWE: Record<number, number> = {
  0: 0, 1: 1, 2: 4, 3: 2, 4: 5, 5: 3, 6: 6, 7: 10, 8: -1,
};

let sweInstance: SwissEph | null = null;

async function initSwissEph(): Promise<SwissEph> {
  if (!sweInstance) {
    sweInstance = new SwissEph();
    await sweInstance.initSwissEph();
  }
  return sweInstance;
}

async function calculateRealPlanetPositions(
  jdUtc: number,
): Promise<Array<{ planet: number; rasi: number; longitude: number; isRetrograde: boolean }>> {
  const swe = await initSwissEph();

  swe.set_sid_mode(1, 0, 0); // Lahiri
  const ayanamsa = swe.get_ayanamsa(jdUtc);
  const flags = 4 | 256; // SEFLG_MOSEPH | SEFLG_SPEED

  const positions: Array<{ planet: number; rasi: number; longitude: number; isRetrograde: boolean }> = [];
  let rahuLong = 0;

  for (let p = 0; p <= 8; p++) {
    const sweP = PYJHORA_TO_SWE[p];
    let long: number, speed: number;

    if (sweP === -1) {
      long = (rahuLong + 180) % 360;
      speed = 0;
    } else {
      try {
        const r = swe.calc_ut(jdUtc, sweP ?? 0, flags);
        if (!r || typeof r[0] !== 'number') {
          long = 0;
          speed = 0;
        } else {
          const tropical = ((r[0] % 360) + 360) % 360;
          long = ((tropical - ayanamsa) % 360 + 360) % 360;
          speed = r[3] ?? 0;
        }
        if (p === 7) rahuLong = long;
      } catch (err) {
        console.error(`Error calculating planet ${p} (sweP=${sweP}):`, err);
        long = 0;
        speed = 0;
      }
    }

    positions.push({
      planet: p,
      rasi: Math.floor(long / 30),
      longitude: long % 30,
      isRetrograde: p < 7 && speed < 0,
    });
  }

  return positions;
}

async function calculateRealAscendant(
  jd: number,
  place: Place,
): Promise<{ rasi: number; longitude: number }> {
  const swe = await initSwissEph();
  swe.set_sid_mode(1, 0, 0); // Lahiri
  const jdUtc = jd - place.timezone / 24;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SweModule = (swe as any).SweModule;
  const cuspsPtr = SweModule._malloc(13 * Float64Array.BYTES_PER_ELEMENT);
  const ascmcPtr = SweModule._malloc(10 * Float64Array.BYTES_PER_ELEMENT);
  const SEFLG_SIDEREAL = 65536;

  try {
    const retCode = SweModule.ccall(
      'swe_houses_ex',
      'number',
      ['number', 'number', 'number', 'number', 'number', 'pointer', 'pointer'],
      [jdUtc, SEFLG_SIDEREAL, place.latitude, place.longitude, 'P'.charCodeAt(0), cuspsPtr, ascmcPtr],
    );

    const ascmcArray = new Float64Array(SweModule.HEAPF64.buffer, ascmcPtr, 10);
    const siderealAsc = ascmcArray[0];

    if (retCode < 0 || !isFinite(siderealAsc) || siderealAsc === 0) {
      const ayanamsa = swe.get_ayanamsa(jdUtc);
      const cuspsArray = new Float64Array(SweModule.HEAPF64.buffer, cuspsPtr, 13);
      const tropicalAsc = cuspsArray[1];
      const fallbackAsc = ((tropicalAsc - ayanamsa) % 360 + 360) % 360;
      return { rasi: Math.floor(fallbackAsc / 30), longitude: fallbackAsc % 30 };
    }

    const normalizedAsc = ((siderealAsc % 360) + 360) % 360;
    return { rasi: Math.floor(normalizedAsc / 30), longitude: normalizedAsc % 30 };
  } finally {
    SweModule._free(cuspsPtr);
    SweModule._free(ascmcPtr);
  }
}

// ============================================================================
// Dasha calculator
// ============================================================================

export function calculateDasha(
  systemId: DashaSystemId,
  jd: number,
  place: Place,
): DashaResult {
  const options = { includeBhuktis: true };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawResult: any;

  switch (systemId) {
    case 'vimsottari':     rawResult = getVimsottariDashaBhukti(jd, place); break;
    case 'ashtottari':     rawResult = getAshtottariDashaBhukti(jd, place, options); break;
    case 'yogini':         rawResult = getYoginiDashaBhukti(jd, place, { ...options, cycles: 3 }); break;
    case 'shastihayani':   rawResult = getShastihayaniDashaBhukti(jd, place, options); break;
    case 'shodasottari':   rawResult = getShodasottariDashaBhukti(jd, place, options); break;
    case 'panchottari':    rawResult = getPanchottariDashaBhukti(jd, place, options); break;
    case 'dwadasottari':   rawResult = getDwadasottariDashaBhukti(jd, place, options); break;
    case 'sataabdika':     rawResult = getSataabdikaDashaBhukti(jd, place, options); break;
    case 'dwisatpathi':    rawResult = getDwisatpathiDashaBhukti(jd, place, { ...options, cycles: 2 }); break;
    case 'chaturaseethi':  rawResult = getChaturaseethiDashaBhukti(jd, place, options); break;
    case 'naisargika':     rawResult = getNaisargikaDashaBhukti(jd, place, { includeBhuktis: false }); break;
    case 'tara':           rawResult = getTaraDashaBhukti(jd, place, options); break;
    case 'shattrimsa':     rawResult = getShattrimsaDashaBhukti(jd, place, { ...options, cycles: 3 }); break;
    case 'saptharishi':    rawResult = getSaptharishiDashaBhukti(jd, place, options); break;
    case 'narayana':       rawResult = getNarayanaDashaBhukti(jd, place, options); break;
    case 'chara':          rawResult = getCharaDashaBhukti(jd, place, options); break;
    case 'lagnamsaka':     rawResult = getLagnamsakaDashaBhukti(jd, place, options); break;
    case 'navamsa':        rawResult = getNavamsaDashaBhukti(jd, place, options); break;
    case 'moola':          rawResult = getMoolaDashaBhukti(jd, place, options); break;
    case 'kendradhi':      rawResult = getKendradhiDashaBhukti(jd, place, options); break;
    case 'mandooka':       rawResult = getMandookaDashaBhukti(jd, place, options); break;
    case 'shoola':         rawResult = getShoolaDashaBhukti(jd, place, options); break;
    case 'nirayana':       rawResult = getNirayanaShoolaDashaBhukti(jd, place, options); break;
    case 'drig':           rawResult = getDrigDashaBhukti(jd, place, options); break;
    case 'trikona':        rawResult = getTrikonaDashaBhukti(jd, place, options); break;
    case 'chakra':         rawResult = getChakraDashaBhukti(jd, place, options); break;
    case 'yogardha':       rawResult = getYogardhaDashaBhukti(jd, place, options); break;
    default:               rawResult = getVimsottariDashaBhukti(jd, place); break;
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mahadashas: rawResult.mahadashas.map((m: any) => ({
      lord: m.lord ?? m.rasi ?? 0,
      lordName: m.lordName ?? m.rasiName ?? m.yoginiName ?? 'Unknown',
      startDate: m.startDate,
      durationYears: m.durationYears,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bhuktis: rawResult.bhuktis?.map((b: any) => ({
      dashaLord: b.dashaLord ?? b.dashaRasi ?? 0,
      bhuktiLord: b.bhuktiLord ?? b.bhuktiRasi ?? 0,
      bhuktiLordName: b.bhuktiLordName ?? b.bhuktiRasiName ?? b.bhuktiYoginiName ?? 'Unknown',
      startDate: b.startDate,
    })),
    balance: rawResult.balance,
  };
}

// ============================================================================
// Hook
// ============================================================================

interface UseHoroscopeResult {
  horoscope: HoroscopeData | null;
  isCalculating: boolean;
  error: string | null;
}

export function useHoroscope(birthData: BirthData | null): UseHoroscopeResult {
  const [horoscope, setHoroscope] = useState<HoroscopeData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!birthData) {
      setHoroscope(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsCalculating(true);
    setError(null);

    const calc = async () => {
      try {
        const [year, month, day] = birthData.date.split('-').map(Number);
        const [hour, minute] = birthData.time.split(':').map(Number);
        if (!year || !month || !day) {
          setHoroscope(null);
          return;
        }

        const place: Place = {
          name: birthData.placeName,
          latitude: birthData.latitude,
          longitude: birthData.longitude,
          timezone: birthData.timezone,
        };

        const jd = gregorianToJulianDay(
          { year, month, day },
          { hour: hour ?? 12, minute: minute ?? 0, second: 0 },
        );
        const jdUtc = jd - place.timezone / 24;

        const planets = await calculateRealPlanetPositions(jdUtc);
        const ascendant = await calculateRealAscendant(jd, place);

        const tithi = calculateTithi(jd, place);
        const nakshatra = calculateNakshatra(jd, place);
        const yoga = calculateYoga(jd, place);
        const karana = calculateKarana(jd, place);
        const vara = calculateVara(jd);

        if (!cancelled) {
          setHoroscope({
            jd,
            place,
            panchanga: { tithi, nakshatra, yoga, karana, vara },
            planets,
            ascendantRasi: ascendant.rasi,
            ascendantLongitude: ascendant.rasi * 30 + ascendant.longitude,
          });
        }
      } catch (err) {
        console.error('Calculation error:', err);
        if (!cancelled) {
          setHoroscope(null);
          setError(err instanceof Error ? err.message : 'Calculation failed');
        }
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    };

    calc();
    return () => { cancelled = true; };
  }, [birthData]);

  return { horoscope, isCalculating, error };
}
