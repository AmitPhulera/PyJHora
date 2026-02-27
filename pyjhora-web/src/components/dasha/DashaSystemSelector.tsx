/**
 * DashaSystemSelector — Categorized dasha system picker with search
 */
import { useState } from 'react';
import { useDashaCategories, useDashaSearch } from '../../hooks/useDasha';
import type { DashaSystemId } from '../../hooks/useHoroscope';
import './DashaSystemSelector.css';

interface DashaSystemSelectorProps {
  selectedSystem: string;
  onSelect: (id: DashaSystemId) => void;
}

export function DashaSystemSelector({ selectedSystem, onSelect }: DashaSystemSelectorProps) {
  const categories = useDashaCategories();
  const { searchQuery, setSearchQuery, filteredCategories } = useDashaSearch(categories);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="dasha-selector-panel">
      <div className="dasha-search">
        <input
          type="text"
          className="dasha-search-input"
          placeholder="Search dasha systems..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="dasha-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            x
          </button>
        )}
      </div>

      <div className="dasha-category-list">
        {filteredCategories.map((cat) => {
          const isCollapsed = collapsedSections.has(cat.id) && !searchQuery;
          return (
            <div key={cat.id} className="dasha-category">
              <button
                className="dasha-category-header"
                onClick={() => toggleSection(cat.id)}
              >
                <span className="dasha-category-label">{cat.label}</span>
                <span className="dasha-category-count">{cat.systems.length}</span>
                <span className={`dasha-category-chevron ${isCollapsed ? 'collapsed' : ''}`}>
                  {isCollapsed ? '+' : '-'}
                </span>
              </button>
              {!isCollapsed && (
                <div className="dasha-system-list">
                  {cat.systems.map((sys) => (
                    <button
                      key={sys.id}
                      className={`dasha-system-item ${selectedSystem === sys.id ? 'active' : ''}`}
                      onClick={() => onSelect(sys.id as DashaSystemId)}
                    >
                      <span className="dasha-system-name">{sys.name}</span>
                      <span className="dasha-system-desc">{sys.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filteredCategories.length === 0 && (
          <p className="dasha-no-results">No matching dasha systems.</p>
        )}
      </div>
    </div>
  );
}
