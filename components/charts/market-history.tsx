"use client";
import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MarketObservation } from "@/lib/analytics/types";
import { compact, number } from "@/lib/format";
export function MarketHistory({ history }: { history: MarketObservation[] }) {
  const [window, setWindow] = useState(90);
  const latest = history.at(-1);
  const rows = latest
    ? history.filter(
        (r) =>
          Date.parse(r.date) >= Date.parse(latest.date) - window * 86400000,
      )
    : [];
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Price & volume</h2>
        <select
          aria-label="Chart period"
          value={window}
          onChange={(e) => setWindow(Number(e.target.value))}
          className="rounded border border-border p-1 text-xs"
        >
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
        </select>
      </div>
      {rows.length > 1 ? (
        <div className="panel-content">
          <p className="small muted mb-3">
            Closing price · IDR · Unadjusted price series
          </p>
          <div
            className="chart-box"
            role="img"
            aria-label={`Closing prices for the last ${window} calendar days`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rows}
                margin={{ left: 0, right: 5, top: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 4"
                  vertical={false}
                  stroke="#e5ebe8"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  tick={{ fontSize: 10, fill: "#64726a" }}
                  minTickGap={30}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => compact(Number(v))}
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "#64726a" }}
                  width={44}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [number(Number(v), 0), "Close (IDR)"]}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#187650"
                  fill="#eaf4ee"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="small muted mt-3">Daily volume · shares</p>
          <div
            style={{ height: 100, width: "100%" }}
            role="img"
            aria-label="Daily trading volume"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ left: 0, right: 5, top: 10, bottom: 0 }}
              >
                <XAxis dataKey="date" hide />
                <YAxis
                  tickFormatter={(v) => compact(Number(v))}
                  tick={{ fontSize: 10, fill: "#64726a" }}
                  width={44}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => [compact(Number(v)), "Volume"]} />
                <Bar
                  dataKey="volume"
                  fill="#b2cbbd"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="small mt-4">
            <summary>View recent observations</summary>
            <table className="data-table mt-2">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Close (IDR)</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice(-10)
                  .reverse()
                  .map((r) => (
                    <tr key={r.date}>
                      <td>{r.date}</td>
                      <td>{number(r.close, 0)}</td>
                      <td>{compact(r.volume)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>
        </div>
      ) : (
        <p className="empty-state">Price history is unavailable.</p>
      )}
    </section>
  );
}
