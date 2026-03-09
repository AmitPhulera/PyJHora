/**
 * Vedic Calendar Component
 * Ported from PyJHora vedic_calendar.py
 *
 * Displays a monthly calendar grid with panchanga info in each cell:
 * tithi, nakshatra, sunrise/sunset times, and Gregorian/Tamil dates.
 * Clicking a cell shows detailed panchanga info in a side panel.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  calculateTithi,
  calculateNakshatra,
  calculateYoga,
  calculateKarana,
  calculateVara,
  vaara,
  dayLength,
  nightLength,
} from '../../core/panchanga/drik';
import { formatDms } from '../../core/panchanga/info';
import { gregorianToJulianDay, julianDayToGregorian } from '../../core/utils/julian';
import { sunrise, sunset } from '../../core/ephemeris/swe-adapter';
import type { Place } from '../../core/types';
import './VedicCalendar.css';

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PRESET_PLACES = [
  { name: 'Chennai, India', lat: 13.083, lon: 80.27, tz: 5.5 },
  { name: 'Bangalore, India', lat: 12.972, lon: 77.594, tz: 5.5 },
  { name: 'Delhi, India', lat: 28.679, lon: 77.217, tz: 5.5 },
  { name: 'Mumbai, India', lat: 19.076, lon: 72.878, tz: 5.5 },
  { name: 'New York, USA', lat: 40.714, lon: -74.006, tz: -5 },
  { name: 'London, UK', lat: 51.507, lon: -0.127, tz: 0 },
];

interface CellData {
  year: number;
  month: number;
  day: number;
  jd: number;
  tithi: string;
  tithiNumber: number;
  paksha: 'shukla' | 'krishna';
  nakshatra: string;
  nakshatraPada: number;
  sunriseTime: string;
  sunsetTime: string;
  varaName: string;
  yogaName: string;
  karanaName: string;
  isCurrentMonth: boolean;
}

interface CalendarInfo {
  tithi: string;
  tithiDetail: string;
  nakshatra: string;
  nakshatraDetail: string;
  yoga: string;
  karana: string;
  vara: string;
  sunrise: string;
  sunset: string;
  dayLength: string;
  nightLength: string;
}

function formatFloatHours(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

interface VedicCalendarProps {
  initialDate?: { year: number; month: number; day: number };
  initialPlace?: Place;
}

export function VedicCalendar({ initialDate, initialPlace }: VedicCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(initialDate?.year ?? now.getFullYear());
  const [month, setMonth] = useState(initialDate?.month ?? now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(initialDate?.day ?? now.getDate());

  const [placeName, setPlaceName] = useState(initialPlace?.name ?? 'Chennai, India');
  const [latitude, setLatitude] = useState(initialPlace?.latitude ?? 13.083);
  const [longitude, setLongitude] = useState(initialPlace?.longitude ?? 80.27);
  const [timezone, setTimezone] = useState(initialPlace?.timezone ?? 5.5);

  const [cells, setCells] = useState<(CellData | null)[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<CalendarInfo | null>(null);
  const [headerText, setHeaderText] = useState('');

  const place: Place = useMemo(() => ({
    name: placeName,
    latitude,
    longitude,
    timezone,
  }), [placeName, latitude, longitude, timezone]);

  const computeCalendar = useCallback(() => {
    try {
      const totalDays = daysInMonth(year, month);
      const startDow = firstDayOfWeek(year, month);

      // Previous month last day
      const prevMonthDays = month === 1 ? daysInMonth(year - 1, 12) : daysInMonth(year, month - 1);
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;

      // Next month
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;

      const newCells: (CellData | null)[] = [];
      const totalSlots = Math.ceil((startDow + totalDays) / 7) * 7;

      for (let i = 0; i < totalSlots; i++) {
        let cellYear: number, cellMonth: number, cellDay: number;
        let isCurrentMonth = true;

        if (i < startDow) {
          // Previous month
          cellDay = prevMonthDays - (startDow - i - 1);
          cellMonth = prevMonth;
          cellYear = prevYear;
          isCurrentMonth = false;
        } else if (i - startDow >= totalDays) {
          // Next month
          cellDay = i - startDow - totalDays + 1;
          cellMonth = nextMonth;
          cellYear = nextYear;
          isCurrentMonth = false;
        } else {
          cellDay = i - startDow + 1;
          cellMonth = month;
          cellYear = year;
        }

        try {
          const jd = gregorianToJulianDay(
            { year: cellYear, month: cellMonth, day: cellDay },
            { hour: 6, minute: 0, second: 0 }
          );

          const tithiResult = calculateTithi(jd, place);
          const nakResult = calculateNakshatra(jd, place);
          const sr = sunrise(jd, place);
          const ss = sunset(jd, place);

          newCells.push({
            year: cellYear,
            month: cellMonth,
            day: cellDay,
            jd,
            tithi: tithiResult.name,
            tithiNumber: tithiResult.number,
            paksha: tithiResult.paksha,
            nakshatra: nakResult.name,
            nakshatraPada: nakResult.pada,
            sunriseTime: formatFloatHours(sr.localTime),
            sunsetTime: formatFloatHours(ss.localTime),
            varaName: '',
            yogaName: '',
            karanaName: '',
            isCurrentMonth,
          });
        } catch {
          newCells.push(null);
        }
      }

      setCells(newCells);

      // Auto-select the current day or first day
      const dayToSelect = selectedDay <= totalDays ? selectedDay : 1;
      selectCell(newCells, dayToSelect);
    } catch (err) {
      console.error('VedicCalendar: computeCalendar error:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, place]);

  const selectCell = useCallback((cellList: (CellData | null)[], day: number) => {
    const cell = cellList.find(c => c && c.isCurrentMonth && c.day === day);
    if (!cell) return;

    setSelectedDay(day);

    try {
      const jd = cell.jd;
      const tithiResult = calculateTithi(jd, place);
      const nakResult = calculateNakshatra(jd, place);
      const yogaResult = calculateYoga(jd, place);
      const karanaResult = calculateKarana(jd, place);
      const varaResult = calculateVara(jd);
      const sr = sunrise(jd, place);
      const ss = sunset(jd, place);
      const dl = dayLength(jd, place);
      const nl = nightLength(jd, place);

      setSelectedInfo({
        tithi: tithiResult.name,
        tithiDetail: `${tithiResult.paksha === 'shukla' ? 'Sukla' : 'Krishna'} ${tithiResult.name} (#${tithiResult.number})`,
        nakshatra: nakResult.name,
        nakshatraDetail: `${nakResult.name} Pada ${nakResult.pada}`,
        yoga: yogaResult.name,
        karana: karanaResult.name,
        vara: varaResult.name,
        sunrise: formatFloatHours(sr.localTime),
        sunset: formatFloatHours(ss.localTime),
        dayLength: formatFloatHours(dl),
        nightLength: formatFloatHours(nl),
      });

      setHeaderText(
        `${cell.year} ${MONTH_NAMES[cell.month - 1]} ${cell.day} - ` +
        `${tithiResult.paksha === 'shukla' ? 'Sukla' : 'Krishna'} ${tithiResult.name} - ${nakResult.name}`
      );
    } catch (err) {
      console.error('VedicCalendar: selectCell error:', err);
    }
  }, [place]);

  // Compute on mount and when inputs change
  useEffect(() => {
    computeCalendar();
  }, [computeCalendar]);

  const handleCellClick = useCallback((cell: CellData) => {
    if (!cell.isCurrentMonth) {
      // Navigate to that month
      setYear(cell.year);
      setMonth(cell.month);
      setSelectedDay(cell.day);
    } else {
      selectCell(cells, cell.day);
    }
  }, [cells, selectCell]);

  const handlePlacePreset = (preset: typeof PRESET_PLACES[0]) => {
    setPlaceName(preset.name);
    setLatitude(preset.lat);
    setLongitude(preset.lon);
    setTimezone(preset.tz);
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(1);
  };

  return (
    <div className="vedic-calendar card">
      <h3 className="vedic-calendar-title">Vedic Calendar</h3>

      {/* Input row */}
      <div className="calendar-input-row">
        <label>Date:</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ width: 70 }}
        />
        <select value={month} onChange={(e) => { setMonth(Number(e.target.value)); setSelectedDay(1); }}>
          {MONTH_NAMES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

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

        <button className="btn btn-secondary" onClick={handlePrevMonth} title="Previous Month">&laquo;</button>
        <button className="btn btn-secondary" onClick={handleNextMonth} title="Next Month">&raquo;</button>
      </div>

      {/* Body: info panel + grid */}
      <div className="calendar-body">
        {/* Info panel */}
        {selectedInfo && (
          <div className="calendar-info-panel">
            <h4>Panchanga Details</h4>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Tithi:</span>
              <span className="calendar-info-value">{selectedInfo.tithiDetail}</span>
            </div>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Nakshatra:</span>
              <span className="calendar-info-value">{selectedInfo.nakshatraDetail}</span>
            </div>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Yoga:</span>
              <span className="calendar-info-value">{selectedInfo.yoga}</span>
            </div>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Karana:</span>
              <span className="calendar-info-value">{selectedInfo.karana}</span>
            </div>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Vara:</span>
              <span className="calendar-info-value">{selectedInfo.vara}</span>
            </div>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Sunrise:</span>
              <span className="calendar-info-value">{selectedInfo.sunrise}</span>
            </div>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Sunset:</span>
              <span className="calendar-info-value">{selectedInfo.sunset}</span>
            </div>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Day Length:</span>
              <span className="calendar-info-value">{selectedInfo.dayLength}</span>
            </div>
            <div className="calendar-info-row">
              <span className="calendar-info-key">Night Length:</span>
              <span className="calendar-info-value">{selectedInfo.nightLength}</span>
            </div>
          </div>
        )}

        {/* Calendar grid */}
        <div className="calendar-grid-container">
          <div className="calendar-header-label">{headerText}</div>
          <div className="calendar-grid">
            {/* Day-of-week headers */}
            {DAY_NAMES_SHORT.map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}

            {/* Cells */}
            {cells.map((cell, idx) => {
              if (!cell) {
                return <div key={idx} className="calendar-cell empty" />;
              }
              const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
              let cellClass = 'calendar-cell';
              if (isSelected) cellClass += ' selected';
              else if (!cell.isCurrentMonth && cell.month < month) cellClass += ' prev-month';
              else if (!cell.isCurrentMonth && cell.month > month) cellClass += ' next-month';
              else cellClass += ' default';

              return (
                <div
                  key={idx}
                  className={cellClass}
                  onClick={() => handleCellClick(cell)}
                  title={`${cell.tithi} | ${cell.nakshatra}`}
                >
                  <div className="cell-top-row">
                    <span className="cell-tithi">
                      {cell.paksha === 'shukla' ? '\u263D' : '\u25CF'} {cell.tithi.slice(0, 6)}
                    </span>
                    <span className="cell-sunrise">{cell.sunriseTime}</span>
                  </div>
                  <div className="cell-middle-row">
                    <span className="cell-greg-date">{cell.day}</span>
                  </div>
                  <div className="cell-bottom-row">
                    <span className="cell-nakshatra">{cell.nakshatra.slice(0, 7)}</span>
                    <span className="cell-sunset">{cell.sunsetTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VedicCalendar;
