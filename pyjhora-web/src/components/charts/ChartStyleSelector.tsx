/**
 * ChartStyleSelector — Segmented control to pick chart rendering style.
 * Compact enough to sit in the TopBar.
 */

import { useSettings, type ChartStyle } from '../../contexts/SettingsContext';
import './ChartStyleSelector.css';

const OPTIONS: Array<{ value: ChartStyle; label: string; title: string }> = [
  { value: 'south', label: 'S', title: 'South Indian' },
  { value: 'north', label: 'N', title: 'North Indian' },
  { value: 'east',  label: 'E', title: 'East Indian' },
];

export function ChartStyleSelector() {
  const { chartStyle, setChartStyle } = useSettings();

  return (
    <div className="chart-style-selector" role="radiogroup" aria-label="Chart style">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`chart-style-btn ${chartStyle === opt.value ? 'chart-style-btn--active' : ''}`}
          onClick={() => setChartStyle(opt.value)}
          title={opt.title}
          aria-checked={chartStyle === opt.value}
          role="radio"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
