/**
 * useYogas — Detect and categorize yogas from planet positions
 */
import { useMemo } from 'react';
import {
  detectAllYogasFromPlanetPositions,
  type YogaResult,
} from '../core/horoscope/yoga';
import type { PlanetPosition } from '../core/types';

export interface CategorizedYoga extends YogaResult {
  category: string;
}

/** Map horoscope planet data to the PlanetPosition shape expected by yoga.ts */
function toYogaPositions(
  planets: Array<{ planet: number; rasi: number; longitude: number; isRetrograde?: boolean }>,
): PlanetPosition[] {
  return planets.map((p) => {
    // HoroscopeData.planets stores longitude as 0-30 (within sign).
    // PlanetPosition from types.ts expects:
    //   longitude: total 0-360, longitudeInSign: 0-30
    const longitudeInSign = p.longitude;
    const totalLongitude = p.rasi * 30 + p.longitude;
    const nak = Math.floor(totalLongitude / (360 / 27));
    const pada = Math.floor((totalLongitude % (360 / 27)) / (360 / 108)) + 1;

    return {
      planet: p.planet,
      rasi: p.rasi,
      longitude: totalLongitude,
      longitudeInSign,
      isRetrograde: p.isRetrograde ?? false,
      nakshatra: nak,
      nakshatraPada: pada,
    };
  });
}

/** Categorize a yoga by its name pattern */
function categorizeYoga(name: string): string {
  const lc = name.toLowerCase();

  // Pancha Mahapurusha
  if (/ruchak|bhadra|hamsa|malavya|sasa/.test(lc)) return 'Pancha Mahapurusha Yogas';

  // Raja Yogas
  if (/raja/.test(lc)) return 'Raja Yogas';

  // Dhana / Wealth Yogas
  if (/dhana|lakshmi|kubera/.test(lc)) return 'Wealth Yogas';

  // Nabhasa Yogas
  if (/nabhasa|akriti|sankhya|asraya/.test(lc)) return 'Nabhasa Yogas';

  // Solar Yogas
  if (/vesi|vosi|ubhayachari|subha.*kartari|papa.*kartari/.test(lc)) return 'Solar Yogas';

  // Lunar Yogas
  if (/sunaph|anaph|durudhur|kemadruma|gajakesari|chandra|moon/.test(lc)) return 'Lunar Yogas';

  // Parivraja (renunciation) Yogas
  if (/parivraja|sanyasa|pravrajya/.test(lc)) return 'Parivraja Yogas';

  return 'Other Yogas';
}

export interface UseYogasResult {
  yogas: CategorizedYoga[];
  presentCount: number;
  totalChecked: number;
  categories: string[];
}

export function useYogas(
  planets: Array<{ planet: number; rasi: number; longitude: number; isRetrograde?: boolean }> | null,
): UseYogasResult {
  return useMemo(() => {
    if (!planets || planets.length === 0) {
      return { yogas: [], presentCount: 0, totalChecked: 0, categories: [] };
    }

    try {
      const positions = toYogaPositions(planets);
      const allYogas = detectAllYogasFromPlanetPositions(positions);

      const categorized: CategorizedYoga[] = allYogas.map((y) => ({
        ...y,
        category: categorizeYoga(y.name),
      }));

      // Sort: present first, then by category, then by name
      categorized.sort((a, b) => {
        if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      });

      const presentCount = categorized.filter((y) => y.isPresent).length;
      const categories = [...new Set(categorized.map((y) => y.category))];

      return {
        yogas: categorized,
        presentCount,
        totalChecked: categorized.length,
        categories,
      };
    } catch (err) {
      console.error('Yoga detection error:', err);
      return { yogas: [], presentCount: 0, totalChecked: 0, categories: [] };
    }
  }, [planets]);
}
