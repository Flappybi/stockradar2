# Verified Sectors data map

Official v2 documentation inspected 2026-09-20. Contract verified from docs; authenticated live verification requires SECTORS_API_KEY.

Sources: [report](https://docs.sectors.app/api-references/v2/indonesia/report/company-report), [daily](https://docs.sectors.app/api-references/v2/indonesia/transaction/daily), [authentication](https://docs.sectors.app/get-started/v2/overview).

Base URL https://api.sectors.app/v2. Authorization header is the raw API key (no Bearer prefix). Report GET /company/report/{symbol}/?sections=overview,financials,valuation,dividend. Daily GET /daily/{symbol}/?start=YYYY-MM-DD&end=YYYY-MM-DD, max 90 calendar days per request. Symbols accept four letters with optional .JK. Daily returns an array; report returns an object.

| Feature | Verified raw field | Transformation |
|---|---|---|
| Identity | symbol, company_name, overview.sector/sub_sector/industry | Strip .JK from canonical ticker |
| Price freshness | overview.latest_close_date; daily[].date | Preserve separately from fetchedAt |
| ROE, ROA, net margin | financials.historical_financial_ratio[].profitability.roe/roa/net_profit_margin | Latest annual year; decimal ratios |
| Leverage | financials.historical_financial_ratio[].leverage.debt_to_equity_ratio | Latest annual year; not scored for Financials |
| Growth | financials.historical_financials[].year/revenue/earnings | Consecutive annual YoY with positive base |
| P/E and P/B | valuation.historical_valuation[].year/pe/pb | Latest annual year, positive multiples only, preserve valuation period |
| Dividend yield | dividend.yield_ttm | Decimal yield, optional |
| Momentum | daily[].date/close | Trailing 30/90/365 calendar day price returns |
| Risk | daily[].close | Sample daily-return volatility and maximum drawdown |
| Volume anomaly | daily[].volume | Current vs previous 60 sessions; min 30 |
| Price anomaly | daily[].close | Current daily return vs previous 60 returns |
| Volatility anomaly | daily[].close | Current 10-return sample SD vs past rolling 10-return SDs |
| Sector divergence | multiple companies' daily[].date/close | Leave-one-out equal-weight sector daily returns on identical date intervals |

Daily volume is shares. Prices are IDR. The documented daily endpoint has no transaction-value or frequency field; activity factor is omitted and weights renormalized. No inferred price x volume transaction value is presented as a reported value. No analyst forecasts, price targets, or ratings feed scores. Missing fields remain absent. Historical annual valuation is not presented as current TTM valuation.

Client-generated provenance is separate from provider fields: cached responses retain `{ raw, fetchedAt }`, `reportWithMetadata()` exposes report retrieval, and `daily()` exposes the oldest contributing retrieval plus each chunk's date range and retrieval time. Canonical `reportFetchedAt` and `marketFetchedAt` preserve these times; `fetchedAt` is their minimum. Re-ingestion does not relabel a cached response as freshly fetched.
