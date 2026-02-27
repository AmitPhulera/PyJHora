/**
 * JHora PWA - Main Application Component
 * Now uses HoroscopeContext for all calculation state.
 */

import { useState } from 'react';
import './App.css';

// Components
import {
  BirthInputForm,
  DashaTable,
  DivisionalChartSelector,
  LagnaDisplay,
  PanchangaDisplay,
  PlanetPositionTable,
  SouthIndianChart,
  WheelChart,
} from './components';
import type { ChartView } from './components';

// Context
import {
  DASHA_SYSTEMS,
  useHoroscopeContext,
  type DashaSystemId,
} from './contexts/HoroscopeContext';

function App() {
  const {
    birthData,
    setBirthData,
    horoscope,
    selectedVarga,
    setSelectedVarga,
    chartData,
    selectedSystem,
    setSelectedSystem,
    dashaResult,
    selectedDasha,
    setSelectedDasha,
  } = useHoroscopeContext();

  const [chartView, setChartView] = useState<ChartView>('south-indian');

  const systemInfo = DASHA_SYSTEMS.find((s) => s.id === selectedSystem);

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <div className="logo">JHora</div>
          <div className="header-meta text-sm text-secondary">
            Vedic Astrology Calculator
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {!horoscope ? (
            <div className="intro-section">
              <div className="intro-content">
                <h1 className="intro-title">Vedic Horoscope Calculator</h1>
                <p className="intro-subtitle text-secondary">
                  Enter your birth details to generate a complete Vedic horoscope with
                  Panchanga, Divisional Charts, and 27 different Dasha systems.
                </p>
                <BirthInputForm onSubmit={setBirthData} />
              </div>
            </div>
          ) : (
            <div className="horoscope-section animate-fadeIn">
              <div className="horoscope-header">
                <div>
                  <h2>{birthData?.placeName}</h2>
                  <p className="text-secondary">
                    {birthData?.date} at {birthData?.time}
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setBirthData(null)}
                >
                  New Chart
                </button>
              </div>

              <div className="horoscope-grid">
                <div className="section">
                  <DivisionalChartSelector
                    selectedVarga={selectedVarga}
                    onSelect={setSelectedVarga}
                    chartView={chartView}
                    onChartViewChange={setChartView}
                  />

                  {chartView === 'south-indian' ? (
                    <SouthIndianChart
                      planets={chartData?.planets || []}
                      ascendantRasi={chartData?.ascendantRasi || 0}
                      title={chartData?.title || ''}
                    />
                  ) : (
                    <WheelChart
                      planets={chartData?.planets || []}
                      ascendantRasi={chartData?.ascendantRasi || 0}
                      title={chartData?.title || ''}
                    />
                  )}
                </div>

                <div className="section">
                  <LagnaDisplay
                    ascendantRasi={horoscope.ascendantRasi}
                    ascendantLongitude={horoscope.ascendantLongitude}
                  />
                </div>

                <div className="section">
                  <PanchangaDisplay panchanga={horoscope.panchanga} />
                </div>

                <div className="section section-wide">
                  <h3>Planet Positions</h3>
                  <PlanetPositionTable
                    d1Positions={horoscope.planets}
                    vargas={[1, 9, 10, 12]}
                    showDegrees={true}
                  />
                </div>

                <div className="section section-wide">
                  <div className="dasha-selector card">
                    <label htmlFor="dasha-system" className="dasha-selector-label">
                      Select Dasha System:
                    </label>
                    <select
                      id="dasha-system"
                      className="dasha-system-select"
                      value={selectedSystem}
                      onChange={(e) => setSelectedSystem(e.target.value as DashaSystemId)}
                    >
                      {DASHA_SYSTEMS.map((system) => (
                        <option key={system.id} value={system.id}>
                          {system.name}
                        </option>
                      ))}
                    </select>
                    {systemInfo && (
                      <p className="dasha-system-desc text-sm text-secondary">
                        {systemInfo.description}
                      </p>
                    )}
                  </div>

                  {dashaResult && (
                    <DashaTable
                      title={systemInfo?.name ?? 'Dasha'}
                      mahadashas={dashaResult.mahadashas.map((m) => ({
                        lord: typeof m.lord === 'number' ? m.lord : 0,
                        lordName: m.lordName,
                        startDate: m.startDate,
                        durationYears: m.durationYears,
                      }))}
                      bhuktis={dashaResult.bhuktis?.map((b) => ({
                        dashaLord: typeof b.dashaLord === 'number' ? b.dashaLord : 0,
                        bhuktiLord: typeof b.bhuktiLord === 'number' ? b.bhuktiLord : 0,
                        bhuktiLordName: b.bhuktiLordName,
                        startDate: b.startDate,
                      }))}
                      balance={dashaResult.balance}
                      selectedDasha={selectedDasha}
                      onDashaSelect={setSelectedDasha}
                      coloringMode={systemInfo?.type === 'rasi' ? 'rasi' : 'planet'}
                    />
                  )}
                </div>
              </div>

              <div className="tech-info card mt-md">
                <h4>Technical Info</h4>
                <div className="tech-grid">
                  <div>
                    <span className="text-secondary">Julian Day:</span>
                    <span className="font-mono">{horoscope.jd.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Latitude:</span>
                    <span className="font-mono">{horoscope.place.latitude.toFixed(4)}&deg;</span>
                  </div>
                  <div>
                    <span className="text-secondary">Longitude:</span>
                    <span className="font-mono">{horoscope.place.longitude.toFixed(4)}&deg;</span>
                  </div>
                  <div>
                    <span className="text-secondary">Timezone:</span>
                    <span className="font-mono">
                      UTC{horoscope.place.timezone >= 0 ? '+' : ''}
                      {horoscope.place.timezone}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container text-center text-sm text-muted">
          <p>JHora -- Vedic Astrology Calculator</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
