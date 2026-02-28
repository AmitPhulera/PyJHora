/**
 * YogasPage — Yoga analysis with categorized results
 */
import { Link } from 'react-router-dom';
import { Card } from '../components/shared/Card';
import { YogaList } from '../components/yogas/YogaList';
import { useHoroscopeContext } from '../contexts/HoroscopeContext';
import { useYogas } from '../hooks/useYogas';

export function YogasPage() {
  const { horoscope } = useHoroscopeContext();
  const { yogas, presentCount, totalChecked } = useYogas(horoscope?.planets ?? null);

  if (!horoscope) {
    return (
      <div className="page-stub">
        <Card>
          <div className="page-stub-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L30 16L44 18L34 28L36 44L24 37L12 44L14 28L4 18L18 16Z" stroke="var(--color-accent-gold)" strokeWidth="2" fill="none" opacity="0.5" />
              <circle cx="24" cy="24" r="4" fill="var(--color-accent-gold)" opacity="0.4" />
            </svg>
          </div>
          <h2>Yoga Analysis</h2>
          <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
            Calculate a horoscope first to analyze 170+ yoga combinations.
          </p>
          <Link to="/" className="btn btn-secondary">
            Go to Overview
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-yogas animate-fadeIn">
      <h2 className="page-title">Yoga Analysis</h2>
      <YogaList
        yogas={yogas}
        presentCount={presentCount}
        totalChecked={totalChecked}
      />
    </div>
  );
}
