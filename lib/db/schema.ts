import {
  pgTable,
  text,
  jsonb,
  timestamp,
  date,
  doublePrecision,
  primaryKey,
} from "drizzle-orm/pg-core";
import type {
  StockInput,
  Dataset,
  SignalResult,
  AnomalyResult,
} from "@/lib/analytics/types";

export const companies = pgTable("companies", {
  ticker: text("ticker").primaryKey(),
  name: text("name").notNull(),
  sector: text("sector"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
export const fundamentalSnapshots = pgTable("fundamental_snapshots", {
  id: text("id").primaryKey(),
  ticker: text("ticker")
    .notNull()
    .references(() => companies.ticker),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  canonical: jsonb("canonical").$type<StockInput>().notNull(),
  rawReport: jsonb("raw_report").notNull(),
  rawDaily: jsonb("raw_daily").notNull(),
});
export const marketHistory = pgTable(
  "market_history",
  {
    ticker: text("ticker")
      .notNull()
      .references(() => companies.ticker),
    date: date("date").notNull(),
    close: doublePrecision("close").notNull(),
    volume: doublePrecision("volume"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.ticker, table.date] })],
);
export const signalScores = pgTable("signal_scores", {
  id: text("id").primaryKey(),
  ticker: text("ticker")
    .notNull()
    .references(() => companies.ticker),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
  version: text("version").notNull(),
  result: jsonb("result").$type<SignalResult>().notNull(),
});
export const anomalyScores = pgTable("anomaly_scores", {
  id: text("id").primaryKey(),
  ticker: text("ticker")
    .notNull()
    .references(() => companies.ticker),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
  version: text("version").notNull(),
  result: jsonb("result").$type<AnomalyResult>().notNull(),
});
export const datasetSnapshots = pgTable("dataset_snapshots", {
  key: text("key").primaryKey(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  dataset: jsonb("dataset").$type<Dataset>().notNull(),
});
export const responseCache = pgTable("response_cache", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
