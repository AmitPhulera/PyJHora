/**
 * YogaCard — Individual yoga display card
 */
import type { CategorizedYoga } from '../../hooks/useYogas';
import { Badge } from '../shared/Badge';

const PLANET_NAMES: Record<number, string> = {
  0: 'Sun', 1: 'Moon', 2: 'Mars', 3: 'Mercury',
  4: 'Jupiter', 5: 'Venus', 6: 'Saturn', 7: 'Rahu', 8: 'Ketu',
};

const PLANET_VARIANT: Record<number, 'gold' | 'blue' | 'error' | 'success' | 'muted'> = {
  0: 'gold', 1: 'muted', 2: 'error', 3: 'success',
  4: 'gold', 5: 'error', 6: 'blue', 7: 'muted', 8: 'muted',
};

interface YogaCardProps {
  yoga: CategorizedYoga;
}

export function YogaCard({ yoga }: YogaCardProps) {
  return (
    <div className={`yoga-card card ${yoga.isPresent ? 'yoga-present' : 'yoga-absent'}`}>
      <div className="yoga-card-header">
        <span className="yoga-card-name">{yoga.name}</span>
        <Badge variant={yoga.isPresent ? 'success' : 'muted'}>
          {yoga.isPresent ? 'Present' : 'Absent'}
        </Badge>
      </div>

      {yoga.description && (
        <p className="yoga-card-desc">{yoga.description}</p>
      )}

      <div className="yoga-card-details">
        {yoga.planets && yoga.planets.length > 0 && (
          <div className="yoga-card-badges">
            {yoga.planets.map((p) => (
              <Badge key={p} variant={PLANET_VARIANT[p] ?? 'muted'}>
                {PLANET_NAMES[p] ?? `P${p}`}
              </Badge>
            ))}
          </div>
        )}

        {yoga.houses && yoga.houses.length > 0 && (
          <div className="yoga-card-badges">
            {yoga.houses.map((h) => (
              <Badge key={h} variant="blue">
                H{h + 1}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
