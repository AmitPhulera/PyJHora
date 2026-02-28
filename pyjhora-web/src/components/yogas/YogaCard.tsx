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

/** Classify yoga nature from its name/category */
function getYogaNature(name: string, category: string): 'benefic' | 'malefic' | 'neutral' {
  const lc = name.toLowerCase();
  // Malefic yogas
  if (/kemadruma|papa|daridra|dur|arist|graha.*malika.*6|graha.*malika.*8|graha.*malika.*12/.test(lc)) return 'malefic';
  // Clearly benefic yogas
  if (/raja|dhana|lakshmi|hamsa|malavya|ruchak|bhadra|sasa|gajakesari|amala|subha|budha.*aditya/.test(lc)) return 'benefic';
  // Category-based
  if (category === 'Wealth Yogas' || category === 'Raja Yogas' || category === 'Pancha Mahapurusha Yogas') return 'benefic';
  if (category === 'Parivraja Yogas') return 'neutral';
  return 'neutral';
}

/** SVG icon for yoga category */
function CategoryIcon({ category }: { category: string }) {
  const color = 'currentColor';
  if (category === 'Raja Yogas' || category === 'Pancha Mahapurusha Yogas') {
    // Crown icon
    return (
      <svg className="yoga-category-icon" viewBox="0 0 14 14" width="12" height="12" aria-hidden="true">
        <path d="M2 10L1 4L4.5 6.5L7 3L9.5 6.5L13 4L12 10Z" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
        <line x1="2" y1="11.5" x2="12" y2="11.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (category === 'Wealth Yogas') {
    // Gem icon
    return (
      <svg className="yoga-category-icon" viewBox="0 0 14 14" width="12" height="12" aria-hidden="true">
        <polygon points="7,1 12,5 10,13 4,13 2,5" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
        <polyline points="2,5 7,7 12,5" fill="none" stroke={color} strokeWidth="0.8" />
        <line x1="7" y1="7" x2="7" y2="13" stroke={color} strokeWidth="0.8" />
      </svg>
    );
  }
  if (category === 'Lunar Yogas') {
    // Crescent icon
    return (
      <svg className="yoga-category-icon" viewBox="0 0 14 14" width="12" height="12" aria-hidden="true">
        <path d="M9 2A5.5 5.5 0 109 12A4 4 0 019 2Z" fill="none" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  }
  if (category === 'Solar Yogas') {
    // Sun icon
    return (
      <svg className="yoga-category-icon" viewBox="0 0 14 14" width="12" height="12" aria-hidden="true">
        <circle cx="7" cy="7" r="3" fill="none" stroke={color} strokeWidth="1.2" />
        {[0, 45, 90, 135].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return <line key={angle} x1={7 + 4.5 * Math.cos(rad)} y1={7 + 4.5 * Math.sin(rad)} x2={7 + 6 * Math.cos(rad)} y2={7 + 6 * Math.sin(rad)} stroke={color} strokeWidth="1" strokeLinecap="round" />;
        })}
      </svg>
    );
  }
  // Default star
  return (
    <svg className="yoga-category-icon" viewBox="0 0 14 14" width="12" height="12" aria-hidden="true">
      <path d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5Z" fill="none" stroke={color} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

interface YogaCardProps {
  yoga: CategorizedYoga;
}

export function YogaCard({ yoga }: YogaCardProps) {
  const nature = yoga.isPresent ? getYogaNature(yoga.name, yoga.category) : 'neutral';

  return (
    <div className={`yoga-card card ${yoga.isPresent ? 'yoga-present' : 'yoga-absent'} ${yoga.isPresent ? `yoga-${nature}` : ''}`}>
      <div className="yoga-card-header">
        <span className="yoga-card-name">
          <CategoryIcon category={yoga.category} />
          {yoga.name}
        </span>
        <div className="yoga-card-badges-header">
          {yoga.isPresent && nature !== 'neutral' && (
            <Badge variant={nature === 'benefic' ? 'success' : 'error'}>
              {nature === 'benefic' ? 'Benefic' : 'Malefic'}
            </Badge>
          )}
          <Badge variant={yoga.isPresent ? 'success' : 'muted'}>
            {yoga.isPresent ? 'Present' : 'Absent'}
          </Badge>
        </div>
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
