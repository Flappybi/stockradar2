import type { Metadata } from "next";
import { Shell } from "@/components/layout/shell";
import "./globals.css";
import "./emerald.css";
export const metadata: Metadata = {
  title: {
    default: "StockRadar — Find the signal behind the market",
    template: "%s | StockRadar",
  },
  description:
    "Transparent multi-factor research and statistical anomaly detection for Indonesian equities.",
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell mode={process.env.DATA_MODE ?? "sectors"}>{children}</Shell>
      </body>
    </html>
  );
}
