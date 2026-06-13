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
  const [date, setDate] = useState(initialData?.date ?? '');
  const [time, setTime] = useState(initialData?.time ?? '');
  const [placeName, setPlaceName] = useState(initialData?.placeName ?? '');
  // Coordinates/timezone are kept as strings so the user can type arbitrary
  // decimal precision; a controlled number input would truncate a trailing
  // "." mid-entry. They're parsed to numbers on submit.
  const [latitude, setLatitude] = useState(initialData?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(initialData?.longitude?.toString() ?? '');
  const [timezone, setTimezone] = useState(initialData?.timezone?.toString() ?? '');

  const handlePlaceSelect = (result: GeocodeResult) => {
    setPlaceName(result.displayName);
    setLatitude(result.latitude.toString());
    setLongitude(result.longitude.toString());
    // Derive the date-specific UTC offset (handles DST historically).
    const tz = offsetHoursForCoordsAtDate(result.latitude, result.longitude, date, time);
    setTimezone(tz.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim() || undefined,
      date,
      time,
      placeName,
      latitude: Number(latitude),
      longitude: Number(longitude),
      timezone: Number(timezone)
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
              onChange={(e) => setLatitude(e.target.value)}
              step="any"
              min="-90"
              max="90"
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="longitude">Longitude</label>
            <input
              id="longitude"
              type="number"
              className="input input-mono"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              step="any"
              min="-180"
              max="180"
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="timezone">
              Timezone
              {timezone !== '' && (
                <span className="form-tz-badge">{formatTimezoneUTC(Number(timezone))}</span>
              )}
            </label>
            <input
              id="timezone"
              type="number"
              className="input input-mono"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              step="any"
              min="-12"
              max="14"
              required
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
