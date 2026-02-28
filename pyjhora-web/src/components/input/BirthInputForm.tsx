/**
 * Birth Input Form Component
 * Form for entering birth date, time, and place with improved UX.
 */

import { useState } from 'react';
import './BirthInputForm.css';

interface BirthData {
  date: string;
  time: string;
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: number;
}

interface BirthInputFormProps {
  onSubmit: (data: BirthData) => void;
  initialData?: Partial<BirthData>;
  isCalculating?: boolean;
}

// Preset places for quick selection — global coverage across time zones
const PRESET_PLACES = [
  { name: 'Pithoragarh, India', lat: 29.5829, lon: 80.2182, tz: 5.5 },
  { name: 'Bangalore, India', lat: 12.972, lon: 77.594, tz: 5.5 },
  { name: 'Delhi, India', lat: 28.679, lon: 77.217, tz: 5.5 },
  { name: 'Mumbai, India', lat: 19.076, lon: 72.878, tz: 5.5 },
  { name: 'Chennai, India', lat: 13.083, lon: 80.27, tz: 5.5 },
  { name: 'Kolkata, India', lat: 22.573, lon: 88.364, tz: 5.5 },
  { name: 'Hyderabad, India', lat: 17.385, lon: 78.487, tz: 5.5 },
  { name: 'London, UK', lat: 51.507, lon: -0.127, tz: 0 },
  { name: 'New York, USA', lat: 40.714, lon: -74.006, tz: -5 },
  { name: 'Los Angeles, USA', lat: 34.052, lon: -118.244, tz: -8 },
  { name: 'Chicago, USA', lat: 41.878, lon: -87.630, tz: -6 },
  { name: 'Toronto, Canada', lat: 43.653, lon: -79.383, tz: -5 },
  { name: 'Dubai, UAE', lat: 25.204, lon: 55.271, tz: 4 },
  { name: 'Singapore', lat: 1.352, lon: 103.820, tz: 8 },
  { name: 'Sydney, Australia', lat: -33.869, lon: 151.209, tz: 11 },
  { name: 'Tokyo, Japan', lat: 35.682, lon: 139.692, tz: 9 },
  { name: 'Kathmandu, Nepal', lat: 27.717, lon: 85.324, tz: 5.75 },
  { name: 'Colombo, Sri Lanka', lat: 6.927, lon: 79.861, tz: 5.5 },
  { name: 'Nairobi, Kenya', lat: -1.286, lon: 36.817, tz: 3 },
  { name: 'São Paulo, Brazil', lat: -23.550, lon: -46.633, tz: -3 },
];

function formatTimezoneUTC(tz: number): string {
  const sign = tz >= 0 ? '+' : '-';
  const abs = Math.abs(tz);
  const hours = Math.floor(abs);
  const mins = Math.round((abs - hours) * 60);
  return `UTC${sign}${hours}${mins > 0 ? `:${mins.toString().padStart(2, '0')}` : ''}`;
}

export function BirthInputForm({ onSubmit, initialData, isCalculating = false }: BirthInputFormProps) {
  const [date, setDate] = useState(initialData?.date ?? '2025-05-26');
  const [time, setTime] = useState(initialData?.time ?? '04:15');
  const [placeName, setPlaceName] = useState(initialData?.placeName ?? 'Bangalore, India');
  const [latitude, setLatitude] = useState(initialData?.latitude ?? 12.972);
  const [longitude, setLongitude] = useState(initialData?.longitude ?? 77.594);
  const [timezone, setTimezone] = useState(initialData?.timezone ?? 5.5);

  const handlePresetSelect = (preset: typeof PRESET_PLACES[0]) => {
    setPlaceName(preset.name);
    setLatitude(preset.lat);
    setLongitude(preset.lon);
    setTimezone(preset.tz);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date,
      time,
      placeName,
      latitude,
      longitude,
      timezone
    });
  };

  return (
    <form className="birth-input-form card" onSubmit={handleSubmit} aria-label="Birth details">
      <h3 className="form-title">Birth Details</h3>

      {/* Date & Time — prominent row */}
      <div className="form-row">
        <div className="form-group">
          <label className="label" htmlFor="birth-date">Date</label>
          <input
            id="birth-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="birth-time">Time</label>
          <input
            id="birth-time"
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Place */}
      <div className="form-group">
        <label className="label" htmlFor="place-select">Place (Preset)</label>
        <select
          id="place-select"
          className="select"
          value={placeName}
          onChange={(e) => {
            const preset = PRESET_PLACES.find(p => p.name === e.target.value);
            if (preset) {
              handlePresetSelect(preset);
            }
          }}
        >
          {PRESET_PLACES.map(place => (
            <option key={place.name} value={place.name}>{place.name}</option>
          ))}
        </select>
      </div>

      {/* Coordinates — always visible */}
      <div className="form-coords">
        <div className="form-row form-row-3">
          <div className="form-group">
            <label className="label" htmlFor="latitude">Latitude</label>
            <input
              id="latitude"
              type="number"
              className="input input-mono"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
              step="0.001"
              min="-90"
              max="90"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="longitude">Longitude</label>
            <input
              id="longitude"
              type="number"
              className="input input-mono"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
              step="0.001"
              min="-180"
              max="180"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="timezone">
              Timezone
              <span className="form-tz-badge">{formatTimezoneUTC(timezone)}</span>
            </label>
            <input
              id="timezone"
              type="number"
              className="input input-mono"
              value={timezone}
              onChange={(e) => setTimezone(parseFloat(e.target.value) || 0)}
              step="0.5"
              min="-12"
              max="14"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className={`btn btn-primary submit-btn${isCalculating ? ' submit-btn--loading' : ''}`}
        disabled={isCalculating}
      >
        {isCalculating ? (
          <>
            <span className="submit-spinner" aria-hidden="true" />
            Calculating…
          </>
        ) : (
          'Calculate Horoscope'
        )}
      </button>
    </form>
  );
}

export default BirthInputForm;
