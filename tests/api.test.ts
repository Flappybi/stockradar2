import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/data/service", () => ({
  getDataset: vi.fn(async () => ({
    stocks: [],
    source: "fixture",
    fetchedAt: "2026-09-18",
    stale: false,
    warnings: [],
  })),
}));
vi.mock("@/lib/ai/explain-stock", () => ({ explainStock: vi.fn() }));
import { POST } from "@/app/api/explanation/route";
import { GET } from "@/app/api/stocks/route";
import { getDataset } from "@/lib/data/service";
beforeEach(() => vi.clearAllMocks());
describe("public API boundaries", () => {
  it("rejects arbitrary financial context and invalid ticker", async () => {
    for (const body of [
      { ticker: "../../secret" },
      { ticker: "BBCA", context: { score: 99 } },
    ]) {
      const r = await POST(
        new Request("http://localhost:3000/api/explanation", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      expect(r.status).toBe(400);
    }
  });
  it("rejects cross-origin requests", async () => {
    const r = await POST(
      new Request("http://localhost:3000/api/explanation", {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: JSON.stringify({ ticker: "BBCA" }),
      }),
    );
    expect(r.status).toBe(403);
  });
  it("returns safe unavailable errors without secret leakage", async () => {
    vi.mocked(getDataset).mockRejectedValueOnce(new Error("secret-key"));
    const r = await GET();
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("secret-key");
  });
  it("uses the server universe and returns 404 for uncovered tickers", async () => {
    const r = await POST(
      new Request("http://localhost:3000/api/explanation", {
        method: "POST",
        body: JSON.stringify({ ticker: "ZZZZ" }),
      }),
    );
    expect(r.status).toBe(404);
  });
});
