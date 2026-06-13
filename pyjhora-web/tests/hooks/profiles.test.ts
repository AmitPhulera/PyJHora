import { describe, it, expect } from 'vitest';
import { profileId, profileLabel, type Profile } from '@/hooks/useProfiles';
import type { BirthData } from '@/hooks/useHoroscope';

const base: BirthData = {
  name: 'Amit',
  date: '1995-06-08',
  time: '03:55',
  placeName: 'Pithoragarh, India',
  latitude: 29.5829,
  longitude: 80.2182,
  timezone: 5.5,
};

describe('profileId', () => {
  it('is stable for identical inputs', () => {
    expect(profileId(base)).toBe(profileId({ ...base }));
  });

  it('treats same name + different time as distinct', () => {
    expect(profileId(base)).not.toBe(profileId({ ...base, time: '04:55' }));
  });

  it('treats different names at same place/time as distinct', () => {
    expect(profileId(base)).not.toBe(profileId({ ...base, name: 'Riya' }));
  });

  it('normalizes name case/whitespace', () => {
    expect(profileId(base)).toBe(profileId({ ...base, name: '  amit ' }));
  });

  it('handles missing name', () => {
    const anon: BirthData = { ...base };
    delete anon.name;
    expect(profileId(anon)).toBe(profileId({ ...anon }));
  });
});

describe('profileLabel', () => {
  const profile = (over: Partial<Profile>): Profile => ({
    ...base,
    id: 'x',
    createdAt: 0,
    lastViewedAt: 0,
    ...over,
  });

  it('uses the name when present', () => {
    expect(profileLabel(profile({ name: 'Amit' }))).toBe('Amit');
  });

  it('falls back to place + date when name is blank', () => {
    expect(profileLabel(profile({ name: '   ' }))).toBe('Pithoragarh, India — 1995-06-08');
    const noName = profile({});
    delete noName.name;
    expect(profileLabel(noName)).toBe('Pithoragarh, India — 1995-06-08');
  });
});
