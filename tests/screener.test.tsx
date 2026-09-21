// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Screener } from "@/components/screener";
import type { StockAnalysis } from "@/lib/analytics/types";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
const factors = {
  quality: { score: 90, coverage: 1, metrics: [] },
  growth: { score: 50, coverage: 1, metrics: [] },
  valuation: { score: 40, coverage: 1, metrics: [] },
  momentum: { score: 80, coverage: 1, metrics: [] },
  risk: { score: 60, coverage: 1, metrics: [] },
};
const stocks = [
  {
    input: {
      ticker: "BBCA",
      name: "Bank Central Asia",
      sector: "Financials",
      subsector: "Banks",
      industry: "Banks",
      fundamentals: {},
      history: [],
      financialYear: 2025,
      valuationYear: 2025,
      source: "fixture",
      fetchedAt: "2026-09-18",
    },
    signal: {
      score: 65,
      coverage: 1,
      factors,
      weights: {
        quality: 25,
        growth: 25,
        valuation: 20,
        momentum: 20,
        risk: 10,
      },
      reason: null,
    },
    anomaly: {
      score: 40,
      coverage: 1,
      label: "Watch",
      primaryTrigger: "Volume",
      components: [],
      reason: null,
    },
    findings: [],
    asOf: "2026-09-18",
    calculatedAt: "2026-09-18",
    version: "1",
    change: 0,
  },
] satisfies StockAnalysis[];
describe("Screener controls", () => {
  it("renders covered companies and changes presets", () => {
    render(<Screener stocks={stocks} />);
    expect(screen.getByText("BBCA")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Screening preset"), {
      target: { value: "Growth" },
    });
    expect(screen.getByLabelText("growth weight")).toHaveValue(40);
    expect(screen.getByText("64.0")).toBeVisible();
  });
  it("withholds rankings until custom weights total 100 and supports empty search", () => {
    render(<Screener stocks={stocks} />);
    fireEvent.change(screen.getByLabelText("quality weight"), {
      target: { value: "0" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("100%");
    expect(screen.queryByText("BBCA")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    fireEvent.change(screen.getByLabelText("Filter companies"), {
      target: { value: "nomatch" },
    });
    expect(screen.getByText("No companies match your filters.")).toBeVisible();
  });
});
