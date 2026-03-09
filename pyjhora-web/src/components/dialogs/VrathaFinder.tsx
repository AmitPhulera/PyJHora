/**
 * Vratha Finder Component
 * Search for Hindu fasting days / festival dates by type or combination
 * Ported from PyJHora vratha_finder.py
 */

import { useState, useCallback, useMemo } from 'react';
import {
  NAKSHATRA_NAMES_EN,
  YOGA_NAMES_EN,
  TITHI_NAMES_EN,
  RASI_NAMES_EN,
} from '../../core/constants';
import { SPECIAL_VRATHA_MAP } from '../../core/panchanga/vratha';
import type { VrathaDate } from '../../core/panchanga/vratha';
import './dialog-base.css';
import './VrathaFinder.css';

// ============================================================================
// TYPES
// ============================================================================

export interface VrathaFinderProps {
  open: boolean;
  onClose: () => void;
  onAccept?: (selectedDate: VrathaDate | null) => void;
  initialFromDate?: string;  // YYYY,MM,DD
  initialToDate?: string;    // YYYY,MM,DD
  title?: string;
}

/** Search mode within "Customized" vratha type */
type SearchMode = 'all' | 'combination' | 'name';

// ============================================================================
// CONSTANTS
// ============================================================================

const SPECIAL_VRATHA_KEYS = Object.keys(SPECIAL_VRATHA_MAP);
const VRATHA_TYPE_OPTIONS = [
  ...SPECIAL_VRATHA_KEYS.map(k => formatVrathaName(k)),
  'Customized',
];

const PAKSHA_TITHI_LIST = buildPakshaTithiList();
const TAMIL_MONTH_LIST = [
  'Chittirai', 'Vaikasi', 'Aani', 'Aadi', 'Aavani', 'Purattasi',
  'Aippasi', 'Karthigai', 'Margazhi', 'Thai', 'Maasi', 'Panguni',
];

