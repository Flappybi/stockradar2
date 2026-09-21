import { describe, expect, it, vi } from "vitest";
import type { GenerateContentParameters } from "@google/genai";
import { GeminiExplanationProvider } from "@/lib/ai/gemini";
import type { StockExplanationContext } from "@/lib/ai/context";

const sdk = vi.hoisted(() => ({
  generateContent: vi.fn(),
  options: {} as Record<string, unknown>,
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options: Record<string, unknown>) {
      sdk.options = options;
    }
    models = { generateContent: sdk.generateContent };
  },
}));
const context: StockExplanationContext = {
  company: {
    ticker: "TEST",
    name: "Test",
    sector: null,
    source: "fixture",
    asOf: null,
    fetchedAt: "2026-09-18",
    reportFetchedAt: "2026-09-18",
    marketFetchedAt: "2026-09-18",
    financialYear: null,
    valuationYear: null,
  },
  signal: {
    score: null,
    coverage: 0,
    reason: "No data",
    weights: { quality: 20, growth: 20, valuation: 20, momentum: 20, risk: 20 },
    factors: {
      quality: { score: null, coverage: 0, metrics: [] },
      growth: { score: null, coverage: 0, metrics: [] },
      valuation: { score: null, coverage: 0, metrics: [] },
      momentum: { score: null, coverage: 0, metrics: [] },
      risk: { score: null, coverage: 0, metrics: [] },
    },
  },
  anomaly: {
    score: null,
    coverage: 0,
    label: "Unavailable",
    primaryTrigger: "Unavailable",
    reason: "No history",
    components: [],
  },
  deterministicFindings: [],
  facts: [],
  analyticsVersion: "test",
};

describe("Gemini SDK boundary", () => {
  it("sends strict JSON schema, configured model and abort signal without tools or retries", async () => {
    sdk.generateContent.mockResolvedValueOnce({
      text: '{"summary":"response"}',
    });
    const provider = new GeminiExplanationProvider(
      "test-key",
      "configured-model",
    );
    const controller = new AbortController();
    expect(
      await provider.explainStock(context, {
        signal: controller.signal,
        retry: false,
      }),
    ).toEqual({ summary: "response" });
    const request = sdk.generateContent.mock
      .lastCall![0] as GenerateContentParameters;
    expect(request.model).toBe("configured-model");
    expect(JSON.parse(request.contents as string).company.source).toBe(
      "fixture",
    );
    expect(request.config?.abortSignal).toBe(controller.signal);
    expect(request.config?.responseMimeType).toBe("application/json");
    expect(request.config?.responseJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: expect.arrayContaining([
        "summary",
        "watchItems",
        "anomalyDrivers",
      ]),
    });
    expect(request.config?.tools).toBeUndefined();
    expect(sdk.options).toMatchObject({
      httpOptions: { retryOptions: { attempts: 1 } },
    });
  });
  it("classifies invalid provider JSON as retryable invalid output", async () => {
    sdk.generateContent.mockResolvedValueOnce({ text: "not JSON" });
    const provider = new GeminiExplanationProvider(
      "test-key",
      "configured-model",
    );
    await expect(
      provider.explainStock(context, {
        signal: new AbortController().signal,
        retry: true,
      }),
    ).rejects.toMatchObject({ name: "InvalidBriefError" });
  });
});
