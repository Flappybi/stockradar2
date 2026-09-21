import "server-only";
import { createHash } from "node:crypto";
import type { Dataset, StockInput } from "@/lib/analytics/types";
import { analyzeUniverse, ANALYTICS_VERSION } from "@/lib/analytics/engine";
import { DAY_MS, FRESHNESS_DAYS } from "@/lib/analytics/history";
import { SectorsClient } from "@/lib/sectors/client";
import { normalizeCompany } from "@/lib/sectors/adapters";
import { tickerSchema } from "@/lib/sectors/schemas";
import { DataError } from "@/lib/sectors/errors";
import { getCache, setCache } from "@/lib/cache/store";
import {
  readSnapshot,
  saveSnapshot,
  saveAnalysisSnapshot,
  type RawSource,
} from "@/lib/db/queries";
import { fixtureInputs, FIXTURE_FETCHED_AT } from "./fixtures";
import { datasetSchema } from "./validation";

const DEFAULT_TICKERS =
  "BBCA,BBRI,BMRI,BBNI,BBTN,ICBP,INDF,MYOR,UNVR,ROTI,ADRO,PTBA,ITMG,MEDC,PGAS";
const FRESH_FOR_MS = 6 * 3_600_000;
let remembered: { key: string; dataset: Dataset } | undefined;
function mode() {
  const value = process.env.DATA_MODE || "sectors";
  if (value !== "fixture" && value !== "sectors")
    throw new DataError(
      "configuration",
      "DATA_MODE must be sectors or fixture.",
    );
  return value;
}
function liveConfig() {
  // Constructor validates credentials and the fixed origin without making a request.
  const client = new SectorsClient();
  const raw = (process.env.SECTORS_TICKERS || DEFAULT_TICKERS).split(",");
  if (
    !raw.length ||
    raw.length > 40 ||
    raw.some((value) => !tickerSchema.safeParse(value).success)
  )
    throw new DataError(
      "configuration",
      "SECTORS_TICKERS must contain 1–40 comma-separated four-letter IDX tickers.",
    );
  const tickers = [
    ...new Set(raw.map((value) => tickerSchema.parse(value))),
  ].sort();
  const universe = createHash("sha256")
    .update(tickers.join(","))
    .digest("hex")
    .slice(0, 20);
  return { client, tickers, key: `sectors:${ANALYTICS_VERSION}:${universe}` };
}
function fixtureDataset(): Dataset {
  return {
    stocks: analyzeUniverse(fixtureInputs(), FIXTURE_FETCHED_AT),
    source: "fixture",
    fetchedAt: FIXTURE_FETCHED_AT,
    stale: false,
    warnings: [
      "Synthetic fixture demo dated 18 September 2026. Company names and tickers are real; every price, volume, financial value and score is synthetic, not live Sectors data. Weekdays include exchange holidays.",
    ],
  };
}
function staleDataset(dataset: Dataset, warning: string): Dataset {
  return {
    ...structuredClone(dataset),
    stale: true,
    warnings: [...new Set([...dataset.warnings, warning])],
  };
}
async function saved(key: string): Promise<Dataset | null> {
  try {
    const persisted = await readSnapshot(key);
    if (
      persisted &&
      persisted.source === "sectors" &&
      persisted.stocks.length
    ) {
      remembered = { key, dataset: persisted };
      return persisted;
    }
  } catch {
    if (remembered?.key === key)
      return staleDataset(
        remembered.dataset,
        "Database unavailable; showing the last complete snapshot held by this server.",
      );
    throw new DataError(
      "unavailable",
      "Market data temporarily unavailable. Check database connectivity and run pnpm db:migrate followed by pnpm ingest.",
    );
  }
  return remembered?.key === key ? structuredClone(remembered.dataset) : null;
}
/** Request path: reads a complete saved universe only; never calls Sectors. */
export async function getDataset(): Promise<Dataset> {
  if (mode() === "fixture") return fixtureDataset();
  const { key } = liveConfig();
  let dataset = await saved(key);
  if (!dataset)
    throw new DataError(
      "no_snapshot",
      "No complete Sectors snapshot exists. Configure DATABASE_URL, run pnpm db:migrate, then pnpm ingest on a worker or your development machine.",
    );
  const now = Date.now();
  // Re-evaluate the whole peer universe when a saved analysis crosses the market
  // freshness cutoff. Retrieval times stay unchanged; no upstream IO or DB write.
  if (
    dataset.stocks.some(
      (stock) =>
        stock.asOf &&
        now - Date.parse(stock.asOf) > FRESHNESS_DAYS * DAY_MS &&
        Date.parse(stock.calculatedAt) - Date.parse(stock.asOf) <=
          FRESHNESS_DAYS * DAY_MS,
    )
  ) {
    dataset = {
      ...dataset,
      stocks: analyzeUniverse(
        dataset.stocks.map((s) => s.input),
        new Date(now).toISOString(),
      ),
    };
  }
  const failed = await getCache<boolean>(`refresh-failed:${key}`, {
    authoritative: true,
  });
  const sourceExpired = dataset.stocks.some(
    (s) =>
      now - Date.parse(s.input.marketFetchedAt ?? s.input.fetchedAt) >
        FRESH_FOR_MS ||
      now - Date.parse(s.input.reportFetchedAt ?? s.input.fetchedAt) >
        24 * 3_600_000,
  );
  if (failed !== false || sourceExpired)
    return staleDataset(
      dataset,
      "Showing the last complete Sectors snapshot. Refresh is overdue or the latest ingestion failed; timestamps identify the saved data.",
    );
  return structuredClone(dataset);
}
/** Explicit CLI/worker ingestion only. All companies succeed before snapshot replacement. */
export async function refreshDataset(): Promise<Dataset> {
  if (mode() === "fixture") return fixtureDataset();
  const { key, client, tickers } = liveConfig();
  if (!process.env.DATABASE_URL)
    throw new DataError(
      "configuration",
      "DATABASE_URL is required for live ingestion. Run pnpm db:migrate before pnpm ingest.",
    );
  const now = new Date();
  const fetchedAt = now.toISOString();
  const end = fetchedAt.slice(0, 10),
    start = new Date(now.getTime() - 399 * 86_400_000)
      .toISOString()
      .slice(0, 10);
  try {
    const inputs: StockInput[] = [],
      raw: RawSource[] = [];
    for (const ticker of tickers) {
      const report = await client.reportWithMetadata(ticker);
      const daily = await client.daily(ticker, start, end);
      const sourceFetchedAt = [report.fetchedAt, daily.fetchedAt].sort()[0];
      inputs.push({
        ...normalizeCompany(report.raw, daily.history, sourceFetchedAt, ticker),
        reportFetchedAt: report.fetchedAt,
        marketFetchedAt: daily.fetchedAt,
      });
      raw.push({ ticker, report: report.raw, daily: daily.raw });
    }
    const dataset = datasetSchema.parse({
      stocks: analyzeUniverse(inputs, fetchedAt),
      source: "sectors",
      fetchedAt: inputs.map((input) => input.fetchedAt).sort()[0],
      stale: false,
      warnings: [
        "Scores compare the configured coverage universe, not every IDX listing. Financial ratios and valuation multiples retain annual reporting periods.",
      ],
    });
    await saveSnapshot(key, dataset, raw);
    remembered = { key, dataset };
    await setCache(`refresh-failed:${key}`, false, 7 * 86_400_000);
    return structuredClone(dataset);
  } catch (error) {
    await setCache(`refresh-failed:${key}`, true, 7 * 86_400_000);
    const previous = await saved(key);
    if (previous)
      return staleDataset(
        previous,
        "Latest ingestion failed. The prior complete snapshot remains available; no partial universe was published.",
      );
    if (error instanceof DataError) throw error;
    throw new DataError(
      "unavailable",
      "Ingestion failed; no complete snapshot was saved. Verify database migrations and documented Sectors access.",
    );
  }
}
export async function recalculateDataset(): Promise<Dataset> {
  const dataset = await getDataset();
  const calculatedAt =
    dataset.source === "fixture"
      ? FIXTURE_FETCHED_AT
      : new Date().toISOString();
  const result = datasetSchema.parse({
    ...dataset,
    stocks: analyzeUniverse(
      dataset.stocks.map((stock) => stock.input),
      calculatedAt,
    ),
  });
  if (result.source === "sectors") {
    const { key } = liveConfig();
    await saveAnalysisSnapshot(key, result);
    remembered = { key, dataset: result };
  }
  return result;
}
