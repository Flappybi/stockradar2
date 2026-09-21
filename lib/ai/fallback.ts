import {
  displayNumber,
  factorLabel,
  type StockExplanationContext,
} from "./context";
import type { StockResearchBrief } from "./schemas";

export function deterministicBrief(
  context: StockExplanationContext,
): StockResearchBrief {
  const factors = Object.entries(context.signal.factors)
    .filter(
      (entry): entry is [string, (typeof entry)[1] & { score: number }] =>
        entry[1].score !== null,
    )
    .sort((a, b) => b[1].score - a[1].score);
  const item = ([key, factor]: (typeof factors)[number], highest: boolean) => ({
    title: `${factorLabel(key)} ${highest ? "leads the measured profile" : "deserves closer review"}`,
    explanation: `${factorLabel(key)} score: ${displayNumber(factor.score)}. This is ${highest ? "the highest" : "the lowest"} measured factor in this company's profile; factor scores summarize available peer-relative metrics.`,
    metricReferences: [
      `${factorLabel(key)} score: ${displayNumber(factor.score)}`,
    ],
  });
  const missing = Object.entries(context.signal.factors)
    .filter(([, factor]) => factor.score === null)
    .map(([key]) => factorLabel(key));
  const limitations = [
    context.company.source === "fixture"
      ? "Illustrative fixture data; these values are not live market observations."
      : "Metrics reflect the supplied data snapshot and may lag the market.",
  ];
  if (missing.length)
    limitations.push(
      `Unavailable factors: ${missing.join(", ")}. Missing measurements are excluded, not assumed to be zero.`,
    );
  if (context.signal.reason)
    limitations.push(context.signal.reason.slice(0, 250));
  if (context.anomaly.reason)
    limitations.push(context.anomaly.reason.slice(0, 250));
  if (limitations.length < 4)
    limitations.push(
      "The supplied metrics do not establish a cause for unusual market behavior.",
    );
  return {
    summary: `${context.company.ticker} has ${context.signal.score === null ? "insufficient data for a Signal Score" : `Signal Score: ${displayNumber(context.signal.score)}`} and ${context.anomaly.score === null ? "insufficient history for an Anomaly Score" : `Anomaly Score: ${displayNumber(context.anomaly.score)}`}. The scores describe separate dimensions: measured factor strength and statistical unusualness.`,
    signalInterpretation:
      context.signal.score === null
        ? "The supplied financial and market metrics are insufficient for a composite signal. Review coverage and available factors individually."
        : `Signal Score: ${displayNumber(context.signal.score)}. This summarizes the available weighted factors. Higher scores indicate a stronger measured profile within the supplied comparisons, not an expected return.`,
    anomalyInterpretation:
      context.anomaly.score === null
        ? "Anomaly analysis is unavailable because historical or peer observations are insufficient."
        : `Anomaly Score: ${displayNumber(context.anomaly.score)}. The current classification is ${context.anomaly.label.toLowerCase()}. Unusual behavior describes distance from the historical baseline; it does not establish investment attractiveness or future direction.`,
    strengths: factors.length ? [item(factors[0], true)] : [],
    watchItems:
      factors.length > 1 ? [item(factors[factors.length - 1], false)] : [],
    anomalyDrivers: context.anomaly.components
      .filter((component) => component.zScore !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 4)
      .map((component) => ({
        driver: component.label,
        explanation: `${component.label} Z-score: ${displayNumber(component.zScore!)}. The latest observation is ${component.direction === "positive" ? "above" : component.direction === "negative" ? "below" : "at"} its comparison baseline.${component.percentDifference === null ? "" : ` ${component.label} difference percent: ${displayNumber(component.percentDifference)}.`}`,
      })),
    dataLimitations: limitations.slice(0, 4),
    closingNote:
      "Research support based on supplied measurements. Review the underlying metrics, coverage, and data freshness before drawing conclusions.",
  };
}
