/**
 * East Indian Chart — SVG implementation
 *
 * 3x3 grid (cells of 130x130) with diagonal splits in corner cells.
 * Center cell displays the chart title.
 *
 * House mapping (houses rotate based on ascendant, sign_in_house_i = (asc + i) % 12):
 *
 *   Top-left:     H3 (upper-right) / H2 (lower-left)   (diagonal: TL->BR)
 *   Top-center:   H1
 *   Top-right:    H11 (upper-left) / H12 (lower-right)  (diagonal: TR->BL, i.e. 260,0 -> 390,130)
 *   Mid-left:     H4
 *   Center:       Title
 *   Mid-right:    H10
 *   Bot-left:     H5 (upper-right) / H6 (lower-left)   (diagonal: TL->BR)
 *   Bot-center:   H7
 *   Bot-right:    H9 (upper-left) / H8 (lower-right)   (diagonal: TR->BL)
 */

import { useMemo } from 'react';
import { RASI_SYMBOLS, layoutPlanetsInCell } from './chart-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PlanetData {
  planet: number;
  rasi: number;
  longitude: number;
  isRetrograde?: boolean;
}

interface EastIndianChartProps {
  planets: PlanetData[];
  ascendantRasi: number;
  title?: string;
  showDegrees?: boolean;
}

// ---------------------------------------------------------------------------
// House layout — bounding boxes for planet text (within 390x390 viewBox)
// ---------------------------------------------------------------------------
const C = 130; // cell size

/**
 * Each house has a bounding box for planet text placement.
 * Corner cells are split diagonally; each half gets a triangular region
 * approximated by a smaller rectangle in the relevant half.
 */
const HOUSE_BOUNDS: Array<{ x: number; y: number; width: number; height: number }> = [
  // H1:  top-center full cell
  { x: C + 8,      y: 8,         width: C - 16,      height: C - 16 },
  // H2:  top-left, lower-left triangle
  { x: 6,          y: C / 2 + 4, width: C / 2 - 4,   height: C / 2 - 10 },
  // H3:  top-left, upper-right triangle
  { x: C / 2 + 4,  y: 6,         width: C / 2 - 8,   height: C / 2 - 10 },
  // H4:  mid-left full cell
  { x: 8,          y: C + 8,     width: C - 16,       height: C - 16 },
  // H5:  bot-left, upper-right triangle
  { x: C / 2 + 4,  y: 2 * C + 6, width: C / 2 - 8,  height: C / 2 - 10 },
  // H6:  bot-left, lower-left triangle
  { x: 6,          y: 2 * C + C / 2 + 4, width: C / 2 - 4, height: C / 2 - 10 },
  // H7:  bot-center full cell
  { x: C + 8,      y: 2 * C + 8, width: C - 16,       height: C - 16 },
  // H8:  bot-right, lower-right triangle
  { x: 2 * C + C / 2 + 4, y: 2 * C + C / 2 + 4, width: C / 2 - 8, height: C / 2 - 10 },
  // H9:  bot-right, upper-left triangle
  { x: 2 * C + 6,  y: 2 * C + 6, width: C / 2 - 4,  height: C / 2 - 10 },
  // H10: mid-right full cell
  { x: 2 * C + 8,  y: C + 8,     width: C - 16,       height: C - 16 },
  // H11: top-right, upper-left triangle
  { x: 2 * C + 6,  y: 6,         width: C / 2 - 4,   height: C / 2 - 10 },
  // H12: top-right, lower-right triangle
  { x: 2 * C + C / 2 + 4, y: C / 2 + 4, width: C / 2 - 8, height: C / 2 - 10 },
];

