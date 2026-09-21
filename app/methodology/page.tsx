import Link from "next/link";
import { PRESETS } from "@/lib/analytics/engine";
import { FACTORS } from "@/lib/analytics/types";
export const metadata = { title: "Methodology & transparency" };
export default function Page() {
  return (
    <article className="prose">
      <div className="page-heading">
        <h1>Methodology & transparency</h1>
        <p className="subtitle">
          Every score has a formula. Every conclusion has a source.
        </p>
      </div>
      <section>
        <h2>Two independent research questions</h2>
        <p>
          <strong>Signal Score</strong> ranks the strength of a company’s
          measured profile relative to its comparison group.{" "}
          <strong>Anomaly Score</strong> describes how unusual current market
          activity is relative to past observations and sector peers. The two
          scores are never combined. Neither is a forecast, price target, or
          buy/sell recommendation.
        </p>
      </section>
      <section>
        <h2>Signal Score</h2>
        <div className="formula">
          Signal = 0.25 × Quality + 0.25 × Growth + 0.20 × Valuation + 0.20 ×
          Momentum + 0.10 × Risk
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Measured inputs</th>
                <th>Direction</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Quality</td>
                <td>ROE 35%, ROA 25%, net margin 25%, debt/equity 15%</td>
                <td>Higher; lower leverage</td>
              </tr>
              <tr>
                <td>Growth</td>
                <td>Annual revenue growth 50%, earnings growth 50%</td>
                <td>Higher</td>
              </tr>
              <tr>
                <td>Valuation</td>
                <td>Historical annual P/E 50%, P/B 35%, dividend yield 15%</td>
                <td>Lower multiples; higher yield</td>
              </tr>
              <tr>
                <td>Momentum</td>
                <td>30-day 40%, 90-day 40%, 365-day price return 20%</td>
                <td>Higher</td>
              </tr>
              <tr>
                <td>Risk</td>
                <td>
                  60-session annualized volatility 60%, maximum drawdown 40%
                </td>
                <td>Lower risk → higher score</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Financials exclude debt/equity and redistribute Quality’s remaining
          weights. Annual growth requires consecutive years with a positive
          base. Negative or zero valuation multiples are excluded. Momentum uses
          calendar-day horizons and a prior closing-price anchor no more than
          seven days before the target. Risk needs at least 30 valid daily
          returns; volatility uses sample standard deviation × √252.
        </p>
      </section>
      <section>
        <h2>Peer comparisons and outliers</h2>
        <p>
          Each metric uses at least five valid observations. The engine first
          tries the same subsector within the same sector, then the sector, then
          the configured research universe. The stock detail page discloses each
          metric’s actual comparison group and peer count. Market-derived peers
          must share the same latest price date.
        </p>
        <div className="formula">
          Percentile = 100 × (count below + (count equal − 1) / 2) / (population
          size − 1)
        </div>
        <p>
          Equal values receive the same midrank. The lowest unique value
          receives 0, the highest 100, and an all-equal group 50.
          Lower-is-favorable metrics use the inverse percentile. For fundamental
          metrics with at least 20 valid peers, values are clipped at the
          interpolated 2.5th and 97.5th percentiles before ranking. Raw evidence
          remains unchanged.
        </p>
      </section>
      <section>
        <h2>Missing data stays missing</h2>
        <p>
          Unavailable data is never replaced with zero. Available submetric
          weights are renormalized within each factor, and available factors are
          renormalized in the final score. Coverage measures the original
          weighted inputs, before redistribution. Signal is withheld below 60%
          overall coverage. Users can set a higher coverage filter.
        </p>
        <p>
          A current download does not make an old price current. Market factors
          and current anomalies are withheld when the latest close is more than
          seven calendar days before calculation. Financial and valuation
          periods are shown separately. Annual fundamentals do not yet have an
          automatic age cutoff.
        </p>
      </section>
      <section>
        <h2>Screening presets</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Preset</th>
                {FACTORS.map((f) => (
                  <th key={f} className="capitalize">
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PRESETS).map(([name, w]) => (
                <tr key={name}>
                  <td>{name}</td>
                  {FACTORS.map((f) => (
                    <td key={f}>{w[f]}%</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Custom weights must be nonnegative and total 100%. The screener
          remembers the last valid weights on this device. Stock detail and AI
          briefs always use Balanced to provide a stable reference.
        </p>
      </section>
      <section>
        <h2>Anomaly Score</h2>
        <div className="formula">
          z = (current − historical mean) / historical sample standard deviation
          <br />
          Component score = 100 × (1 − exp(−|z| / 2))
          <br />
          Anomaly = weighted mean of available component scores
        </div>
        <p>
          Baselines use up to the previous 60 session slots, excluding the
          current observation, with at least 30 valid observations. Zero
          variance, insufficient history, and nonfinite values make the
          component unavailable. At least 60% coverage of supported component
          weight is needed for an overall anomaly score.
        </p>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Original weight</th>
                <th>Current observation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Volume</td>
                <td>30</td>
                <td>Latest volume in shares</td>
              </tr>
              <tr>
                <td>Price</td>
                <td>25</td>
                <td>Latest daily price return</td>
              </tr>
              <tr>
                <td>Volatility</td>
                <td>20</td>
                <td>Sample SD of the latest 10 contiguous returns</td>
              </tr>
              <tr>
                <td>Sector divergence</td>
                <td>15</td>
                <td>
                  Company daily return minus equal-weight sector peer return
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Sector divergence excludes the company itself and requires at least
          three other sector members on each identical date interval. The
          proposed trading activity factor is omitted because the integrated
          daily endpoint does not provide transaction value or frequency;
          supported weights sum to 90 and are renormalized. The primary trigger
          is the largest weighted component contribution.
        </p>
        <p>
          Signed Z-scores describe direction relative to the baseline. A
          negative price Z-score does not necessarily mean the price fell.
          Scores below 40 are <strong>Normal</strong>; 40–59.99{" "}
          <strong>Watch</strong>; 60–74.99 <strong>Elevated</strong>; 75–89.99{" "}
          <strong>Unusual</strong>; 90–100 <strong>Extreme</strong>. These are
          descriptive labels, not significance probabilities.
        </p>
      </section>
      <section>
        <h2>Grounded explanations</h2>
        <p>
          Gemini receives only calculated StockRadar metrics, their references,
          and deterministic findings. It has no web-search tools and cannot
          compute scores. Structured output is checked against a Zod schema and
          semantic rules that reject inappropriate recommendations, unsupported
          causes, and ungrounded numeric statements. Invalid output, missing
          credentials, quota failures, or timeouts lead to a clearly labeled
          deterministic template brief.
        </p>
        <p>
          Explanations are cached by complete context, calculation version,
          prompt version, model, and source mode. A model can still phrase
          evidence imperfectly; inspect the underlying metrics.
        </p>
      </section>
      <section>
        <h2>Sources and limitations</h2>
        <p>
          Live financial data comes from{" "}
          <a
            className="text-link"
            href="https://docs.sectors.app/api-references/v2/indonesia/report/company-report"
          >
            Sectors company reports
          </a>{" "}
          and{" "}
          <a
            className="text-link"
            href="https://docs.sectors.app/api-references/v2/indonesia/transaction/daily"
          >
            daily transaction history
          </a>
          . Historical annual valuation is not current TTM valuation. Source
          dates, retrieval dates, and calculation dates remain distinct. Demo
          mode uses synthetic inputs and is always labeled.
        </p>
        <ul>
          <li>
            The configured universe is a sample, not the whole Indonesian
            market. Ranks change with peer composition.
          </li>
          <li>
            Annual reporting periods may differ; no forward-looking forecasts or
            earnings stability factor is fabricated.
          </li>
          <li>
            Price history is unadjusted. Splits, dividends, suspensions, and
            illiquidity can produce misleading signals.
          </li>
          <li>
            Daily-return intervals longer than seven days are excluded. There is
            no exchange holiday calendar.
          </li>
          <li>
            Overlapping volatility windows and non-normal returns limit
            statistical interpretation.
          </li>
        </ul>
        <p>
          StockRadar supports further research. It does not provide personalized
          investment advice.
        </p>
        <Link className="text-link" href="/screener">
          Explore the screener
        </Link>
      </section>
    </article>
  );
}
