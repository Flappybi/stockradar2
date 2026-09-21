import { afterAll, describe, expect, it, vi } from "vitest";
import {
  percentile,
  winsorize,
  zScore,
  anomalyTransform,
  sampleStd,
} from "@/lib/analytics/math";
import {
  combineFactors,
  analyzeUniverse,
  PRESETS,
} from "@/lib/analytics/engine";
import type { FactorResult, StockInput } from "@/lib/analytics/types";

// Keep default-timestamp tests reproducible after the fixed historical fixture ages.
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-09-21T00:00:00Z"));
afterAll(() => vi.useRealTimers());

describe("percentiles and robust numeric primitives", () => {
  it("ranks endpoints and ties symmetrically", () => {
    expect(percentile(1, [1, 2, 3])).toBe(0);
    expect(percentile(3, [1, 2, 3])).toBe(100);
    expect(percentile(2, [1, 2, 2, 3])).toBe(50);
    expect(percentile(2, [1, 2, 3], true)).toBe(50);
    expect(percentile(7, [7])).toBeNull();
    expect(percentile(null, [1, 2])).toBeNull();
    expect(percentile(7, [7, 7, 7])).toBe(50);
    expect(percentile(1, [1, 2, 3], true)).toBe(100);
  });
  it("winsorizes both tails without mutating the source", () => {
    const x = [-100, 0, 1, 2, 100];
    expect(winsorize(x, 0.25, 0.75)).toEqual([0, 0, 1, 2, 2]);
    expect(x[0]).toBe(-100);
    expect(winsorize([5], 0.025, 0.975)).toEqual([5]);
  });
  it("computes sample deviation and excludes insufficient or invalid baselines", () => {
    expect(sampleStd([1, 2, 3])).toBe(1);
    expect(zScore(4, [1, 2, 3], 3)).toBe(2);
    expect(zScore(0, [1, 2, 3], 3)).toBe(-2);
    expect(zScore(7, [7, 7, 7], 3)).toBeNull();
    expect(zScore(4, [1, 2], 3)).toBeNull();
    expect(zScore(Infinity, [1, 2, 3], 3)).toBeNull();
    expect(anomalyTransform(0)).toBe(0);
    expect(anomalyTransform(-4)).toBe(anomalyTransform(4));
    expect(anomalyTransform(99)).toBeLessThanOrEqual(100);
  });
});
describe("Signal weighting", () => {
  const f = (score: number | null, coverage = 1): FactorResult => ({
    score,
    coverage,
    metrics: [],
  });
  const factors = {
    quality: f(100),
    growth: f(80),
    valuation: f(60),
    momentum: f(40),
    risk: f(20),
  };
  it("uses default and custom weights with no rounding", () => {
    expect(combineFactors(factors, PRESETS.Balanced).score).toBe(67);
    expect(combineFactors(factors, PRESETS.Growth).score).toBe(68);
  });
  it("renormalizes unavailable factors and measures original coverage", () => {
    const r = combineFactors(
      { ...factors, quality: f(null, 0) },
      PRESETS.Balanced,
    );
    expect(r.coverage).toBe(0.75);
    expect(r.score).toBeCloseTo(42 / 0.75);
  });
  it("withholds below sixty percent instead of scoring missing data as zero", () => {
    expect(
      combineFactors(
        { ...factors, quality: f(null, 0), growth: f(null, 0) },
        PRESETS.Balanced,
      ).score,
    ).toBeNull();
  });
  it("rejects invalid weight totals and negative weights", () => {
    expect(() =>
      combineFactors(factors, { ...PRESETS.Balanced, risk: 0 }),
    ).toThrow();
    expect(() =>
      combineFactors(factors, { ...PRESETS.Balanced, risk: -10, quality: 45 }),
    ).toThrow();
  });
  it("retains 0 and 100 boundaries", () => {
    for (const n of [0, 100])
      expect(
        combineFactors(
          {
            quality: f(n),
            growth: f(n),
            valuation: f(n),
            momentum: f(n),
            risk: f(n),
          },
          PRESETS.Balanced,
        ).score,
      ).toBe(n);
  });
});
function stock(i: number): StockInput {
  let close = 100;
  return {
    ticker: `TST${String.fromCharCode(65 + i)}`,
    name: `Test ${i}`,
    sector: "Test",
    subsector: null,
    industry: null,
    financialYear: 2025,
    valuationYear: 2025,
    source: "fixture",
    fetchedAt: "2026-09-18T00:00:00Z",
    fundamentals: {
      roe: 0.1 + i * 0.02,
      roa: 0.03 + i * 0.005,
      netMargin: 0.1 + i * 0.01,
      debtToEquity: 1,
      revenueGrowth: 0.1,
      earningsGrowth: 0.2,
      pe: 10 + i,
      pb: 1 + i * 0.1,
      dividendYield: 0.03,
    },
    history: Array.from({ length: 300 }, (_, j) => {
      close *= 1 + 0.001 + Math.sin(j * 0.7 + i) * 0.01;
      return {
        date: new Date(Date.UTC(2025, 10, 23 + j)).toISOString().slice(0, 10),
        close,
        volume: 1000 + Math.sin(j + i) * 100,
      };
    }),
  };
}
describe("end-to-end deterministic analytics", () => {
  it("preserves anomaly direction, bounds, original evidence and separates scores", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => stock(i));
    inputs[0].history.at(-1)!.volume = 9000;
    inputs[0].history.at(-1)!.close *= 0.8;
    const a = analyzeUniverse(inputs, "2026-09-20T00:00:00Z")[0];
    expect(
      a.anomaly.components.find((c) => c.key === "volume")!.zScore,
    ).toBeGreaterThan(10);
    expect(a.anomaly.components.find((c) => c.key === "price")!.direction).toBe(
      "negative",
    );
    expect(a.anomaly.score).toBeGreaterThanOrEqual(0);
    expect(a.anomaly.score).toBeLessThanOrEqual(100);
    expect(a.signal.score).not.toBe(a.anomaly.score);
    expect(
      a.anomaly.components.find((c) => c.key === "sectorDivergence")!.score,
    ).not.toBeNull();
    expect(analyzeUniverse(inputs, "2026-09-20T00:00:00Z")).toEqual(
      analyzeUniverse(inputs, "2026-09-20T00:00:00Z"),
    );
  });
  it("does not rank a negative multiple as cheap or fabricate short history", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => stock(i));
    inputs[0].fundamentals.pe = -5;
    inputs[0].history = inputs[0].history.slice(0, 5);
    const a = analyzeUniverse(inputs)[0];
    expect(
      a.signal.factors.valuation.metrics.find((m) => m.key === "pe")!.score,
    ).toBeNull();
    expect(a.anomaly.score).toBeNull();
  });
  it("never invents scores for an uncovered singleton", () => {
    const s = stock(0);
    s.fundamentals = {};
    s.history = [];
    const a = analyzeUniverse([s])[0];
    expect(a.signal.score).toBeNull();
    expect(a.anomaly.score).toBeNull();
    expect(JSON.stringify(a)).not.toContain("NaN");
  });
});

