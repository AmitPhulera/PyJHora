/**
 * Wheel Chart Component (Western/Circular style)
 * Renders a circular horoscope chart with concentric rings, house divisions,
 * zodiac labels, and planet positions.
 *
 * Ported from PyJHora's WesternChart (chart_styles.py) and SudarsanaChakraChart (chakra.py).
 * Uses SVG for rendering.
 */

import { useMemo } from 'react';
import './chart-styles.css';

// Planet symbols (matches SouthIndianChart)
const PLANET_SYMBOLS: Record<number, string> = {
  0: 'Su',
  1: 'Mo',
  2: 'Ma',
  3: 'Me',
  4: 'Ju',
  5: 'Ve',
  6: 'Sa',
  7: 'Ra',
  8: 'Ke'
};

// Zodiac sign symbols (Unicode) - ported from chart_styles.py _zodiac_symbols
const ZODIAC_SYMBOLS: string[] = [
  '\u2648', // Aries
  '\u2649', // Taurus
  '\u264A', // Gemini
  '\u264B', // Cancer
  '\u264C', // Leo
  '\u264D', // Virgo
  '\u264E', // Libra
  '\u264F', // Scorpio
  '\u2650', // Sagittarius
  '\u2651', // Capricorn
  '\u2652', // Aquarius
  '\u2653', // Pisces
];

// Short rasi names
const RASI_NAMES = [
  'Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir',
  'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'
];

interface PlanetData {
  planet: number;
  rasi: number;
  longitude: number;
  isRetrograde?: boolean;
}

interface WheelChartProps {
  planets: PlanetData[];
  ascendantRasi: number;
  title?: string;
  showDegrees?: boolean;
  size?: number;
}

/** Convert degrees to radians */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Get (x, y) on a circle given center, radius, and angle in degrees.
 *  0 degrees = top (12 o'clock), proceeding clockwise. */
function polarToXY(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  // SVG: 0 degrees at top, clockwise. Subtract 90 to shift from math convention.
  const rad = degToRad(angleDeg - 90);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  };
}

