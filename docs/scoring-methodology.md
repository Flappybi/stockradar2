# StockRadar scoring methodology

Implementation version: `1.0.0`. All calculations are deterministic TypeScript. Gemini receives completed evidence and never computes, changes, or fills in scores. Signal and Anomaly remain separate outputs. A higher Signal is a stronger relative profile under the chosen weights, not a forecast or expected return. Anomaly measures unusual behavior, not investment merit.

## Input integrity and time

Fundamentals use the documented Sectors fields in [the data map](sectors-data-map.md). Ratios use decimal units. Financial year and valuation year are retained separately; historical annual P/E and P/B are not represented as current TTM multiples. Missing values remain unavailable. Nonfinite numeric inputs are excluded. Negative or zero P/E and P/B, negative dividend yield and negative debt/equity cannot receive a rank. Their original finite observations remain visible in metric evidence.

Daily observations must have a real ISO calendar date and positive finite close. Invalid rows are excluded, rows are sorted, duplicate dates collapse to the final supplied valid observation, and future dates after the calculation timestamp are excluded. Volume must be finite and nonnegative. Zero volume is a real observation, not a missing value.

Each result stores its price `asOf`, source `fetchedAt`, `calculatedAt`, and calculation version. If the most recent close is more than seven elapsed calendar days before calculation, market factors and current anomaly components are withheld. Reads also re-evaluate the complete saved peer universe when a previously fresh history crosses that cutoff, without fetching Sectors or changing source retrieval times. A fresh download does not make an old close fresh. Fundamentals are still analyzed with their stated annual periods. This MVP has no exchange holiday calendar and no automatic freshness cutoff for annual fundamentals.

Sectors cache entries preserve their actual retrieval time. Canonical inputs separately record report and market-history retrieval; market-history retrieval is the oldest contributing daily chunk. Snapshot `fetchedAt` is the oldest contributing source retrieval, and `calculatedAt` records computation. Source freshness uses six hours for market data and 24 hours for reports. Refresh failure/recovery status is read from durable storage on each request, bypassing the process cache; unknown status is visibly stale. Stock pages display retrieval and calculation times in WIB.

## Peer normalization

Each metric selects its own valid comparison population. Prefer the same sector and subsector, then sector, then the available universe. A population must contain at least five valid observations, including the subject when valid. Every metric records its actual group and count. Universe fallback explicitly means the loaded universe, not all IDX listings. Market-derived metrics additionally require peers to have the exact same latest price date. Missing sector labels never create an artificial shared sector.

With `n` valid observations, `b` observations strictly below the subject, and `t` equal observations, percentile is `100 × (b + (t − 1)/2) / (n − 1)`. Clamp to 0–100. This gives the unique minimum 0, unique maximum 100, and tie midranks; an all-equal group receives 50. Inverse metrics use `100 − percentile`. A singleton has no percentile. The public utility applies the same formula when the subject is absent (`t = 0`), centering its insertion position between adjacent ranks and clamping values beyond the endpoints.

Fundamental metrics are winsorized only when the selected valid population contains at least 20 values. Use linear interpolation at positions `(n−1)×0.025` and `(n−1)×0.975`; clip both peer observations and the subject to these bounds before ranking. Raw evidence is never overwritten. Price returns, volatility, drawdown and anomaly distributions are not winsorized. This limits tail distinctions but does not repair unreliable accounting observations.

## Signal factors

| Factor | Submetrics and original weights | Direction |
|---|---|---|
| Quality | ROE 35%, ROA 25%, net margin 25%, debt/equity 15% | Higher is favorable except debt/equity |
| Growth | Revenue YoY growth 50%, earnings YoY growth 50% | Higher |
| Valuation | P/E 50%, P/B 35%, dividend yield 15% | Lower multiples; higher yield |
| Momentum | 30-calendar-day return 40%, 90-day 40%, 365-day 20% | Higher |
| Risk | Annualized daily-return volatility 60%, maximum drawdown 40% | Lower |

For Financials, debt/equity is structurally omitted because it is not economically comparable to industrial leverage. Quality's remaining weights are divided by 0.85 before measuring coverage. Missing leverage for another sector still loses its original 15% coverage. Growth is available only when the adapter can derive a valid consecutive annual change with a positive base; no fabricated consistency or forecast metric is included.

Momentum return is `latestClose / anchorClose − 1`. The anchor is the last observation on or before latest date minus 30, 90 or 365 calendar days, at most seven calendar days before that target. No valid anchor means unavailable. Momentum is ranked relative to the selected peer group, rather than subtracting a sector series with inconsistent dates.

Risk uses at most the last 61 closes (60 returns) and requires at least 30 returns. Returns are `close_t / close_(t−1) − 1`. Intervals longer than seven calendar days are excluded from daily returns; if any such gap occurs in the risk window, risk is withheld. Volatility is sample standard deviation times `sqrt(252)`. Drawdown is the largest `1 − close/runningPeak` in that window. A constant price history has zero measured risk and may be ranked as such; a constant anomaly baseline has no Z-score.

