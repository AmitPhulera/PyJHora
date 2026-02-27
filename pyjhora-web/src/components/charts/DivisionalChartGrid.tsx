/**
 * DivisionalChartGrid — Grid-based divisional chart selector
 * for the Charts page. Shows all divisional charts as clickable cards.
 */

import { useState } from 'react';
import { DIVISIONAL_CHART_FACTORS, VARGA_NAMES } from '../../core/constants';
import './DivisionalChartGrid.css';

interface DivisionalChartGridProps {
  selectedVarga: number;
  onSelect: (varga: number) => void;
}

/** Popular charts shown first (always visible) */
const POPULAR_FACTORS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];

/** Remaining charts shown in collapsible section */
const OTHER_FACTORS = DIVISIONAL_CHART_FACTORS.filter(
  (f) => !POPULAR_FACTORS.includes(f)
);

function getShortName(factor: number): string {
  const full = VARGA_NAMES[factor];
  if (!full) return `D-${factor}`;
  // Extract the Sanskrit name (before the parenthesized part)
  const match = full.match(/^(\w+)/);
  return match ? match[1] : `D-${factor}`;
}

export function DivisionalChartGrid({ selectedVarga, onSelect }: DivisionalChartGridProps) {
  const [showOthers, setShowOthers] = useState(false);

  return (
    <div className="divisional-chart-grid">
      <div className="dcg-cards">
        {POPULAR_FACTORS.map((factor) => (
          <button
            key={factor}
            className={`dcg-card ${selectedVarga === factor ? 'dcg-card--selected' : ''}`}
            onClick={() => onSelect(factor)}
            title={VARGA_NAMES[factor] || `D-${factor}`}
          >
            <span className="dcg-card-factor">D-{factor}</span>
            <span className="dcg-card-name">{getShortName(factor)}</span>
          </button>
        ))}
      </div>

      {OTHER_FACTORS.length > 0 && (
        <>
          <button
            className="dcg-toggle"
            onClick={() => setShowOthers(!showOthers)}
          >
            {showOthers ? 'Hide' : 'Show'} other charts ({OTHER_FACTORS.length})
          </button>

          {showOthers && (
            <div className="dcg-cards dcg-cards--others">
              {OTHER_FACTORS.map((factor) => (
                <button
                  key={factor}
                  className={`dcg-card ${selectedVarga === factor ? 'dcg-card--selected' : ''}`}
                  onClick={() => onSelect(factor)}
                  title={VARGA_NAMES[factor] || `D-${factor}`}
                >
                  <span className="dcg-card-factor">D-{factor}</span>
                  <span className="dcg-card-name">{getShortName(factor)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
