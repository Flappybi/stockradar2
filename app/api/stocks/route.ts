import { getDataset } from "@/lib/data/service";
export async function GET() {
  try {
    const data = await getDataset();
    return Response.json(
      {
        source: data.source,
        stale: data.stale,
        fetchedAt: data.fetchedAt,
        stocks: data.stocks.map((s) => ({
          ticker: s.input.ticker,
          name: s.input.name,
          sector: s.input.sector,
          signal: s.signal.score,
          anomaly: s.anomaly.score,
          asOf: s.asOf,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Market data temporarily unavailable." },
      { status: 503 },
    );
  }
}
