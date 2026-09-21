import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeUniverse } from "@/lib/analytics/engine";
import { fixtureInputs, FIXTURE_FETCHED_AT } from "@/lib/data/fixtures";
import type { Dataset } from "@/lib/analytics/types";
const database = vi.hoisted(() => ({
  readSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
  saveAnalysisSnapshot: vi.fn(),
}));
vi.mock("@/lib/db/queries", () => database);
const refreshStatus = vi.hoisted(() => ({ get: vi.fn(async () => false) }));
vi.mock("@/lib/cache/store", () => ({
  getCache: refreshStatus.get,
  setCache: async () => {},
}));
import { getDataset, refreshDataset } from "@/lib/data/service";

function snapshot(): Dataset {
  return {
    stocks: analyzeUniverse(
      fixtureInputs().map((input) => ({ ...input, source: "sectors" })),
      FIXTURE_FETCHED_AT,
    ),
    source: "sectors",
    fetchedAt: FIXTURE_FETCHED_AT,
    stale: false,
    warnings: [],
  };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("saved live snapshots", () => {
  function configure() {
    vi.stubEnv("DATA_MODE", "sectors");
    vi.stubEnv("SECTORS_API_KEY", "test-key");
    vi.stubEnv("SECTORS_TICKERS", "BBCA");
    vi.stubEnv("DATABASE_URL", "postgres://not-used");
  }
  it("preserves original timestamps and marks an expired snapshot stale", async () => {
    configure();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T00:00:00.000Z"));
    database.readSnapshot.mockResolvedValue(snapshot());
    const result = await getDataset();
    expect(result.stale).toBe(true);
    expect(result.fetchedAt).toBe(FIXTURE_FETCHED_AT);
    expect(result.warnings.join(" ")).toContain("last complete");
    expect(result.stocks[0].calculatedAt).toBe(FIXTURE_FETCHED_AT);
  });
  it("bases freshness on actual source retrieval, not a recent ingestion timestamp", async () => {
    configure();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-18T14:01:00.000Z"));
    const data = snapshot();
    data.fetchedAt = "2026-09-18T13:55:00.000Z";
    for (const s of data.stocks) {
      s.input.fetchedAt = data.fetchedAt;
      s.input.marketFetchedAt = "2026-09-18T08:00:00.000Z";
      s.input.reportFetchedAt = "2026-09-18T07:00:00.000Z";
    }
    database.readSnapshot.mockResolvedValue(data);
    expect((await getDataset()).stale).toBe(true);
    expect(refreshStatus.get).toHaveBeenCalledWith(
      expect.stringContaining("refresh-failed:"),
      { authoritative: true },
    );
    data.stocks.forEach((s) => {
      s.input.marketFetchedAt = "2026-09-18T13:55:00.000Z";
    });
    expect((await getDataset()).stale).toBe(false);
  });
  it("uses the process-held complete snapshot visibly when the database becomes unavailable", async () => {
    configure();
    database.readSnapshot
      .mockResolvedValueOnce(snapshot())
      .mockRejectedValueOnce(new Error("private connection string"));
    await getDataset();
    const result = await getDataset();
    expect(result.stale).toBe(true);
    expect(result.stocks).toHaveLength(15);
    expect(result.warnings.join(" ")).toContain("Database unavailable");
    expect(JSON.stringify(result)).not.toContain("private connection string");
  });
  it("withholds aged market scores on read without relabeling source retrieval or writing a snapshot", async () => {
    configure();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00.000Z"));
    const original = snapshot();
    database.readSnapshot.mockResolvedValue(original);
    database.saveAnalysisSnapshot.mockClear();
    const result = await getDataset();
    expect(result.stocks.every((s) => s.anomaly.score === null)).toBe(true);
    expect(
      result.stocks.every(
        (s) =>
          s.signal.factors.momentum.score === null &&
          s.signal.factors.risk.score === null,
      ),
    ).toBe(true);
    expect(result.stocks[0].signal.factors.quality).toEqual(
      original.stocks[0].signal.factors.quality,
    );
    expect(result.fetchedAt).toBe(FIXTURE_FETCHED_AT);
    expect(result.stocks[0].input.fetchedAt).toBe(FIXTURE_FETCHED_AT);
    expect(result.stocks[0].calculatedAt).toBe("2026-09-26T00:00:00.000Z");
    expect(original.stocks[0].anomaly.score).not.toBeNull();
    expect(database.saveAnalysisSnapshot).not.toHaveBeenCalled();
  });
  it("retains the complete old universe after rejected live credentials and never publishes a partial universe", async () => {
    configure();
    database.readSnapshot.mockResolvedValue(snapshot());
    database.saveSnapshot.mockClear();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("private provider detail", { status: 401 }),
    );
    const result = await refreshDataset();
    expect(result.stale).toBe(true);
    expect(result.fetchedAt).toBe(FIXTURE_FETCHED_AT);
    expect(result.stocks).toHaveLength(15);
    expect(database.saveSnapshot).not.toHaveBeenCalled();
    expect(result.warnings.join(" ")).toContain("Latest ingestion failed");
  });
});
