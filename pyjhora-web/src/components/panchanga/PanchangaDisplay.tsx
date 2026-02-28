/**
 * Panchanga Display Component
 * Shows tithi, nakshatra, yoga, karana, vara with ruling lords
 */

import './PanchangaDisplay.css';

interface PanchangaData {
  tithi: {
    number: number;
    name: string;
    paksha: 'shukla' | 'krishna';
  };
  nakshatra: {
    number: number;
    name: string;
    pada: number;
  };
  yoga: {
    number: number;
    name: string;
  };
  karana: {
    number: number;
    name: string;
  };
  vara: {
    number: number;
    name: string;
  };
}

interface PanchangaDisplayProps {
  panchanga: PanchangaData;
}

/** Vara (weekday) → ruling planet name */
const VARA_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/** Nakshatra lords (Vimsottari cycle): Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury */
const NAKSHATRA_LORD_CYCLE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

/** Tithi lords (1-based): 1=Sun, 2=Moon, 3=Mars, ... cycles through 7 planets + Rahu */
const TITHI_LORD_CYCLE = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function getNakshatraLord(nakshatraNum: number): string {
  return NAKSHATRA_LORD_CYCLE[nakshatraNum % 9];
}

function getTithiLord(tithiNum: number): string {
  // Tithi 1-15 (shukla) and 1-15 (krishna)
  return TITHI_LORD_CYCLE[(tithiNum - 1) % 7];
}

function getVaraLord(varaNum: number): string {
  return VARA_LORD[varaNum % 7];
}

export function PanchangaDisplay({ panchanga }: PanchangaDisplayProps) {
  const tithiLord = getTithiLord(panchanga.tithi.number);
  const nakshatraLord = getNakshatraLord(panchanga.nakshatra.number);
  const varaLord = getVaraLord(panchanga.vara.number);

  return (
    <div className="panchanga-display card">
      <h3 className="panchanga-title">Panchanga</h3>

      <div className="panchanga-grid">
        <div className="panchanga-item">
          <div className="panchanga-label-row">
            <svg className="panchanga-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            </svg>
            <span className="panchanga-label">Tithi</span>
          </div>
          <span className="panchanga-value">
            {panchanga.tithi.name}
            <span className="panchanga-detail">
              {panchanga.tithi.paksha === 'shukla' ? 'Bright' : 'Dark'} {panchanga.tithi.number} &middot; Lord: {tithiLord}
            </span>
          </span>
        </div>

        <div className="panchanga-item">
          <div className="panchanga-label-row">
            <svg className="panchanga-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="8" y1="8" x2="8" y2="3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <line x1="8" y1="8" x2="11" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <circle cx="8" cy="8" r="0.8" fill="currentColor" />
            </svg>
            <span className="panchanga-label">Nakshatra</span>
          </div>
          <span className="panchanga-value">
            {panchanga.nakshatra.name}
            <span className="panchanga-detail">
              Pada {panchanga.nakshatra.pada} &middot; Lord: {nakshatraLord}
            </span>
          </span>
        </div>

        <div className="panchanga-item">
          <div className="panchanga-label-row">
            <svg className="panchanga-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M8 2L9.5 6.5L14 8L9.5 9.5L8 14L6.5 9.5L2 8L6.5 6.5Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            <span className="panchanga-label">Yoga</span>
          </div>
          <span className="panchanga-value">
            {panchanga.yoga.name}
            <span className="panchanga-detail">
              #{panchanga.yoga.number + 1} of 27
            </span>
          </span>
        </div>

        <div className="panchanga-item">
          <div className="panchanga-label-row">
            <svg className="panchanga-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="8" y1="2.5" x2="8" y2="13.5" stroke="currentColor" strokeWidth="0.8" />
            </svg>
            <span className="panchanga-label">Karana</span>
          </div>
          <span className="panchanga-value">
            {panchanga.karana.name}
            <span className="panchanga-detail">
              Half-tithi #{panchanga.karana.number + 1}
            </span>
          </span>
        </div>

        <div className="panchanga-item">
          <div className="panchanga-label-row">
            <svg className="panchanga-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <rect x="3" y="3" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="3" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="0.8" />
              <line x1="6" y1="3" x2="6" y2="6" stroke="currentColor" strokeWidth="0.8" />
              <line x1="10" y1="3" x2="10" y2="6" stroke="currentColor" strokeWidth="0.8" />
            </svg>
            <span className="panchanga-label">Vara</span>
          </div>
          <span className="panchanga-value">
            {panchanga.vara.name}
            <span className="panchanga-detail">
              Lord: {varaLord}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default PanchangaDisplay;