export function WheelChart({
  planets,
  ascendantRasi,
  title = 'Rasi Chart',
  showDegrees = false,
  size = 340
}: WheelChartProps) {
  const cx = size / 2;
  const cy = size / 2;

  // Radii for concentric rings (ported from WesternChart)
  const r1 = size * 0.10; // innermost circle (center)
  const r2 = size * 0.34; // planet ring outer boundary
  const r3 = size * 0.40; // zodiac ring inner boundary
  const r4 = size * 0.48; // zodiac ring outer boundary (outermost)

  // The ascendant longitude determines the rotation of the entire chart.
  // In the Python code, houses start from the ascendant and go counter-clockwise.
  // Each house spans 30 degrees. House 0 (ascendant sign) starts at the left (9 o'clock position = 270 deg).
  // We rotate so the ascendant rasi begins at the "left" of the chart (traditional Western orientation).
  const ascStartAngle = 0; // Ascendant house starts at 0 (top), houses go clockwise

  // Group planets by rasi
  const planetsByRasi = useMemo(() => {
    const grouped: Record<number, PlanetData[]> = {};
    for (let i = 0; i < 12; i++) {
      grouped[i] = [];
    }
    for (const planet of planets) {
      if (grouped[planet.rasi]) {
        grouped[planet.rasi].push(planet);
      }
    }
    return grouped;
  }, [planets]);

  // Compute house angles: house index 0 = ascendant sign
  // Each house = 30 degrees, going clockwise
  const houseAngles = useMemo(() => {
    const angles: Array<{ rasi: number; startAngle: number; endAngle: number; midAngle: number }> = [];
    for (let i = 0; i < 12; i++) {
      const rasiIndex = (ascendantRasi + i) % 12;
      const startAngle = ascStartAngle + i * 30;
      const endAngle = startAngle + 30;
      const midAngle = startAngle + 15;
      angles.push({ rasi: rasiIndex, startAngle, endAngle, midAngle });
    }
    return angles;
  }, [ascendantRasi]);

  // Build SVG elements
  const houseDividers = useMemo(() => {
    const lines: JSX.Element[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = ascStartAngle + i * 30;
      const inner = polarToXY(cx, cy, r1, angle);
      const outer = polarToXY(cx, cy, r4, angle);
      const isAsc = i === 0;
      lines.push(
        <line
          key={`divider-${i}`}
          x1={inner.x}
          y1={inner.y}
          x2={outer.x}
          y2={outer.y}
          className={isAsc ? 'wheel-asc-line' : 'wheel-house-line'}
        />
      );
    }
    return lines;
  }, [cx, cy, r1, r4]);

  // Tick marks on the zodiac ring (every 5 degrees)
  const tickMarks = useMemo(() => {
    const ticks: JSX.Element[] = [];
    for (let i = 0; i < 360; i += 5) {
      const angle = ascStartAngle + i;
      const isMajor = i % 10 === 0;
      const innerR = isMajor ? r3 + (r4 - r3) * 0.25 : r3 + (r4 - r3) * 0.5;
      const inner = polarToXY(cx, cy, innerR, angle);
      const outer = polarToXY(cx, cy, r4, angle);
      ticks.push(
        <line
          key={`tick-${i}`}
          x1={inner.x}
          y1={inner.y}
          x2={outer.x}
          y2={outer.y}
          className={isMajor ? 'wheel-tick-major' : 'wheel-tick'}
        />
      );
    }
    return ticks;
  }, [cx, cy, r3, r4]);

  // Zodiac sign labels in the outer ring
  const rasiLabels = useMemo(() => {
    return houseAngles.map((house, i) => {
      const labelR = r3 + (r4 - r3) * 0.5;
      const pos = polarToXY(cx, cy, labelR, house.midAngle);
      return (
        <text
          key={`rasi-${i}`}
          x={pos.x}
          y={pos.y}
          className="wheel-rasi-label"
          transform={`rotate(${house.midAngle}, ${pos.x}, ${pos.y})`}
        >
          {ZODIAC_SYMBOLS[house.rasi]}{' '}{RASI_NAMES[house.rasi]}
        </text>
      );
    });
  }, [houseAngles, cx, cy, r3, r4]);

  // Planet labels placed in the planet ring (between r1 and r3)
  const planetLabels = useMemo(() => {
    const labels: JSX.Element[] = [];
    const planetR = r1 + (r2 - r1) * 0.55; // radial position for planet labels

    for (const house of houseAngles) {
      const housePlanets = planetsByRasi[house.rasi] ?? [];
      if (housePlanets.length === 0) continue;

      const count = housePlanets.length;
      // Distribute planets evenly within the 30-degree house span
      const spanDeg = 30;
      const increment = spanDeg / (count + 1);

      housePlanets.forEach((p, idx) => {
        const angle = house.startAngle + increment * (idx + 1);
        const pos = polarToXY(cx, cy, planetR, angle);
        const symbol = PLANET_SYMBOLS[p.planet] ?? '?';
        const retroSuffix = p.isRetrograde ? 'R' : '';
        const degreeStr = showDegrees ? ` ${p.longitude.toFixed(1)}` : '';

        labels.push(
          <g key={`planet-${p.planet}`}>
            <text
              x={pos.x}
              y={pos.y}
              className={`wheel-planet-label wheel-planet-${p.planet}`}
            >
              {symbol}{retroSuffix}{degreeStr}
            </text>
            {p.isRetrograde && (
              <text
                x={pos.x + 12}
                y={pos.y - 6}
                className="wheel-retrograde"
              >
                R
              </text>
            )}
          </g>
        );
      });
    }

    return labels;
  }, [houseAngles, planetsByRasi, cx, cy, r1, r2, showDegrees]);

  // Ascendant house highlight (filled wedge)
  const ascHighlight = useMemo(() => {
    const startAngle = houseAngles[0]?.startAngle ?? 0;
    const endAngle = houseAngles[0]?.endAngle ?? 30;
    const p1 = polarToXY(cx, cy, r1, startAngle);
    const p2 = polarToXY(cx, cy, r2, startAngle);
    const p3 = polarToXY(cx, cy, r2, endAngle);
    const p4 = polarToXY(cx, cy, r1, endAngle);

    // SVG arc path: move to inner start, line to outer start, arc to outer end,
    // line to inner end, arc back to inner start
    const largeArc = 0; // 30 degrees < 180
    const d = [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${r2} ${r2} 0 ${largeArc} 1 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${r1} ${r1} 0 ${largeArc} 0 ${p1.x} ${p1.y}`,
      'Z'
    ].join(' ');

    return <path d={d} className="wheel-asc-house" />;
  }, [houseAngles, cx, cy, r1, r2]);

  return (
    <div className="wheel-chart">
      <div className="chart-title">{title}</div>
      <svg
        className="wheel-chart-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Ascendant house highlight */}
        {ascHighlight}

        {/* Concentric circles */}
        <circle cx={cx} cy={cy} r={r4} className="wheel-ring wheel-ring-outer" />
        <circle cx={cx} cy={cy} r={r3} className="wheel-ring" />
        <circle cx={cx} cy={cy} r={r2} className="wheel-ring" />
        <circle cx={cx} cy={cy} r={r1} className="wheel-ring wheel-ring-inner" />

        {/* Center circle fill */}
        <circle cx={cx} cy={cy} r={r1} className="wheel-center-circle" />
        <text x={cx} y={cy} className="wheel-center-text">Asc</text>

        {/* Tick marks on zodiac ring */}
        {tickMarks}

        {/* House divider lines */}
        {houseDividers}

        {/* Rasi labels */}
        {rasiLabels}

        {/* Planet labels */}
        {planetLabels}
      </svg>
    </div>
  );
}

export default WheelChart;
