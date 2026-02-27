/**
 * ChartsPage — Full divisional chart browser.
 * Shows a grid of selectable vargas, the rendered chart, and a planet position table.
 */

import { Link } from 'react-router-dom';
import { Card } from '../components/shared/Card';
import { ChartRenderer } from '../components/charts/ChartRenderer';
import { DivisionalChartGrid } from '../components/charts/DivisionalChartGrid';
import { PlanetPositionTable } from '../components/charts/PlanetPositionTable';
import { useHoroscopeContext } from '../contexts/HoroscopeContext';
import './ChartsPage.css';

export function ChartsPage() {
  const { horoscope, selectedVarga, setSelectedVarga, chartData } =
    useHoroscopeContext();

  if (!horoscope) {
    return (
      <div className="page-stub">
        <Card>
          <h2>Divisional Charts</h2>
          <p
            className="text-secondary"
            style={{ marginTop: 'var(--space-md)' }}
          >
            Calculate a horoscope first to explore divisional charts.
          </p>
          <Link
            to="/"
            className="btn btn-secondary"
            style={{ marginTop: 'var(--space-md)', display: 'inline-block' }}
          >
            Go to Overview
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="charts-page animate-fadeIn">
      {/* Header */}
      <div className="charts-page-header">
        <h2>Divisional Charts</h2>
      </div>

      {/* Varga Grid Selector */}
      <Card className="charts-page-selector">
        <DivisionalChartGrid
          selectedVarga={selectedVarga}
          onSelect={setSelectedVarga}
        />
      </Card>

      {/* Chart + Positions */}
      <div className="charts-page-content">
        <div className="charts-page-chart">
          <Card>
            <h3 className="charts-page-chart-title">
              {chartData?.title || `D-${selectedVarga}`}
            </h3>
            <div className="charts-page-chart-container">
              <ChartRenderer
                planets={chartData?.planets || []}
                ascendantRasi={chartData?.ascendantRasi || 0}
                title={chartData?.title || ''}
              />
            </div>
          </Card>
        </div>

        <div className="charts-page-positions">
          <Card>
            <h3 className="charts-page-positions-title">Planet Positions</h3>
            <PlanetPositionTable
              d1Positions={horoscope.planets}
              vargas={[selectedVarga]}
              showDegrees={true}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
