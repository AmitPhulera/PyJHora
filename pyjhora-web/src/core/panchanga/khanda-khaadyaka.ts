/**
 * Khanda Khaadyaka calculations
 * Ported from PyJHora khanda_khaadyaka.py
 *
 * This module provides alternative ahargana calculations.
 * The main calculations delegate to surya_sidhantha.
 */

import { aharganaKhandaKhaadyaka } from './surya-sidhantha';

export { aharganaKhandaKhaadyaka };

/**
 * Graha Laghavam ahargana.
 * Uses a different epoch offset than Khanda Khaadyaka.
 */
export function aharganaGrahaLaghavam(jd: number): number {
  return jd - 1687850;
}
