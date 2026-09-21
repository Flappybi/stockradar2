import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeCompany,
  normalizeDaily,
  dateChunks,
} from "@/lib/sectors/adapters";
import { SectorsClient } from "@/lib/sectors/client";

const report = {
  symbol: "BBCA.JK",
  company_name: "Bank Central Asia",
  overview: { sector: "Financials", sub_sector: "Banks", industry: "Banks" },
  financials: {
    historical_financial_ratio: [
      {
        year: "2024",
        profitability: { roe: 0.2, roa: null, net_profit_margin: -0.1 },
        leverage: { debt_to_equity_ratio: 2 },
      },
    ],
    historical_financials: [
      { year: 2023, revenue: 100, earnings: -10 },
      { year: 2024, revenue: 120, earnings: 20 },
    ],
  },
  valuation: { historical_valuation: [{ year: 2024, pe: -2, pb: 1.5 }] },
  dividend: { yield_ttm: null },
};
describe("Sectors normalization", () => {
  it("preserves annual periods and signed ratios while excluding invalid multiples and negative growth bases", () => {
    const result = normalizeCompany(
      report,
      [],
      "2026-09-18T12:00:00.000Z",
      "BBCA",
    );
    expect(result).toMatchObject({
      ticker: "BBCA",
      financialYear: 2024,
      valuationYear: 2024,
      fundamentals: { roe: 0.2, netMargin: -0.1, revenueGrowth: 0.2, pb: 1.5 },
    });
    expect(result.fundamentals.roa).toBeUndefined();
    expect(result.fundamentals.pe).toBeUndefined();
    expect(result.fundamentals.earningsGrowth).toBeUndefined();
    expect(result.fundamentals.dividendYield).toBeUndefined();
  });
  it("rejects numeric strings, malformed responses and inconsistent tickers", () => {
    expect(() =>
      normalizeCompany({ ...report, symbol: "TLKM" }, [], "now", "BBCA"),
    ).toThrow();
    expect(() => normalizeCompany([], [], "now", "BBCA")).toThrow();
    expect(() =>
      normalizeDaily(
        [{ symbol: "BBCA", date: "2026-09-18", close: "100" }],
        "BBCA",
      ),
    ).toThrow();
    expect(() =>
      normalizeDaily(
        [{ symbol: "TLKM", date: "2026-09-18", close: 100 }],
        "BBCA",
      ),
    ).toThrow();
  });
  it("sorts deduplicates and omits null volume without inventing observations", () => {
    expect(
      normalizeDaily(
        [
          { symbol: "BBCA.JK", date: "2026-09-18", close: 100, volume: null },
          { symbol: "BBCA", date: "2026-09-17", close: 98, volume: 0 },
          { symbol: "BBCA", date: "2026-09-18", close: 101 },
        ],
        "BBCA",
      ),
    ).toEqual([
      { date: "2026-09-17", close: 98, volume: 0 },
      { date: "2026-09-18", close: 101 },
    ]);
  });
  it("creates inclusive non-overlapping 90 calendar day windows", () => {
    expect(dateChunks("2026-01-01", "2026-04-01")).toEqual([
      { start: "2026-01-01", end: "2026-03-31" },
      { start: "2026-04-01", end: "2026-04-01" },
    ]);
    expect(() => dateChunks("2026-02-30", "2026-04-01")).toThrow();
  });
});

