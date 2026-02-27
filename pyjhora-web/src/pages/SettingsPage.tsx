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
