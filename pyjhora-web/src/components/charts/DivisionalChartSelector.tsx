
import React from 'react';
import { DIVISIONAL_CHART_FACTORS, VARGA_NAMES } from '../../core/constants';
import './chart-styles.css';

export type ChartView = 'south-indian' | 'wheel';

interface DivisionalChartSelectorProps {
  selectedVarga: number;
  onSelect: (varga: number) => void;
  chartView?: ChartView;
  onChartViewChange?: (view: ChartView) => void;
}

export const DivisionalChartSelector: React.FC<DivisionalChartSelectorProps> = ({
  selectedVarga,
  onSelect,
  chartView = 'south-indian',
  onChartViewChange
}) => {
  return (
    <div className="varga-selector mb-sm flex gap-2 items-center">
      <label htmlFor="varga-select" className="text-sm font-medium">Chart:</label>
      <select
        id="varga-select"
        className="form-select text-sm p-1 border rounded"
        value={selectedVarga}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {DIVISIONAL_CHART_FACTORS.map(factor => (
          <option key={factor} value={factor}>
            {VARGA_NAMES[factor] || `D-${factor}`}
          </option>
        ))}
      </select>

      {onChartViewChange && (
        <div className="chart-view-toggle">
          <button
            className={chartView === 'south-indian' ? 'active' : ''}
            onClick={() => onChartViewChange('south-indian')}
            title="South Indian Chart"
          >
            South
          </button>
          <button
            className={chartView === 'wheel' ? 'active' : ''}
            onClick={() => onChartViewChange('wheel')}
            title="Wheel / Circular Chart"
          >
            Wheel
          </button>
        </div>
      )}
    </div>
  );
};