For a factor, coverage is the sum of original valid submetric weights. Factor score is `sum(validMetricScore × originalMetricWeight) / validMetricWeightSum`. Partial factors retain their partial coverage even after score normalization. An available factor can have less than 60% coverage; the minimum is enforced on the overall Signal using original weighted inputs.

| Preset | Quality | Growth | Valuation | Momentum | Risk |
|---|---:|---:|---:|---:|---:|
| Balanced | 25 | 25 | 20 | 20 | 10 |
| Growth | 20 | 40 | 10 | 20 | 10 |
| Value | 25 | 15 | 40 | 10 | 10 |
| Quality | 45 | 20 | 15 | 10 | 10 |
| Momentum | 15 | 15 | 10 | 50 | 10 |
| Defensive | 35 | 10 | 15 | 10 | 30 |

Custom weights must be finite, nonnegative and total 100 (floating point tolerance `1e−8`). Original overall coverage is `sum(originalFactorWeight/100 × factorCoverage)` for available factors. If this is below 0.60, Signal is unavailable. Otherwise Signal is `sum(availableFactorScore × originalFactorWeight) / sum(availableFactorWeight)`. Missing values are never zero-filled. No intermediate score is rounded.

## Anomaly statistics

All baselines exclude the current observation. A component requires at least 30 valid values drawn from its previous 60 session slots. Missing values do not cause the window to reach arbitrarily further into the past. Sample standard deviation is `sqrt(sum((x−mean)²)/(n−1))`; zero or nonfinite standard deviation makes the Z-score unavailable. `z = (current−mean)/sampleStd`. The centered mean implementation ensures a truly constant baseline remains exactly zero-variance.

| Component | Weight | Current observation and prior baseline |
|---|---:|---|
| Volume | 30% | Latest shares traded versus the preceding 60 volume slots |
| Price | 25% | Latest daily return versus valid returns in the previous 60 interval slots |
| Volatility | 20% | Sample SD of the current 10 contiguous daily returns versus the previous 60 rolling 10-return SD slots |
| Sector divergence | 15% | Latest company daily return minus equal-weight peer daily return, versus preceding residual slots |

The latest return must end on the latest close date. An older valid return cannot masquerade as the current observation after a gap. Rolling volatility windows must have ten contiguous return intervals. Prior rolling windows can overlap, but none includes the current return; the observations are not statistically independent.

Sector divergence excludes the subject ticker. Each residual needs at least three other companies in the same known sector with returns sharing exactly the same start and end dates. Equal-weight peer return is calculated separately for each interval. Historical residuals must satisfy the same rule, with at least 30 valid residuals in the prior window. No peers or mismatched intervals means unavailable. This controls for a shared sector move but does not establish causation; changing peer availability can change the reference composition.

For each valid component, magnitude score is `100 × (1 − exp(−abs(z)/2))`. Invalid values return unavailable, never a zero score. The signed Z-score and direction relative to the historical mean are retained. The price return itself is also retained: a negative price Z-score does not necessarily mean the price fell, only that its return was below its historical mean. `percentDifference = 100 × (current−mean)/abs(mean)` when the mean is nonzero; this statistic is unavailable at zero mean and can be unstable for means near zero.

Trading activity's proposed 10% is structurally omitted because the documented daily endpoint supplies neither actual transaction value nor trade frequency. Available original component weights therefore total 0.90. Anomaly coverage is `sum(validOriginalWeights)/0.90`. At least 60% coverage is required. Anomaly score is `sum(validComponentScore × originalWeight)/sum(validOriginalWeights)`. The primary trigger is the valid component with the greatest weighted contribution, not necessarily the largest raw Z-score.

| Score, before display rounding | Label |
|---|---|
| 0 ≤ score < 40 | Normal |
| 40 ≤ score < 60 | Watch |
| 60 ≤ score < 75 | Elevated |
| 75 ≤ score < 90 | Unusual |
| 90 ≤ score ≤ 100 | Extreme |
| Unavailable | Unavailable |

## Interpretation limits

This is a descriptive screening tool with a deliberately small, configured universe. Relative ranks can change when the loaded universe changes. Annual financial periods may differ between companies and are disclosed rather than silently synchronized. Raw closing prices may contain splits, dividends or other corporate-action effects; no unverified adjustment is assumed. Prices do not imply total returns. Sparse volume, suspensions and changing peer composition can affect anomaly estimates. Z-scores and the exponential transform are not probabilities, significance tests, forecasts, or calibrated confidence levels. Overlapping rolling volatility windows and non-normal market returns preclude those interpretations. Fixture mode is synthetic demonstration data, separate from Sectors live mode.

Validation covers numeric primitives, exact preset weighting, missing metric coverage, five-observation peer minimums, Financials exclusions, date integrity, stale history, zero variance, calendar momentum, winsorized ties, direction, baseline exclusion, and exact leave-one-out sector alignment.
