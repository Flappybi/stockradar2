export const metadata = { title: "About" };
export default function Page() {
  return (
    <article className="prose">
      <h1>Detect what matters.</h1>
      <p>
        StockRadar is a Track 3 — Market Intelligence hackathon project. It
        transforms Sectors financial and market data into transparent
        multi-factor research rankings and statistical anomaly detection.
      </p>
      <h2>Data → derived intelligence → explanation</h2>
      <p>
        Sectors provides the financial foundation. StockRadar’s deterministic
        analytical layer produces factor percentiles, Signal Scores, Anomaly
        Scores, and sector-relative evidence. Gemini translates those findings
        into a grounded research brief without generating or altering the
        calculations.
      </p>
      <p>
        The quantitative product remains usable when Gemini is unavailable. Live
        mode depends on Sectors; demonstration mode uses explicitly synthetic
        fixtures.
      </p>
    </article>
  );
}
