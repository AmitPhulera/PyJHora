/**
 * ChartRenderer — Dispatches to the correct chart component
 * based on the user's chart style preference from Settings.
 */

import { useSettings } from '../../contexts/SettingsContext';
import { SouthIndianChart } from './SouthIndianChart';
import { NorthIndianChart } from './NorthIndianChart';
import { EastIndianChart } from './EastIndianChart';

interface ChartRendererProps {
  planets: Array<{ planet: number; rasi: number; longitude: number; isRetrograde?: boolean }>;
  ascendantRasi: number;
  title?: string;
  showDegrees?: boolean;
}

export function ChartRenderer(props: ChartRendererProps) {
  const { chartStyle } = useSettings();

  switch (chartStyle) {
    case 'north':
      return <NorthIndianChart {...props} />;
    case 'east':
      return <EastIndianChart {...props} />;
    default:
      return <SouthIndianChart {...props} />;
  }
}
