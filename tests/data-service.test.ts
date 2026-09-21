import { afterEach, describe, expect, it, vi } from "vitest";
import { getDataset, refreshDataset } from "@/lib/data/service";
import { datasetSchema } from "@/lib/data/validation";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("data service boundaries", () => {
  it("serves explicitly labeled deterministic fixture analysis without external services", async () => {
    vi.stubEnv("DATA_MODE", "fixture");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("SECTORS_API_KEY", "");
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    const result = await getDataset();
    expect(result.source).toBe("fixture");
    expect(result.stocks).toHaveLength(15);
    expect(result.fetchedAt).toBe("2026-09-18T10:00:00.000Z");
    expect(result.warnings.join(" ")).toMatch(/synthetic/i);
    expect(
      result.stocks.every(
        (stock) => stock.signal.score !== null && stock.anomaly.score !== null,
      ),
    ).toBe(true);
    expect(datasetSchema.safeParse(result).success).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
  it("defaults to live mode and never silently substitutes fixtures", async () => {
    vi.stubEnv("DATA_MODE", "");
    vi.stubEnv("SECTORS_API_KEY", "");
    await expect(getDataset()).rejects.toThrow("SECTORS_API_KEY");
  });
  it("does not start expensive ingestion on a user read when no snapshot exists", async () => {
    vi.stubEnv("DATA_MODE", "sectors");
    vi.stubEnv("SECTORS_API_KEY", "test-key");
    vi.stubEnv("DATABASE_URL", "");
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    await expect(getDataset()).rejects.toThrow("ingest");
    expect(request).not.toHaveBeenCalled();
  });
  it("requires durable storage before live ingestion can consume API quota", async () => {
    vi.stubEnv("DATA_MODE", "sectors");
    vi.stubEnv("SECTORS_API_KEY", "test-key");
    vi.stubEnv("DATABASE_URL", "");
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    await expect(refreshDataset()).rejects.toThrow("DATABASE_URL");
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects unexpected data modes and ticker input before IO", async () => {
    vi.stubEnv("DATA_MODE", "fake-live");
    await expect(getDataset()).rejects.toThrow("DATA_MODE");
    vi.stubEnv("DATA_MODE", "sectors");
    vi.stubEnv("SECTORS_API_KEY", "key");
    vi.stubEnv("SECTORS_TICKERS", "BBCA,../private");
    await expect(getDataset()).rejects.toThrow("SECTORS_TICKERS");
  });
});
