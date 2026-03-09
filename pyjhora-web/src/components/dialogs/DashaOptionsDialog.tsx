/**
 * Dasha Options Dialog Component
 * Configure dasha system parameters: tribhagi, seed star, start planet,
 * moon position, antardhasa, varga chart, and system-specific options
 * Ported from PyJHora dhasa_bhukthi_options_dialog.py
 */

import { useState, useCallback, useMemo } from 'react';
import {
  PLANET_NAMES_EN,
  NAKSHATRA_NAMES_EN,
  VARGA_NAMES,
  DIVISIONAL_CHART_FACTORS,
} from '../../core/constants';
import './dialog-base.css';
import './DashaOptionsDialog.css';

// ============================================================================
// TYPES
// ============================================================================

export interface DashaOptionsResult {
  optionString: string;
  optionList: (number | boolean)[];
  accepted: boolean;
}

export interface DashaOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onAccept?: (result: DashaOptionsResult) => void;
  dashaIndex: number;
  dashaOptionList?: (number | boolean)[];
}

// ============================================================================
// CONSTANTS (mirroring Python dhasa_bhukthi_options_dialog.py)
// ============================================================================

const GRAHA_DHASA_NAMES = [
  'Vimsottari', 'Yoga Vimsottari', 'Rasi Bhukthi Vimsottari', 'Ashtottari',
  'Tithi Ashtottari', 'Yogini', 'Tithi Yogini', 'Shodasottari', 'Dwadasottari',
  'Dwisatpathi', 'Panchottari', 'Sataabdika', 'Chaturaseethi Sama',
  'Karana Chaturaseethi Sama', 'Shashtisama', 'Shattrimsa Sama', 'Naisargika',
  'Tara', 'Karaka', 'Buddhi Gathi', 'Kaala', 'Aayu', 'Saptharishi Nakshatra',
];

const CHART_NAMES = [
  'Rasi (D-1)', 'Hora (D-2)', 'Drekkana (D-3)', 'Chaturthamsa (D-4)',
  'Panchamsa (D-5)', 'Shashthamsa (D-6)', 'Saptamsa (D-7)', 'Ashtamsa (D-8)',
  'Navamsa (D-9)', 'Dasamsa (D-10)', 'Rudramsa (D-11)', 'Dwadasamsa (D-12)',
  'Shodasamsa (D-16)', 'Vimsamsa (D-20)', 'Chaturvimsamsa (D-24)',
  'Nakshatramsa (D-27)', 'Trimsamsa (D-30)', 'Khavedamsa (D-40)',
  'Akshavedamsa (D-45)', 'Shashtiamsa (D-60)', 'Nava Navamsa (D-81)',
  'Ashtottaramsa (D-108)', 'Dwadas Dwadasamsa (D-144)',
];

const TITHI_OPTIONS = [
  'Janma Tithi', 'Dhana Tithi', 'Bhrartri Tithi', 'Matri Tithi',
  'Putra Tithi', 'Satru Tithi', 'Kalatra Tithi', 'Mrutyu Tithi',
  'Bhagya Tithi', 'Karma Tithi', 'Laabha Tithi', 'Vyaya Tithi',
];

const DHASA_START_OPTIONS = [
  ...PLANET_NAMES_EN.slice(0, 9).map(p => `${p} Sphuta`),
  'Ascendant Sphuta', 'Maandi Sphuta', 'Gulika Sphuta', 'Tri-Sphuta',
  'Bhrigu Bindhu Lagna', 'Indu Lagna', 'Pranapada Lagna',
];

const MOON_START_OPTIONS = [
  'From birth star', 'From 4th star', 'From 5th star', 'From 8th star',
];

const ANTARDHASA_OPTIONS = [
  'Option 1: Standard', 'Option 2: Reverse', 'Option 3: From lord',
  'Option 4: From 7th lord', 'Option 5: Kendradhi', 'Option 6: Trikona',
];

const AAYU_TYPE_OPTIONS = ['Pindayu', 'Nisargayu', 'Amsayu', 'None'];

const TARA_METHOD_OPTIONS = ['Method 1: Direct', 'Method 2: Indirect'];