describe("coverage, peers and temporal integrity", () => {
  it("counts missing metric weights before renormalization", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => stock(i));
    delete inputs[0].fundamentals.roe;
    const a = analyzeUniverse(inputs, "2026-09-20T00:00:00Z")[0];
    expect(a.signal.factors.quality.coverage).toBeCloseTo(0.65);
    expect(a.signal.coverage).toBeCloseTo(
      0.25 * 0.65 + 0.25 + 0.2 + 0.2 * 0.8 + 0.1,
    );
  });
  it("omits leverage structurally for Financials", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => ({
      ...stock(i),
      sector: "Financials",
    }));
    for (const s of inputs) delete s.fundamentals.debtToEquity;
    const q = analyzeUniverse(inputs)[0].signal.factors.quality;
    expect(q.coverage).toBeCloseTo(1);
    expect(q.metrics.some((m) => m.key === "debtToEquity")).toBe(false);
  });
  it("requires five valid observations per metric and labels broader fallback", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => ({
      ...stock(i),
      subsector: i < 2 ? "Small" : "Other",
    }));
    delete inputs[0].fundamentals.roa;
    delete inputs[1].fundamentals.roa;
    const metrics = analyzeUniverse(inputs)[2].signal.factors.quality.metrics;
    expect(metrics.find((m) => m.key === "roa")!.score).toBeNull();
    expect(metrics.find((m) => m.key === "roe")!.peerGroup).toContain("Sector");
    inputs[0].sector = "Alone";
    expect(
      analyzeUniverse(inputs)[0].signal.factors.quality.metrics[0].peerGroup,
    ).toContain("Universe");
  });
  it("does not compare asynchronous daily intervals or include the subject as its own peer", () => {
    const inputs = Array.from({ length: 4 }, (_, i) => stock(i));
    inputs[3].history.pop();
    const c = analyzeUniverse(inputs)[0].anomaly.components.find(
      (c) => c.key === "sectorDivergence",
    )!;
    expect(c.score).toBeNull();
  });
  it("excludes the current volume from the historical baseline", () => {
    const s = stock(0);
    s.history = s.history.slice(-61);
    s.history.forEach(
      (p, i) => (p.volume = i === 60 ? 1000 : i % 2 === 0 ? 10 : 20),
    );
    const c = analyzeUniverse([s])[0].anomaly.components.find(
      (c) => c.key === "volume",
    )!;
    expect(c.mean).toBe(15);
    expect(c.observations).toBe(60);
    expect(c.current).toBe(1000);
  });
  it("uses calendar horizons rather than row counts", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => stock(i));
    for (const s of inputs) s.history = s.history.filter((_, i) => i % 2 === 0);
    const m = analyzeUniverse(inputs)[0].signal.factors.momentum.metrics.find(
      (m) => m.key === "return30",
    )!;
    const h = inputs[0].history;
    expect(m.value).toBeCloseTo(h.at(-1)!.close / h.at(-16)!.close - 1);
  });
  it("withholds stale market factors and anomalies", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => stock(i));
    const a = analyzeUniverse(inputs, "2026-10-20T00:00:00Z")[0];
    expect(a.signal.factors.momentum.score).toBeNull();
    expect(a.anomaly.score).toBeNull();
    expect(a.findings.join(" ")).toMatch(/stale/i);
  });
});

