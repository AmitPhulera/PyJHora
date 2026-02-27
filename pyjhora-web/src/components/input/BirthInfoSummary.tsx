/**
 * BirthInfoSummary — Compact birth info display for the TopBar.
 */

import { useHoroscopeContext } from '../../contexts/HoroscopeContext';
import './BirthInfoSummary.css';

export function BirthInfoSummary() {
  const { birthData, horoscope } = useHoroscopeContext();

  if (!horoscope || !birthData) return null;

  return (
    <div className="birth-info-summary">
      <span className="birth-info-summary-place">{birthData.placeName}</span>
      <span className="birth-info-summary-sep">&middot;</span>
      <span className="birth-info-summary-datetime">
        {birthData.date} {birthData.time}
      </span>
    </div>
  );
}
