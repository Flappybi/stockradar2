"use client";

import Link from "next/link";
import { ArrowRight, Star, ShieldCheck } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";
import { Score } from "@/components/score";
import { WatchlistButton } from "@/components/watchlist-button";
import { dateLabel } from "@/lib/format";

export type WatchlistStock = {
  ticker: string;
  name: string;
  sector: string | null;
  signal: number | null;
  anomaly: number | null;
  asOf: string | null;
};

export function Watchlist({ stocks }: { stocks: WatchlistStock[] }) {
  const tickers = useWatchlist();
  return (
    <>
      <section className="watchlist-intro">
        <div>
          <h1>Your research, in focus.</h1>
          <p>Keep the companies you want to understand closer.</p>
        </div>
        <div className="watchlist-total">
          <Star aria-hidden="true" />
          <strong>{tickers.length}</strong>
          <span>saved companies</span>
        </div>
      </section>
      <div className="local-note">
        <ShieldCheck size={17} aria-hidden="true" /> Saved in this browser · No
        account required · Not synced across devices
      </div>
      {tickers.length ? (
        <section className="panel watchlist-panel" aria-label="Saved companies">
          <div className="panel-heading">
            <h2>My watchlist</h2>
            <Link href="/screener" className="text-link">
              Find companies <ArrowRight />
            </Link>
          </div>
          <div className="watchlist-columns" aria-hidden="true">
            <span>Company</span>
            <span>Signal</span>
            <span>Anomaly</span>
            <span>Data as of</span>
            <span />
          </div>
          {tickers.map((ticker) => {
            const stock = stocks.find((item) => item.ticker === ticker);
            return (
              <article
                className="watchlist-row"
                key={ticker}
                aria-label={ticker}
              >
                <div className="watchlist-company">
                  <span className="company-monogram" aria-hidden="true">
                    {ticker.slice(0, 2)}
                  </span>
                  {stock ? (
                    <Link className="company-cell" href={`/stock/${ticker}`}>
                      <span className="ticker">{ticker}</span>
                      <span className="company-name">{stock.name}</span>
                      <span className="company-name">
                        {stock.sector ?? "Sector unavailable"}
                      </span>
                    </Link>
                  ) : (
                    <div>
                      <strong>{ticker}</strong>
                      <p className="small muted">
                        Outside the current research universe
                      </p>
                    </div>
                  )}
                </div>
                <div
                  className="watchlist-score"
                  role="group"
                  aria-label="Signal Score"
                >
                  <span className="mobile-only muted small">Signal</span>
                  <Score value={stock?.signal ?? null} chip />
                </div>
                <div
                  className="watchlist-score"
                  role="group"
                  aria-label="Anomaly Score"
                >
                  <span className="mobile-only muted small">Anomaly</span>
                  <Score value={stock?.anomaly ?? null} chip anomaly />
                </div>
                <span className="watchlist-date muted small">
                  <span className="mobile-only">Data as of </span>
                  {dateLabel(stock?.asOf)}
                </span>
                <WatchlistButton ticker={ticker} />
              </article>
            );
          })}
        </section>
      ) : (
        <section className="panel watchlist-empty">
          <div className="empty-star">
            <Star size={32} aria-hidden="true" />
          </div>
          <h2>Start with a company that interests you.</h2>
          <p>
            Tap the star on a company to keep its Signal and Anomaly Scores
            here.
          </p>
          <Link className="watchlist-cta" href="/screener">
            Explore the screener <ArrowRight size={17} />
          </Link>
        </section>
      )}
    </>
  );
}
