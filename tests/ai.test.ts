import { afterEach, describe, expect, it, vi } from "vitest";
import type { StockAnalysis } from "@/lib/analytics/types";
import { buildExplanationContext } from "@/lib/ai/context";
import { deterministicBrief } from "@/lib/ai/fallback";
import { validateBrief } from "@/lib/ai/validate";
import { createExplanationService } from "@/lib/ai/explain-stock";
import { stockResearchBriefSchema } from "@/lib/ai/schemas";
import { analyzeUniverse } from "@/lib/analytics/engine";
import { fixtureInputs } from "@/lib/data/fixtures";

const analysis: StockAnalysis = {
  input: {
    ticker: "TEST",
    name: "Test Company",
    sector: "Finance",
    subsector: null,
    industry: null,
    fundamentals: { roe: 0.2 },
    financialYear: 2025,
    valuationYear: null,
    history: [],
    fetchedAt: "2026-09-18T10:00:00Z",
    source: "fixture",
  },
  signal: {
    score: 70,
    coverage: 0.8,
    reason: null,
    weights: { quality: 20, growth: 20, valuation: 20, momentum: 20, risk: 20 },
    factors: {
      quality: {
        score: 90,
        coverage: 1,
        metrics: [
          {
            key: "roe",
            label: "ROE",
            value: 0.2,
            score: 90,
            weight: 1,
            peerGroup: "Finance",
            peerCount: 10,
            inverse: false,
          },
        ],
      },
      growth: { score: 60, coverage: 1, metrics: [] },
      valuation: { score: 40, coverage: 1, metrics: [] },
      momentum: { score: 70, coverage: 1, metrics: [] },
      risk: { score: null, coverage: 0, metrics: [] },
    },
  },
  anomaly: {
    score: 65,
    coverage: 0.3,
    label: "Elevated",
    primaryTrigger: "Volume",
    reason: null,
    components: [
      {
        key: "volume",
        label: "Volume",
        score: 65,
        zScore: 2.6,
        current: 360,
        mean: 100,
        std: 100,
        percentDifference: 260,
        observations: 20,
        direction: "positive",
        weight: 0.3,
      },
    ],
  },
  findings: ["Quality is the strongest measured factor."],
  asOf: "2026-09-18",
  calculatedAt: "2026-09-18T11:00:00Z",
  version: "test-v1",
  change: null,
};

const memory = () => {
  const values = new Map<string, { value: unknown; expires: number }>();
  return {
    get: async <T>(key: string): Promise<T | null> => {
      const hit = values.get(key);
      return hit && hit.expires > Date.now() ? (hit.value as T) : null;
    },
    set: async (key: string, value: unknown, ttl: number) => {
      values.set(key, { value, expires: Date.now() + ttl });
    },
  };
};
const good = () => deterministicBrief(buildExplanationContext(analysis));
afterEach(() => {
  vi.useRealTimers();
});

