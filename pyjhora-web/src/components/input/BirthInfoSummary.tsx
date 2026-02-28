/**
 * BirthInfoSummary — Compact birth info display for the TopBar.
 * Shows place, date/time, and key chart identifiers (lagna + moon sign).
 */

import { RASI_NAMES_EN } from '../../core/constants';
import { useHoroscopeContext } from '../../contexts/HoroscopeContext';
import './BirthInfoSummary.css';

export function BirthInfoSummary() {
  const { birthData, horoscope } = useHoroscopeContext();

  if (!horoscope || !birthData) return null;

  const lagnaRasi = RASI_NAMES_EN[horoscope.ascendantRasi] ?? '';
  const moonPlanet = horoscope.planets.find(p => p.planet === 1);
  const moonRasi = moonPlanet ? (RASI_NAMES_EN[moonPlanet.rasi] ?? '') : '';

  return (
    <div className="birth-info-summary">
      <span className="birth-info-summary-place">{birthData.placeName}</span>
      <span className="birth-info-summary-sep">&middot;</span>
      <span className="birth-info-summary-datetime">
        {birthData.date} {birthData.time}
      </span>
      {lagnaRasi && (
        <>
          <span className="birth-info-summary-sep">&middot;</span>
          <span className="birth-info-summary-astro">
            <span className="birth-info-tag" title="Ascendant">Asc {lagnaRasi}</span>
            {moonRasi && (
              <span className="birth-info-tag" title="Moon sign">Mo {moonRasi}</span>
            )}
          </span>
        </>
      )}
    </div>
  );
}
