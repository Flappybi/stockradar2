import { getDataset } from "@/lib/data/service";
import { Watchlist } from "@/components/watchlist";
import { DataNotice } from "@/components/data-state";

export const metadata = { title: "Watchlist" };

export default async function Page() {
  const data = await getDataset().catch(() => null);
  return (
    <>
      {data ? (
        <DataNotice data={data} />
      ) : (
        <p className="notice" role="status">
          Market data is unavailable. Your saved tickers remain on this device;
          scores will return when data is available.
        </p>
      )}
      <Watchlist
        stocks={
          data?.stocks.map((stock) => ({
            ticker: stock.input.ticker,
            name: stock.input.name,
            sector: stock.input.sector,
            signal: stock.signal.score,
            anomaly: stock.anomaly.score,
            asOf: stock.asOf,
          })) ?? []
        }
      />
    </>
  );
}
