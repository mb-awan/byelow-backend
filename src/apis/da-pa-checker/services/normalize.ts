/**
 * Normalization utilities for DA/PA calculations
 */

/**
 * Logarithmic normalization function
 * Normalizes a value between 0 and max to a 0-1 range using logarithmic scaling
 * @param value - The value to normalize
 * @param max - The maximum expected value
 * @returns Normalized value between 0 and 1
 */
export function logNormalize(value: number, max: number): number {
  return Math.min(Math.log(value + 1) / Math.log(max + 1), 1);
}

/**
 * Ratio calculation utility
 * Calculates the ratio of value to total, ensuring it doesn't exceed 1
 * @param value - The numerator
 * @param total - The denominator
 * @returns Ratio between 0 and 1
 */
export function ratio(value: number, total: number): number {
  if (!total) return 0;
  return Math.min(value / total, 1);
}
