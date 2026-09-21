import { number } from "@/lib/format";
export function Score({
  value,
  anomaly = false,
  chip = false,
}: {
  value: number | null;
  anomaly?: boolean;
  chip?: boolean;
}) {
  return (
    <span
      className={`score ${anomaly ? "anomaly" : ""} ${chip ? "score-chip" : ""} ${value === null ? "unavailable" : ""}`}
      aria-label={value === null ? "Unavailable" : undefined}
    >
      {number(value)}
    </span>
  );
}