function formatVrathaName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildPakshaTithiList(): string[] {
  const list: string[] = [];
  for (let i = 0; i < 14; i++) {
    list.push(`Sukla-${TITHI_NAMES_EN[i]}`);
  }
  list.push(TITHI_NAMES_EN[14]); // Purnima
  for (let i = 0; i < 14; i++) {
    list.push(`Krishna-${TITHI_NAMES_EN[i]}`);
  }
  list.push(TITHI_NAMES_EN[29] ?? 'Amavasya'); // Amavasya
  return list;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VrathaFinder({
  open,
  onClose,
  onAccept,
  initialFromDate = '',
  initialToDate = '',
  title = 'Search Festival / Vratha',
}: VrathaFinderProps) {
  // ---- State ----
  const [vrathaTypeIndex, setVrathaTypeIndex] = useState(0);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [searchText, setSearchText] = useState('');
  const [tithiIndex, setTithiIndex] = useState(0);  // 0 = "Tithi" (none)
  const [nakshatraIndex, setNakshatraIndex] = useState(0); // 0 = "Nakshatra" (none)
  const [yogaIndex, setYogaIndex] = useState(0); // 0 = "Yoga" (none)
  const [tamilMonthIndex, setTamilMonthIndex] = useState(0); // 0 = "Tamil Month" (none)
  const [results, setResults] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState(0);
  const [statsText, setStatsText] = useState('');
  const [computing, setComputing] = useState(false);

  const isCustomized = vrathaTypeIndex === SPECIAL_VRATHA_KEYS.length;
  const showCombinationFilters = isCustomized && searchMode === 'combination';
  const showSearchInput = isCustomized && searchMode === 'name';

  // ---- Handlers ----
  const handleVrathaTypeChange = useCallback((index: number) => {
    setVrathaTypeIndex(index);
    setResults([]);
    setStatsText('');
  }, []);

  const handleCompute = useCallback(() => {
    setComputing(true);
    setResults([]);
    setStatsText('');

    // Simulate computation (real implementation calls vratha.specialVrathaDates / vratha.search)
    setTimeout(() => {
      const typeName = VRATHA_TYPE_OPTIONS[vrathaTypeIndex];
      const sampleResults = [
        `${fromDate} / Sample ${typeName} occurrence 1`,
        `${toDate} / Sample ${typeName} occurrence 2`,
      ];
      setResults(sampleResults);
      setStatsText(`${sampleResults.length} matching dates found`);
      setSelectedRow(0);
      setComputing(false);
    }, 100);
  }, [vrathaTypeIndex, fromDate, toDate]);

  const handleAccept = useCallback(() => {
    if (results.length > 0 && onAccept) {
      // In real implementation, this would pass the actual VrathaDate object
      onAccept(null);
    }
    onClose();
  }, [results, onAccept, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog vratha-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">{title}</h3>
          <button className="dialog-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="dialog-body">
          {/* Top Row: Vratha type + date range */}
          <div className="dialog-row">
            <div className="form-group vratha-type-group">
              <label className="label">Vratha Type</label>
              <select
                className="select"
                value={vrathaTypeIndex}
                onChange={e => handleVrathaTypeChange(Number(e.target.value))}
              >
                {VRATHA_TYPE_OPTIONS.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">From (YYYY,MM,DD)</label>
              <input
                className="input"
                type="text"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                placeholder="2025,1,1"
              />
            </div>
            <div className="form-group">
              <label className="label">To (YYYY,MM,DD)</label>
              <input
                className="input"
                type="text"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                placeholder="2026,1,1"
              />
            </div>
          </div>

          {/* Search Mode (visible only for Customized) */}
          {isCustomized && (
            <div className="vratha-search-modes">
              <label className="options-radio-item">
                <input
                  type="radio"
                  name="search-mode"
                  checked={searchMode === 'all'}
                  onChange={() => setSearchMode('all')}
                />
                <span>Show All Festivals</span>
              </label>
              <label className="options-radio-item">
                <input
                  type="radio"
                  name="search-mode"
                  checked={searchMode === 'combination'}
                  onChange={() => setSearchMode('combination')}
                />
                <span>Search by Combination</span>
              </label>
              <label className="options-radio-item">
                <input
                  type="radio"
                  name="search-mode"
                  checked={searchMode === 'name'}
                  onChange={() => setSearchMode('name')}
                />
                <span>Search by Name</span>
              </label>
            </div>
          )}

          {/* Search text input */}
          {showSearchInput && (
            <div className="form-group">
              <input
                className="input"
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Enter festival name..."
              />
            </div>
          )}

          {/* Combination filters */}
          {showCombinationFilters && (
            <div className="dialog-row">
              <div className="form-group">
                <select
                  className="select"
                  value={tithiIndex}
                  onChange={e => setTithiIndex(Number(e.target.value))}
                >
                  <option value={0}>Tithi</option>
                  {PAKSHA_TITHI_LIST.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <select
                  className="select"
                  value={nakshatraIndex}
                  onChange={e => setNakshatraIndex(Number(e.target.value))}
                >
                  <option value={0}>Nakshatra</option>
                  {NAKSHATRA_NAMES_EN.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <select
                  className="select"
                  value={yogaIndex}
                  onChange={e => setYogaIndex(Number(e.target.value))}
                >
                  <option value={0}>Yoga</option>
                  {YOGA_NAMES_EN.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <select
                  className="select"
                  value={tamilMonthIndex}
                  onChange={e => setTamilMonthIndex(Number(e.target.value))}
                >
                  <option value={0}>Tamil Month</option>
                  {TAMIL_MONTH_LIST.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="vratha-results-list">
            {results.length === 0 && !computing && (
              <div className="vratha-empty">No results yet. Click Compute to search.</div>
            )}
            {computing && (
              <div className="vratha-computing">Calculating... Please wait...</div>
            )}
            {results.map((item, i) => (
              <div
                key={i}
                className={`vratha-result-item ${selectedRow === i ? 'active' : ''}`}
                onClick={() => setSelectedRow(i)}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Stats */}
          {statsText && (
            <div className="vratha-stats">{statsText}</div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn btn-primary" onClick={handleCompute} disabled={computing}>
            {computing ? 'Computing...' : 'Compute'}
          </button>
          <button className="btn btn-primary" onClick={handleAccept} disabled={results.length === 0}>
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

export default VrathaFinder;
