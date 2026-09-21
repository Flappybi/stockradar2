import { z } from "zod";
import { getDataset } from "@/lib/data/service";
import { explainStock } from "@/lib/ai/explain-stock";
export const runtime = "nodejs";
export const maxDuration = 30;
const bodySchema = z
  .object({ ticker: z.string().regex(/^[A-Z]{4}$/) })
  .strict();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 1024)
      return Response.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Provide one valid ticker only." },
      { status: 400 },
    );
  try {
    const data = await getDataset();
    const stock = data.stocks.find(
      (s) => s.input.ticker === parsed.data.ticker,
    );
    if (!stock)
      return Response.json(
        { error: "Company not in research universe." },
        { status: 404 },
      );
    const result = await explainStock(stock);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Research brief temporarily unavailable." },
      { status: 503 },
    );
  }
}
