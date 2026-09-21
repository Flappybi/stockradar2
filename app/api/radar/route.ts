import { getDataset } from "@/lib/data/service";
export async function GET() {
  try {
    const data = await getDataset();
    return Response.json({
      source: data.source,
      stale: data.stale,
      stocks: data.stocks
        .map((s) => ({
          ticker: s.input.ticker,
          name: s.input.name,
          anomaly: s.anomaly,
          asOf: s.asOf,
        }))
        .sort((a, b) => (b.anomaly.score ?? -1) - (a.anomaly.score ?? -1)),
    });
  } catch {
    return Response.json(
      { error: "Market data temporarily unavailable." },
      { status: 503 },
    );
  }
}
