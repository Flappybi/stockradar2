import { recalculateDataset } from "../lib/data/service";
import { closeDatabase } from "../lib/db/client";
import { DataError } from "../lib/sectors/errors";

async function main() {
  try {
    const dataset = await recalculateDataset();
    console.table(
      dataset.stocks.map((stock) => ({
        ticker: stock.input.ticker,
        signal: stock.signal.score?.toFixed(2) ?? "N/A",
        anomaly: stock.anomaly.score?.toFixed(2) ?? "N/A",
        source: stock.input.source,
        asOf: stock.asOf,
      })),
    );
    console.log(
      dataset.source === "fixture"
        ? "Synthetic fixture scores calculated in memory."
        : "Scores persisted from saved inputs without upstream requests.",
    );
  } catch (error) {
    console.error(
      error instanceof DataError
        ? error.message
        : "Score calculation failed. Check saved dataset and database configuration.",
    );
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
void main();
