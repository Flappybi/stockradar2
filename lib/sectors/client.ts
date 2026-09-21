import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getCache, setCache } from "@/lib/cache/store";
import { dateChunks, normalizeDaily } from "./adapters";
import {
  dailySchema,
  reportSchema,
  tickerSchema,
  type CompanyReport,
} from "./schemas";
import { DataError } from "./errors";

const BASE_URL = "https://api.sectors.app/v2";
type Cache = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, ttl: number) => Promise<void>;
};
type Options = {
  apiKey?: string;
  request?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  cache?: Cache;
};
export class SectorsClient {
  private readonly key: string;
  private readonly request: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly cache: Cache;
  private readonly scope: string;
  constructor(options: Options = {}) {
    this.key = options.apiKey ?? process.env.SECTORS_API_KEY ?? "";
    if (!this.key.trim())
      throw new DataError(
        "configuration",
        "Set SECTORS_API_KEY on the server, then run pnpm ingest. Use DATA_MODE=fixture only for the labeled synthetic demo.",
      );
    const base =
      process.env.SECTORS_API_BASE_URL?.replace(/\/$/, "") || BASE_URL;
    if (base !== BASE_URL)
      throw new DataError(
        "configuration",
        "SECTORS_API_BASE_URL must be https://api.sectors.app/v2.",
      );
    this.request = options.request ?? fetch;
    this.sleep =
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.cache = options.cache ?? { get: getCache, set: setCache };
    this.scope = createHash("sha256")
      .update(this.key)
      .digest("hex")
      .slice(0, 20);
  }
  private async load<S extends z.ZodType>(
    path: string,
    schema: S,
    ttl: number,
    validate: (raw: z.input<S>) => void,
  ): Promise<{ raw: z.input<S>; fetchedAt: string }> {
    const cacheKey = `sectors:v2-provenance:${this.scope}:${path}`;
    const cached = await this.cache.get<unknown>(cacheKey);
    const envelope = z
      .object({ raw: z.unknown(), fetchedAt: z.iso.datetime() })
      .safeParse(cached);
    if (
      envelope.success &&
      schema.safeParse(envelope.data.raw).success &&
      Date.now() - Date.parse(envelope.data.fetchedAt) >= 0 &&
      Date.now() - Date.parse(envelope.data.fetchedAt) < ttl
    ) {
      try {
        validate(envelope.data.raw as z.input<S>);
        return {
          raw: envelope.data.raw as z.input<S>,
          fetchedAt: envelope.data.fetchedAt,
        };
      } catch {
        /* Re-fetch invalid cached identity. */
      }
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await this.request(`${BASE_URL}${path}`, {
          headers: { Authorization: this.key, Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
          cache: "no-store",
        });
      } catch {
        if (attempt < 2) {
          await this.sleep(500 * 2 ** attempt);
          continue;
        }
        throw new DataError(
          "unavailable",
          "Sectors market data temporarily unavailable.",
        );
      }
      if (response.status === 401 || response.status === 403)
        throw new DataError(
          "credentials",
          "Sectors credentials rejected. Check the server API key and plan permissions.",
        );
      if (response.status === 429 || response.status >= 500) {
        if (attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await this.sleep(
            Math.min(
              5_000,
              Math.max(
                500 * 2 ** attempt,
                Number.isFinite(retryAfter) ? retryAfter * 1_000 : 0,
              ),
            ),
          );
          continue;
        }
        throw new DataError(
          "unavailable",
          "Sectors market data temporarily unavailable after bounded retries.",
        );
      }
      if (!response.ok)
        throw new DataError(
          "unavailable",
          `Sectors request failed (HTTP ${response.status}). Check configured ticker and API access.`,
        );
      let raw: unknown;
      try {
        raw = await response.json();
      } catch {
        throw new DataError("schema", "Sectors returned invalid JSON.");
      }
      if (!schema.safeParse(raw).success)
        throw new DataError(
          "schema",
          "Sectors response did not match the documented schema.",
        );
      try {
        validate(raw as z.input<S>);
      } catch {
        throw new DataError(
          "schema",
          "Sectors response identity or date range did not match the request.",
        );
      }
      const result = {
        raw: raw as z.input<S>,
        fetchedAt: new Date().toISOString(),
      };
      await this.cache.set(cacheKey, result, ttl);
      return result;
    }
    throw new DataError(
      "unavailable",
      "Sectors market data temporarily unavailable.",
    );
  }
  async report(ticker: string): Promise<CompanyReport> {
    return (await this.reportWithMetadata(ticker)).raw;
  }
  async reportWithMetadata(ticker: string) {
    const symbol = tickerSchema.parse(ticker);
    return this.load(
      `/company/report/${symbol}/?sections=overview,financials,valuation,dividend`,
      reportSchema,
      24 * 3_600_000,
      (raw) => {
        if (tickerSchema.parse(raw.symbol) !== symbol)
          throw new Error("Mismatch");
      },
    );
  }
  async daily(ticker: string, start: string, end: string) {
    const symbol = tickerSchema.parse(ticker);
    const rawRows: z.input<typeof dailySchema> = [];
    const chunks: { start: string; end: string; fetchedAt: string }[] = [];
    for (const chunk of dateChunks(start, end)) {
      const result = await this.load(
        `/daily/${symbol}/?start=${chunk.start}&end=${chunk.end}`,
        dailySchema,
        6 * 3_600_000,
        (rows) => {
          normalizeDaily(rows, symbol);
          if (
            rows.some((row) => row.date < chunk.start || row.date > chunk.end)
          )
            throw new Error("Date range mismatch");
        },
      );
      rawRows.push(...result.raw);
      chunks.push({ ...chunk, fetchedAt: result.fetchedAt });
    }
    return {
      raw: rawRows,
      history: normalizeDaily(rawRows, symbol),
      fetchedAt: chunks.map((chunk) => chunk.fetchedAt).sort()[0],
      chunks,
    };
  }
}
