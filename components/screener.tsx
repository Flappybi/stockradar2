"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowDownUp, RotateCcw } from "lucide-react";
import { z } from "zod";
import {
  FACTORS,
  type Factor,
  type StockAnalysis,
  type Weights,
} from "@/lib/analytics/types";
import { combineFactors, PRESETS } from "@/lib/analytics/engine";
import { percent } from "@/lib/format";
import { Score } from "@/components/score";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "@/components/watchlist-button";
const weightSchema = z
  .object({
    quality: z.number().min(0).max(100),
    growth: z.number().min(0).max(100),
    valuation: z.number().min(0).max(100),
    momentum: z.number().min(0).max(100),
    risk: z.number().min(0).max(100),
  })
  .refine(
    (w) => Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 100) < 1e-8,
  );
function readStoredWeights() {
  try {
    return localStorage.getItem("stockradar-weights-v1");
  } catch {
    return null;
  }
}
function parseStoredWeights(raw: string | null): Weights | null {
  try {
    const parsed = weightSchema.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
function subscribeWeights(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("stockradar-weights", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("stockradar-weights", callback);
  };
}
type SortKey = Factor | "signal" | "coverage" | "ticker";
export type ScreenerStock = Pick<StockAnalysis, "signal"> & {
  input: Pick<
    StockAnalysis["input"],
    "ticker" | "name" | "sector" | "subsector"
  >;
};
export function Screener({ stocks }: { stocks: ScreenerStock[] }) {
  const [draftWeights, setWeights] = useState<Weights | null>(null);
  const stored = useSyncExternalStore(
    subscribeWeights,
    readStoredWeights,
    () => null,
  );
  const weights =
    draftWeights ?? parseStoredWeights(stored) ?? PRESETS.Balanced;
  const preset =
    Object.entries(PRESETS).find(([, w]) =>
      FACTORS.every((f) => w[f] === weights[f]),
    )?.[0] ?? "Custom";
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [minCoverage, setMinCoverage] = useState(60);
  const [sort, setSort] = useState<SortKey>("signal");
  const [ascending, setAscending] = useState(false);
  const valid = weightSchema.safeParse(weights).success;
  const total = FACTORS.reduce((n, f) => n + weights[f], 0);
  const sectors = [
    ...new Set(
      stocks.map((s) => s.input.sector).filter((s): s is string => !!s),
    ),
  ].sort();
  const rows = valid
    ? stocks
        .map((s) => ({
          ...s,
          signal: combineFactors(s.signal.factors, weights),
        }))
        .filter(
          (s) =>
            `${s.input.ticker} ${s.input.name}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (!sector || s.input.sector === sector) &&
            s.signal.score !== null &&
            s.signal.score >= minScore &&
            s.signal.coverage * 100 >= minCoverage,
        )
        .sort((a, b) => {
          if (sort === "ticker")
            return ascending
              ? a.input.ticker.localeCompare(b.input.ticker)
              : b.input.ticker.localeCompare(a.input.ticker);
          const av =
            sort === "signal"
              ? a.signal.score
              : sort === "coverage"
                ? a.signal.coverage
                : a.signal.factors[sort].score;
          const bv =
            sort === "signal"
              ? b.signal.score
              : sort === "coverage"
                ? b.signal.coverage
                : b.signal.factors[sort].score;
          if (av === null) return bv === null ? 0 : 1;
          if (bv === null) return -1;
          return (
            (ascending ? 1 : -1) * (av - bv) ||
            a.input.ticker.localeCompare(b.input.ticker)
          );
        })
    : [];
  function save(w: Weights) {
    setWeights(w);
    if (weightSchema.safeParse(w).success)
      try {
        localStorage.setItem("stockradar-weights-v1", JSON.stringify(w));
        window.dispatchEvent(new Event("stockradar-weights"));
      } catch {
        /* Browsing remains usable without storage. */
      }
  }
  function choosePreset(value: string) {
    if (value in PRESETS) {
      save({ ...PRESETS[value as keyof typeof PRESETS] });
    }
  }
  function reset() {
    choosePreset("Balanced");
    setQuery("");
    setSector("");
    setMinScore(0);
    setMinCoverage(60);
    setSort("signal");
    setAscending(false);
  }
  function sortBy(key: SortKey) {
    if (key === sort) setAscending(!ascending);
    else {
      setSort(key);
      setAscending(key === "ticker");
    }
  }
  return (
    <div className="screen-layout">
      <aside className="panel filters" aria-label="Screener filters">
        <h2>Refine your view</h2>
        <div className="field">
          <label htmlFor="preset">Screening preset</label>
          <select
            id="preset"
            value={preset}
            onChange={(e) => choosePreset(e.target.value)}
          >
            {Object.keys(PRESETS).map((p) => (
              <option key={p}>{p}</option>
            ))}
            <option value="Custom" disabled>
              Custom
            </option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-query">Filter companies</label>
          <input
            id="filter-query"
            type="search"
            placeholder="Ticker or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="sector">Sector</label>
          <select
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="min-score">Minimum Signal: {minScore}</label>
          <input
            id="min-score"
            type="range"
            min="0"
            max="100"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="min-coverage">Minimum coverage</label>
          <select
            id="min-coverage"
            value={minCoverage}
            onChange={(e) => setMinCoverage(Number(e.target.value))}
          >
            <option value="60">60% or more</option>
            <option value="80">80% or more</option>
            <option value="100">100%</option>
          </select>
        </div>
        <fieldset className="field weights-field">
          <legend className="mb-3">Factor weights (%)</legend>
          <div className="weight-grid">
            {FACTORS.map((f) => (
              <div className="weight-line" key={f}>
                <label htmlFor={`weight-${f}`}>{f}</label>
                <input
                  id={`weight-${f}`}
                  aria-label={`${f} weight`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Number.isNaN(weights[f]) ? "" : weights[f]}
                  onChange={(e) => {
                    save({
                      ...weights,
                      [f]: e.target.value === "" ? NaN : Number(e.target.value),
                    });
                  }}
                />
              </div>
            ))}
          </div>
          <div className="weight-total">
            <span>Total</span>
            <span>{Number.isFinite(total) ? total : "—"}%</span>
          </div>
          {!valid ? (
            <p className="validation" role="alert">
              Weights must be between 0 and 100 and total 100% before scores can
              be calculated.
            </p>
          ) : null}
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw data-icon="inline-start" />
            Reset filters
          </Button>
        </fieldset>
      </aside>
      <section className="panel">
        <div className="table-toolbar">
          <span aria-live="polite">
            {rows.length} of {stocks.length} companies · {preset}
          </span>
          <span className="hide-mobile">Peer-relative scores · 0–100</span>
        </div>
        <div className="table-scroll">
          <table className="data-table" aria-label="Stock rankings">
            <thead>
              <tr>
                <th>
                  <span className="sr-only">Watchlist</span>
                </th>
                <th>
                  <button
                    className="sort-button"
                    onClick={() => sortBy("ticker")}
                  >
                    Company <ArrowDownUp />
                  </button>
                </th>
                {(["signal", ...FACTORS, "coverage"] as const).map((key) => (
                  <th
                    key={key}
                    className={`numeric ${key === "signal" ? "" : key === "coverage" ? "hide-medium hide-mobile" : "hide-mobile"}`}
                    aria-sort={
                      sort === key
                        ? ascending
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      className="sort-button capitalize"
                      onClick={() => sortBy(key)}
                    >
                      {key === "valuation" ? "Value" : key} <ArrowDownUp />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.input.ticker}>
                  <td className="favorite-cell">
                    <WatchlistButton ticker={s.input.ticker} />
                  </td>
                  <td>
                    <Link
                      href={`/stock/${s.input.ticker}`}
                      className="company-cell"
                    >
                      <span className="ticker">{s.input.ticker}</span>
                      <span className="company-name">{s.input.name}</span>
                      <span className="company-name">
                        {s.input.sector ?? "Sector unavailable"}
                      </span>
                    </Link>
                  </td>
                  <td className="numeric">
                    <Score value={s.signal.score} chip />
                    <span className="mobile-only small muted">
                      {percent(s.signal.coverage)} covered
                    </span>
                  </td>
                  {FACTORS.map((f) => (
                    <td className="numeric hide-mobile" key={f}>
                      <Score value={s.signal.factors[f].score} />
                    </td>
                  ))}
                  <td className="numeric hide-medium hide-mobile">
                    {percent(s.signal.coverage, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <div className="empty-state">
            {valid
              ? "No companies match your filters."
              : "Adjust your factor weights to see rankings."}
          </div>
        ) : null}
        <div className="table-toolbar">
          <span>
            Missing inputs are excluded. At least 60% weighted coverage is
            required.
          </span>
        </div>
      </section>
    </div>
  );
}
