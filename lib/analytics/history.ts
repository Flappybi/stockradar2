import { finite, sampleStd } from "./math";
import type { MarketObservation } from "./types";

export const DAY_MS = 86_400_000;
export const FRESHNESS_DAYS = 7;
export type DailyReturn = { start: string; end: string; value: number };
export function cleanHistory(
  history: MarketObservation[],
): MarketObservation[] {
  const dates = new Map<string, MarketObservation>();
  for (const row of history) {
    const time = Date.parse(row.date);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !finite(time) ||
      new Date(time).toISOString().slice(0, 10) !== row.date ||
      !finite(row.close) ||
      row.close <= 0
    )
      continue;
    dates.set(row.date, {
      date: row.date,
      close: row.close,
      ...(finite(row.volume) && row.volume >= 0 ? { volume: row.volume } : {}),
    });
  }
  return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
}
export function dailyReturns(history: MarketObservation[]): DailyReturn[] {
  return dailyReturnSlots(history).filter(
    (row): row is DailyReturn => row !== null,
  );
}
export function dailyReturnSlots(
  history: MarketObservation[],
): (DailyReturn | null)[] {
  return history.slice(1).map((row, index) => {
    const previous = history[index],
      value = row.close / previous.close - 1;
    // Do not label suspension or missing-history intervals as daily changes.
    return Date.parse(row.date) - Date.parse(previous.date) <=
      FRESHNESS_DAYS * DAY_MS && finite(value)
      ? { start: previous.date, end: row.date, value }
      : null;
  });
}
export function calendarReturn(
  history: MarketObservation[],
  days: number,
): number | null {
  const latest = history.at(-1);
  if (!latest) return null;
  const target = Date.parse(latest.date) - days * DAY_MS;
  const anchor = history.findLast((row) => Date.parse(row.date) <= target);
  if (!anchor || target - Date.parse(anchor.date) > FRESHNESS_DAYS * DAY_MS)
    return null;
  const value = latest.close / anchor.close - 1;
  return finite(value) ? value : null;
}
export function marketRisk(history: MarketObservation[]): {
  volatility: number | null;
  drawdown: number | null;
} {
  const window = history.slice(-61),
    returns = dailyReturns(window);
  if (returns.length < 30 || returns.length !== window.length - 1)
    return { volatility: null, drawdown: null };
  let peak = window[0].close,
    drawdown = 0;
  for (const row of window) {
    peak = Math.max(peak, row.close);
    drawdown = Math.max(drawdown, 1 - row.close / peak);
  }
  const std = sampleStd(returns.map((row) => row.value));
  return { volatility: std === null ? null : std * Math.sqrt(252), drawdown };
}
