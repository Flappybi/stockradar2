"use client";
import Link from "next/link";
import { useState } from "react";
import type { StockAnalysis } from "@/lib/analytics/types";
import { number } from "@/lib/format";
import { Score } from "@/components/score";
export type RadarStock = Pick<StockAnalysis, "anomaly" | "asOf"> & {
  input: Pick<StockAnalysis["input"], "ticker" | "name" | "sector">;
};
const FILTERS = [
  { key: "all", label: "All activity" },
  { key: "volume", label: "Volume" },
  { key: "price", label: "Price" },
  { key: "volatility", label: "Volatility" },
  { key: "sectorDivergence", label: "Sector divergence" },
];
export function MarketRadar({ stocks }: { stocks: RadarStock[] }) {
  const [filter, setFilter] = useState("all");
  const [min, setMin] = useState(0);
  const available = FILTERS.filter(
    (f) =>
      f.key === "all" ||
      stocks.some((s) =>
        s.anomaly.components.some((c) => c.key === f.key && c.score !== null),
      ),
  );
  const rows = stocks
    .filter(
      (s) =>
        s.anomaly.score !== null &&
        s.anomaly.score >= min &&
        (filter === "all" ||
          s.anomaly.components.some(
            (c) => c.key === filter && c.score !== null && c.score >= 40,
          )),
    )
    .sort((a, b) => (b.anomaly.score ?? -1) - (a.anomaly.score ?? -1));
  return (
    <>
      <fieldset className="filter-tabs">
        <legend className="sr-only">Anomaly type</legend>
        {available.map((f) => (
          <label key={f.key}>
            <input
              type="radio"
              name="anomaly-filter"
              value={f.key}
              checked={filter === f.key}
              onChange={() => setFilter(f.key)}
            />
            {f.label}
          </label>
        ))}
      </fieldset>
      <div className="panel">
        <div className="table-toolbar">
          <span>{rows.length} companies · anomaly descending</span>
          <label>
            Minimum anomaly{" "}
            <select
              aria-label="Minimum anomaly"
              className="ml-2 rounded border border-border p-1"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
            >
              <option value="0">All</option>
              <option value="40">Watch · 40+</option>
              <option value="60">Elevated · 60+</option>
              <option value="75">Unusual · 75+</option>
              <option value="90">Extreme · 90+</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table" aria-label="Market anomalies">
            <thead>
              <tr>
                <th>Company</th>
                <th className="numeric">Anomaly</th>
                <th>Primary trigger</th>
                <th className="hide-mobile">Volume Z</th>
                <th className="hide-mobile">Price Z</th>
                <th className="hide-medium hide-mobile">Volatility Z</th>
                <th className="hide-medium hide-mobile">Sector Z</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.input.ticker}>
                  <td>
                    <Link
                      className="company-cell"
                      href={`/stock/${s.input.ticker}`}
                    >
                      <span className="ticker">{s.input.ticker}</span>
                      <span className="company-name hide-mobile">
                        {s.input.name}
                      </span>
                      <span className="company-name">{s.asOf}</span>
                    </Link>
                  </td>
                  <td className="numeric">
                    <Score value={s.anomaly.score} anomaly chip />
                    <p className="small muted">{s.anomaly.label}</p>
                  </td>
                  <td>
                    {s.anomaly.primaryTrigger}
                    <p className="small muted">
                      {s.anomaly.components.find(
                        (c) => c.label === s.anomaly.primaryTrigger,
                      )?.direction ?? ""}
                    </p>
                  </td>
                  {["volume", "price", "volatility", "sectorDivergence"].map(
                    (k, i) => (
                      <td
                        key={k}
                        className={
                          i >= 2 ? "hide-medium hide-mobile" : "hide-mobile"
                        }
                      >
                        {number(
                          s.anomaly.components.find((c) => c.key === k)?.zScore,
                          2,
                        )}
                        σ
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <div className="empty-state">
            No measured anomalies match these filters.
          </div>
        ) : null}
      </div>
      <p className="small muted mt-4">
        Type filters show component scores ≥ 40. Signed Z-scores show direction
        relative to the historical baseline. A high anomaly score means unusual
        activity, not investment attractiveness.
      </p>
    </>
  );
}
