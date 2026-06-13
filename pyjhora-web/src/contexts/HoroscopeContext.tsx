import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { VARGA_NAMES } from '../core/constants';
import { getDivisionalChart } from '../core/horoscope/charts';
import {
  useHoroscope,
  calculateDasha,
  DASHA_SYSTEMS,
  type BirthData,
  type DashaResult,
  type DashaSystemId,
  type HoroscopeData,
} from '../hooks/useHoroscope';
import { useProfiles, type Profile } from '../hooks/useProfiles';

// ---------------------------------------------------------------------------
// Re-export types for consumer convenience
// ---------------------------------------------------------------------------
export type { BirthData, DashaResult, DashaSystemId, HoroscopeData };
export { DASHA_SYSTEMS };

// ---------------------------------------------------------------------------
// Chart data shape
// ---------------------------------------------------------------------------
export interface ChartData {
  planets: Array<{
    planet: number;
    rasi: number;
    longitude: number;
    isRetrograde: boolean;
  }>;
  ascendantRasi: number;
  title: string;
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------
interface HoroscopeContextValue {
  /* Birth input */
  birthData: BirthData | null;
  setBirthData: (data: BirthData | null) => void;

  /* Saved profiles */
  profiles: Profile[];
  loadProfile: (profile: Profile) => void;
  deleteProfile: (id: string) => void;

  /* Core horoscope */
  horoscope: HoroscopeData | null;
  isCalculating: boolean;
  error: string | null;

  /* Varga / divisional chart */
  selectedVarga: number;
  setSelectedVarga: (v: number) => void;
  chartData: ChartData | null;

  /* Dasha */
  selectedSystem: DashaSystemId;
  setSelectedSystem: (s: DashaSystemId) => void;
  dashaResult: DashaResult | null;
  selectedDasha: number | undefined;
  setSelectedDasha: (d: number | undefined) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const HoroscopeContext = createContext<HoroscopeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function HoroscopeProvider({ children }: { children: ReactNode }) {
  const [birthData, setBirthDataRaw] = useState<BirthData | null>(null);
  const [selectedVarga, setSelectedVarga] = useState<number>(1);
  const [selectedSystem, setSelectedSystem] = useState<DashaSystemId>('vimsottari');
  const [selectedDasha, setSelectedDasha] = useState<number | undefined>();

  // Core calculation
  const { horoscope, isCalculating, error } = useHoroscope(birthData);

  // Saved profiles (localStorage-backed)
  const { profiles, saveProfile, deleteProfile } = useProfiles();

  // Stable setter that also clears horoscope-dependent state
  const setBirthData = useCallback((data: BirthData | null) => {
    setBirthDataRaw(data);
    if (!data) {
      setSelectedVarga(1);
      setSelectedSystem('vimsottari');
      setSelectedDasha(undefined);
    }
  }, []);

  // Loading a saved profile is just setting birth data from it.
  const loadProfile = useCallback(
    (profile: Profile) => {
      setBirthData({
        name: profile.name,
        date: profile.date,
        time: profile.time,
        placeName: profile.placeName,
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezone: profile.timezone,
      });
    },
    [setBirthData],
  );

  // Auto-save: every successful calculation upserts a profile (deduped by
  // composite id, so re-viewing the same chart just bumps lastViewedAt).
  useEffect(() => {
    if (horoscope && birthData && !error) {
      saveProfile(birthData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horoscope]);

  // ---- Divisional chart data ----
  const chartData = useMemo<ChartData | null>(() => {
    if (!horoscope) return null;

    if (selectedVarga === 1) {
      return {
        planets: horoscope.planets.map((p) => ({
          ...p,
          isRetrograde: p.isRetrograde ?? false,
        })),
        ascendantRasi: horoscope.ascendantRasi,
        title: 'Rasi Chart (D-1)',
      };
    }

    const vargaPlanets = getDivisionalChart(horoscope.planets, selectedVarga).map((p, i) => ({
      ...p,
      isRetrograde: horoscope.planets[i]?.isRetrograde ?? false,
    }));

    const ascP = [{ planet: 100, rasi: horoscope.ascendantRasi, longitude: horoscope.ascendantLongitude % 30 }];
    const vargaAscList = getDivisionalChart(ascP, selectedVarga);
    const vargaAscRasi = vargaAscList[0]?.rasi ?? horoscope.ascendantRasi;

    const title = VARGA_NAMES[selectedVarga] || `Divisional Chart D-${selectedVarga}`;

    return { planets: vargaPlanets, ascendantRasi: vargaAscRasi, title };
  }, [horoscope, selectedVarga]);

  // ---- Dasha result ----
  const dashaResult = useMemo<DashaResult | null>(() => {
    if (!horoscope) return null;
    try {
      return calculateDasha(selectedSystem, horoscope.jd, horoscope.place, horoscope.planets);
    } catch (err) {
      console.error('Dasha calculation error:', err);
      return null;
    }
  }, [horoscope, selectedSystem]);

  // Auto-select first mahadasha lord
  useEffect(() => {
    if (dashaResult?.mahadashas?.[0]) {
      const lord = dashaResult.mahadashas[0].lord;
      setSelectedDasha(typeof lord === 'number' ? lord : 0);
    }
  }, [dashaResult]);

  const value = useMemo<HoroscopeContextValue>(
    () => ({
      birthData,
      setBirthData,
      profiles,
      loadProfile,
      deleteProfile,
      horoscope,
      isCalculating,
      error,
      selectedVarga,
      setSelectedVarga,
      chartData,
      selectedSystem,
      setSelectedSystem,
      dashaResult,
      selectedDasha,
      setSelectedDasha,
    }),
    [
      birthData, setBirthData,
      profiles, loadProfile, deleteProfile,
      horoscope, isCalculating, error,
      selectedVarga,
      chartData,
      selectedSystem,
      dashaResult,
      selectedDasha,
    ],
  );

  return (
    <HoroscopeContext.Provider value={value}>
      {children}
    </HoroscopeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useHoroscopeContext(): HoroscopeContextValue {
  const ctx = useContext(HoroscopeContext);
  if (!ctx) throw new Error('useHoroscopeContext must be used within a HoroscopeProvider');
  return ctx;
}
