import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChartNoAxesColumnIncreasing,
  TriangleAlert,
  CalendarDays,
  Radar,
  Star,
} from "lucide-react";
import type { Dataset } from "@/lib/analytics/types";
import { dateLabel } from "@/lib/format";
import { Score } from "@/components/score";
import { Button } from "@/components/ui/button";
import { DataNotice } from "@/components/data-state";
import { WatchlistButton } from "@/components/watchlist-button";
export function Dashboard({ data }: { data: Dataset }) {
  const top = [...data.stocks]
    .sort((a, b) => (b.signal.score ?? -1) - (a.signal.score ?? -1))
    .slice(0, 5);
  const radar = [...data.stocks]
    .sort((a, b) => (b.anomaly.score ?? -1) - (a.anomaly.score ?? -1))
    .slice(0, 5);
  const dates = data.stocks
    .map((s) => s.asOf)
    .filter((s): s is string => s !== null)
    .sort();
  return (
    <>
      <div className="hero overview-hero">
        <div className="hero-radar" aria-hidden="true">
          <Radar strokeWidth={0.6} />
        </div>
        <h1>
          Find the signal
          <br />
          behind the market.
        </h1>
        <p>
          A clearer view of Indonesian equities. Transparent signals. Unusual
          activity. Grounded research.
        </p>
        <div className="hero-actions">
          <Button asChild className="hero-action">
            <Link href="/screener">
              Open screener <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Link href="/watchlist" className="hero-secondary">
            <Star size={18} /> My watchlist
          </Link>
        </div>
      </div>
      <DataNotice data={data} />
      <section className="stat-band" aria-label="Market snapshot">
        <div className="stat">
          <div className="stat-label">
            <Building2 />
            Companies analyzed
          </div>
          <div className="stat-value">{data.stocks.length}</div>
          <p className="stat-note">Configured research universe</p>
        </div>
        <div className="stat">
          <div className="stat-label">
            <ChartNoAxesColumnIncreasing />
            High Signal companies
          </div>
          <div className="stat-value">
            {
              data.stocks.filter(
                (s) => s.signal.score !== null && s.signal.score >= 75,
              ).length
            }
          </div>
          <p className="stat-note">Signal Score ≥ 75</p>
        </div>
        <div className="stat">
          <div className="stat-label">
            <TriangleAlert />
            Elevated anomalies
          </div>
          <div className="stat-value">
            {
              data.stocks.filter(
                (s) => s.anomaly.score !== null && s.anomaly.score >= 60,
              ).length
            }
          </div>
          <p className="stat-note">Anomaly Score ≥ 60</p>
        </div>
        <div className="stat">
          <div className="stat-label">
            <CalendarDays />
            Data as of
          </div>
          <div className="stat-value date">{dateLabel(dates[0])}</div>
          <p className="stat-note">Oldest latest market observation</p>
        </div>
      </section>
      <div className="overview-grid">
        <section className="panel signal-panel">
          <div className="panel-heading">
            <h2>
              <ChartNoAxesColumnIncreasing size={21} />
              Top signals
            </h2>
            <Link className="text-link" href="/screener">
              View all <ArrowRight />
            </Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <span className="sr-only">Watchlist</span>
                </th>
                <th>Company</th>
                <th className="numeric">Signal</th>
                <th className="numeric hide-mobile">Quality</th>
                <th className="numeric hide-mobile">Growth</th>
                <th className="numeric hide-mobile">Momentum</th>
              </tr>
            </thead>
            <tbody>
              {top.map((s) => (
                <tr key={s.input.ticker}>
                  <td className="favorite-cell">
                    <WatchlistButton ticker={s.input.ticker} />
                  </td>
                  <td>
                    <Link
                      className="company-identity"
                      href={`/stock/${s.input.ticker}`}
                    >
                      <span className="company-monogram" aria-hidden="true">
                        {s.input.ticker.slice(0, 2)}
                      </span>
                      <span className="company-cell">
                        <span className="ticker">{s.input.ticker}</span>
                        <span className="company-name">{s.input.name}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="numeric">
                    <Score value={s.signal.score} chip />
                  </td>
                  <td className="numeric hide-mobile">
                    <Score value={s.signal.factors.quality.score} />
                  </td>
                  <td className="numeric hide-mobile">
                    <Score value={s.signal.factors.growth.score} />
                  </td>
                  <td className="numeric hide-mobile">
                    <Score value={s.signal.factors.momentum.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!top.length ? (
            <div className="empty-state">
              No covered companies in this snapshot.
            </div>
          ) : null}
        </section>
        <section className="panel radar-panel">
          <div className="panel-heading">
            <h2>
              <Radar size={22} />
              Market radar
            </h2>
            <Link href="/radar" className="text-link">
              View all <ArrowRight />
            </Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Anomaly</th>
                <th>Primary trigger</th>
              </tr>
            </thead>
            <tbody>
              {radar.map((s) => (
                <tr key={s.input.ticker}>
                  <td>
                    <Link
                      className="company-cell"
                      href={`/stock/${s.input.ticker}`}
                    >
                      <span className="ticker">{s.input.ticker}</span>
                      <span className="company-name">{s.anomaly.label}</span>
                    </Link>
                  </td>
                  <td>
                    <Score value={s.anomaly.score} anomaly chip />
                  </td>
                  <td>{s.anomaly.primaryTrigger || "Unavailable"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <section className="panel two-scores">
        <h2>Two scores. Two different questions.</h2>
        <div className="score-explain">
          <div>
            <ChartNoAxesColumnIncreasing />
            <div>
              <h3>Signal Score</h3>
              <p>
                How strong is this company’s measured profile relative to peers
                across quality, growth, valuation, momentum, and risk?
              </p>
            </div>
          </div>
          <div>
            <TriangleAlert style={{ color: "#a96708" }} />
            <div>
              <h3>Anomaly Score</h3>
              <p>
                How unusual is recent activity compared with historical patterns
                in price, volume, volatility, and sector performance?
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
