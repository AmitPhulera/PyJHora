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

/** Chart purpose descriptions for tooltips */
const VARGA_PURPOSE: Record<number, string> = {
  1: 'Overall life, personality, body',
  2: 'Wealth, financial prospects',
  3: 'Siblings, courage, communication',
  4: 'Property, fixed assets, fortune',
  5: 'Spiritual practices, mantras',
  6: 'Health, diseases, enemies',
  7: 'Children, progeny, creativity',
  8: 'Longevity, sudden events',
  9: 'Marriage, dharma, fortune (spouse)',
  10: 'Career, profession, social status',
  11: 'Destruction, Rudra blessings',
  12: 'Parents, ancestral heritage',
  16: 'Vehicles, comforts, luxuries',
  20: 'Spiritual progress, upasana',
  24: 'Education, learning, knowledge',
  27: 'Strengths and weaknesses',
  30: 'Evils, misfortunes, arishtas',
  40: 'Auspicious/inauspicious effects',
  45: 'General indications, all matters',
  60: 'Past life karma, all results',
};

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
            title={`${VARGA_NAMES[factor] || `D-${factor}`}${VARGA_PURPOSE[factor] ? ` — ${VARGA_PURPOSE[factor]}` : ''}`}
            aria-pressed={selectedVarga === factor}
          >
            <span className="dcg-card-factor">D-{factor}</span>
            <span className="dcg-card-name">{getShortName(factor)}</span>
            {VARGA_PURPOSE[factor] && (
              <span className="dcg-card-purpose">{VARGA_PURPOSE[factor]}</span>
            )}
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
                  title={`${VARGA_NAMES[factor] || `D-${factor}`}${VARGA_PURPOSE[factor] ? ` — ${VARGA_PURPOSE[factor]}` : ''}`}
                  aria-pressed={selectedVarga === factor}
                >
                  <span className="dcg-card-factor">D-{factor}</span>
                  <span className="dcg-card-name">{getShortName(factor)}</span>
                  {VARGA_PURPOSE[factor] && (
                    <span className="dcg-card-purpose">{VARGA_PURPOSE[factor]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
