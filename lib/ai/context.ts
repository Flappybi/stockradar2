import type { StockAnalysis } from "@/lib/analytics/types";

export const displayNumber = (value: number) =>
  Number(value.toFixed(2)).toString();
export const factorLabel = (key: string) => key[0].toUpperCase() + key.slice(1);

/** Display references are computed here, never by the model. Null stays unknown. */
export function buildExplanationContext(analysis: StockAnalysis) {
  const facts: string[] = [];
  const add = (label: string, value: number | null) => {
    if (value !== null && Number.isFinite(value))
      facts.push(`${label}: ${displayNumber(value)}`);
  };
  add("Signal Score", analysis.signal.score);
  add("Signal coverage", analysis.signal.coverage);
  add("Anomaly Score", analysis.anomaly.score);
  add("Anomaly coverage", analysis.anomaly.coverage);
  for (const [key, factor] of Object.entries(analysis.signal.factors)) {
    add(`${factorLabel(key)} score`, factor.score);
    add(`${factorLabel(key)} coverage`, factor.coverage);
    for (const metric of factor.metrics) {
      add(`${metric.label} value`, metric.value);
      add(`${metric.label} peer score`, metric.score);
      add(`${metric.label} peer count`, metric.peerCount);
    }
  }
  for (const component of analysis.anomaly.components) {
    add(`${component.label} score`, component.score);
    add(`${component.label} Z-score`, component.zScore);
    add(`${component.label} current`, component.current);
    add(`${component.label} baseline mean`, component.mean);
    add(`${component.label} baseline standard deviation`, component.std);
    add(`${component.label} difference percent`, component.percentDifference);
    add(`${component.label} baseline observations`, component.observations);
  }
  return {
    company: {
      ticker: analysis.input.ticker,
      name: analysis.input.name,
      sector: analysis.input.sector,
      source: analysis.input.source,
      asOf: analysis.asOf,
      fetchedAt: analysis.input.fetchedAt,
      reportFetchedAt:
        analysis.input.reportFetchedAt ?? analysis.input.fetchedAt,
      marketFetchedAt:
        analysis.input.marketFetchedAt ?? analysis.input.fetchedAt,
      financialYear: analysis.input.financialYear,
      valuationYear: analysis.input.valuationYear,
    },
    signal: analysis.signal,
    anomaly: analysis.anomaly,
    deterministicFindings: analysis.findings,
    analyticsVersion: analysis.version,
    facts: [...new Set(facts)],
  };
}

export type StockExplanationContext = ReturnType<
  typeof buildExplanationContext
>;
