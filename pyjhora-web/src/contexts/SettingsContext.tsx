import { createContext, useContext, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ChartStyle = 'south' | 'north' | 'east';

interface SettingsContextValue {
  chartStyle: ChartStyle;
  setChartStyle: (s: ChartStyle) => void;
  ayanamsaMode: string;
  setAyanamsaMode: (m: string) => void;
  houseSystem: string;
  setHouseSystem: (h: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [chartStyle, setChartStyle] = useLocalStorage<ChartStyle>('jhora-chart-style', 'south');
  const [ayanamsaMode, setAyanamsaMode] = useLocalStorage<string>('jhora-ayanamsa', 'LAHIRI');
  const [houseSystem, setHouseSystem] = useLocalStorage<string>('jhora-house-system', 'P');

  return (
    <SettingsContext.Provider
      value={{
        chartStyle,
        setChartStyle,
        ayanamsaMode,
        setAyanamsaMode,
        houseSystem,
        setHouseSystem,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
