export const FACTORS = [
  "quality",
  "growth",
  "valuation",
  "momentum",
  "risk",
] as const;
export type Factor = (typeof FACTORS)[number];
export type Weights = Record<Factor, number>;
export type Metrics = Partial<
  Record<
    | "roe"
    | "roa"
    | "netMargin"
    | "debtToEquity"
    | "revenueGrowth"
    | "earningsGrowth"
    | "pe"
    | "pb"
    | "dividendYield",
    number
  >
>;
export type MarketObservation = {
  date: string;
  close: number;
  volume?: number;
};
export type StockInput = {
  ticker: string;
  name: string;
  sector: string | null;
  subsector: string | null;
  industry: string | null;
  fundamentals: Metrics;
  financialYear: number | null;
  valuationYear: number | null;
  history: MarketObservation[];
  fetchedAt: string;
  reportFetchedAt?: string;
  marketFetchedAt?: string;
  source: "sectors" | "fixture";
};
export type MetricEvidence = {
  key: string;
  label: string;
  value: number | null;
  score: number | null;
  weight: number;
  peerGroup: string;
  peerCount: number;
  inverse: boolean;
};
export type FactorResult = {
  score: number | null;
  coverage: number;
  metrics: MetricEvidence[];
};
export type SignalResult = {
  score: number | null;
  coverage: number;
  factors: Record<Factor, FactorResult>;
  weights: Weights;
  reason: string | null;
};
export type AnomalyKey = "volume" | "price" | "volatility" | "sectorDivergence";
export type AnomalyComponent = {
  key: AnomalyKey;
  label: string;
  score: number | null;
  zScore: number | null;
  current: number | null;
  mean: number | null;
  std: number | null;
  percentDifference: number | null;
  observations: number;
  direction: "positive" | "negative" | "unchanged" | null;
  weight: number;
};
export type AnomalyResult = {
  score: number | null;
  coverage: number;
  label: string;
  primaryTrigger: string;
  components: AnomalyComponent[];
  reason: string | null;
};
export type StockAnalysis = {
  input: StockInput;
  signal: SignalResult;
  anomaly: AnomalyResult;
  findings: string[];
  asOf: string | null;
  calculatedAt: string;
  version: string;
  change: number | null;
};
export type Dataset = {
  stocks: StockAnalysis[];
  source: "fixture" | "sectors";
  fetchedAt: string;
  stale: boolean;
  warnings: string[];
};
