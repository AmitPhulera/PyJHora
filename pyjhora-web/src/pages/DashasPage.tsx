/**
 * DashasPage — Full Dasha Explorer with all 44+ dasha systems
 */
import { Link } from 'react-router-dom';
import { DashaExplorer } from '../components/dasha/DashaExplorer';
import { Card } from '../components/shared/Card';
import { useHoroscopeContext } from '../contexts/HoroscopeContext';

export function DashasPage() {
  const { horoscope } = useHoroscopeContext();

  if (!horoscope) {
    return (
      <div className="page-stub">
        <Card>
          <h2>Dasha Explorer</h2>
          <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
            Calculate a horoscope first to explore dasha systems.
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
    <div className="page-dashas animate-fadeIn">
      <DashaExplorer />
    </div>
  );
}
