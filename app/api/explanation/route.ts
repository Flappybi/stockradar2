import { z } from "zod";
import { getDataset } from "@/lib/data/service";
import { explainStock } from "@/lib/ai/explain-stock";
export const runtime = "nodejs";
export const maxDuration = 30;
const bodySchema = z
  .object({ ticker: z.string().regex(/^[A-Z]{4}$/) })
  .strict();
function isAllowedOrigin(origin: string, request: Request): boolean {
  try {
    const originUrl = new URL(origin);
    const reqUrl = new URL(request.url);
    if (originUrl.origin === reqUrl.origin) return true;

    const hostHeader =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      reqUrl.host;
    if (originUrl.host === hostHeader) return true;

    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
        if (originUrl.origin === appUrl.origin || originUrl.host === appUrl.host) {
          return true;
        }
      } catch {
        // ignore malformed NEXT_PUBLIC_APP_URL
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, request))
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
