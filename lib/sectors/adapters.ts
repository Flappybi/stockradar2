import type {
  MarketObservation,
  Metrics,
  StockInput,
} from "@/lib/analytics/types";
import { dailySchema, dateSchema, reportSchema, tickerSchema } from "./schemas";
import { DataError } from "./errors";

export function normalizeDaily(
  raw: unknown,
  ticker: string,
): MarketObservation[] {
  const rows = dailySchema.parse(raw);
  const expected = tickerSchema.parse(ticker);
  const byDate = new Map<string, MarketObservation>();
  for (const row of rows) {
    if (row.symbol !== expected)
      throw new DataError("schema", "Sectors daily response ticker mismatch.");
    if (row.close === null) continue;
    byDate.set(row.date, {
      date: row.date,
      close: row.close,
      ...(row.volume == null ? {} : { volume: row.volume }),
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function normalizeCompany(
  raw: unknown,
  history: MarketObservation[],
  fetchedAt: string,
  ticker: string,
): StockInput {
  const report = reportSchema.parse(raw);
  if (report.symbol !== tickerSchema.parse(ticker))
    throw new DataError("schema", "Sectors report ticker mismatch.");
  const ratios = report.financials?.historical_financial_ratio ?? [];
  const financials = report.financials?.historical_financials ?? [];
  const years = [...ratios, ...financials].map((row) => row.year);
  const financialYear = years.length ? Math.max(...years) : null;
  const ratio = ratios.find((row) => row.year === financialYear);
  const current = financials.find((row) => row.year === financialYear);
  const previous = financials.find(
    (row) => row.year === (financialYear ?? 0) - 1,
  );
  const valuations = report.valuation?.historical_valuation ?? [];
  const valuationYear = valuations.length
    ? Math.max(...valuations.map((row) => row.year))
    : null;
  const valuation = valuations.find((row) => row.year === valuationYear);
  const fundamentals: Metrics = {};
  const put = (
    key: keyof Metrics,
    value: number | null | undefined,
    positive = false,
  ) => {
    if (value != null && Number.isFinite(value) && (!positive || value > 0))
      fundamentals[key] = value;
  };
  put("roe", ratio?.profitability?.roe);
  put("roa", ratio?.profitability?.roa);
  put("netMargin", ratio?.profitability?.net_profit_margin);
  put("debtToEquity", ratio?.leverage?.debt_to_equity_ratio);
  const growth = (current?: number | null, previous?: number | null) =>
    current != null && previous != null && previous > 0
      ? (current - previous) / previous
      : undefined;
  put("revenueGrowth", growth(current?.revenue, previous?.revenue));
  put("earningsGrowth", growth(current?.earnings, previous?.earnings));
  put("pe", valuation?.pe, true);
  put("pb", valuation?.pb, true);
  put("dividendYield", report.dividend?.yield_ttm);
  return {
    ticker: report.symbol,
    name: report.company_name,
    sector: report.overview?.sector ?? null,
    subsector: report.overview?.sub_sector ?? null,
    industry: report.overview?.industry ?? null,
    fundamentals,
    financialYear,
    valuationYear,
    history,
    fetchedAt,
    source: "sectors",
  };
}

export function dateChunks(
  start: string,
  end: string,
): { start: string; end: string }[] {
  dateSchema.parse(start);
  dateSchema.parse(end);
  if (start > end)
    throw new DataError("configuration", "History start must precede end.");
  const day = 86_400_000;
  const finish = Date.parse(end);
  const chunks = [];
  for (let cursor = Date.parse(start); cursor <= finish; cursor += 90 * day)
    chunks.push({
      start: new Date(cursor).toISOString().slice(0, 10),
      end: new Date(Math.min(cursor + 89 * day, finish))
        .toISOString()
        .slice(0, 10),
    });
  return chunks;
}