/** Which dasha indices support which options */
const SEED_STAR_DASHAS: Record<number, number> = { 0: 3, 2: 3, 3: 6, 5: 7, 7: 8, 8: 27, 9: 19, 10: 17, 11: 27, 12: 15, 14: 1, 15: 22 };
const DHASA_START_PLANET_DASHAS = [0, 2, 3, 5, 7, 8, 9, 10, 11, 12, 14, 15, 22];
const START_FROM_MOON_DASHAS = [0, 2, 3, 5, 7, 8, 9, 10, 11, 12, 14, 15, 22];
const TRIBHAGI_DASHAS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 22];
const VARGA_DASHAS = [0, 2, 3, 5, 7, 8, 9, 10, 11, 12, 14, 15, 17, 19, 22];
const ANTARDHASA_DASHAS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 22];
const TITHI_DASHAS = [4, 6];

// ============================================================================
// COMPONENT
// ============================================================================

export function DashaOptionsDialog({
  open,
  onClose,
  onAccept,
  dashaIndex,
  dashaOptionList,
}: DashaOptionsDialogProps) {
  const dashaName = GRAHA_DHASA_NAMES[dashaIndex] ?? 'Unknown';

  // Determine visibility
  const showAayu = dashaIndex === 21;
  const showNaisargika = dashaIndex === 16;
  const showTara = dashaIndex === 17;
  const showRbv = dashaIndex === 2;
  const showTithi = TITHI_DASHAS.includes(dashaIndex);
  const showTribhagi = TRIBHAGI_DASHAS.includes(dashaIndex);
  const showSeedStar = dashaIndex in SEED_STAR_DASHAS;
  const showDhasaStart = DHASA_START_PLANET_DASHAS.includes(dashaIndex);
  const showMoonStart = START_FROM_MOON_DASHAS.includes(dashaIndex);
  const showAntardhasa = ANTARDHASA_DASHAS.includes(dashaIndex);
  const showVarga = VARGA_DASHAS.includes(dashaIndex);

  const hasAnyOption = showAayu || showNaisargika || showTara || showRbv || showTithi
    || showTribhagi || showSeedStar || showDhasaStart || showMoonStart
    || showAntardhasa || showVarga;

  // ---- State (initialize from dashaOptionList or defaults) ----
  const defaults = dashaOptionList ?? [];
  let optIdx = 0;

  const [aayuType, setAayuType] = useState<number>(() => showAayu ? (defaults[optIdx++] as number ?? 0) : 0);
  const [naisargikaOpt1, setNaisargikaOpt1] = useState<boolean>(() => showNaisargika ? (defaults[optIdx++] as boolean ?? false) : false);
  const [naisargikaOpt2, setNaisargikaOpt2] = useState<boolean>(() => showNaisargika ? (defaults[optIdx++] as boolean ?? false) : false);
  const [naisargikaOpt3, setNaisargikaOpt3] = useState<boolean>(() => showNaisargika ? (defaults[optIdx++] as boolean ?? false) : false);
  const [taraMethod, setTaraMethod] = useState<number>(() => showTara ? (defaults[optIdx++] as number ?? 0) : 0);
  const [rbvVariation, setRbvVariation] = useState<boolean>(() => showRbv ? (defaults[optIdx++] as boolean ?? false) : false);
  const [tithiIndex, setTithiIndex] = useState<number>(() => showTithi ? (defaults[optIdx++] as number ?? 0) : 0);
  const [tribhagi, setTribhagi] = useState<boolean>(() => showTribhagi ? (defaults[optIdx++] as boolean ?? false) : false);
  const [seedStar, setSeedStar] = useState<number>(() => showSeedStar ? (defaults[optIdx++] as number ?? 0) : 0);
  const [dashaStart, setDashaStart] = useState<number>(() => showDhasaStart ? (defaults[optIdx++] as number ?? 0) : 0);
  const [moonStart, setMoonStart] = useState<number>(() => showMoonStart ? (defaults[optIdx++] as number ?? 0) : 0);
  const [antardhasaOpt, setAntardhasaOpt] = useState<number>(() => showAntardhasa ? (defaults[optIdx++] as number ?? 0) : 0);
  const [vargaChart, setVargaChart] = useState<number>(() => showVarga ? (defaults[optIdx++] as number ?? 0) : 0);
  const [vargaMethod, setVargaMethod] = useState<number>(() => showVarga ? (defaults[optIdx++] as number ?? -1) : -1);

  const showVargaMethod = showVarga && vargaChart > 0;

  // ---- Handlers ----
  const handleAccept = useCallback(() => {
    const optionStr: string[] = [];
    const optionList: (number | boolean)[] = [];

    if (showAayu) {
      optionStr.push(`aayur_type=${aayuType < 3 ? aayuType : 'None'}`);
      optionList.push(aayuType);
    }
    if (showNaisargika) {
      optionStr.push(`mahadhasa_lord_has_no_antardhasa=${naisargikaOpt1}`);
      optionList.push(naisargikaOpt1);
      optionStr.push(`antardhasa_option1=${naisargikaOpt2}`);
      optionList.push(naisargikaOpt2);
      optionStr.push(`antardhasa_option2=${naisargikaOpt3}`);
      optionList.push(naisargikaOpt3);
    }
    if (showTara) {
      optionStr.push(`dhasa_method=${taraMethod + 1}`);
      optionList.push(taraMethod);
    }
    if (showRbv) {
      optionStr.push(`use_rasi_bhukthi_variation=${rbvVariation}`);
      optionList.push(rbvVariation);
    }
    if (showTithi) {
      optionStr.push(`tithi_index=${tithiIndex + 1}`);
      optionList.push(tithiIndex);
    }
    if (showTribhagi) {
      optionStr.push(`use_tribhagi_variation=${tribhagi}`);
      optionList.push(tribhagi);
    }
    if (showSeedStar) {
      optionStr.push(`seed_star=${seedStar + 1}`);
      optionList.push(seedStar);
    }
    if (showDhasaStart) {
      const indDict: Record<number, string> = {
        0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
        9: "'L'", 10: "'M'", 11: "'G'", 12: "'T'", 13: "'B'", 14: "'I'", 15: "'P'",
      };
      optionStr.push(`dhasa_starting_planet=${indDict[dashaStart] ?? '0'}`);
      optionList.push(dashaStart);
    }
    if (showMoonStart) {
      const moonIndDict: Record<number, number> = { 0: 1, 1: 4, 2: 5, 3: 8 };
      optionStr.push(`star_position_from_moon=${moonIndDict[moonStart] ?? 1}`);
      optionList.push(moonStart);
    }
    if (showAntardhasa) {
      optionStr.push(`antardhasa_option=${antardhasaOpt + 1}`);
      optionList.push(antardhasaOpt);
    }
    if (showVarga) {
      const dcf = DIVISIONAL_CHART_FACTORS[vargaChart] ?? 1;
      optionStr.push(`divisional_chart_factor=${dcf}`);
      optionList.push(vargaChart);
      if (showVargaMethod) {
        optionStr.push(`chart_method=${vargaMethod + 1}`);
        optionList.push(vargaMethod);
      } else {
        optionList.push(-1);
      }
    }

    onAccept?.({
      optionString: optionStr.join(','),
      optionList,
      accepted: true,
    });
    onClose();
  }, [
    showAayu, showNaisargika, showTara, showRbv, showTithi, showTribhagi,
    showSeedStar, showDhasaStart, showMoonStart, showAntardhasa, showVarga, showVargaMethod,
    aayuType, naisargikaOpt1, naisargikaOpt2, naisargikaOpt3, taraMethod, rbvVariation,
    tithiIndex, tribhagi, seedStar, dashaStart, moonStart, antardhasaOpt, vargaChart, vargaMethod,
    onAccept, onClose,
  ]);

  const handleCancel = useCallback(() => {
    onAccept?.({ optionString: '', optionList: [], accepted: false });
    onClose();
  }, [onAccept, onClose]);

  if (!open) return null;

  // If no options are applicable for this dasha, auto-close
  if (!hasAnyOption) {
    // Render briefly then close
    return null;
  }

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog dasha-options-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">{dashaName} Dasha Options</h3>
          <button className="dialog-close-btn" onClick={handleCancel} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="dialog-body dasha-options-body">
          {/* Aayu Type */}
          {showAayu && (
            <div className="dasha-option-row">
              <label className="dasha-option-label">Aayu Dasha Type</label>
              <select className="select" value={aayuType} onChange={e => setAayuType(Number(e.target.value))}>
                {AAYU_TYPE_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* Naisargika Options */}
          {showNaisargika && (
            <>
              <p className="dasha-option-label">Naisargika Dasha Options</p>
              <label className="options-checkbox-item">
                <input type="checkbox" checked={naisargikaOpt1} onChange={e => setNaisargikaOpt1(e.target.checked)} />
                <span>Mahadasha lord has no antardhasa</span>
              </label>
              <label className="options-checkbox-item">
                <input type="checkbox" checked={naisargikaOpt2} onChange={e => setNaisargikaOpt2(e.target.checked)} />
                <span>Antardhasa option 1</span>
              </label>
              <label className="options-checkbox-item">
                <input type="checkbox" checked={naisargikaOpt3} onChange={e => setNaisargikaOpt3(e.target.checked)} />
                <span>Antardhasa option 2</span>
              </label>
            </>
          )}

          {/* Tara Method */}
          {showTara && (
            <div className="dasha-option-row">
              <label className="dasha-option-label">Tara Dasha Method</label>
              <select className="select" value={taraMethod} onChange={e => setTaraMethod(Number(e.target.value))}>
                {TARA_METHOD_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* RBV Variation */}
          {showRbv && (
            <label className="options-checkbox-item">
              <input type="checkbox" checked={rbvVariation} onChange={e => setRbvVariation(e.target.checked)} disabled />
              <span>Use Rasi Bhukthi Variation</span>
            </label>
          )}

          {/* Tithi Index */}
          {showTithi && (
            <div className="dasha-option-row">
              <label className="dasha-option-label">Tithi Index</label>
              <select className="select" value={tithiIndex} onChange={e => setTithiIndex(Number(e.target.value))}>
                {TITHI_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tribhagi */}
          {showTribhagi && (
            <div className="dasha-option-row">
              <label className="dasha-option-label">Tribhagi Variation</label>
              <label className="options-checkbox-item">
                <input type="checkbox" checked={tribhagi} onChange={e => setTribhagi(e.target.checked)} />
                <span>Use Tribhagi</span>
              </label>
            </div>
          )}

          {/* Seed Star */}
          {showSeedStar && (
            <div className="dasha-option-row">
              <label className="dasha-option-label">Seed Star</label>
              <select className="select" value={seedStar} onChange={e => setSeedStar(Number(e.target.value))}>
                {NAKSHATRA_NAMES_EN.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dasha Start Planet */}
          {showDhasaStart && (
            <div className="dasha-option-row">
              <label className="dasha-option-label">Dasha Starting Planet</label>
              <select className="select" value={dashaStart} onChange={e => setDashaStart(Number(e.target.value))}>
                {DHASA_START_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* Moon Start */}
          {showMoonStart && (
            <div className="dasha-option-row">
              <label className="dasha-option-label">Star Position from Moon</label>
              <select className="select" value={moonStart} onChange={e => setMoonStart(Number(e.target.value))}>
                {MOON_START_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* Antardhasa Option */}
          {showAntardhasa && (
            <div className="dasha-option-row">
              <label className="dasha-option-label">Antardhasa Option</label>
              <select className="select" value={antardhasaOpt} onChange={e => setAntardhasaOpt(Number(e.target.value))}>
                {ANTARDHASA_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* Varga Chart */}
          {showVarga && (
            <>
              <div className="dasha-option-row">
                <label className="dasha-option-label">Varga Chart</label>
                <select className="select" value={vargaChart} onChange={e => setVargaChart(Number(e.target.value))}>
                  {CHART_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
              </div>
              {showVargaMethod && (
                <div className="dasha-option-row">
                  <label className="dasha-option-label">Chart Method</label>
                  <select className="select" value={vargaMethod} onChange={e => setVargaMethod(Number(e.target.value))}>
                    <option value={0}>Method 1</option>
                    <option value={1}>Method 2</option>
                    <option value={2}>Method 3</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn btn-primary" onClick={handleAccept}>Accept</button>
          <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default DashaOptionsDialog;