describe("Sectors HTTP boundary", () => {
  afterEach(() => vi.useRealTimers());
  const cache = () => {
    const data = new Map<string, unknown>();
    return {
      get: async <T>(key: string) => (data.get(key) as T) ?? null,
      set: async (key: string, value: unknown) => {
        data.set(key, value);
      },
    };
  };
  it("retains the actual report retrieval time across a later cache hit", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-18T08:00:00.000Z"));
    const request = vi.fn(async () => Response.json(report));
    const client = new SectorsClient({
      apiKey: "key",
      request,
      cache: cache(),
    });
    const first = await client.reportWithMetadata("BBCA");
    vi.setSystemTime(new Date("2026-09-18T13:55:00.000Z"));
    const cached = await client.reportWithMetadata("BBCA");
    expect(first.fetchedAt).toBe("2026-09-18T08:00:00.000Z");
    expect(cached.fetchedAt).toBe("2026-09-18T08:00:00.000Z");
    expect(cached.raw.symbol).toBe("BBCA.JK");
    expect(await client.report("BBCA")).toEqual(report);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("uses the oldest chunk retrieval time when cached and fresh daily history are combined", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-18T08:00:00.000Z"));
    const request = vi.fn(async (url: string | URL | Request) => {
      const date = new URL(String(url)).searchParams.get("start")!;
      return Response.json([{ symbol: "BBCA.JK", date, close: 100 }]);
    });
    const client = new SectorsClient({
      apiKey: "key",
      request,
      cache: cache(),
    });
    await client.daily("BBCA", "2026-01-01", "2026-03-31");
    vi.setSystemTime(new Date("2026-09-18T13:55:00.000Z"));
    const result = await client.daily("BBCA", "2026-01-01", "2026-04-01");
    expect(result.fetchedAt).toBe("2026-09-18T08:00:00.000Z");
    expect(result.chunks).toEqual([
      {
        start: "2026-01-01",
        end: "2026-03-31",
        fetchedAt: "2026-09-18T08:00:00.000Z",
      },
      {
        start: "2026-04-01",
        end: "2026-04-01",
        fetchedAt: "2026-09-18T13:55:00.000Z",
      },
    ]);
    expect(result.history).toHaveLength(2);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([
    report,
    { raw: report, fetchedAt: "not-a-date" },
    { raw: report, fetchedAt: "2026-09-19T08:00:00.000Z" },
    { raw: report, fetchedAt: "2026-09-17T08:00:00.000Z" },
    {
      raw: { ...report, symbol: "TLKM" },
      fetchedAt: "2026-09-18T07:00:00.000Z",
    },
  ])(
    "refetches cached data with missing or invalid source provenance %#",
    async (cached) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-09-18T08:00:00.000Z"));
      const request = vi.fn(async () => Response.json(report));
      const client = new SectorsClient({
        apiKey: "key",
        request,
        cache: { get: async <T>() => cached as T, set: async () => {} },
      });
      const result = await client.reportWithMetadata("BBCA");
      expect(result.raw.symbol).toBe("BBCA.JK");
      expect(result.fetchedAt).toBe("2026-09-18T08:00:00.000Z");
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
  it("fails bad credentials without retry or response body leakage", async () => {
    const request = vi.fn(
      async () => new Response("private-api-key", { status: 401 }),
    );
    const client = new SectorsClient({
      apiKey: "private-api-key",
      request,
      cache: cache(),
    });
    await expect(client.report("BBCA")).rejects.toThrow("credentials");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("retries transient failures then caches validated responses", async () => {
    let attempts = 0;
    const request = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("Authorization")).toBe(
          "test-key",
        );
        attempts += 1;
        return attempts < 3
          ? new Response("limited", { status: 429 })
          : Response.json(report);
      },
    );
    const client = new SectorsClient({
      apiKey: "test-key",
      request,
      cache: cache(),
      sleep: async () => {},
    });
    expect((await client.report("BBCA")).symbol).toBe("BBCA.JK");
    await client.report("BBCA");
    expect(request).toHaveBeenCalledTimes(3);
  });
  it("never caches invalid response schemas and bounds retries", async () => {
    const request = vi.fn(async () => Response.json({ wrong: true }));
    const client = new SectorsClient({
      apiKey: "key",
      request,
      cache: cache(),
      sleep: async () => {},
    });
    await expect(client.report("BBCA")).rejects.toThrow();
    await expect(client.report("BBCA")).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(2);
    const failing = vi.fn(
      async () => new Response("private details", { status: 503 }),
    );
    await expect(
      new SectorsClient({
        apiKey: "key",
        request: failing,
        cache: cache(),
        sleep: async () => {},
      }).report("BBCA"),
    ).rejects.toThrow("unavailable");
    expect(failing).toHaveBeenCalledTimes(3);
  });
});