describe("invalid data and exact statistical semantics", () => {
  it("does not turn invalid anomaly magnitudes into zero scores", () => {
    expect(anomalyTransform(NaN)).toBeNull();
    expect(anomalyTransform(Infinity)).toBeNull();
  });
  it("preserves observed invalid valuation evidence while excluding its rank", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => stock(i));
    inputs[0].fundamentals.pe = -5;
    const m = analyzeUniverse(inputs)[0].signal.factors.valuation.metrics.find(
      (m) => m.key === "pe",
    )!;
    expect(m.value).toBe(-5);
    expect(m.score).toBeNull();
  });
  it("keeps original factor subcoverage in custom weights", () => {
    const factors = {
      quality: { score: 90, coverage: 0.5, metrics: [] },
      growth: { score: 70, coverage: 1, metrics: [] },
      valuation: { score: 50, coverage: 1, metrics: [] },
      momentum: { score: 30, coverage: 1, metrics: [] },
      risk: { score: 10, coverage: 1, metrics: [] },
    };
    const result = combineFactors(factors, PRESETS.Quality);
    expect(result.coverage).toBeCloseTo(0.775);
    expect(result.score).toBe(66);
  });
  it("does not use unsorted, duplicate or future quotes as new sessions", () => {
    const original = Array.from({ length: 6 }, (_, i) => stock(i));
    const changed = structuredClone(original);
    changed[0].history.reverse();
    changed[0].history.push(
      { ...changed[0].history[0] },
      { date: "2099-01-01", close: 1, volume: 9e8 },
    );
    const before = analyzeUniverse(original, "2026-09-20T00:00:00Z")[0],
      after = analyzeUniverse(changed, "2026-09-20T00:00:00Z")[0];
    expect(after.signal).toEqual(before.signal);
    expect(after.anomaly).toEqual(before.anomaly);
  });
  it("ignores stale anchors rather than inventing a yearly return", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => stock(i));
    for (const s of inputs)
      s.history.unshift({ date: "2024-01-01", close: 10, volume: 100 });
    expect(
      analyzeUniverse(inputs)[0].signal.factors.momentum.metrics.find(
        (m) => m.key === "return365",
      )!.score,
    ).toBeNull();
  });
  it("withholds constant baselines without infinite z scores", () => {
    const s = stock(0);
    s.history.forEach((p) => {
      p.close = 100;
      p.volume = 100;
    });
    const a = analyzeUniverse([s]);
    expect(a[0].anomaly.score).toBeNull();
    expect(a[0].anomaly.components.every((c) => c.zScore === null)).toBe(true);
    expect(JSON.stringify(a)).not.toMatch(/NaN|Infinity/);
  });
});

