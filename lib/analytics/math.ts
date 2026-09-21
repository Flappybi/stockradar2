export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export const clamp = (value: number, lower = 0, upper = 100) =>
  Math.max(lower, Math.min(upper, value));
export function mean(values: number[]): number | null {
  if (!values.length || !values.every(finite)) return null;
  // Center first: identical finite values must have exactly zero sample variance.
  const result =
    values[0] +
    values.reduce((sum, value) => sum + (value - values[0]) / values.length, 0);
  return finite(result) ? result : null;
}
export function sampleStd(values: number[]): number | null {
  const average = mean(values);
  if (average === null || values.length < 2) return null;
  const result = Math.sqrt(
    values.reduce(
      (sum, value) => sum + (value - average) ** 2 / (values.length - 1),
      0,
    ),
  );
  return finite(result) ? result : null;
}
export function percentile(
  value: number | null,
  peers: number[],
  inverse = false,
): number | null {
  const valid = peers.filter(finite);
  if (!finite(value) || valid.length < 2) return null;
  const below = valid.filter((peer) => peer < value).length;
  const tied = valid.filter((peer) => peer === value).length;
  const rank = clamp((100 * (below + (tied - 1) / 2)) / (valid.length - 1));
  return inverse ? 100 - rank : rank;
}
export function quantile(values: number[], probability: number): number | null {
  const sorted = values.filter(finite).sort((a, b) => a - b);
  if (
    !sorted.length ||
    !finite(probability) ||
    probability < 0 ||
    probability > 1
  )
    return null;
  const position = (sorted.length - 1) * probability;
  const low = Math.floor(position),
    high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}
export function winsorize(
  values: number[],
  lower = 0.025,
  upper = 0.975,
): number[] {
  if (
    lower < 0 ||
    upper > 1 ||
    lower > upper ||
    !finite(lower) ||
    !finite(upper)
  )
    throw new Error("Invalid winsorization bounds");
  const lo = quantile(values, lower),
    hi = quantile(values, upper);
  if (lo === null || hi === null) return [];
  return values.filter(finite).map((value) => clamp(value, lo, hi));
}
export function zScore(
  current: number | null,
  history: number[],
  minimum = 30,
): number | null {
  const valid = history.filter(finite),
    average = mean(valid),
    std = sampleStd(valid);
  if (
    !finite(current) ||
    valid.length < Math.max(2, minimum) ||
    average === null ||
    std === null ||
    std === 0
  )
    return null;
  const result = (current - average) / std;
  return finite(result) ? result : null;
}
export function anomalyTransform(z: number): number | null {
  return finite(z) ? clamp(100 * (1 - Math.exp(-Math.abs(z) / 2))) : null;
}
