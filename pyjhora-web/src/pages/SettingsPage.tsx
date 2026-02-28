/**
 * SettingsPage — Configure appearance and calculation options.
 */

import type { ReactNode } from 'react';
import { useSettings, type ChartStyle } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { ChartStyleSelector } from '../components/charts/ChartStyleSelector';
import { AYANAMSA_MODES, WESTERN_HOUSE_SYSTEMS } from '../core/constants';
import './SettingsPage.css';

// ---------------------------------------------------------------------------
// Ayanamsa options — deduplicated (skip aliases that share the same value)
// ---------------------------------------------------------------------------
const AYANAMSA_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'LAHIRI',          label: 'Lahiri' },
  { key: 'RAMAN',           label: 'Raman' },
  { key: 'KRISHNAMURTI',    label: 'Krishnamurti (KP)' },
  { key: 'FAGAN_BRADLEY',   label: 'Fagan-Bradley' },
  { key: 'TRUE_CITRA',      label: 'True Citra' },
  { key: 'TRUE_REVATI',     label: 'True Revati' },
  { key: 'TRUE_PUSHYA',     label: 'True Pushya' },
  { key: 'TRUE_MULA',       label: 'True Mula' },
  { key: 'YUKTESHWAR',      label: 'Yukteshwar' },
  { key: 'USHASHASHI',      label: 'Usha-Shashi' },
  { key: 'JN_BHASIN',       label: 'JN Bhasin' },
  { key: 'ARYABHATA',       label: 'Aryabhata' },
  { key: 'ARYABHATA_MSUN',  label: 'Aryabhata (Mean Sun)' },
  { key: 'SURYASIDDHANTA',  label: 'Surya Siddhanta' },
  { key: 'SURYASIDDHANTA_MSUN', label: 'Surya Siddhanta (Mean Sun)' },
  { key: 'SS_CITRA',        label: 'SS Citra' },
  { key: 'SS_REVATI',       label: 'SS Revati' },
  { key: 'KP_SENTHIL',      label: 'KP Senthil' },
  { key: 'SASSANIAN',       label: 'Sassanian' },
];

// Validate at build time that all keys actually exist in AYANAMSA_MODES
AYANAMSA_OPTIONS.forEach((opt) => {
  if (!(opt.key in AYANAMSA_MODES)) {
    console.warn(`SettingsPage: unknown ayanamsa key '${opt.key}'`);
  }
});

// ---------------------------------------------------------------------------
// House system options
// ---------------------------------------------------------------------------
const HOUSE_SYSTEM_OPTIONS = Object.entries(WESTERN_HOUSE_SYSTEMS).map(
  ([code, name]) => ({ code, name })
);

// ---------------------------------------------------------------------------
// SettingRow helper
// ---------------------------------------------------------------------------
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-row-info">
        <span className="setting-row-label">{label}</span>
        {description && (
          <span className="setting-row-desc">{description}</span>
        )}
      </div>
      <div className="setting-row-control">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini chart silhouettes for the style preview cards
