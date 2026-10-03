import { AlertCircle } from "lucide-react";
import type { Dataset } from "@/lib/analytics/types";
import { timestampLabel } from "@/lib/format";
export function DataNotice({ data }: { data: Dataset }) {
  return null;
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
