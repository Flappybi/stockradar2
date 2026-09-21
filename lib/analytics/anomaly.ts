import {
  anomalyTransform,
  clamp,
  finite,
  mean,
  sampleStd,
  zScore,
} from "./math";
import { dailyReturns, dailyReturnSlots, type DailyReturn } from "./history";
import type { PreparedStock } from "./signal";
import type { AnomalyComponent, AnomalyKey, AnomalyResult } from "./types";

const WINDOW = 60;
const MINIMUM = 30;
const COMPONENTS: { key: AnomalyKey; label: string; weight: number }[] = [
  { key: "volume", label: "Volume", weight: 0.3 },
  { key: "price", label: "Price", weight: 0.25 },
  { key: "volatility", label: "Volatility", weight: 0.2 },
  { key: "sectorDivergence", label: "Sector divergence", weight: 0.15 },
];
function component(
  definition: (typeof COMPONENTS)[number],
  current: number | null,
  baseline: number[],
): AnomalyComponent {
  const valid = baseline.filter(finite),
    average = mean(valid),
    std = sampleStd(valid);
  const z = zScore(current, valid, MINIMUM);
  const relative =
    finite(current) && average !== null && average !== 0
      ? ((current - average) / Math.abs(average)) * 100
      : null;
  return {
    ...definition,
    current,
    mean: average,
    std,
    observations: valid.length,
    zScore: z,
    score: z === null ? null : anomalyTransform(z),
    percentDifference: finite(relative) ? relative : null,
    direction:
      z === null ? null : z > 0 ? "positive" : z < 0 ? "negative" : "unchanged",
  };
}
export function anomalyLabel(score: number | null): string {
  return score === null
    ? "Unavailable"
    : score < 40
      ? "Normal"
      : score < 60
        ? "Watch"
        : score < 75
          ? "Elevated"
          : score < 90
            ? "Unusual"
            : "Extreme";
}
function intervalKey(row: DailyReturn) {
  return `${row.start}/${row.end}`;
}
function sectorResiduals(
  subject: PreparedStock,
  universe: PreparedStock[],
  returns: (DailyReturn | null)[],
): (number | null)[] {
  if (!subject.input.sector) return returns.map(() => null);
  const peers = universe.filter(
    (peer) =>
      peer.input.ticker !== subject.input.ticker &&
      peer.input.sector === subject.input.sector,
  );
  const indexes = peers.map(
    (peer) =>
      new Map(
        dailyReturns(peer.history).map((row) => [intervalKey(row), row.value]),
      ),
  );
  return returns.map((row) => {
    if (!row) return null;
    const values = indexes
      .map((index) => index.get(intervalKey(row)))
      .filter(finite);
    return values.length >= 3 ? row.value - mean(values)! : null;
  });
}
export function analyzeAnomaly(
  subject: PreparedStock,
  universe: PreparedStock[],
): AnomalyResult {
  const history = subject.history,
    latest = history.at(-1),
    returns = dailyReturnSlots(history);
  // If the latest close has no valid daily interval, a previous return must not become today's return.
  const currentReturn =
    returns.at(-1)?.end === latest?.date ? returns.at(-1)! : null;
  const rolling = returns.map((_, index) => {
    const window = returns.slice(Math.max(0, index - 9), index + 1);
    if (
      window.length < 10 ||
      window.some(
        (row, i) => row === null || (i > 0 && row.start !== window[i - 1]?.end),
      )
    )
      return null;
    return sampleStd(window.map((row) => row!.value));
  });
  const residuals = sectorResiduals(subject, universe, returns);
  const observations: { current: number | null; baseline: number[] }[] = [
    {
      current: latest?.volume ?? null,
      baseline: history
        .slice(-WINDOW - 1, -1)
        .map((row) => row.volume)
        .filter(finite),
    },
    {
      current: currentReturn?.value ?? null,
      baseline: returns
        .slice(-WINDOW - 1, -1)
        .map((row) => row?.value)
        .filter(finite),
    },
    {
      current: currentReturn ? (rolling.at(-1) ?? null) : null,
      baseline: rolling.slice(-WINDOW - 1, -1).filter(finite),
    },
    {
      current: currentReturn ? (residuals.at(-1) ?? null) : null,
      baseline: residuals.slice(-WINDOW - 1, -1).filter(finite),
    },
  ];
  const components = COMPONENTS.map((definition, index) =>
    component(
      definition,
      subject.stale ? null : observations[index].current,
      observations[index].baseline,
    ),
  );
  const available = components.filter((item) => item.score !== null);
  const validWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const coverage = clamp(validWeight / 0.9, 0, 1);
  const score =
    coverage >= 0.6
      ? clamp(
          available.reduce((sum, item) => sum + item.score! * item.weight, 0) /
            validWeight,
        )
      : null;
  const primary = [...available].sort(
    (a, b) => b.score! * b.weight - a.score! * a.weight,
  )[0];
  return {
    score,
    coverage,
    components,
    label: anomalyLabel(score),
    primaryTrigger:
      score === null ? "Insufficient data" : (primary?.label ?? "None"),
    reason:
      score !== null
        ? null
        : subject.stale
          ? "Market history is stale; current anomaly withheld."
          : "Insufficient data: at least 30 prior observations, nonzero baseline variation and 60% component coverage are required.",
  };
}
