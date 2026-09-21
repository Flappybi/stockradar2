import { getDataset } from "@/lib/data/service";
import { Dashboard } from "@/components/dashboard";
import { DataUnavailable } from "@/components/data-state";
export default async function Page() {
  const data = await getDataset().catch(() => null);
  return data ? <Dashboard data={data} /> : <DataUnavailable />;
}