describe("peer normalization and sector statistics", () => {
  it("winsorizes only sufficiently populated fundamental groups while retaining raw evidence", () => {
    const inputs = Array.from({ length: 41 }, (_, i) => stock(i));
    const low = analyzeUniverse(inputs, "2026-09-20T00:00:00Z")[0].signal
      .factors.quality.metrics[0];
    expect(low.value).toBe(0.1);
    expect(low.score).toBeCloseTo(1.25);
  });
  it("computes leave-one-out sector residuals on identical date intervals", () => {
    const inputs = Array.from({ length: 4 }, (_, i) => stock(i));
    const changes = [0.1, 0.01, 0.02, 0.03];
    inputs.forEach(
      (s, i) =>
        (s.history.at(-1)!.close = s.history.at(-2)!.close * (1 + changes[i])),
    );
    const c = analyzeUniverse(inputs)[0].anomaly.components.find(
      (c) => c.key === "sectorDivergence",
    )!;
    expect(c.current).toBeCloseTo(0.08);
    expect(c.observations).toBe(60);
    expect(c.zScore).not.toBeNull();
    inputs[3].history.splice(-2, 1);
    expect(
      analyzeUniverse(inputs)[0].anomaly.components.find(
        (c) => c.key === "sectorDivergence",
      )!.score,
    ).toBeNull();
  });
  it("handles threshold labels without rounding", async () => {
    const { anomalyLabel } = await import("@/lib/analytics/anomaly");
    for (const [value, label] of [
      [0, "Normal"],
      [39.99, "Normal"],
      [40, "Watch"],
      [60, "Elevated"],
      [75, "Unusual"],
      [90, "Extreme"],
      [100, "Extreme"],
      [null, "Unavailable"],
    ] as const)
      expect(anomalyLabel(value)).toBe(label);
  });
});

describe("bounded observation windows", () => {
  it("does not backfill omitted long-gap returns from outside the prior sixty slots", () => {
    const s = stock(0);
    s.history.splice(250, 10);
    const c = analyzeUniverse(
      [s],
      "2026-09-21T00:00:00Z",
    )[0].anomaly.components.find((c) => c.key === "price")!;
    expect(c.observations).toBe(59);
  });
  it("keeps a September 18 fixture fresh on September 21 and stale after seven days", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => stock(i));
    expect(
      analyzeUniverse(inputs, "2026-09-21T00:00:00Z")[0].anomaly.score,
    ).not.toBeNull();
    expect(
      analyzeUniverse(inputs, "2026-09-26T00:00:00Z")[0].anomaly.score,
    ).toBeNull();
  });
});

describe("percentile insertion symmetry", () => {
  it("ranks a value between two observations at the midpoint", () => {
    expect(percentile(2, [1, 3])).toBe(50);
    expect(percentile(-5, [1, 3])).toBe(0);
    expect(percentile(5, [1, 3])).toBe(100);
  });
});
