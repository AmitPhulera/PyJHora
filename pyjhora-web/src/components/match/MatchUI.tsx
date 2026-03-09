/**
 * Marriage Compatibility (Match) UI Component
 * Ported from PyJHora match_ui.py
 *
 * Allows selecting boy/girl nakshatra and paadham, computing Ashtakoota
 * compatibility scores, and optionally showing all matching partners.
 */

import { useState, useCallback } from 'react';
import {
  compatibilityScore,
  rasiFromNakshatraPada,
  type CompatibilityResult,
  type Method,
} from '../../core/horoscope/compatibility';
import './MatchUI.css';

// 27 nakshatras (1-based index matches compatibility module expectations)
const NAKSHATRA_LIST = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Ettu (8) poruthams with their max scores (North Indian)
const ETTU_PORUTHAM_LABELS = [
  { key: 'varna', label: 'Varna Porutham', max: 1 },
  { key: 'vasiya', label: 'Vasiya Porutham', max: 2 },
  { key: 'gana', label: 'Gana Porutham', max: 6 },
  { key: 'dina', label: 'Nakshathra Porutham', max: 3 },
  { key: 'yoni', label: 'Yoni Porutham', max: 4 },
  { key: 'rasiAdhipathi', label: 'Adhipathi Porutham', max: 5 },
  { key: 'rasi', label: 'Raasi Porutham', max: 7 },
  { key: 'naadi', label: 'Naadi Porutham', max: 8 },
] as const;

// Naalu (4) supplementary poruthams (boolean)
const NAALU_PORUTHAM_LABELS = [
  { key: 'mahendra', label: 'Mahendra Porutham' },
  { key: 'vedha', label: 'Vedha Porutham' },
  { key: 'rajju', label: 'Rajju Porutham' },
  { key: 'sthreeDheerga', label: 'Sthree Dheerga Porutham' },
] as const;

interface MatchEntry {
  nakshatra: number; // 1-based
  paadham: number;   // 1-based
  boyPaadham: number;
  result: CompatibilityResult;
}

