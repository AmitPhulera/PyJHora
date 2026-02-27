/**
 * YogaList — Filterable yoga list with category grouping
 */
import { useMemo, useState } from 'react';
import type { CategorizedYoga } from '../../hooks/useYogas';
import { Badge } from '../shared/Badge';
import { YogaCard } from './YogaCard';
import './YogaList.css';

interface YogaListProps {
  yogas: CategorizedYoga[];
  presentCount: number;
  totalChecked: number;
}

export function YogaList({ yogas, presentCount, totalChecked }: YogaListProps) {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let list = yogas;

    // Filter present/all
    if (!showAll) {
      list = list.filter((y) => y.isPresent);
    }

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (y) =>
          y.name.toLowerCase().includes(q) ||
          (y.description ?? '').toLowerCase().includes(q) ||
          y.category.toLowerCase().includes(q),
      );
    }

    return list;
  }, [yogas, showAll, searchQuery]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CategorizedYoga[]>();
    for (const yoga of filtered) {
      if (!map.has(yoga.category)) map.set(yoga.category, []);
      map.get(yoga.category)!.push(yoga);
    }
    return map;
  }, [filtered]);

  return (
    <div className="yoga-list-container">
      {/* Toolbar */}
      <div className="yoga-toolbar">
        <div className="yoga-toolbar-left">
          <Badge variant="gold">
            {presentCount} of {totalChecked} present
          </Badge>
          <button
            className={`yoga-filter-btn ${!showAll ? 'active' : ''}`}
            onClick={() => setShowAll(false)}
          >
            Present Only
          </button>
          <button
            className={`yoga-filter-btn ${showAll ? 'active' : ''}`}
            onClick={() => setShowAll(true)}
          >
            Show All
          </button>
        </div>

        <div className="yoga-search">
          <input
            type="text"
            className="yoga-search-input"
            placeholder="Search yogas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Yoga categories */}
      <div className="yoga-categories">
        {[...grouped.entries()].map(([category, categoryYogas]) => (
          <div key={category} className="yoga-category-section">
            <h3 className="yoga-category-header">
              {category}
              <span className="yoga-category-count">{categoryYogas.length}</span>
            </h3>
            <div className="yoga-grid">
              {categoryYogas.map((yoga) => (
                <YogaCard key={yoga.name} yoga={yoga} />
              ))}
            </div>
          </div>
        ))}

        {grouped.size === 0 && (
          <div className="yoga-empty">
            <p className="text-secondary">
              {searchQuery
                ? 'No yogas match your search.'
                : showAll
                  ? 'No yogas detected.'
                  : 'No yogas present in this chart.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
