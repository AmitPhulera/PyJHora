/**
 * Interpolation utilities for panchanga calculations
 * Ported from Python utils.py (inverse_lagrange, unwrap_angles, extend_angle_range)
 */

/**
 * Inverse Lagrange interpolation.
 * Given paired data points (x, y), find the value x = xa when y = ya.
 * Constructs a Lagrange polynomial through the points (y_i, x_i) and evaluates at y = ya.
 *
 * Used extensively in panchanga calculations: tithi end time, nakshatra end time,
 * yogam end time, karana end time, new/full moon, planet entry dates, etc.
 *
 * Python: utils.inverse_lagrange(x, y, ya)
 *
 * @param x - Array of x values (e.g., Julian day offsets)
 * @param y - Array of y values (e.g., longitudes/phases at those times)
 * @param ya - Target y value to find x for
 * @returns Interpolated x value
 */
export function inverseLagrange(x: number[], y: number[], ya: number): number {
  let total = 0;
  for (let i = 0; i < x.length; i++) {
    let numer = 1;
    let denom = 1;
    for (let j = 0; j < x.length; j++) {
      if (j !== i) {
        numer *= (ya - y[j]);
        denom *= (y[i] - y[j]);
      }
    }
    total += numer * x[i] / denom;
  }
  return total;
}

/**
 * Unwrap angles for circular continuity.
 * Ensures angles are monotonically increasing by adding 360 at wrap-around points.
 * For example: [350, 355, 2, 8, 15] → [350, 355, 362, 368, 375]
 *
 * Critical for nakshatra calculations near the Ashwini/Revati boundary (0°/360°).
 *
 * Python: utils.unwrap_angles(angles)
 *
 * @param angles - Array of angles in degrees
 * @returns Unwrapped angles (monotonically increasing)
 */
export function unwrapAngles(angles: number[]): number[] {
  if (angles.length === 0) return [];
  const result = [angles[0]];
  for (let i = 1; i < angles.length; i++) {
    let angle = angles[i];
    if (angle < result[i - 1]) {
      angle += 360;
    }
    result.push(angle);
  }
  return result;
}

/**
 * Extend angle range for interpolation.
 * Adds 360 to all angles until the range covers at least `target` degrees.
 *
 * Python: utils.extend_angle_range(angles, target)
 *
 * @param angles - Array of angles in degrees
 * @param target - Minimum range to cover
 * @returns Extended array of angles
 */
export function extendAngleRange(angles: number[], target: number): number[] {
  let extended = [...angles];
  while (Math.max(...extended) - Math.min(...extended) < target) {
    extended = [...extended, ...angles.map(a => a + 360)];
  }
  return extended;
}

/**
 * Newton's divided-difference polynomial interpolation.
 * Evaluates the interpolating polynomial at point x given data points.
 *
 * Python: utils.newton_polynomial(x_data, y_data, x)
 *
 * @param xData - Array of x data points
 * @param yData - Array of y data points
 * @param x - Evaluation point
 * @returns Interpolated y value at x
 */
export function newtonPolynomial(xData: number[], yData: number[], x: number): number {
  const m = xData.length;

  // Compute divided-difference coefficients
  const a = [...yData];
  for (let k = 1; k < m; k++) {
    for (let i = m - 1; i >= k; i--) {
      a[i] = (a[i]! - a[i - 1]!) / (xData[i]! - xData[i - k]!);
    }
  }

  // Evaluate using Horner's method
  const n = m - 1;
  let p = a[n]!;
  for (let k = 1; k <= n; k++) {
    p = a[n - k]! + (x - xData[n - k]!) * p;
  }

  return p;
}

/**
 * Bisection search to find a root of a function within [start, stop].
 *
 * Python: utils._bisection_search(func, start, stop)
 *
 * @param func - Function to find root of
 * @param start - Left bound
 * @param stop - Right bound
 * @param epsilon - Convergence tolerance (default 5e-10)
 * @returns Approximate root
 */
export function bisectionSearch(
  func: (x: number) => number,
  start: number,
  stop: number,
  epsilon = 5e-10,
): number {
  let left = start;
  let right = stop;

  while (right - left > epsilon) {
    const middle = (left + right) / 2;
    const midVal = func(middle);
    const rtVal = func(right);

    if (midVal * rtVal >= 0) {
      right = middle;
    } else {
      left = middle;
    }
  }

  return (right + left) / 2;
}
