import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureInputs } from "@/lib/data/fixtures";
import { getCache, setCache } from "@/lib/cache/store";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("deterministic synthetic data", () => {
  it("provides three viable peer groups, full annual history and all five factors", () => {
    const inputs = fixtureInputs();
    expect(inputs).toHaveLength(15);
    expect(inputs).toEqual(fixtureInputs());
    expect([...new Set(inputs.map((row) => row.sector))]).toHaveLength(3);
    for (const row of inputs) {
      expect(inputs.filter((peer) => peer.sector === row.sector)).toHaveLength(
        5,
      );
      expect(row.source).toBe("fixture");
      expect(row.fetchedAt).toBe("2026-09-18T10:00:00.000Z");
      expect(row.history.length).toBeGreaterThan(260);
      expect(row.history.at(-1)?.date).toBe("2026-09-18");
      expect(row.history[0].date < "2025-09-18").toBe(true);
      expect(Object.keys(row.fundamentals)).toHaveLength(9);
    }
  });
});
describe("cache", () => {
  it("expires responses and prevents reference mutation", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.useFakeTimers();
    await setCache("ttl-test", { n: 7 }, 1_000);
    const value = await getCache<{ n: number }>("ttl-test");
    expect(value?.n).toBe(7);
    value!.n = 0;
    expect(await getCache("ttl-test")).toEqual({ n: 7 });
    vi.advanceTimersByTime(1_001);
    expect(await getCache("ttl-test")).toBeNull();
  });
});
