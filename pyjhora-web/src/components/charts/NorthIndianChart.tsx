/**
 * North Indian Chart — SVG implementation
 *
 * Diamond-shaped chart where House 1 always occupies the top-center diamond.
 * Signs rotate: sign_in_house_i = (ascendantRasi + i) % 12
 *
 * Geometry (within 400x400 viewBox, 10px inset):
 *   - Outer square: (10,10)-(390,390)
 *   - Diagonal X: two lines from corner to corner of the outer square
 *   - Inner diamond: connecting midpoints of the outer square edges
 *   - This creates 12 house regions
 *
 * House layout (counter-clockwise from top-center):
 *   H1  = top center diamond
 *   H2  = upper-left corner triangle
 *   H3  = left upper triangle
 *   H4  = left center diamond
 *   H5  = left lower triangle
 *   H6  = lower-left corner triangle
 *   H7  = bottom center diamond
 *   H8  = lower-right corner triangle
 *   H9  = right lower triangle
 *   H10 = right center diamond
 *   H11 = right upper triangle
 *   H12 = upper-right corner triangle
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

interface NorthIndianChartProps {
  planets: PlanetData[];
  ascendantRasi: number;
  title?: string;
  showDegrees?: boolean;
}

// ---------------------------------------------------------------------------
// House geometry (positions for planet text, derived from Python label positions)
// ---------------------------------------------------------------------------

/** Approximate center positions for planet text in each house (0-indexed) */
const HOUSE_PLANET_BOUNDS: Array<{ x: number; y: number; width: number; height: number }> = [
  { x: 130, y: 20,  width: 140, height: 80 },   // H1  top center
  { x: 25,  y: 20,  width: 90,  height: 65 },    // H2  upper-left
  { x: 10,  y: 110, width: 90,  height: 80 },    // H3  left upper
  { x: 20,  y: 225, width: 100, height: 80 },    // H4  left center
  { x: 10,  y: 310, width: 90,  height: 70 },    // H5  left lower
  { x: 25,  y: 315, width: 90,  height: 65 },    // H6  lower-left
  { x: 130, y: 300, width: 140, height: 80 },    // H7  bottom center
  { x: 275, y: 315, width: 90,  height: 65 },    // H8  lower-right
  { x: 300, y: 310, width: 90,  height: 70 },    // H9  right lower
  { x: 280, y: 225, width: 100, height: 80 },    // H10 right center
  { x: 300, y: 110, width: 90,  height: 80 },    // H11 right upper
  { x: 275, y: 20,  width: 90,  height: 65 },    // H12 upper-right
];

/** Positions for the small rasi abbreviation label in each house */
const HOUSE_RASI_LABEL: Array<{ x: number; y: number }> = [
  { x: 190, y: 28 },   // H1
  { x: 88,  y: 78 },   // H2
  { x: 14,  y: 28 },   // H3
  { x: 88,  y: 198 },  // H4
  { x: 14,  y: 370 },  // H5
  { x: 88,  y: 320 },  // H6
  { x: 190, y: 370 },  // H7
  { x: 294, y: 320 },  // H8
  { x: 370, y: 370 },  // H9
  { x: 294, y: 198 },  // H10
  { x: 370, y: 28 },   // H11
  { x: 294, y: 78 },   // H12
];

// ---------------------------------------------------------------------------
// Outer square inset
// ---------------------------------------------------------------------------
const P = 10;                   // padding from viewBox edge
const S = 400 - 2 * P;         // inner square side = 380
const L = P;                    // left
const T = P;                    // top
const R = P + S;                // right  = 390
const B = P + S;                // bottom = 390
const MX = P + S / 2;          // midX   = 200
const MY = P + S / 2;          // midY   = 200

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NorthIndianChart({
  planets,
  ascendantRasi,
  title = 'Rasi Chart',
  showDegrees: _showDegrees = false,
}: NorthIndianChartProps) {
  // Build house -> planets mapping.  House i has sign (ascendantRasi + i) % 12.
  const houses = useMemo(() => {
    const grouped: Array<{ rasi: number; planets: PlanetData[] }> = [];
    for (let h = 0; h < 12; h++) {
      grouped.push({ rasi: (ascendantRasi + h) % 12, planets: [] });
    }
    for (const p of planets) {
      // Find which house this planet falls in
      const houseIdx = ((p.rasi - ascendantRasi) % 12 + 12) % 12;
      grouped[houseIdx].planets.push(p);
    }
    return grouped;
  }, [planets, ascendantRasi]);

  // Pre-compute positioned text for each house
  const houseContent = useMemo(() => {
    return houses.map((h, idx) => {
      const bounds = HOUSE_PLANET_BOUNDS[idx];
      const positioned = layoutPlanetsInCell(h.planets, bounds, 10);
      return { ...h, idx, positioned };
    });
  }, [houses]);

  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      className="north-indian-chart"
      style={{ width: '100%', maxWidth: 400 }}
    >
      {/* Background */}
      <rect width="400" height="400" rx="8" fill="var(--color-card)" />

      {/* Outer square */}
      <rect
        x={L} y={T} width={S} height={S}
        fill="none"
        stroke="var(--color-accent-gold)"
        strokeWidth="2"
      />

      {/* Diagonal X */}
      <line x1={L} y1={T} x2={R} y2={B} stroke="var(--color-accent-gold)" strokeWidth="1.5" />
      <line x1={L} y1={B} x2={R} y2={T} stroke="var(--color-accent-gold)" strokeWidth="1.5" />

      {/* Inner diamond (midpoints of outer square edges) */}
      <polygon
        points={`${L},${MY} ${MX},${T} ${R},${MY} ${MX},${B}`}
        fill="none"
        stroke="var(--color-accent-gold)"
        strokeWidth="1.5"
      />

      {/* Center title */}
      <text
        x={MX} y={MY}
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
              textAnchor="middle"
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
                fontSize="12"
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

export default NorthIndianChart;
