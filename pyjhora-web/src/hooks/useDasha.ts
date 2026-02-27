/**
 * useDasha — groups dasha systems by category for the UI
 */
import { useMemo, useState } from 'react';
import { DASHA_SYSTEMS } from './useHoroscope';

export type DashaSystem = (typeof DASHA_SYSTEMS)[number];

export interface DashaCategory {
  id: string;
  label: string;
  systems: DashaSystem[];
}

/** Groups systems by UI-display category. Tithi, Karana, and Yoga merge into one group. */
export function useDashaCategories(): DashaCategory[] {
  return useMemo(() => {
    const map = new Map<string, DashaSystem[]>();

    for (const sys of DASHA_SYSTEMS) {
      // Merge tithi, karana, yoga into one bucket
      const groupKey =
        sys.category === 'karana' || sys.category === 'yoga'
          ? 'tithi'
          : sys.type === 'special' && sys.category === 'special'
            ? 'special-system'
            : sys.category;

      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey)!.push(sys);
    }

    const order = ['nakshatra', 'tithi', 'special', 'rasi', 'special-system'];
    const labelMap: Record<string, string> = {
      nakshatra: 'Nakshatra Dashas',
      tithi: 'Tithi / Karana / Yoga Dashas',
      special: 'Special Graha Dashas',
      rasi: 'Rasi Dashas',
      'special-system': 'Special Systems',
    };

    const categories: DashaCategory[] = [];
    for (const key of order) {
      const systems = map.get(key);
      if (systems && systems.length > 0) {
        categories.push({
          id: key,
          label: labelMap[key] ?? key,
          systems,
        });
      }
    }

    return categories;
  }, []);
}

/** Hook for search-filtered dasha systems. */
export function useDashaSearch(categories: DashaCategory[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .map((cat) => ({
        ...cat,
        systems: cat.systems.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.systems.length > 0);
  }, [categories, searchQuery]);

  return { searchQuery, setSearchQuery, filteredCategories };
}
