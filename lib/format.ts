export function number(value: number | null | undefined, digits = 1): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value)
    : "—";
}
export function percent(
  value: number | null | undefined,
  signed = false,
): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${signed && value > 0 ? "+" : ""}${number(value * 100)}%`
    : "—";
}
export function compact(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value)
    : "—";
}
export function dateLabel(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
export function timestampLabel(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Unavailable";
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
      hour12: false,
    }).format(new Date(value)) + " WIB"
  );
}
