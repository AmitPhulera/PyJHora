/**
 * Shared utilities for SVG chart rendering.
 *
 * Provides planet/rasi symbols, color helpers, and a layout function that
 * positions planet labels within an arbitrary bounding box.
 */

// ---------------------------------------------------------------------------
// Planet short names
// ---------------------------------------------------------------------------
export const PLANET_SYMBOLS: Record<number, string> = {
  0: 'Su',
  1: 'Mo',
  2: 'Ma',
  3: 'Me',
  4: 'Ju',
  5: 'Ve',
  6: 'Sa',
  7: 'Ra',
  8: 'Ke',
};

// ---------------------------------------------------------------------------
// Planet full names (for tooltips)
// ---------------------------------------------------------------------------
export const PLANET_FULL_NAMES: Record<number, string> = {
  0: 'Sun',
  1: 'Moon',
  2: 'Mars',
  3: 'Mercury',
  4: 'Jupiter',
  5: 'Venus',
  6: 'Saturn',
  7: 'Rahu',
  8: 'Ketu',
};

// ---------------------------------------------------------------------------
// Rasi short names (indexed 0 = Aries .. 11 = Pisces)
// ---------------------------------------------------------------------------
export const RASI_SYMBOLS = [
  'Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi',
  'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi',
];

// ---------------------------------------------------------------------------
// Rasi full names (for tooltips)
// ---------------------------------------------------------------------------
export const RASI_FULL_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// ---------------------------------------------------------------------------
// Planet CSS color variable name (for SVG fill/stroke)
// ---------------------------------------------------------------------------
const PLANET_COLOR_VARS: Record<number, string> = {
  0: 'var(--color-planet-sun)',
  1: 'var(--color-planet-moon)',
  2: 'var(--color-planet-mars)',
  3: 'var(--color-planet-mercury)',
  4: 'var(--color-planet-jupiter)',
  5: 'var(--color-planet-venus)',
  6: 'var(--color-planet-saturn)',
  7: 'var(--color-planet-rahu)',
  8: 'var(--color-planet-ketu)',
};

export function getPlanetColor(planetId: number): string {
  return PLANET_COLOR_VARS[planetId] ?? 'var(--color-text)';
}

// ---------------------------------------------------------------------------
// Degree formatting (longitude → DD°MM'SS")
// ---------------------------------------------------------------------------
export function formatDegrees(longitude: number): string {
  const deg = Math.floor(longitude);
  const minFloat = (longitude - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(2, '0')}"`;
}

/**
 * Build a tooltip string for a planet in a chart cell.
 */
export function buildPlanetTooltip(
  planetId: number,
  rasi: number,
  longitude: number,
  isRetrograde?: boolean,
): string {
  const name = PLANET_FULL_NAMES[planetId] ?? `Planet ${planetId}`;
  const rasiName = RASI_FULL_NAMES[rasi] ?? `Rasi ${rasi}`;
  const degInSign = longitude % 30;
  const retro = isRetrograde ? ' (R)' : '';
  return `${name}${retro} — ${rasiName} ${formatDegrees(degInSign)}`;
}

// ---------------------------------------------------------------------------
// Layout planets within a cell bounding box
// ---------------------------------------------------------------------------
export interface PositionedText {
  text: string;
  x: number;
  y: number;
  color: string;
  tooltip?: string;
}

/**
 * Given a list of planets and a bounding box, returns positioned text items
 * ready to be placed as <text> elements in SVG.
 *
 * - 1 planet: centered in the cell
 * - 2-3 planets: stacked vertically (centered horizontally)
 * - 4+ planets: arranged in 2 columns
 *
 * Retrograde planets get an "R" suffix appended to their abbreviation.
 */
export function layoutPlanetsInCell(
  planets: Array<{ planet: number; rasi?: number; longitude?: number; isRetrograde?: boolean }>,
  bounds: { x: number; y: number; width: number; height: number },
  fontSize: number,
): PositionedText[] {
  if (planets.length === 0) return [];

  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const lineHeight = fontSize * 1.4;

  const items: PositionedText[] = [];

  if (planets.length <= 3) {
    // Stack vertically, centered
    const totalHeight = planets.length * lineHeight;
    const startY = cy - totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const label = (PLANET_SYMBOLS[p.planet] ?? '?') + (p.isRetrograde ? '\u1D3F' : '');
      const tooltip = p.rasi != null && p.longitude != null
        ? buildPlanetTooltip(p.planet, p.rasi, p.longitude, p.isRetrograde)
        : undefined;
      items.push({
        text: label,
        x: cx,
        y: startY + i * lineHeight,
        color: getPlanetColor(p.planet),
        tooltip,
      });
    }
  } else {
    // 2-column layout
    const cols = 2;
    const rows = Math.ceil(planets.length / cols);
    const colWidth = bounds.width / (cols + 1);
    const totalHeight = rows * lineHeight;
    const startY = cy - totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < planets.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const p = planets[i];
      const label = (PLANET_SYMBOLS[p.planet] ?? '?') + (p.isRetrograde ? '\u1D3F' : '');
      const tooltip = p.rasi != null && p.longitude != null
        ? buildPlanetTooltip(p.planet, p.rasi, p.longitude, p.isRetrograde)
        : undefined;
      items.push({
        text: label,
        x: bounds.x + colWidth * (col + 0.75),
        y: startY + row * lineHeight,
        color: getPlanetColor(p.planet),
        tooltip,
      });
    }
  }

  return items;
}
