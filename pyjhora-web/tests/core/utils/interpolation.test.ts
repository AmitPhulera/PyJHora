/**
 * Tests for interpolation utilities (inverseLagrange, unwrapAngles, extendAngleRange)
 * Python reference: utils.py inverse_lagrange, unwrap_angles, extend_angle_range
 */

import { describe, expect, it } from 'vitest';
import { inverseLagrange, unwrapAngles, extendAngleRange, newtonPolynomial, bisectionSearch } from '@core/utils/interpolation';

describe('inverseLagrange', () => {
  it('should interpolate linear data exactly', () => {
    // Python: inverse_lagrange([0, 0.25, 0.5, 0.75, 1.0], [0, 3, 6, 9, 12], 6.0) = 0.5
    const x = [0.0, 0.25, 0.5, 0.75, 1.0];
    const y = [0.0, 3.0, 6.0, 9.0, 12.0];
    expect(inverseLagrange(x, y, 6.0)).toBeCloseTo(0.5, 10);
  });

  it('should interpolate cubic data', () => {
    // Python: inverse_lagrange([0,1,2,3,4], [0,1,8,27,64], 8.0) = 2.0
    const x = [0.0, 1.0, 2.0, 3.0, 4.0];
    const y = [0.0, 1.0, 8.0, 27.0, 64.0];
    expect(inverseLagrange(x, y, 8.0)).toBeCloseTo(2.0, 10);
  });

  it('should interpolate at boundary values', () => {
    const x = [0.0, 1.0, 2.0, 3.0, 4.0];
    const y = [0.0, 1.0, 8.0, 27.0, 64.0];
    // At y=0, should return x=0
    expect(inverseLagrange(x, y, 0.0)).toBeCloseTo(0.0, 10);
    // At y=64, should return x=4
    expect(inverseLagrange(x, y, 64.0)).toBeCloseTo(4.0, 10);
  });

  it('should handle two-point linear interpolation', () => {
    const x = [0.0, 1.0];
    const y = [10.0, 20.0];
    expect(inverseLagrange(x, y, 15.0)).toBeCloseTo(0.5, 10);
    expect(inverseLagrange(x, y, 12.0)).toBeCloseTo(0.2, 10);
  });

  it('should handle panchanga-like data (JD offsets and longitudes)', () => {
    // Simulating tithi calculation: JD offsets and moon-sun phase angles
    const offsets = [0.0, 0.25, 0.5, 0.75, 1.0];
    const phases = [350.0, 356.0, 362.0, 368.0, 374.0]; // ~6° per quarter day
    // Find when phase = 360 (tithi boundary)
    // Linear: phase = 350 + 24*offset, so offset = (360-350)/24 = 10/24 = 5/12
    const result = inverseLagrange(offsets, phases, 360.0);
    expect(result).toBeCloseTo(5 / 12, 6); // ~0.4167 days
  });
});

describe('unwrapAngles', () => {
  it('should unwrap angles crossing 0/360 boundary', () => {
    // Python: unwrap_angles([350, 355, 2, 8, 15]) = [350, 355, 362, 368, 375]
    expect(unwrapAngles([350, 355, 2, 8, 15])).toEqual([350, 355, 362, 368, 375]);
  });

  it('should not modify already increasing angles', () => {
    // Python: unwrap_angles([10, 20, 30, 40, 50]) = [10, 20, 30, 40, 50]
    expect(unwrapAngles([10, 20, 30, 40, 50])).toEqual([10, 20, 30, 40, 50]);
  });

  it('should handle empty array', () => {
    expect(unwrapAngles([])).toEqual([]);
  });

  it('should handle single element', () => {
    expect(unwrapAngles([100])).toEqual([100]);
  });

  it('should handle decreasing sequence', () => {
    // Each element that is less than previous gets +360
    // Note: only adds ONE 360 per element, so large drops may not fully unwrap
    expect(unwrapAngles([350, 5, 350, 5])).toEqual([350, 365, 710, 365]);
  });

  it('should handle wrap at exactly 0', () => {
    expect(unwrapAngles([358, 359, 0, 1, 2])).toEqual([358, 359, 360, 361, 362]);
  });
});

describe('extendAngleRange', () => {
  it('should extend angles when range is less than target', () => {
    const result = extendAngleRange([0, 10, 20], 350);
    // Original range is 20. Need 350. Should add 360 offsets.
    expect(Math.max(...result) - Math.min(...result)).toBeGreaterThanOrEqual(350);
  });

  it('should not modify angles when range already covers target', () => {
    const result = extendAngleRange([0, 100, 200, 300], 200);
    // Original range is 300, already > 200
    expect(result).toEqual([0, 100, 200, 300]);
  });

  it('should handle single angle (range = 0)', () => {
    const result = extendAngleRange([100], 350);
    expect(Math.max(...result) - Math.min(...result)).toBeGreaterThanOrEqual(350);
  });
});

describe('newtonPolynomial', () => {
  it('should interpolate linear data exactly', () => {
    // y = 2x + 1
    const xData = [0, 1, 2, 3];
    const yData = [1, 3, 5, 7];
    expect(newtonPolynomial(xData, yData, 1.5)).toBeCloseTo(4.0, 10);
  });

  it('should interpolate quadratic data', () => {
    // y = x^2
    const xData = [0, 1, 2, 3, 4];
    const yData = [0, 1, 4, 9, 16];
    expect(newtonPolynomial(xData, yData, 2.5)).toBeCloseTo(6.25, 6);
  });

  it('should match at data points', () => {
    const xData = [0, 1, 2];
    const yData = [5, 10, 20];
    expect(newtonPolynomial(xData, yData, 0)).toBeCloseTo(5, 10);
    expect(newtonPolynomial(xData, yData, 1)).toBeCloseTo(10, 10);
    expect(newtonPolynomial(xData, yData, 2)).toBeCloseTo(20, 10);
  });
});

describe('bisectionSearch', () => {
  it('should find root of linear function', () => {
    // f(x) = x - 5, root at x = 5 — start must bracket the root
    // bisection requires func(left) and func(right) have opposite signs
    const root = bisectionSearch((x) => x - 5, 3, 8);
    expect(root).toBeCloseTo(5.0, 6);
  });

  it('should find root of quadratic', () => {
    // f(x) = x^2 - 4, root at x = 2 (in [0, 3])
    const root = bisectionSearch((x) => x * x - 4, 0, 3);
    expect(root).toBeCloseTo(2.0, 6);
  });

  it('should find root of sin', () => {
    // sin(x) = 0 at x = pi (in [2, 4])
    const root = bisectionSearch(Math.sin, 2, 4);
    expect(root).toBeCloseTo(Math.PI, 6);
  });
});
