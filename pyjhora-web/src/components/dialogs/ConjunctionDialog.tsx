/**
 * Conjunction Dialog Component
 * Planetary conjunction, transit entry, and retrograde analysis
 * Ported from PyJHora conjunction_dialog.py
 */

import { useState, useCallback, useMemo } from 'react';
import {
  PLANET_NAMES_EN,
  RASI_NAMES_EN,
} from '../../core/constants';
import './dialog-base.css';
import './ConjunctionDialog.css';

// ============================================================================
// TYPES
// ============================================================================

/** Entry type determines dialog mode */
export type ConjunctionEntryType =
  | 'conjunction'    // 0: Planetary conjunctions
  | 'transit'        // 1: Planet entry/transit
  | 'retrograde';    // 2: Vakra gathi change

export interface ConjunctionResult {
  dateJd: number;
  dateStr: string;
  planet1Name: string;
  planet2Name?: string;
  longitude1?: string;
  longitude2?: string;
  rasiName?: string;
  retrogradeSymbol?: string;
}

export interface ConjunctionDialogProps {
  open: boolean;
  onClose: () => void;
  onAccept?: (result: ConjunctionResult) => void;
  entryType?: ConjunctionEntryType;
  title?: string;
  initialDate?: string;       // YYYY,MM,DD
  initialTime?: string;       // HH:MM:SS
  defaultPlanet1?: number;
  defaultPlanet2?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PLANET_LIST_FULL = ['Ascendant', ...PLANET_NAMES_EN.slice(0, 9)];
const PLANET_LIST_RETRO = PLANET_NAMES_EN.slice(2, 7); // Mars through Saturn
const SEPARATION_ANGLES = [
  '0° (Conjunction)',
  '30° (Semi-sextile)',
  '60° (Sextile)',
  '90° (Square)',
  '120° (Trine)',
  '150° (Quincunx)',
  '180° (Opposition)',
];
const DIRECTION_OPTIONS = ['Next', 'Previous'];

// ============================================================================
// COMPONENT
// ============================================================================

export function ConjunctionDialog({
  open,
  onClose,
  onAccept,
  entryType = 'conjunction',
  title,
  initialDate = '',
  initialTime = '00:00:00',
  defaultPlanet1 = 6,
  defaultPlanet2 = 4,
}: ConjunctionDialogProps) {
  // ---- State ----
  const [dateStr, setDateStr] = useState(initialDate);
  const [timeStr, setTimeStr] = useState(initialTime);
  const [direction, setDirection] = useState(0); // 0=next, 1=previous
  const [separationAngle, setSeparationAngle] = useState(0);
  const [planet1Index, setPlanet1Index] = useState(defaultPlanet1);
  const [planet2Index, setPlanet2Index] = useState(defaultPlanet2);
  const [rasiIndex, setRasiIndex] = useState(0); // 0 = "Rasi" (any)
  const [resultText, setResultText] = useState('');
  const [computing, setComputing] = useState(false);
  const [hasResult, setHasResult] = useState(false);

  // ---- Derived ----
  const dialogTitle = useMemo(() => {
    if (title) return title;
    switch (entryType) {
      case 'conjunction': return 'Planetary Conjunctions';
      case 'transit': return 'Planet Transit';
      case 'retrograde': return 'Retrograde Change';
      default: return 'Conjunction';
    }
  }, [title, entryType]);

  const planet1List = useMemo(() => {
    return entryType === 'retrograde' ? PLANET_LIST_RETRO : PLANET_LIST_FULL;
  }, [entryType]);

  const planet2List = useMemo(() => {
    const full = [...PLANET_LIST_FULL];
    const selected = planet1List[planet1Index] ?? '';
    const filtered = full.filter(p => p !== selected);
    // If planet1 is Rahu or Ketu (index 8 or 9 in full list), limit planet2
    if (planet1Index === 8 || planet1Index === 9) {
      return filtered.slice(0, 7);
    }
    return filtered;
  }, [planet1Index, planet1List]);

  // ---- Handlers ----
  const handleCompute = useCallback(() => {
    setComputing(true);
    setHasResult(false);
    setResultText('Calculating... Please wait...');

    // Simulate async computation (in a real app this calls the calculation engine)
    setTimeout(() => {
      const p1Name = planet1List[planet1Index] ?? 'Unknown';
      const sep = separationAngle * 30;
      let result = '';

      if (entryType === 'conjunction') {
        const p2Name = planet2List[planet2Index] ?? 'Unknown';
        result = `${p1Name} / ${p2Name} conjunction at ${sep}° separation`;
        result += ` | Direction: ${DIRECTION_OPTIONS[direction]}`;
        result += ` | Date: ${dateStr} ${timeStr}`;
      } else if (entryType === 'transit') {
        const rName = rasiIndex > 0 ? RASI_NAMES_EN[rasiIndex - 1] : 'Any Rasi';
        result = `${p1Name} transit into ${rName}`;
        result += ` | Direction: ${DIRECTION_OPTIONS[direction]}`;
        result += ` | Date: ${dateStr} ${timeStr}`;
      } else {
        result = `${p1Name} retrograde change`;
        result += ` | Direction: ${DIRECTION_OPTIONS[direction]}`;
        result += ` | Date: ${dateStr} ${timeStr}`;
      }

      setResultText(result);
      setComputing(false);
      setHasResult(true);
    }, 100);
  }, [
    planet1Index, planet2Index, separationAngle, direction,
    dateStr, timeStr, entryType, rasiIndex, planet1List, planet2List,
  ]);

  const handleAccept = useCallback(() => {
    if (onAccept && hasResult) {
      onAccept({
        dateJd: 0, // Would be set by real calculation
        dateStr: `${dateStr} ${timeStr}`,
        planet1Name: planet1List[planet1Index] ?? '',
        planet2Name: entryType === 'conjunction'
          ? planet2List[planet2Index]
          : undefined,
      });
    }
    onClose();
  }, [onAccept, onClose, hasResult, dateStr, timeStr, planet1Index, planet2Index, planet1List, planet2List, entryType]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog conjunction-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">{dialogTitle}</h3>
          <button className="dialog-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="dialog-body">
          {/* Date/Time Row */}
          <div className="dialog-row">
            <div className="form-group">
              <label className="label">Date (YYYY,MM,DD)</label>
              <input
                className="input"
                type="text"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                placeholder="2025,1,1"
                title="Date in the format YYYY,MM,DD. For BC enter negative years."
              />
            </div>
            <div className="form-group">
              <label className="label">Time (HH:MM:SS)</label>
              <input
                className="input"
                type="text"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
                placeholder="10:30:00"
              />
            </div>
            <div className="form-group">
              <label className="label">Direction</label>
              <select
                className="select"
                value={direction}
                onChange={e => setDirection(Number(e.target.value))}
              >
                {DIRECTION_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Planet Selection Row */}
          <div className="dialog-row">
            {entryType === 'conjunction' && (
              <div className="form-group">
                <label className="label">Separation Angle</label>
                <select
                  className="select"
                  value={separationAngle}
                  onChange={e => setSeparationAngle(Number(e.target.value))}
                >
                  {SEPARATION_ANGLES.map((label, i) => (
                    <option key={i} value={i}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="label">Planet 1</label>
              <select
                className="select"
                value={planet1Index}
                onChange={e => setPlanet1Index(Number(e.target.value))}
              >
                {planet1List.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>

            {entryType === 'conjunction' && (
              <div className="form-group">
                <label className="label">Planet 2</label>
                <select
                  className="select"
                  value={planet2Index}
                  onChange={e => setPlanet2Index(Number(e.target.value))}
                >
                  {planet2List.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {entryType === 'transit' && (
              <div className="form-group">
                <label className="label">Rasi</label>
                <select
                  className="select"
                  value={rasiIndex}
                  onChange={e => setRasiIndex(Number(e.target.value))}
                >
                  <option value={0}>Any Rasi</option>
                  {RASI_NAMES_EN.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Results */}
          <div className={`conjunction-result ${computing ? 'computing' : ''}`}>
            {resultText || 'Results will appear here after computation.'}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-primary" onClick={handleCompute} disabled={computing}>
            {computing ? 'Computing...' : 'Compute'}
          </button>
          <button className="btn btn-primary" onClick={handleAccept} disabled={!hasResult}>
            Accept
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConjunctionDialog;
