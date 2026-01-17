export function logNormalize(value: number, max: number): number {
  return Math.min(Math.log(value + 1) / Math.log(max + 1), 1);
}

export function ratio(value: number, total: number): number {
  if (!total) return 0;
  return Math.min(value / total, 1);
}
