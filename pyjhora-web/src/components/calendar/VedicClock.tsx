/**
 * Vedic Clock Component
 * Ported from PyJHora vedic_clock.py
 *
 * Displays both an SVG analog clock and a digital readout showing:
 * - Local time (HH:MM:SS)
 * - Vedic time in Ghati:Phala:Vighati
 *
 * The analog clock has an outer ring (ghati/phala) and inner ring (vighati),
 * with day/night shading based on sunrise/sunset for the given place.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  floatHoursToVedicTime,
  dayLength,
  nightLength,
} from '../../core/panchanga/drik';
import { sunrise, sunset } from '../../core/ephemeris/swe-adapter';
import { gregorianToJulianDay } from '../../core/utils/julian';
import type { Place } from '../../core/types';
import './VedicClock.css';

// Clock geometry constants
const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 170;
const INNER_R = 95;
const VEDIC_HOURS = 60; // 60 ghatis per day
const HALF_VEDIC_HOURS = VEDIC_HOURS / 2;
const ANGLE_FACTOR = 360 / VEDIC_HOURS;
const LABEL_AT_ZERO = HALF_VEDIC_HOURS; // 30 ghatis at the 0-degree position
const SUNRISE_DEGREES = 180; // East on the left

// Periods of the day (8 praharas)
const PRAHARA_NAMES = [
  'Pratah', 'Sangava', 'Madhyahna', 'Aparahna',
  'Sayahna', 'Pradosha', 'Nishitha', 'Arunodhaya',
];

const PRESET_PLACES = [
  { name: 'Chennai, India', lat: 13.083, lon: 80.27, tz: 5.5 },
  { name: 'Bangalore, India', lat: 12.972, lon: 77.594, tz: 5.5 },
  { name: 'Delhi, India', lat: 28.679, lon: 77.217, tz: 5.5 },
  { name: 'New York, USA', lat: 40.714, lon: -74.006, tz: -5 },
  { name: 'London, UK', lat: 51.507, lon: -0.127, tz: 0 },
];

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function formatTime(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatFloatHours(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ss = Math.round(((h - hh) * 60 - mm) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

interface VedicClockProps {
  initialPlace?: Place;
}

export function VedicClock({ initialPlace }: VedicClockProps) {
  const [placeName, setPlaceName] = useState(initialPlace?.name ?? 'Chennai, India');
  const [latitude, setLatitude] = useState(initialPlace?.latitude ?? 13.083);
  const [longitude, setLongitude] = useState(initialPlace?.longitude ?? 80.27);
  const [timezone, setTimezone] = useState(initialPlace?.timezone ?? 5.5);

  const [localTime, setLocalTime] = useState('00:00:00');
  const [vedicTime, setVedicTime] = useState<[number, number, number]>([0, 0, 0]);
  const [sunriseStr, setSunriseStr] = useState('');
  const [sunsetStr, setSunsetStr] = useState('');
  const [dayLen, setDayLen] = useState('');
  const [nightLen, setNightLen] = useState('');
  const [sunsetDegrees, setSunsetDegrees] = useState(180);

  const timerRef = useRef<number | null>(null);

  const place: Place = useMemo(() => ({
    name: placeName,
    latitude,
    longitude,
    timezone,
  }), [placeName, latitude, longitude, timezone]);

  const updateClock = useCallback(() => {
    try {
      // Get current time in the place's timezone
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const placeDate = new Date(utcMs + timezone * 3600000);

      const hour = placeDate.getHours();
      const min = placeDate.getMinutes();
      const sec = placeDate.getSeconds();
      setLocalTime(formatTime(hour, min, sec));

      const floatHours = hour + min / 60 + sec / 3600;

      const jd = gregorianToJulianDay(
        { year: placeDate.getFullYear(), month: placeDate.getMonth() + 1, day: placeDate.getDate() },
        { hour, minute: min, second: sec }
      );

      // Vedic time
      const vt = floatHoursToVedicTime(jd, place, floatHours);
      setVedicTime(vt);

      // Sunrise/sunset info (only recalculate occasionally)
      const sr = sunrise(jd, place);
      const ss = sunset(jd, place);
      setSunriseStr(formatFloatHours(sr.localTime));
      setSunsetStr(formatFloatHours(ss.localTime));

      const dl = dayLength(jd, place);
      const nl = nightLength(jd, place);
      setDayLen(formatFloatHours(dl));
      setNightLen(formatFloatHours(nl));

      // Sunset degrees for the clock face shading
      const ssVt = floatHoursToVedicTime(jd, place, ss.localTime);
      const ssGhati = ssVt[0] + ssVt[1] / VEDIC_HOURS + ssVt[2] / (VEDIC_HOURS * VEDIC_HOURS);
      setSunsetDegrees(Math.ceil(ssGhati * ANGLE_FACTOR));
    } catch (err) {
      // Silently handle errors during updates
    }
  }, [place, timezone]);

  useEffect(() => {
    updateClock();
    timerRef.current = window.setInterval(updateClock, 1000);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [updateClock]);

  const handlePlacePreset = (preset: typeof PRESET_PLACES[0]) => {
    setPlaceName(preset.name);
    setLatitude(preset.lat);
    setLongitude(preset.lon);
    setTimezone(preset.tz);
  };

  // SVG clock rendering helpers
  const renderTickMarks = (radius: number, step: number) => {
    const ticks: JSX.Element[] = [];
    for (let i = 0; i < VEDIC_HOURS; i += step) {
      const angle = degToRad(ANGLE_FACTOR * i);
      const isLabel = i % 5 === 0;
      const tickLen = isLabel ? 18 : 8;
      const x1 = CX + radius * Math.cos(angle);
      const y1 = CY + radius * Math.sin(angle);
      const x2 = CX + (radius - tickLen) * Math.cos(angle);
      const y2 = CY + (radius - tickLen) * Math.sin(angle);
      ticks.push(
        <line
          key={`tick-${radius}-${i}`}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="currentColor" strokeWidth={isLabel ? 1.5 : 0.5}
          opacity={0.6}
        />
      );
    }
    return ticks;
  };

  const renderLabels = (radius: number, step: number, color: string) => {
    const labels: JSX.Element[] = [];
    for (let i = 0; i <= VEDIC_HOURS; i += step) {
      const angle = degToRad(ANGLE_FACTOR * i);
      const x = CX + (radius - 22) * Math.cos(angle);
      const y = CY + (radius - 22) * Math.sin(angle);
      const label = (i + LABEL_AT_ZERO) % VEDIC_HOURS;
      labels.push(
        <text
          key={`label-${radius}-${i}`}
          x={x} y={y + 4}
          textAnchor="middle"
          fill={color}
          fontSize={9}
          fontWeight="bold"
        >
          {label}
        </text>
      );
    }
    return labels;
  };

  const renderHand = (length: number, angleDeg: number, color: string, width: number = 2) => {
    const totalAngle = angleDeg + SUNRISE_DEGREES;
    const rad = degToRad(totalAngle);
    const endX = CX + length * Math.cos(rad);
    const endY = CY + length * Math.sin(rad);
    // Arrowhead
    const arrowSize = 8;
    const leftX = endX + arrowSize * Math.cos(rad + Math.PI - Math.PI / 6);
    const leftY = endY + arrowSize * Math.sin(rad + Math.PI - Math.PI / 6);
    const rightX = endX + arrowSize * Math.cos(rad + Math.PI + Math.PI / 6);
    const rightY = endY + arrowSize * Math.sin(rad + Math.PI + Math.PI / 6);

    return (
      <g>
        <line x1={CX} y1={CY} x2={endX} y2={endY} stroke={color} strokeWidth={width} />
        <polygon points={`${endX},${endY} ${leftX},${leftY} ${rightX},${rightY}`} fill={color} />
      </g>
    );
  };

  const renderDayNightArc = () => {
    // Day arc: from sunrise angle (180deg) sweeping clockwise by sunsetDegrees
    const startAngle = SUNRISE_DEGREES;
    const dayAngleEnd = startAngle + sunsetDegrees;

    // Create arc path for the day portion (between outer and inner circles)
    const outerArcPath = describeArc(CX, CY, OUTER_R, startAngle, dayAngleEnd);
    const innerArcPath = describeArc(CX, CY, INNER_R + 5, dayAngleEnd, startAngle);

    return (
      <>
        {/* Night - full outer circle */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill="rgba(180,180,200,0.12)" />
        {/* Day - pie wedge */}
        <path
          d={`M ${CX} ${CY} L ${CX + OUTER_R * Math.cos(degToRad(startAngle))} ${CY + OUTER_R * Math.sin(degToRad(startAngle))} ${outerArcPath} Z`}
          fill="rgba(255,255,200,0.12)"
        />
        {/* Inner circle (clears center) */}
        <circle cx={CX} cy={CY} r={INNER_R} fill="var(--bg-primary, #1a1a2e)" />
      </>
    );
  };

  // Describe an SVG arc
  function describeArc(cx: number, cy: number, r: number, startAngleDeg: number, endAngleDeg: number): string {
    const start = degToRad(startAngleDeg);
    const end = degToRad(endAngleDeg);
    let sweep = endAngleDeg - startAngleDeg;
    if (sweep < 0) sweep += 360;
    const largeArc = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    return `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  const renderPraharaLabels = () => {
    const labels: JSX.Element[] = [];
    const angleStep = 360 / PRAHARA_NAMES.length;
    const captionShift = 15;
    PRAHARA_NAMES.forEach((name, i) => {
      const angle = degToRad(SUNRISE_DEGREES + i * angleStep + captionShift);
      const x = CX + (OUTER_R + 14) * Math.cos(angle);
      const y = CY + (OUTER_R + 14) * Math.sin(angle);
      const rotDeg = i * angleStep;
      const rotation = rotDeg <= 180 ? rotDeg - 90 : rotDeg + 90;
      labels.push(
        <text
          key={`prahara-${i}`}
          x={x} y={y}
          textAnchor="middle"
          fill="#1e3a8a"
          fontSize={7}
          fontWeight="bold"
          transform={`rotate(${rotation}, ${x}, ${y})`}
        >
          {name}
        </text>
      );
    });
    return labels;
  };

  const ghatiAngle = ANGLE_FACTOR * vedicTime[0];
  const phalaAngle = ANGLE_FACTOR * vedicTime[1];
  const vighatiAngle = ANGLE_FACTOR * vedicTime[2];

  return (
    <div className="vedic-clock card">
      <h3 className="vedic-clock-title">Vedic Clock (Ghati)</h3>

      {/* Place selector */}
      <div className="vedic-clock-input-row">
        <label>Place:</label>
        <select
          value={placeName}
          onChange={(e) => {
            const p = PRESET_PLACES.find(pp => pp.name === e.target.value);
            if (p) handlePlacePreset(p);
          }}
        >
          {PRESET_PLACES.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="vedic-clock-display">
        {/* SVG Analog Clock */}
        <div className="vedic-clock-analog">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg">
            {/* Day/night shading */}
            {renderDayNightArc()}

            {/* Outer circle border */}
            <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.3} />
            {/* Inner circle border */}
            <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.3} />

            {/* Tick marks */}
            {renderTickMarks(OUTER_R, 1)}
            {renderTickMarks(INNER_R, 1)}

            {/* Labels */}
            {renderLabels(OUTER_R, 5, '#8b008b')}
            {renderLabels(INNER_R, 5, '#006400')}

            {/* Prahara captions */}
            {renderPraharaLabels()}

            {/* Clock hands */}
            {renderHand(140, ghatiAngle, '#ef4444', 3)}
            {renderHand(160, phalaAngle, '#3b82f6', 2)}
            {renderHand(75, vighatiAngle, '#22c55e', 1.5)}

            {/* Center dot */}
            <circle cx={CX} cy={CY} r={6} fill="var(--text-primary, white)" opacity={0.8} />

            {/* Place info at bottom */}
            <text x={CX} y={SIZE - 20} textAnchor="middle" fill="#991b1b" fontSize={9}>
              {placeName}
            </text>
            <text x={CX} y={SIZE - 8} textAnchor="middle" fill="#991b1b" fontSize={8}>
              {latitude.toFixed(2)}N, {longitude.toFixed(2)}E, UTC{timezone >= 0 ? '+' : ''}{timezone}
            </text>
          </svg>
        </div>

        {/* Digital displays */}
        <div className="vedic-clock-digital">
          <div className="clock-digital-block">
            <span className="clock-digital-label">Local Time</span>
            <span className="clock-digital-time local">{localTime}</span>
            <span className="clock-digital-sublabel">Hours : Minutes : Seconds</span>
          </div>
          <div className="clock-digital-block">
            <span className="clock-digital-label">Vedic Time</span>
            <span className="clock-digital-time vedic">
              {formatTime(vedicTime[0], vedicTime[1], vedicTime[2])}
            </span>
            <span className="clock-digital-sublabel">Ghati : Phala : Vighati</span>
          </div>
        </div>

        {/* Sunrise/sunset info */}
        <div className="vedic-clock-info">
          <div className="vedic-clock-info-row">
            <span className="vedic-clock-info-key">Sunrise:</span>
            <span className="vedic-clock-info-value">{sunriseStr}</span>
          </div>
          <div className="vedic-clock-info-row">
            <span className="vedic-clock-info-key">Sunset:</span>
            <span className="vedic-clock-info-value">{sunsetStr}</span>
          </div>
          <div className="vedic-clock-info-row">
            <span className="vedic-clock-info-key">Day Length:</span>
            <span className="vedic-clock-info-value">{dayLen}</span>
          </div>
          <div className="vedic-clock-info-row">
            <span className="vedic-clock-info-key">Night Length:</span>
            <span className="vedic-clock-info-value">{nightLen}</span>
          </div>
          <div className="vedic-clock-info-row">
            <span className="vedic-clock-info-key">Legend:</span>
            <span className="vedic-clock-info-value">
              <span style={{ color: '#ef4444' }}>Ghati</span>{' / '}
              <span style={{ color: '#3b82f6' }}>Phala</span>{' / '}
              <span style={{ color: '#22c55e' }}>Vighati</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VedicClock;
