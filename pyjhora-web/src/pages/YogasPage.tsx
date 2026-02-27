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
          <h2>Yoga Analysis</h2>
          <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
            Calculate a horoscope first to analyze yogas.
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
