import { clamp, finite, percentile, quantile, winsorize } from "./math";
import { calendarReturn, marketRisk } from "./history";
import type {
  Factor,
  FactorResult,
  MarketObservation,
  MetricEvidence,
  Metrics,
  StockInput,
} from "./types";

type MetricDefinition = {
  key: string;
  label: string;
  weight: number;
  inverse?: boolean;
  positive?: boolean;
};
const DEFINITIONS: Record<Factor, MetricDefinition[]> = {
  quality: [
    { key: "roe", label: "Return on equity", weight: 0.35 },
    { key: "roa", label: "Return on assets", weight: 0.25 },
    { key: "netMargin", label: "Net profit margin", weight: 0.25 },
    {
      key: "debtToEquity",
      label: "Debt / equity",
      weight: 0.15,
      inverse: true,
    },
  ],
  growth: [
    { key: "revenueGrowth", label: "Revenue growth", weight: 0.5 },
    { key: "earningsGrowth", label: "Earnings growth", weight: 0.5 },
  ],
  valuation: [
    { key: "pe", label: "P/E", weight: 0.5, inverse: true, positive: true },
    { key: "pb", label: "P/B", weight: 0.35, inverse: true, positive: true },
    { key: "dividendYield", label: "Dividend yield", weight: 0.15 },
  ],
  momentum: [
    { key: "return30", label: "30D price return", weight: 0.4 },
    { key: "return90", label: "90D price return", weight: 0.4 },
    { key: "return365", label: "365D price return", weight: 0.2 },
  ],
  risk: [
    {
      key: "volatility",
      label: "60-session annualized volatility",
      weight: 0.6,
      inverse: true,
    },
    {
      key: "drawdown",
      label: "60-session maximum drawdown",
      weight: 0.4,
      inverse: true,
    },
  ],
};
export type PreparedStock = {
  input: StockInput;
  history: MarketObservation[];
  stale: boolean;
  values: Record<string, number | null>;
};
export function prepareStock(
  input: StockInput,
  history: MarketObservation[],
  stale: boolean,
): PreparedStock {
  const risk = stale
    ? { volatility: null, drawdown: null }
    : marketRisk(history);
  const values: Record<string, number | null> = { ...risk };
  for (const key of Object.keys(input.fundamentals) as (keyof Metrics)[]) {
    const value = input.fundamentals[key];
    values[key] = finite(value) ? value : null;
  }
  for (const days of [30, 90, 365])
    values[`return${days}`] = stale ? null : calendarReturn(history, days);
  return { input, history, stale, values };
}
function validValue(
  stock: PreparedStock,
  definition: MetricDefinition,
): number | null {
  const value = stock.values[definition.key];
  if (!finite(value) || (definition.positive && value <= 0)) return null;
  if (
    (definition.key === "debtToEquity" || definition.key === "dividendYield") &&
    value < 0
  )
    return null;
  return value;
}
function metricEvidence(
  subject: PreparedStock,
  universe: PreparedStock[],
  definition: MetricDefinition,
  fundamental: boolean,
): MetricEvidence {
  const { input } = subject;
  const sameDate = (peer: PreparedStock) =>
    fundamental || peer.history.at(-1)?.date === subject.history.at(-1)?.date;
  const groups = [
    {
      name: `Subsector: ${input.subsector}`,
      peers:
        input.subsector && input.sector
          ? universe.filter(
              (peer) =>
                peer.input.subsector === input.subsector &&
                peer.input.sector === input.sector,
            )
          : [],
    },
    {
      name: `Sector: ${input.sector}`,
      peers: input.sector
        ? universe.filter((peer) => peer.input.sector === input.sector)
        : [],
    },
    { name: "Universe fallback", peers: universe },
  ].map((group) => ({
    name: group.name,
    values: group.peers
      .filter(sameDate)
      .map((peer) => validValue(peer, definition))
      .filter(finite),
  }));
  const group = groups.find((group) => group.values.length >= 5) ?? groups[2];
  const value = validValue(subject, definition);
  let rankedValue = value,
    peers = group.values;
  if (fundamental && peers.length >= 20) {
    const low = quantile(peers, 0.025)!,
      high = quantile(peers, 0.975)!;
    rankedValue = value === null ? null : clamp(value, low, high);
    peers = winsorize(peers);
  }
  return {
    key: definition.key,
    label: definition.label,
    value: subject.values[definition.key] ?? null,
    score:
      peers.length >= 5
        ? percentile(rankedValue, peers, definition.inverse)
        : null,
    weight: definition.weight,
    peerGroup: group.name,
    peerCount: peers.length,
    inverse: definition.inverse ?? false,
  };
}
export function scoreFactor(
  subject: PreparedStock,
  universe: PreparedStock[],
  factor: Factor,
): FactorResult {
  const definitions = DEFINITIONS[factor].filter(
    (metric) =>
      !(
        factor === "quality" &&
        subject.input.sector?.toLowerCase() === "financials" &&
        metric.key === "debtToEquity"
      ),
  );
  const total = definitions.reduce((sum, metric) => sum + metric.weight, 0);
  const metrics = definitions.map((definition) =>
    metricEvidence(
      subject,
      universe,
      { ...definition, weight: definition.weight / total },
      factor !== "momentum" && factor !== "risk",
    ),
  );
  const valid = metrics.filter((metric) => metric.score !== null);
  const coverage = clamp(
    valid.reduce((sum, metric) => sum + metric.weight, 0),
    0,
    1,
  );
  return {
    score:
      coverage > 0
        ? clamp(
            valid.reduce(
              (sum, metric) => sum + metric.score! * metric.weight,
              0,
            ) / coverage,
          )
        : null,
    coverage,
    metrics,
  };
}
