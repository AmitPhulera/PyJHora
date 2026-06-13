/**
 * PlaceAutocomplete — debounced place search backed by OpenStreetMap Nominatim.
 *
 * On selection it reports the chosen place's name, latitude and longitude to
 * the parent. Timezone derivation is the parent's job (it depends on the birth
 * date for DST), so this component stays focused on geocoding.
 */
import { useEffect, useRef, useState } from 'react';
import { searchPlaces, type GeocodeResult } from '../../services/geocode';
import './PlaceAutocomplete.css';

interface PlaceAutocompleteProps {
  /** Current place label shown in the input. */
  value: string;
  onSelect: (result: GeocodeResult) => void;
  /** Called as the user types (keeps the parent's placeName in sync). */
  onTextChange?: (text: string) => void;
  id?: string;
}

const DEBOUNCE_MS = 400;

export function PlaceAutocomplete({ value, onSelect, onTextChange, id }: PlaceAutocompleteProps) {
  // The text is owned by the parent (`value`/`onTextChange`) so loading a saved
  // profile updates it; this component stays fully controlled.
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search. All state updates happen inside the (async) timeout
  // callback, never synchronously in the effect body.
  useEffect(() => {
    if (!open) return;
    const trimmed = value.trim();
    const handle = setTimeout(async () => {
      if (trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const found = await searchPlaces(trimmed, controller.signal);
      setResults(found);
      setActiveIndex(-1);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [value, open]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (result: GeocodeResult) => {
    setOpen(false);
    setResults([]);
    onSelect(result); // parent updates `value` to the chosen place name
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      choose(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="place-autocomplete" ref={containerRef}>
      <input
        id={id}
        type="text"
        className="input"
        autoComplete="off"
        placeholder="Search for a city or place…"
        value={value}
        onChange={(e) => {
          setOpen(true);
          onTextChange?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="place-autocomplete-list"
        aria-autocomplete="list"
      />
      {open && (value.trim().length >= 2) && (
        <ul className="place-autocomplete-list" id="place-autocomplete-list" role="listbox">
          {loading && <li className="place-autocomplete-status">Searching…</li>}
          {!loading && results.length === 0 && (
            <li className="place-autocomplete-status">No matches</li>
          )}
          {!loading &&
            results.map((r, i) => (
              <li
                key={`${r.latitude},${r.longitude},${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`place-autocomplete-item${i === activeIndex ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
              >
                {r.displayName}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export default PlaceAutocomplete;