export function MatchUI() {
  // Boy inputs
  const [boyNakshatra, setBoyNakshatra] = useState(1);
  const [boyPaadham, setBoyPaadham] = useState(1);
  const [showAllGirls, setShowAllGirls] = useState(false);
  const [minScoreGirls, setMinScoreGirls] = useState(18);

  // Girl inputs
  const [girlNakshatra, setGirlNakshatra] = useState(15); // Swati default
  const [girlPaadham, setGirlPaadham] = useState(1);
  const [showAllBoys, setShowAllBoys] = useState(false);
  const [minScoreBoys, setMinScoreBoys] = useState(18);

  // Optional porutham checks
  const [checkMahendra, setCheckMahendra] = useState(true);
  const [checkVedha, setCheckVedha] = useState(true);
  const [checkRajju, setCheckRajju] = useState(true);
  const [checkShreeDheerga, setCheckShreeDheerga] = useState(true);

  // Method
  const [method, setMethod] = useState<Method>('North');

  // Results
  const [matchEntries, setMatchEntries] = useState<MatchEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const computeMatch = useCallback(() => {
    const entries: MatchEntry[] = [];

    if (showAllGirls) {
      // Iterate all girl nakshatras and paadhas, keep boy fixed
      for (let gn = 1; gn <= 27; gn++) {
        for (let gp = 1; gp <= 4; gp++) {
          const result = compatibilityScore(boyNakshatra, boyPaadham, gn, gp, method);
          // Apply optional checks as filters
          if (checkMahendra && !result.mahendra) continue;
          if (checkVedha && !result.vedha) continue;
          if (checkRajju && !result.rajju) continue;
          if (checkShreeDheerga && !result.sthreeDheerga) continue;
          if (result.totalScore >= minScoreGirls) {
            entries.push({ nakshatra: gn, paadham: gp, boyPaadham: boyPaadham, result });
          }
        }
      }
    } else if (showAllBoys) {
      // Iterate all boy nakshatras and paadhas, keep girl fixed
      for (let bn = 1; bn <= 27; bn++) {
        for (let bp = 1; bp <= 4; bp++) {
          const result = compatibilityScore(bn, bp, girlNakshatra, girlPaadham, method);
          if (checkMahendra && !result.mahendra) continue;
          if (checkVedha && !result.vedha) continue;
          if (checkRajju && !result.rajju) continue;
          if (checkShreeDheerga && !result.sthreeDheerga) continue;
          if (result.totalScore >= minScoreBoys) {
            entries.push({ nakshatra: bn, paadham: bp, boyPaadham: bp, result });
          }
        }
      }
    } else {
      // Single pair
      const result = compatibilityScore(boyNakshatra, boyPaadham, girlNakshatra, girlPaadham, method);
      entries.push({ nakshatra: girlNakshatra, paadham: girlPaadham, boyPaadham: boyPaadham, result });
    }

    // Sort by totalScore descending
    entries.sort((a, b) => b.result.totalScore - a.result.totalScore);
    setMatchEntries(entries);
    setSelectedIndex(0);
  }, [
    boyNakshatra, boyPaadham, girlNakshatra, girlPaadham,
    showAllGirls, showAllBoys, minScoreGirls, minScoreBoys,
    checkMahendra, checkVedha, checkRajju, checkShreeDheerga, method,
  ]);

  const selectedResult = matchEntries[selectedIndex]?.result ?? null;

  return (
    <div className="match-ui card">
      <h3 className="match-ui-title">Marriage Compatibility (Ashtakoota)</h3>

      <div className="match-inputs">
        {/* Method selector */}
        <div className="match-options-row">
          <div className="match-checkbox-group">
            <label htmlFor="match-method">Method:</label>
            <select
              id="match-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              <option value="North">North Indian (36 pts)</option>
              <option value="South">South Indian (10 pts)</option>
            </select>
          </div>
        </div>

        {/* Boy row */}
        <div className="match-person-row">
          <label>Boy&apos;s Star:</label>
          <select
            value={boyNakshatra}
            onChange={(e) => setBoyNakshatra(Number(e.target.value))}
            disabled={showAllBoys}
          >
            {NAKSHATRA_LIST.map((n, i) => (
              <option key={i} value={i + 1}>{n}</option>
            ))}
          </select>

          <label>Paadham:</label>
          <input
            type="number"
            min={1}
            max={4}
            value={boyPaadham}
            onChange={(e) => setBoyPaadham(Math.min(4, Math.max(1, Number(e.target.value))))}
            disabled={showAllBoys}
          />

          <div className="match-show-all-group">
            <input
              type="checkbox"
              id="show-all-girls"
              checked={showAllGirls}
              onChange={(e) => {
                setShowAllGirls(e.target.checked);
                if (e.target.checked) setShowAllBoys(false);
              }}
            />
            <label htmlFor="show-all-girls">Show all matching girls</label>
            {showAllGirls && (
              <>
                <label>Min score:</label>
                <input
                  type="number"
                  min={0}
                  max={method === 'North' ? 36 : 10}
                  value={minScoreGirls}
                  onChange={(e) => setMinScoreGirls(Number(e.target.value))}
                />
              </>
            )}
          </div>
        </div>

        {/* Girl row */}
        <div className="match-person-row">
          <label>Girl&apos;s Star:</label>
          <select
            value={girlNakshatra}
            onChange={(e) => setGirlNakshatra(Number(e.target.value))}
            disabled={showAllGirls}
          >
            {NAKSHATRA_LIST.map((n, i) => (
              <option key={i} value={i + 1}>{n}</option>
            ))}
          </select>

          <label>Paadham:</label>
          <input
            type="number"
            min={1}
            max={4}
            value={girlPaadham}
            onChange={(e) => setGirlPaadham(Math.min(4, Math.max(1, Number(e.target.value))))}
            disabled={showAllGirls}
          />

          <div className="match-show-all-group">
            <input
              type="checkbox"
              id="show-all-boys"
              checked={showAllBoys}
              onChange={(e) => {
                setShowAllBoys(e.target.checked);
                if (e.target.checked) setShowAllGirls(false);
              }}
            />
            <label htmlFor="show-all-boys">Show all matching boys</label>
            {showAllBoys && (
              <>
                <label>Min score:</label>
                <input
                  type="number"
                  min={0}
                  max={method === 'North' ? 36 : 10}
                  value={minScoreBoys}
                  onChange={(e) => setMinScoreBoys(Number(e.target.value))}
                />
              </>
            )}
          </div>
        </div>

        {/* Optional porutham checks */}
        <div className="match-options-row">
          <div className="match-checkbox-group">
            <input
              type="checkbox"
              id="check-mahendra"
              checked={checkMahendra}
              onChange={(e) => setCheckMahendra(e.target.checked)}
            />
            <label htmlFor="check-mahendra">Mahendra</label>
          </div>
          <div className="match-checkbox-group">
            <input
              type="checkbox"
              id="check-vedha"
              checked={checkVedha}
              onChange={(e) => setCheckVedha(e.target.checked)}
            />
            <label htmlFor="check-vedha">Vedha</label>
          </div>
          <div className="match-checkbox-group">
            <input
              type="checkbox"
              id="check-rajju"
              checked={checkRajju}
              onChange={(e) => setCheckRajju(e.target.checked)}
            />
            <label htmlFor="check-rajju">Rajju</label>
          </div>
          <div className="match-checkbox-group">
            <input
              type="checkbox"
              id="check-shree-dheerga"
              checked={checkShreeDheerga}
              onChange={(e) => setCheckShreeDheerga(e.target.checked)}
            />
            <label htmlFor="check-shree-dheerga">Shree Dheerga</label>
          </div>
        </div>

        <button className="btn btn-primary match-compute-btn" onClick={computeMatch}>
          Show Match
        </button>
      </div>

      {/* Results */}
      {matchEntries.length > 0 && (
        <div className="match-results">
          {/* Matching star list (shown when "show all" is active) */}
          {(showAllGirls || showAllBoys) && (
            <div className="match-star-list">
              {matchEntries.map((entry, idx) => {
                const name = NAKSHATRA_LIST[entry.nakshatra - 1];
                const label = `${name} P${entry.paadham} (${entry.result.totalScore}/${entry.result.maxScore})`;
                return (
                  <div
                    key={idx}
                    className={`match-star-item${idx === selectedIndex ? ' selected' : ''}`}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}

          {/* Compatibility detail table */}
          {selectedResult && (
            <div className="match-table-container">
              <table className="match-table">
                <thead>
                  <tr>
                    <th>Porutham / Koota</th>
                    <th>Score</th>
                    <th>Max</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {ETTU_PORUTHAM_LABELS.map(({ key, label, max }) => {
                    const score = selectedResult[key] as number;
                    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
                    return (
                      <tr key={key}>
                        <td>{label}</td>
                        <td>{score}</td>
                        <td>{max}</td>
                        <td className={pct >= 50 ? 'match-score-good' : 'match-score-bad'}>{pct}%</td>
                      </tr>
                    );
                  })}
                  {NAALU_PORUTHAM_LABELS.map(({ key, label }) => {
                    const val = selectedResult[key] as boolean;
                    return (
                      <tr key={key}>
                        <td>{label}</td>
                        <td>{val ? 'Yes' : 'No'}</td>
                        <td>True</td>
                        <td className={val ? 'match-score-good' : 'match-score-bad'}>
                          {val ? '\u2705' : '\u274C'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td>Overall Matching Score</td>
                    <td>{selectedResult.totalScore}</td>
                    <td>{selectedResult.maxScore}</td>
                    <td className={
                      selectedResult.totalScore / selectedResult.maxScore >= 0.5
                        ? 'match-score-good'
                        : 'match-score-bad'
                    }>
                      {Math.round((selectedResult.totalScore / selectedResult.maxScore) * 100)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {matchEntries.length === 0 && (
        <div className="match-no-results" />
      )}
    </div>
  );
}

export default MatchUI;