describe("grounded brief", () => {
  it("preserves unknown metrics and source and excludes raw history", () => {
    const context = buildExplanationContext(analysis);
    expect(context.signal.factors.risk.score).toBeNull();
    expect(context.company.source).toBe("fixture");
    expect(JSON.stringify(context)).not.toContain('"history"');
    expect(context.facts).toContain("Signal Score: 70");
  });
  it("provides specific factor and anomaly evidence without a provider", () => {
    const brief = good();
    expect(brief.strengths[0].metricReferences).toContain("Quality score: 90");
    expect(
      brief.watchItems.some((item) =>
        item.metricReferences.includes("Valuation score: 40"),
      ),
    ).toBe(true);
    expect(brief.anomalyDrivers[0].explanation).toContain(
      "Volume Z-score: 2.6",
    );
    expect(brief.dataLimitations.join(" ")).toMatch(/fixture/i);
    expect(validateBrief(brief, buildExplanationContext(analysis))).toEqual(
      brief,
    );
  });
  it.each([
    "Signal Score: 99",
    "Signal Score: 65",
    "Quality score: 70",
    "Signal Score: 70 million",
    "Signal Score is ninety nine",
    "The price will definitely rise.",
    "You should buy TEST now.",
    "We assign a HOLD rating.",
    "The company announced an acquisition.",
    "Strong earnings caused the price movement.",
    "The price increased because the company reported strong earnings.",
  ])("rejects unsupported claim: %s", (claim) => {
    expect(() =>
      validateBrief(
        { ...good(), summary: claim },
        buildExplanationContext(analysis),
      ),
    ).toThrow();
  });
  it("rejects nonexistent references even without numbers", () => {
    const brief = good();
    brief.strengths[0].metricReferences = ["Cash flow quality"];
    expect(() =>
      validateBrief(brief, buildExplanationContext(analysis)),
    ).toThrow();
  });
  it("permits neutral caution about missing causal evidence", () => {
    expect(() =>
      validateBrief(
        {
          ...good(),
          closingNote:
            "The supplied metrics do not establish a cause for price movement.",
        },
        buildExplanationContext(analysis),
      ),
    ).not.toThrow();
  });
  it("permits a punctuation comma after a canonical value", () => {
    expect(() =>
      validateBrief(
        { ...good(), summary: "Signal Score: 70, while Anomaly Score: 65." },
        buildExplanationContext(analysis),
      ),
    ).not.toThrow();
  });
  it("permits a known metric horizon in qualitative prose", () => {
    const input = structuredClone(analysis);
    input.signal.factors.momentum.metrics = [
      {
        key: "return30",
        label: "30D price return",
        value: 0.05,
        score: 70,
        weight: 1,
        peerGroup: "Finance",
        peerCount: 10,
        inverse: false,
      },
    ];
    expect(() =>
      validateBrief(
        {
          ...good(),
          closingNote:
            "Review the supplied 30D price return alongside coverage.",
        },
        buildExplanationContext(input),
      ),
    ).not.toThrow();
  });
  it("permits neutral statements that corporate-event evidence is unavailable", () => {
    expect(() =>
      validateBrief(
        {
          ...good(),
          closingNote:
            "No acquisition news was provided; the data does not establish a cause.",
        },
        buildExplanationContext(analysis),
      ),
    ).not.toThrow();
  });
  it("provides schema-valid fallback briefs across the actual fixture universe and stale history", () => {
    for (const at of ["2026-09-18T12:00:00Z", "2026-12-18T12:00:00Z"]) {
      const universe = analyzeUniverse(fixtureInputs(), at);
      for (const stock of universe) {
        const brief = deterministicBrief(buildExplanationContext(stock));
        expect(stockResearchBriefSchema.safeParse(brief).success).toBe(true);
        expect(brief.summary).not.toMatch(/NaN|undefined/);
      }
    }
  });
});

