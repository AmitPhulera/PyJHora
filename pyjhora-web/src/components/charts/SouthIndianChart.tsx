/**
 * South Indian Chart — SVG implementation
 *
 * 4x4 grid with fixed sign positions (signs never move, planets move).
 * The center 2x2 area is empty and displays the chart title.
 *
 * Layout:
 *   [Pis(11)] [Ari(0)]  [Tau(1)]  [Gem(2)]
 *   [Aqu(10)] [center]  [center]  [Can(3)]
 *   [Cap(9)]  [center]  [center]  [Leo(4)]
 *   [Sag(8)]  [Sco(7)]  [Lib(6)]  [Vir(5)]
 */

import { useMemo } from 'react';
import {
  PLANET_SYMBOLS,
  RASI_SYMBOLS,
  getPlanetColor,
  layoutPlanetsInCell,
} from './chart-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PlanetData {
  planet: number;
  rasi: number;
  longitude: number;
  isRetrograde?: boolean;
}

interface SouthIndianChartProps {
  planets: PlanetData[];
  ascendantRasi: number;
  title?: string;
  showDegrees?: boolean;
}

// ---------------------------------------------------------------------------
// Fixed sign positions in the 4x4 grid (row, col)
// ---------------------------------------------------------------------------
const SIGN_GRID: Array<{ rasi: number; row: number; col: number }> = [
  { rasi: 11, row: 0, col: 0 }, // Pisces
  { rasi: 0,  row: 0, col: 1 }, // Aries
  { rasi: 1,  row: 0, col: 2 }, // Taurus
  { rasi: 2,  row: 0, col: 3 }, // Gemini
  { rasi: 10, row: 1, col: 0 }, // Aquarius
  { rasi: 3,  row: 1, col: 3 }, // Cancer
  { rasi: 9,  row: 2, col: 0 }, // Capricorn
  { rasi: 4,  row: 2, col: 3 }, // Leo
  { rasi: 8,  row: 3, col: 0 }, // Sagittarius
  { rasi: 7,  row: 3, col: 1 }, // Scorpio
  { rasi: 6,  row: 3, col: 2 }, // Libra
  { rasi: 5,  row: 3, col: 3 }, // Virgo
];

const CELL = 100; // each cell is 100x100 in the 400x400 viewBox

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SouthIndianChart({
  planets,
  ascendantRasi,
  title = 'Rasi Chart',
  showDegrees: _showDegrees = false,
}: SouthIndianChartProps) {
  // Group planets by rasi
  const planetsByRasi = useMemo(() => {
    const grouped: Record<number, PlanetData[]> = {};
    for (let i = 0; i < 12; i++) grouped[i] = [];
    for (const p of planets) {
      if (grouped[p.rasi]) grouped[p.rasi].push(p);
    }
    return grouped;
  }, [planets]);

  // Pre-compute positioned text for each cell
  const cellContent = useMemo(() => {
    return SIGN_GRID.map((cell) => {
      const cellPlanets = planetsByRasi[cell.rasi] ?? [];
      const x = cell.col * CELL;
      const y = cell.row * CELL;

      // Planet layout area: inset from cell edges, leaving room for the rasi label
      const positioned = layoutPlanetsInCell(
        cellPlanets,
        { x: x + 4, y: y + 14, width: CELL - 8, height: CELL - 18 },
        11,
      );

      return { ...cell, x, y, positioned };
    });
  }, [planetsByRasi]);

  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      className="south-indian-chart"
      style={{ width: '100%', maxWidth: 400 }}
    >
      {/* Background */}
      <rect width="400" height="400" rx="8" fill="var(--color-card)" />

      {/* Center 2x2 darker fill */}
      <rect x="100" y="100" width="200" height="200" fill="var(--color-surface)" />

      {/* Grid lines */}
      {[1, 2, 3].map((i) => (
        <g key={`grid-${i}`}>
          <line
            x1={i * CELL} y1={0} x2={i * CELL} y2={400}
            stroke="var(--color-border)" strokeWidth="1"
          />
          <line
            x1={0} y1={i * CELL} x2={400} y2={i * CELL}
            stroke="var(--color-border)" strokeWidth="1"
          />
        </g>
      ))}

      {/* Outer border */}
      <rect
        x="0.5" y="0.5" width="399" height="399" rx="8"
        fill="none" stroke="var(--color-accent-gold)" strokeWidth="2"
      />

      {/* Center title */}
      <text
        x={200} y={195}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-display)"
        fontSize="14"
        fill="var(--color-text-secondary)"
      >
        {title}
      </text>

      {/* Sign cells */}
      {cellContent.map((cell) => {
        const isAsc = cell.rasi === ascendantRasi;

        return (
          <g key={cell.rasi}>
            {/* Ascendant marker: diagonal line in top-left corner of cell */}
            {isAsc && (
              <line
                x1={cell.x} y1={cell.y}
                x2={cell.x + 30} y2={cell.y}
                stroke="var(--color-accent-gold)" strokeWidth="1.5"
              />
            )}
            {isAsc && (
              <line
                x1={cell.x} y1={cell.y}
                x2={cell.x} y2={cell.y + 30}
                stroke="var(--color-accent-gold)" strokeWidth="1.5"
              />
            )}
            {isAsc && (
              <line
                x1={cell.x + 30} y1={cell.y}
                x2={cell.x} y2={cell.y + 30}
                stroke="var(--color-accent-gold)" strokeWidth="1.5"
              />
            )}

            {/* Rasi abbreviation (top-left corner of cell) */}
            <text
              x={cell.x + 4}
              y={cell.y + 12}
              fontSize="9"
              fontFamily="var(--font-mono)"
              fill="var(--color-text-muted)"
            >
              {RASI_SYMBOLS[cell.rasi]}
            </text>

            {/* Planets */}
            {cell.positioned.map((item, idx) => (
              <text
                key={idx}
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

export default SouthIndianChart;
