import { describe, it, expect } from 'vitest';
import { coerce } from '../../src/parity/coercion';

describe('coerce', () => {
  it('passes through primitives', () => {
    expect(coerce(7)).toBe(7);
    expect(coerce(3.14)).toBe(3.14);
    expect(coerce('hello')).toBe('hello');
    expect(coerce(true)).toBe(true);
    expect(coerce(null)).toBe(null);
  });

  it('passes through arrays', () => {
    expect(coerce([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('passes through plain objects', () => {
    expect(coerce({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('coerces Place to {name, latitude, longitude, timezone}', () => {
    const tagged = {
      __type: 'Place',
      value: { name: 'Bangalore', latitude: 12.97, longitude: 77.58, timezone: 5.5 },
    };
    const result = coerce(tagged) as { name: string; latitude: number; longitude: number; timezone: number };
    expect(result.name).toBe('Bangalore');
    expect(result.latitude).toBe(12.97);
    expect(result.longitude).toBe(77.58);
    expect(result.timezone).toBe(5.5);
  });

  it('coerces Date to {year, month, day}', () => {
    const tagged = {
      __type: 'Date',
      value: { year: 2024, month: 1, day: 15 },
    };
    const result = coerce(tagged) as { year: number; month: number; day: number };
    expect(result.year).toBe(2024);
    expect(result.month).toBe(1);
    expect(result.day).toBe(15);
  });

  it('recurses into nested structures', () => {
    const tagged = {
      nested: { __type: 'Place', value: { name: 'X', latitude: 0, longitude: 0, timezone: 0 } },
      list: [{ __type: 'Date', value: { year: 2024, month: 6, day: 10 } }],
    };
    const result = coerce(tagged) as { nested: any; list: any[] };
    expect(result.nested.latitude).toBe(0);
    expect(result.nested.name).toBe('X');
    expect(result.list[0].year).toBe(2024);
  });

  it('throws on unknown __type', () => {
    expect(() => coerce({ __type: 'Unknown', value: {} })).toThrow(/Unknown __type/);
  });
});
