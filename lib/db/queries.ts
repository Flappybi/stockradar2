import "server-only";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Dataset } from "@/lib/analytics/types";
import { datasetSchema } from "@/lib/data/validation";
import { getDatabase } from "./client";
import {
  companies,
  fundamentalSnapshots,
  marketHistory,
  signalScores,
  anomalyScores,
  datasetSnapshots,
} from "./schema";

export type RawSource = { ticker: string; report: unknown; daily: unknown };
function inputId(input: Dataset["stocks"][number]["input"]) {
  return `${input.source}:${input.ticker}:${createHash("sha256").update(JSON.stringify(input)).digest("hex")}`;
}
export async function readSnapshot(key: string): Promise<Dataset | null> {
  const db = getDatabase();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(datasetSnapshots)
    .where(eq(datasetSnapshots.key, key))
    .limit(1);
  if (!row) return null;
  const parsed = datasetSchema.safeParse(row.dataset);
  return parsed.success ? parsed.data : null;
}
export async function saveSnapshot(
  key: string,
  dataset: Dataset,
  raw: RawSource[],
): Promise<void> {
  const db = getDatabase();
  if (!db)
    throw new Error("DATABASE_URL is required to persist live ingestion.");
  datasetSchema.parse(dataset);
  await db.transaction(async (tx) => {
    for (const stock of dataset.stocks) {
      const input = stock.input,
        fetchedAt = new Date(input.fetchedAt);
      const id = inputId(input);
      const source = raw.find((row) => row.ticker === input.ticker);
      if (!source) throw new Error("Missing raw source for snapshot.");
      await tx
        .insert(companies)
        .values({
          ticker: input.ticker,
          name: input.name,
          sector: input.sector,
          updatedAt: fetchedAt,
        })
        .onConflictDoUpdate({
          target: companies.ticker,
          set: { name: input.name, sector: input.sector, updatedAt: fetchedAt },
        });
      await tx
        .insert(fundamentalSnapshots)
        .values({
          id,
          ticker: input.ticker,
          fetchedAt,
          source: input.source,
          canonical: input,
          rawReport: source.report,
          rawDaily: source.daily,
        })
        .onConflictDoUpdate({
          target: fundamentalSnapshots.id,
          set: {
            canonical: input,
            rawReport: source.report,
            rawDaily: source.daily,
          },
        });
      // Batch upserts preserve older history and the full versioned raw input above.
      for (let cursor = 0; cursor < input.history.length; cursor += 100) {
        const rows = input.history.slice(cursor, cursor + 100).map((row) => ({
          ticker: input.ticker,
          date: row.date,
          close: row.close,
          volume: row.volume ?? null,
          fetchedAt,
        }));
        await tx
          .insert(marketHistory)
          .values(rows)
          .onConflictDoUpdate({
            target: [marketHistory.ticker, marketHistory.date],
            set: {
              close: sql`excluded.close`,
              volume: sql`excluded.volume`,
              fetchedAt,
            },
          });
      }
      const scoreBase = {
        id: `${id}:${stock.version}`,
        ticker: input.ticker,
        calculatedAt: new Date(stock.calculatedAt),
        version: stock.version,
      };
      await tx
        .insert(signalScores)
        .values({ ...scoreBase, result: stock.signal })
        .onConflictDoUpdate({
          target: signalScores.id,
          set: { result: stock.signal, calculatedAt: scoreBase.calculatedAt },
        });
      await tx
        .insert(anomalyScores)
        .values({ ...scoreBase, result: stock.anomaly })
        .onConflictDoUpdate({
          target: anomalyScores.id,
          set: { result: stock.anomaly, calculatedAt: scoreBase.calculatedAt },
        });
    }
    await tx
      .insert(datasetSnapshots)
      .values({ key, fetchedAt: new Date(dataset.fetchedAt), dataset })
      .onConflictDoUpdate({
        target: datasetSnapshots.key,
        set: { fetchedAt: new Date(dataset.fetchedAt), dataset },
      });
  });
}
export async function saveAnalysisSnapshot(
  key: string,
  dataset: Dataset,
): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_URL is required to persist scores.");
  datasetSchema.parse(dataset);
  await db.transaction(async (tx) => {
    for (const stock of dataset.stocks) {
      const base = {
        id: `${inputId(stock.input)}:${stock.version}`,
        ticker: stock.input.ticker,
        calculatedAt: new Date(stock.calculatedAt),
        version: stock.version,
      };
      await tx
        .insert(signalScores)
        .values({ ...base, result: stock.signal })
        .onConflictDoUpdate({
          target: signalScores.id,
          set: { result: stock.signal, calculatedAt: base.calculatedAt },
        });
      await tx
        .insert(anomalyScores)
        .values({ ...base, result: stock.anomaly })
        .onConflictDoUpdate({
          target: anomalyScores.id,
          set: { result: stock.anomaly, calculatedAt: base.calculatedAt },
        });
    }
    await tx
      .update(datasetSnapshots)
      .set({ dataset })
      .where(eq(datasetSnapshots.key, key));
  });
}
