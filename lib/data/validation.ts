import { z } from "zod";
import { dateSchema, tickerSchema } from "@/lib/sectors/schemas";
import type { Dataset } from "@/lib/analytics/types";
const number = z.number().finite();
const score = number.min(0).max(100).nullable();
const coverage = number.min(0).max(1);
const timestamp = z.iso.datetime();
const metrics = z.object({
  roe: number.optional(),
  roa: number.optional(),
  netMargin: number.optional(),
  debtToEquity: number.optional(),
  revenueGrowth: number.optional(),
  earningsGrowth: number.optional(),
  pe: number.optional(),
  pb: number.optional(),
  dividendYield: number.optional(),
});
const input = z.object({
  ticker: tickerSchema,
  name: z.string(),
  sector: z.string().nullable(),
  subsector: z.string().nullable(),
  industry: z.string().nullable(),
  fundamentals: metrics,
  financialYear: z.number().int().nullable(),
  valuationYear: z.number().int().nullable(),
  history: z.array(
    z.object({
      date: dateSchema,
      close: number.positive(),
      volume: number.nonnegative().optional(),
    }),
  ),
  fetchedAt: timestamp,
  reportFetchedAt: timestamp.optional(),
  marketFetchedAt: timestamp.optional(),
  source: z.enum(["fixture", "sectors"]),
});
const factor = z.object({
  score,
  coverage,
  metrics: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: number.nullable(),
      score,
      weight: number,
      peerGroup: z.string(),
      peerCount: z.number().int().nonnegative(),
      inverse: z.boolean(),
    }),
  ),
});
const weights = z.object({
  quality: number,
  growth: number,
  valuation: number,
  momentum: number,
  risk: number,
});
export const datasetSchema: z.ZodType<Dataset> = z.object({
  source: z.enum(["fixture", "sectors"]),
  fetchedAt: timestamp,
  stale: z.boolean(),
  warnings: z.array(z.string()),
  stocks: z.array(
    z.object({
      input,
      signal: z.object({
        score,
        coverage,
        weights,
        reason: z.string().nullable(),
        factors: z.object({
          quality: factor,
          growth: factor,
          valuation: factor,
          momentum: factor,
          risk: factor,
        }),
      }),
      anomaly: z.object({
        score,
        coverage,
        label: z.string(),
        primaryTrigger: z.string(),
        reason: z.string().nullable(),
        components: z.array(
          z.object({
            key: z.enum(["volume", "price", "volatility", "sectorDivergence"]),
            label: z.string(),
            score,
            zScore: number.nullable(),
            current: number.nullable(),
            mean: number.nullable(),
            std: number.nullable(),
            percentDifference: number.nullable(),
            observations: z.number().int().nonnegative(),
            direction: z.enum(["positive", "negative", "unchanged"]).nullable(),
            weight: number,
          }),
        ),
      }),
      findings: z.array(z.string()),
      asOf: dateSchema.nullable(),
      calculatedAt: timestamp,
      version: z.string(),
      change: number.nullable(),
    }),
  ),
});
