import { getDataset } from "@/lib/data/service";
import { PRESETS, combineFactors } from "@/lib/analytics/engine";
export async function GET(request: Request) {
  const preset = new URL(request.url).searchParams.get("preset") ?? "Balanced";
  if (!Object.hasOwn(PRESETS, preset))
    return Response.json({ error: "Unknown preset." }, { status: 400 });
  try {
    const data = await getDataset();
    const weights = PRESETS[preset as keyof typeof PRESETS];
    const stocks = data.stocks
      .map((s) => ({
        ticker: s.input.ticker,
        name: s.input.name,
        sector: s.input.sector,
        signal: combineFactors(s.signal.factors, weights),
        asOf: s.asOf,
      }))
      .sort((a, b) => (b.signal.score ?? -1) - (a.signal.score ?? -1));
    return Response.json({
      stocks,
      source: data.source,
      stale: data.stale,
      preset,
    });
  } catch {
    return Response.json(
      { error: "Market data temporarily unavailable." },
      { status: 503 },
    );
  }
}
