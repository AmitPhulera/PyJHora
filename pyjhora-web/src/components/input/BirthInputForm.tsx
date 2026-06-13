/**
 * Birth Input Form Component
 * Form for entering birth date, time, and place with improved UX.
 */

import { useState } from 'react';
import { offsetHoursForCoordsAtDate } from '../../core/utils/timezone';
import type { GeocodeResult } from '../../services/geocode';
import { PlaceAutocomplete } from './PlaceAutocomplete';
import './BirthInputForm.css';

interface BirthData {
  name?: string;
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

function formatTimezoneUTC(tz: number): string {
  const sign = tz >= 0 ? '+' : '-';
  const abs = Math.abs(tz);
  const hours = Math.floor(abs);
  const mins = Math.round((abs - hours) * 60);
  return `UTC${sign}${hours}${mins > 0 ? `:${mins.toString().padStart(2, '0')}` : ''}`;
}

export function BirthInputForm({ onSubmit, initialData, isCalculating = false }: BirthInputFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [date, setDate] = useState(initialData?.date ?? '2025-05-26');
  const [time, setTime] = useState(initialData?.time ?? '04:15');
  const [placeName, setPlaceName] = useState(initialData?.placeName ?? 'Bangalore, India');
  const [latitude, setLatitude] = useState(initialData?.latitude ?? 12.972);
  const [longitude, setLongitude] = useState(initialData?.longitude ?? 77.594);
  const [timezone, setTimezone] = useState(initialData?.timezone ?? 5.5);

  const handlePlaceSelect = (result: GeocodeResult) => {
    setPlaceName(result.displayName);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    // Derive the date-specific UTC offset (handles DST historically).
    const tz = offsetHoursForCoordsAtDate(result.latitude, result.longitude, date, time);
    setTimezone(tz);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim() || undefined,
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

      {/* Name — optional label */}
      <div className="form-group">
        <label className="label" htmlFor="birth-name">Name <span className="text-muted">(optional)</span></label>
        <input
          id="birth-name"
          type="text"
          className="input"
          placeholder="e.g. Amit"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

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

      {/* Place — live search */}
      <div className="form-group">
        <label className="label" htmlFor="place-search">Place</label>
        <PlaceAutocomplete
          id="place-search"
          value={placeName}
          onSelect={handlePlaceSelect}
          onTextChange={setPlaceName}
        />
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