// ---------------------------------------------------------------------------
function ChartMiniSilhouette({ style }: { style: ChartStyle }) {
  const stroke = 'var(--color-accent-gold)';
  const faint = 'var(--color-border)';

  if (style === 'south') {
    return (
      <svg viewBox="0 0 80 80" width="72" height="72" style={{ opacity: 0.85 }}>
        {/* 4x4 grid */}
        {[1, 2, 3].map((i) => (
          <g key={i}>
            <line x1={i * 20} y1={0} x2={i * 20} y2={80} stroke={faint} strokeWidth="0.8" />
            <line x1={0} y1={i * 20} x2={80} y2={i * 20} stroke={faint} strokeWidth="0.8" />
          </g>
        ))}
        {/* Outer border */}
        <rect x="0.5" y="0.5" width="79" height="79" fill="none" stroke={stroke} strokeWidth="1.5" rx="2" />
        {/* Ascendant marker (Aries = row 0, col 1) */}
        <line x1={20} y1={0.5} x2={20} y2={8} stroke={stroke} strokeWidth="1.2" />
        <line x1={20} y1={0.5} x2={28} y2={0.5} stroke={stroke} strokeWidth="1.2" />
        <line x1={28} y1={0.5} x2={20} y2={8} stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }

  if (style === 'north') {
    return (
      <svg viewBox="0 0 80 80" width="72" height="72" style={{ opacity: 0.85 }}>
        {/* Outer square */}
        <rect x="2" y="2" width="76" height="76" fill="none" stroke={stroke} strokeWidth="1.5" rx="2" />
        {/* Diagonals */}
        <line x1={2} y1={2} x2={78} y2={78} stroke={stroke} strokeWidth="0.8" />
        <line x1={2} y1={78} x2={78} y2={2} stroke={stroke} strokeWidth="0.8" />
        {/* Inner diamond */}
        <polygon points="2,40 40,2 78,40 40,78" fill="none" stroke={stroke} strokeWidth="0.8" />
      </svg>
    );
  }

  // East Indian
  return (
    <svg viewBox="0 0 90 90" width="72" height="72" style={{ opacity: 0.85 }}>
      {/* 3x3 grid */}
      {[1, 2].map((i) => (
        <g key={i}>
          <line x1={i * 30} y1={0} x2={i * 30} y2={90} stroke={faint} strokeWidth="0.8" />
          <line x1={0} y1={i * 30} x2={90} y2={i * 30} stroke={faint} strokeWidth="0.8" />
        </g>
      ))}
      {/* Corner diagonals */}
      <line x1={0} y1={0} x2={30} y2={30} stroke={stroke} strokeWidth="0.8" />
      <line x1={60} y1={0} x2={90} y2={30} stroke={stroke} strokeWidth="0.8" />
      <line x1={0} y1={60} x2={30} y2={90} stroke={stroke} strokeWidth="0.8" />
      <line x1={60} y1={60} x2={90} y2={90} stroke={stroke} strokeWidth="0.8" />
      {/* Outer border */}
      <rect x="0.5" y="0.5" width="89" height="89" fill="none" stroke={stroke} strokeWidth="1.5" rx="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SettingsPage() {
  const {
    chartStyle,
    setChartStyle,
    ayanamsaMode,
    setAyanamsaMode,
    houseSystem,
    setHouseSystem,
  } = useSettings();
  const { theme } = useTheme();

  return (
    <div className="settings-page animate-fadeIn">
      <h2 className="settings-page-title">Settings</h2>

      {/* ---- Appearance ---- */}
      <section className="settings-section card">
        <h3 className="settings-section-title">Appearance</h3>

        <SettingRow
          label="Theme"
          description={`Currently ${theme === 'dark' ? 'Dark (Celestial)' : 'Light (Parchment)'}`}
        >
          <ThemeToggle />
        </SettingRow>

        <SettingRow
          label="Chart Style"
          description="Choose South, North, or East Indian chart rendering"
        >
          <div className="settings-chart-style-row">
            <ChartStyleSelector />
            <span className="settings-chart-style-label">
              {chartStyle === 'south'
                ? 'South Indian'
                : chartStyle === 'north'
                  ? 'North Indian'
                  : 'East Indian'}
            </span>
          </div>
        </SettingRow>
      </section>

      {/* ---- Calculation ---- */}
      <section className="settings-section card">
        <h3 className="settings-section-title">Calculation</h3>

        <SettingRow
          label="Ayanamsa"
          description="Precession correction method used for sidereal longitudes"
        >
          <select
            className="select settings-select"
            value={ayanamsaMode}
            onChange={(e) => setAyanamsaMode(e.target.value)}
          >
            {AYANAMSA_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow
          label="House System"
          description="Method for calculating house cusps"
        >
          <select
            className="select settings-select"
            value={houseSystem}
            onChange={(e) => setHouseSystem(e.target.value)}
          >
            {HOUSE_SYSTEM_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name} ({opt.code})
              </option>
            ))}
          </select>
        </SettingRow>
      </section>

      {/* ---- Chart Style Preview ---- */}
      <section className="settings-section card">
        <h3 className="settings-section-title">Chart Style Preview</h3>
        <div className="settings-chart-preview">
          {(['south', 'north', 'east'] as ChartStyle[]).map((style) => (
            <button
              key={style}
              className={`settings-chart-preview-card ${chartStyle === style ? 'settings-chart-preview-card--selected' : ''}`}
              onClick={() => setChartStyle(style)}
            >
              <ChartMiniSilhouette style={style} />
              <span className="settings-chart-preview-label">
                {style === 'south'
                  ? 'South Indian'
                  : style === 'north'
                    ? 'North Indian'
                    : 'East Indian'}
              </span>
              <span className="settings-chart-preview-desc">
                {style === 'south'
                  ? 'Fixed rasi positions, planets move'
                  : style === 'north'
                    ? 'Fixed house positions, rasis move'
                    : 'Diamond layout, fixed houses'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ---- About ---- */}
      <section className="settings-section card">
        <h3 className="settings-section-title">About</h3>
        <div className="settings-about">
          <p className="settings-about-name">
            JHora &mdash; Vedic Astrology Calculator
          </p>
          <p className="settings-about-credit">
            Based on PyJHora by Sundar Sundaresan
          </p>
          <p className="settings-about-stats">
            44 Dasha Systems &bull; 170+ Yogas &bull; 23 Divisional Charts
          </p>
        </div>
      </section>
    </div>
  );
}
