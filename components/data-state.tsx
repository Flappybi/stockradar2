import { AlertCircle } from "lucide-react";
import type { Dataset } from "@/lib/analytics/types";
import { timestampLabel } from "@/lib/format";
export function DataNotice({ data }: { data: Dataset }) {
  return (
    <>
      {data.source === "fixture" ? (
        <div className="notice">
          Demo mode · Synthetic prices and financials for product testing. These
          are not reported company results.
        </div>
      ) : null}
      {data.stale ? (
        <div className="notice" role="status">
          Showing saved data. Oldest source retrieval:{" "}
          {timestampLabel(data.fetchedAt)}. Refresh is overdue, failed, or its
          status is unavailable.
        </div>
      ) : null}
      {data.warnings
        .filter(
          (w) =>
            data.source !== "fixture" ||
            !w.startsWith("Synthetic fixture demo"),
        )
        .map((w) => (
          <div className="notice" key={w}>
            {w}
          </div>
        ))}
    </>
  );
}
export function DataUnavailable() {
  return (
    <section className="panel error-view" role="status">
      <AlertCircle size={28} />
      <h1>Market data temporarily unavailable.</h1>
      <p>
        Live mode requires a Sectors API key and an ingested snapshot. Check the
        server configuration and run the documented ingestion command. Existing
        cached data will be shown when available.
      </p>
      <a href="/methodology" className="text-link">
        Read the methodology
      </a>
    </section>
  );
}
