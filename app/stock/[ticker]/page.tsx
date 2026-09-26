import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDataset } from "@/lib/data/service";
import { getCachedBrief } from "@/lib/ai/explain-stock";
import { FACTORS } from "@/lib/analytics/types";
import {
  number,
  percent,
  compact,
  dateLabel,
  timestampLabel,
} from "@/lib/format";
import { Score } from "@/components/score";
import { DataNotice, DataUnavailable } from "@/components/data-state";
import { MarketHistory } from "@/components/charts/market-history";
import { ResearchBrief } from "@/components/stock/brief";
import { WatchlistButton } from "@/components/watchlist-button";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return {
    title: /^[A-Z]{4}$/.test(ticker)
      ? `${ticker} Intelligence`
      : "Stock Intelligence",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  if (!/^[A-Z]{4}$/.test(ticker)) notFound();
  const data = await getDataset().catch(() => null);
  if (!data) return <DataUnavailable />;
  const s = data.stocks.find((s) => s.input.ticker === ticker);
  if (!s) notFound();
  const initial = await getCachedBrief(s).catch(() => null);
  const latest = s.input.history.at(-1);
  const m = s.input.fundamentals;
  return (
    <>
      <Link href="/screener" className="text-link">
        <ArrowLeft />
        Back to screener
      </Link>
      <div className="stock-header">
        <div>
          <div className="stock-title-row">
            <h1 className="ticker-title">{ticker}</h1>
            <WatchlistButton ticker={ticker} expanded />
          </div>
          <h2>{s.input.name}</h2>
          <p className="small muted mt-2">
            {[s.input.sector, s.input.subsector].filter(Boolean).join(" / ") ||
              "Sector unavailable"}{" "}
            · Market data as of {dateLabel(s.asOf)}
          </p>
        </div>
        <div className="stock-price">
          Rp {number(latest?.close, 0)}
          <p>
            {percent(s.change, true)} latest session · Volume{" "}
            {compact(latest?.volume)}
          </p>
        </div>
      </div>
      <DataNotice data={data} />
      <div className="headline-scores">
        <section className="panel headline-score">
          <h2>Signal Score</h2>
          <div className="big-score">
            {number(s.signal.score)} <small>/ 100</small>
          </div>
          <p className="score-context">
            Balanced preset · {percent(s.signal.coverage)} coverage
          </p>
          <p className="score-context mt-2">
            {s.signal.reason ??
              "Relative strength across five measured factors."}
          </p>
        </section>
        <section className="panel headline-score anomaly">
          <h2>Anomaly Score</h2>
          <div className="big-score">
            {number(s.anomaly.score)} <small>/ 100</small>
          </div>
          <p className="score-context">
            {s.anomaly.label} · {percent(s.anomaly.coverage)} component coverage
          </p>
          <p className="score-context mt-2">
            {s.anomaly.reason ?? `Primary trigger: ${s.anomaly.primaryTrigger}`}
          </p>
        </section>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Signal breakdown</h2>
            <Link href="/methodology" className="text-link">
              Methodology
            </Link>
          </div>
          <div className="panel-content">
            {FACTORS.map((f) => (
              <div className="factor-row" key={f}>
                <span>{f}</span>
                <div
                  className="factor-track"
                  role="meter"
                  aria-label={`${f} score`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={s.signal.factors[f].score ?? undefined}
                >
                  <div
                    style={{ width: `${s.signal.factors[f].score ?? 0}%` }}
                  />
                </div>
                <Score value={s.signal.factors[f].score} />
              </div>
            ))}
            <ul className="brief-list">
              {s.findings.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </section>
        <MarketHistory history={s.input.history} />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Anomaly evidence</h2>
          <span className="small muted">
            Current observation vs prior history
          </span>
        </div>
        <div className="panel-content">
          {s.anomaly.components.map((c) => (
            <div className="anomaly-detail" key={c.key}>
              <h3>{c.label}</h3>
              <Score value={c.score} anomaly />
              <p className="small muted">
                Z-score {number(c.zScore, 2)}σ · {c.direction ?? "Unavailable"}{" "}
                · {c.observations} baseline observations
              </p>
              <span className="small muted">
                {c.key === "volume"
                  ? c.percentDifference === null
                    ? "—"
                    : `${c.percentDifference > 0 ? "+" : ""}${number(c.percentDifference)}%`
                  : ""}
              </span>
              <p className="small muted">
                Current {number(c.current, c.key === "volume" ? 0 : 5)} · Mean{" "}
                {number(c.mean, c.key === "volume" ? 0 : 5)} · Sample SD{" "}
                {number(c.std, c.key === "volume" ? 0 : 5)}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="panel mt-6">
        <div className="panel-heading">
          <h2>Underlying metrics</h2>
          <span className="small muted">
            Financials: {s.input.financialYear ?? "unavailable"} · Valuation:{" "}
            {s.input.valuationYear ?? "unavailable"}
          </span>
        </div>
        <div className="panel-content">
          <dl className="metrics-grid">
            {[
              { label: "Return on equity", value: percent(m.roe) },
              { label: "Return on assets", value: percent(m.roa) },
              { label: "Net profit margin", value: percent(m.netMargin) },
              {
                label: "Annual revenue growth",
                value: percent(m.revenueGrowth),
              },
              {
                label: "Annual earnings growth",
                value: percent(m.earningsGrowth),
              },
              { label: "Debt / equity", value: number(m.debtToEquity, 2) },
              { label: "Historical annual P/E", value: number(m.pe, 2) },
              { label: "Historical annual P/B", value: number(m.pb, 2) },
              { label: "Dividend yield TTM", value: percent(m.dividendYield) },
            ].map((m) => (
              <div className="metric-item" key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
          <details className="mt-6">
            <summary className="small">
              Inspect metric percentiles and peer groups
            </summary>
            <div className="table-scroll">
              <table className="data-table mt-3">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Raw value</th>
                    <th>Score</th>
                    <th>Peers</th>
                    <th>Comparison group</th>
                  </tr>
                </thead>
                <tbody>
                  {FACTORS.flatMap((f) => s.signal.factors[f].metrics).map(
                    (m) => (
                      <tr key={m.key}>
                        <td>
                          {m.label}
                          {m.inverse ? " (inverse)" : ""}
                        </td>
                        <td>{number(m.value, 4)}</td>
                        <td>{number(m.score)}</td>
                        <td>{m.peerCount}</td>
                        <td>{m.peerGroup}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </section>
      <ResearchBrief ticker={ticker} initial={initial} />
      <p className="small muted mt-5">
        Source:{" "}
        {s.input.source === "fixture"
          ? "Synthetic demo fixture"
          : "Sectors API"}{" "}
        · Report retrieved{" "}
        {timestampLabel(s.input.reportFetchedAt ?? s.input.fetchedAt)} · Market
        data retrieved{" "}
        {timestampLabel(s.input.marketFetchedAt ?? s.input.fetchedAt)} ·
        Calculated {timestampLabel(s.calculatedAt)} · Analytics v{s.version}.
        Custom screener weights apply only to the screener; this page and brief
        use Balanced.
      </p>
    </>
  );
}