/** Positions for small rasi abbreviation labels */
const HOUSE_RASI_LABEL: Array<{ x: number; y: number }> = [
  { x: C + 6,              y: 12 },                       // H1
  { x: 6,                  y: C - 6 },                    // H2
  { x: C - 14,             y: 12 },                       // H3
  { x: 6,                  y: C + 12 },                   // H4
  { x: C - 14,             y: 2 * C + 12 },               // H5
  { x: 6,                  y: 3 * C - 6 },                // H6
  { x: C + 6,              y: 3 * C - 6 },                // H7
  { x: 3 * C - 14,         y: 3 * C - 6 },                // H8
  { x: 2 * C + 6,          y: 2 * C + 12 },               // H9
  { x: 3 * C - 14,         y: C + 12 },                   // H10
  { x: 2 * C + 6,          y: 12 },                       // H11
  { x: 3 * C - 14,         y: C - 6 },                    // H12
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function EastIndianChart({
  planets,
  ascendantRasi,
  title = 'Rasi Chart',
  showDegrees: _showDegrees = false,
}: EastIndianChartProps) {
  // Build house -> planets mapping (same rotation logic as North)
  const houses = useMemo(() => {
    const grouped: Array<{ rasi: number; planets: PlanetData[] }> = [];
    for (let h = 0; h < 12; h++) {
      grouped.push({ rasi: (ascendantRasi + h) % 12, planets: [] });
    }
    for (const p of planets) {
      const houseIdx = ((p.rasi - ascendantRasi) % 12 + 12) % 12;
      grouped[houseIdx].planets.push(p);
    }
    return grouped;
  }, [planets, ascendantRasi]);

  // Pre-compute positioned text for each house
  const houseContent = useMemo(() => {
    return houses.map((h, idx) => {
      const bounds = HOUSE_BOUNDS[idx];
      const positioned = layoutPlanetsInCell(h.planets, bounds, 10);
      return { ...h, idx, positioned };
    });
  }, [houses]);

  const SIZE = 3 * C; // 390

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      className="east-indian-chart"
      style={{ width: '100%', maxWidth: 390 }}
    >
      {/* Background */}
      <rect width={SIZE} height={SIZE} rx="8" fill="var(--color-card)" />

      {/* Center cell fill */}
      <rect x={C} y={C} width={C} height={C} fill="var(--color-bg)" />

      {/* Grid lines */}
      {[1, 2].map((i) => (
        <g key={`grid-${i}`}>
          <line
            x1={i * C} y1={0} x2={i * C} y2={SIZE}
            stroke="var(--color-border)" strokeWidth="1"
          />
          <line
            x1={0} y1={i * C} x2={SIZE} y2={i * C}
            stroke="var(--color-border)" strokeWidth="1"
          />
        </g>
      ))}

      {/* Corner diagonals */}
      {/* Top-left: TL->BR */}
      <line x1={0} y1={0} x2={C} y2={C} stroke="var(--color-accent-gold)" strokeWidth="1.5" />
      {/* Top-right: TR->BL */}
      <line x1={2 * C} y1={0} x2={3 * C} y2={C} stroke="var(--color-accent-gold)" strokeWidth="1.5" />
      {/* Bottom-left: TL->BR */}
      <line x1={0} y1={2 * C} x2={C} y2={3 * C} stroke="var(--color-accent-gold)" strokeWidth="1.5" />
      {/* Bottom-right: TR->BL */}
      <line x1={2 * C} y1={2 * C} x2={3 * C} y2={3 * C} stroke="var(--color-accent-gold)" strokeWidth="1.5" />

      {/* Outer border */}
      <rect
        x="0.5" y="0.5" width={SIZE - 1} height={SIZE - 1} rx="8"
        fill="none" stroke="var(--color-accent-gold)" strokeWidth="2"
      />

      {/* Center title */}
      <text
        x={SIZE / 2} y={SIZE / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-display)"
        fontSize="13"
        fill="var(--color-text-secondary)"
      >
        {title}
      </text>

      {/* House contents */}
      {houseContent.map((h) => {
        const labelPos = HOUSE_RASI_LABEL[h.idx];

        return (
          <g key={h.idx}>
            {/* Rasi abbreviation */}
            <text
              x={labelPos.x}
              y={labelPos.y}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--color-text-secondary)"
            >
              {RASI_SYMBOLS[h.rasi]}
            </text>

            {/* Planet labels */}
            {h.positioned.map((item, i) => (
              <text
                key={i}
                x={item.x}
                y={item.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="600"
                fontFamily="var(--font-body)"
                fill={item.color}
              >
                {item.text}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default EastIndianChart;
