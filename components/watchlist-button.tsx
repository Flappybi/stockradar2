"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toggleWatchlist, useWatchlist } from "@/lib/watchlist";

export function WatchlistButton({
  ticker,
  expanded = false,
}: {
  ticker: string;
  expanded?: boolean;
}) {
  const saved = useWatchlist().includes(ticker);
  const [error, setError] = useState(false);
  const label = saved
    ? `Remove ${ticker} from watchlist`
    : `Save ${ticker} to watchlist`;
  return (
    <span className="favorite-control">
      <button
        type="button"
        className={`favorite-button ${expanded ? "expanded" : ""}`}
        aria-label={label}
        title={label}
        aria-pressed={saved}
        onClick={() => setError(!toggleWatchlist(ticker))}
      >
        <Star
          size={18}
          aria-hidden="true"
          fill={saved ? "currentColor" : "none"}
        />
        {expanded ? (
          <span>{saved ? "Saved to watchlist" : "Add to watchlist"}</span>
        ) : null}
      </button>
      {error ? (
        <span className="favorite-error" role="alert">
          Could not save. Check browser storage or your watchlist limit (200).
        </span>
      ) : null}
    </span>
  );
}
