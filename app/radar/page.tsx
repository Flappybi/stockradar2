import { getDataset } from "@/lib/data/service";
import { MarketRadar } from "@/components/radar";
import { DataNotice, DataUnavailable } from "@/components/data-state";
export const metadata = { title: "Market Radar" };
export default async function Page() {
  const data = await getDataset().catch(() => null);
  if (!data) return <DataUnavailable />;
  return (
    <>
      <div className="page-heading">
        <h1>Market Radar</h1>
        <p className="subtitle">
          What looks statistically unusual today? Follow the evidence behind
          each deviation.
        </p>
      </div>
      <DataNotice data={data} />
      <MarketRadar
        stocks={data.stocks.map((s) => ({
          input: {
            ticker: s.input.ticker,
            name: s.input.name,
            sector: s.input.sector,
          },
          anomaly: s.anomaly,
          asOf: s.asOf,
        }))}
      />
    </>
  );
}
