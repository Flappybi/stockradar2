import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div aria-label="Loading market research" className="flex flex-col gap-6">
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