describe("explanation service", () => {
  it("works without an API key", async () => {
    const service = createExplanationService({
      cache: memory(),
      apiKey: "",
      model: "",
    });
    expect(await service(analysis)).toMatchObject({
      provider: "deterministic",
      model: null,
      cached: false,
      reason: "not_configured",
    });
  });
  it("requires an explicit model when a key exists", async () => {
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "",
    });
    expect(await service(analysis)).toMatchObject({
      provider: "deterministic",
      reason: "model_not_configured",
    });
  });
  it("caches successes and coalesces concurrent identical requests", async () => {
    let calls = 0;
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "test-model",
      provider: {
        explainStock: async () => {
          calls++;
          return good();
        },
      },
    });
    const results = await Promise.all([service(analysis), service(analysis)]);
    expect(results.every((result) => result.provider === "gemini")).toBe(true);
    expect(calls).toBe(1);
    expect((await service(analysis)).cached).toBe(true);
    await service({
      ...analysis,
      findings: [...analysis.findings, "Updated finding"],
    });
    expect(calls).toBe(2);
  });
  it("retries invalid output only once then uses a valid fallback", async () => {
    let calls = 0;
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "test-model",
      provider: {
        explainStock: async () => {
          calls++;
          return { ...good(), summary: "Signal Score: 999" };
        },
      },
    });
    const result = await service(analysis);
    expect(result).toMatchObject({
      provider: "deterministic",
      reason: "invalid_output",
    });
    expect(calls).toBe(2);
    expect(result.brief.summary).not.toContain("999");
  });
  it("recovers after a schema-invalid first response", async () => {
    let calls = 0;
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "test-model",
      provider: {
        explainStock: async () =>
          ++calls === 1 ? { summary: "incomplete" } : good(),
      },
    });
    expect((await service(analysis)).provider).toBe("gemini");
    expect(calls).toBe(2);
  });
  it("does not retry quota failures and allows recovery after fallback expiry", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "test-model",
      provider: {
        explainStock: async () => {
          if (++calls === 1)
            throw Object.assign(new Error("secret error"), { status: 429 });
          return good();
        },
      },
    });
    const failure = await service(analysis);
    expect(failure).toMatchObject({
      provider: "deterministic",
      reason: "quota_exceeded",
    });
    expect(JSON.stringify(failure)).not.toContain("secret error");
    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(61_000);
    expect((await service(analysis)).provider).toBe("gemini");
  });
  it("aborts an underlying stalled provider request on timeout", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "test-model",
      timeoutMs: 20,
      provider: {
        explainStock: async (_context, options) =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener("abort", () => {
              aborted = true;
              reject(new Error("abort"));
            }),
          ),
      },
    });
    const promise = service(analysis);
    await vi.advanceTimersByTimeAsync(21);
    expect(await promise).toMatchObject({
      provider: "deterministic",
      reason: "timeout",
    });
    expect(aborted).toBe(true);
  });
  it("bounds provider calls across distinct ticker contexts", async () => {
    let calls = 0;
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "test-model",
      callsPerMinute: 1,
      provider: {
        explainStock: async () => {
          calls++;
          return good();
        },
      },
    });
    await service(analysis);
    expect(await service({ ...analysis, findings: ["Changed"] })).toMatchObject(
      { provider: "deterministic", reason: "rate_limited" },
    );
    expect(calls).toBe(1);
  });
  it("reads a cached brief without spending a provider call", async () => {
    let calls = 0;
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "test-model",
      provider: {
        explainStock: async () => {
          calls++;
          return good();
        },
      },
    });
    expect(await service.getCachedBrief(analysis)).toBeNull();
    expect(calls).toBe(0);
    await service(analysis);
    expect(await service.getCachedBrief(analysis)).toMatchObject({
      provider: "gemini",
      model: "test-model",
      cached: true,
    });
    expect(calls).toBe(1);
  });
  it("does not render malformed or numerically invalid cached data", async () => {
    const cache = {
      get: async <T>() =>
        ({
          provider: "gemini",
          model: "test-model",
          cached: false,
          generatedAt: "2026-09-18T10:00:00Z",
          brief: { ...good(), summary: "Signal Score: 99" },
        }) as T,
      set: async () => {},
    };
    const service = createExplanationService({
      cache,
      apiKey: "test",
      model: "test-model",
      provider: { explainStock: async () => good() },
    });
    expect(await service.getCachedBrief(analysis)).toBeNull();
    expect((await service(analysis)).brief.summary).not.toContain("99");
  });
  it("invalidates by source, analytics version and model while sharing storage", async () => {
    const cache = memory();
    let calls = 0;
    const provider = {
      explainStock: async () => {
        calls++;
        return good();
      },
    };
    const service = createExplanationService({
      cache,
      apiKey: "test",
      model: "test-model",
      provider,
    });
    await service(analysis);
    await service({ ...analysis, version: "next-version" });
    await service({
      ...analysis,
      input: { ...analysis.input, source: "sectors" },
    });
    const changedModel = createExplanationService({
      cache,
      apiKey: "test",
      model: "next-model",
      provider,
    });
    await changedModel(analysis);
    expect(calls).toBe(4);
  });
  it("expires successful briefs after a day", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const service = createExplanationService({
      cache: memory(),
      apiKey: "test",
      model: "test-model",
      provider: {
        explainStock: async () => {
          calls++;
          return good();
        },
      },
    });
    await service(analysis);
    await vi.advanceTimersByTimeAsync(23 * 60 * 60 * 1000);
    expect((await service(analysis)).cached).toBe(true);
    await vi.advanceTimersByTimeAsync(61 * 60 * 1000);
    expect((await service(analysis)).cached).toBe(false);
    expect(calls).toBe(2);
  });
});
