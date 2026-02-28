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
          <div className="page-stub-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--color-accent-gold)" strokeWidth="2" opacity="0.5" />
              <circle cx="24" cy="24" r="12" stroke="var(--color-border)" strokeWidth="1" />
              <circle cx="24" cy="24" r="4" fill="var(--color-accent-gold)" opacity="0.4" />
              <line x1="24" y1="4" x2="24" y2="12" stroke="var(--color-accent-gold)" strokeWidth="1.5" opacity="0.6" />
              <line x1="44" y1="24" x2="36" y2="24" stroke="var(--color-accent-gold)" strokeWidth="1.5" opacity="0.6" />
              <line x1="24" y1="44" x2="24" y2="36" stroke="var(--color-accent-gold)" strokeWidth="1.5" opacity="0.6" />
            </svg>
          </div>
          <h2>Dasha Explorer</h2>
          <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
            Calculate a horoscope first to explore all 44 dasha systems.
          </p>
          <Link to="/" className="btn btn-secondary">
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
