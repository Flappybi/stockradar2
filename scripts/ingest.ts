import { refreshDataset } from "../lib/data/service";
import { closeDatabase } from "../lib/db/client";
import { DataError } from "../lib/sectors/errors";

async function main() {
  try {
    const dataset = await refreshDataset();
    console.log(
      JSON.stringify(
        {
          source: dataset.source,
          companies: dataset.stocks.length,
          fetchedAt: dataset.fetchedAt,
          stale: dataset.stale,
          warnings: dataset.warnings,
        },
        null,
        2,
      ),
    );
    if (dataset.stale) process.exitCode = 1;
  } catch (error) {
    console.error(
      error instanceof DataError
        ? error.message
        : "Ingestion failed. Check server configuration and database migrations.",
    );
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
void main();
