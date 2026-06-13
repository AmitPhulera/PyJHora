/**
 * useProfiles — persists entered birth charts to localStorage and exposes
 * list / save / delete operations.
 *
 * Identity is a composite of ALL birth inputs (name + date + time + lat + lon
 * + tz), so two people with the same name — or the same person entered with a
 * different time — are distinct entries, while re-calculating identical inputs
 * collapses to one (its lastViewedAt is bumped instead of duplicating).
 */
import { useCallback } from 'react';
import type { BirthData } from './useHoroscope';
import { useLocalStorage } from './useLocalStorage';

export interface Profile extends BirthData {
  /** Composite identity hash (see `profileId`). */
  id: string;
  createdAt: number;
  lastViewedAt: number;
}

const STORAGE_KEY = 'jhora-profiles';

/** Stable composite key from the birth inputs. */
export function profileId(data: BirthData): string {
  return [
    (data.name ?? '').trim().toLowerCase(),
    data.date,
    data.time,
    data.latitude,
    data.longitude,
    data.timezone,
  ].join('|');
}

/** Display label: name if present, else "Place — date". */
export function profileLabel(profile: Profile): string {
  const name = profile.name?.trim();
  if (name) return name;
  return `${profile.placeName} — ${profile.date}`;
}

export interface UseProfilesResult {
  profiles: Profile[];
  /** Insert or update by composite id; returns the saved profile. */
  saveProfile: (data: BirthData) => Profile;
  deleteProfile: (id: string) => void;
}

export function useProfiles(): UseProfilesResult {
  const [profiles, setProfiles] = useLocalStorage<Profile[]>(STORAGE_KEY, []);

  const saveProfile = useCallback(
    (data: BirthData): Profile => {
      const id = profileId(data);
      const now = Date.now();
      let saved!: Profile;
      setProfiles((prev) => {
        const existing = prev.find((p) => p.id === id);
        saved = {
          ...data,
          id,
          createdAt: existing?.createdAt ?? now,
          lastViewedAt: now,
        };
        const others = prev.filter((p) => p.id !== id);
        return [saved, ...others];
      });
      return saved;
    },
    [setProfiles],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    },
    [setProfiles],
  );

  // Most-recently-viewed first.
  const sorted = [...profiles].sort((a, b) => b.lastViewedAt - a.lastViewedAt);

  return { profiles: sorted, saveProfile, deleteProfile };
}
