import { clamp, finite } from "./math";
import { cleanHistory, dailyReturns, DAY_MS, FRESHNESS_DAYS } from "./history";
import { analyzeAnomaly } from "./anomaly";
import { prepareStock, scoreFactor } from "./signal";
import {
  FACTORS,
  type Factor,
  type FactorResult,
  type SignalResult,
  type StockAnalysis,
  type StockInput,
  type Weights,
} from "./types";

export const ANALYTICS_VERSION = "1.0.0";
export const PRESETS: Record<
  "Balanced" | "Growth" | "Value" | "Quality" | "Momentum" | "Defensive",
  Weights
> = {
  Balanced: { quality: 25, growth: 25, valuation: 20, momentum: 20, risk: 10 },
  Growth: { quality: 20, growth: 40, valuation: 10, momentum: 20, risk: 10 },
  Value: { quality: 25, growth: 15, valuation: 40, momentum: 10, risk: 10 },
  Quality: { quality: 45, growth: 20, valuation: 15, momentum: 10, risk: 10 },
  Momentum: { quality: 15, growth: 15, valuation: 10, momentum: 50, risk: 10 },
  Defensive: { quality: 35, growth: 10, valuation: 15, momentum: 10, risk: 30 },
};
export function combineFactors(
  factors: Record<Factor, FactorResult>,
  weights: Weights,
): SignalResult {
  if (
    FACTORS.some((key) => !finite(weights[key]) || weights[key] < 0) ||
    Math.abs(FACTORS.reduce((sum, key) => sum + weights[key], 0) - 100) > 1e-8
  )
    throw new Error("Factor weights must be nonnegative and total 100%");
  const valid = FACTORS.filter(
    (key) => finite(factors[key].score) && factors[key].coverage > 0,
  );
  const coverage = clamp(
    valid.reduce(
      (sum, key) =>
        sum + (weights[key] / 100) * clamp(factors[key].coverage, 0, 1),
      0,
    ),
    0,
    1,
  );
  const availableWeight = valid.reduce((sum, key) => sum + weights[key], 0);
  const score =
    coverage >= 0.6 && availableWeight > 0
      ? clamp(
          valid.reduce(
            (sum, key) => sum + factors[key].score! * weights[key],
            0,
          ) / availableWeight,
        )
      : null;
  return {
    score,
    coverage,
    factors,
    weights: { ...weights },
    reason:
      score === null
        ? "Insufficient data: less than 60% of original weighted metrics are covered."
        : null,
  };
}
export function analyzeUniverse(
  inputs: StockInput[],
  calculatedAt = new Date().toISOString(),
): StockAnalysis[] {
  const calculationTime = Date.parse(calculatedAt);
  if (!finite(calculationTime))
    throw new Error("Invalid calculation timestamp");
  const universe = inputs.map((input) => {
    const history = cleanHistory(input.history).filter(
      (row) => Date.parse(row.date) <= calculationTime,
    );
    const latest = history.at(-1);
    return prepareStock(
      input,
      history,
      !latest ||
        calculationTime - Date.parse(latest.date) > FRESHNESS_DAYS * DAY_MS,
    );
  });
  return universe.map((subject) => {
    const factors = Object.fromEntries(
      FACTORS.map((factor) => [factor, scoreFactor(subject, universe, factor)]),
    ) as Record<Factor, FactorResult>;
    const signal = combineFactors(factors, PRESETS.Balanced),
      anomaly = analyzeAnomaly(subject, universe);
    const findings: string[] = [];
    const measured = FACTORS.filter((key) => factors[key].score !== null).sort(
      (a, b) => factors[b].score! - factors[a].score!,
    );
    if (measured.length)
      findings.push(
        `${measured[0][0].toUpperCase() + measured[0].slice(1)} is the strongest measured factor at ${factors[measured[0]].score!.toFixed(1)}/100.`,
      );
    if (signal.coverage < 1)
      findings.push(
        `${(signal.coverage * 100).toFixed(1)}% of original weighted Signal inputs are covered; unavailable inputs are excluded.`,
      );
    if (subject.stale)
      findings.push(
        "Market history is stale or unavailable; market factors and current anomalies are withheld.",
      );
    if (signal.reason) findings.push(signal.reason);
    if (anomaly.score !== null) {
      const trigger = anomaly.components.find(
        (item) => item.label === anomaly.primaryTrigger,
      )!;
      findings.push(
        `${anomaly.primaryTrigger} is the largest weighted anomaly contribution (${trigger.zScore!.toFixed(2)} standard deviations, ${trigger.direction} relative to its baseline).`,
      );
    } else if (anomaly.reason) findings.push(anomaly.reason);
    if (
      Object.values(factors).some((factor) =>
        factor.metrics.some(
          (metric) =>
            metric.score !== null && metric.peerGroup === "Universe fallback",
        ),
      )
    )
      findings.push(
        "Some metrics use the available universe because fewer than five valid sector or subsector observations were available.",
      );
    const latestReturn = dailyReturns(subject.history).at(-1);
    const asOf = subject.history.at(-1)?.date ?? null;
    return {
      input: subject.input,
      signal,
      anomaly,
      findings,
      asOf,
      calculatedAt,
      version: ANALYTICS_VERSION,
      change: latestReturn?.end === asOf ? latestReturn.value : null,
    };
  });
}
