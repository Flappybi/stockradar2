import { getDataset } from "@/lib/data/service";
import { Screener } from "@/components/screener";
import { DataNotice, DataUnavailable } from "@/components/data-state";
export const metadata = { title: "Multi-Factor Screener" };
export default async function Page() {
  const data = await getDataset().catch(() => null);
  if (!data) return <DataUnavailable />;
  return (
    <>
      <div className="page-heading">
        <h1>Multi-Factor Screener</h1>
        <p className="subtitle">
          Rank companies using your factor weights. Explore what drives the
          signal.
        </p>
      </div>
      <DataNotice data={data} />
      <Screener
        stocks={data.stocks.map((s) => ({
          input: {
            ticker: s.input.ticker,
            name: s.input.name,
            sector: s.input.sector,
            subsector: s.input.subsector,
          },
          signal: s.signal,
        }))}
      />
    </>
  );
}
