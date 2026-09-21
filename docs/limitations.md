# Current limitations

- Authenticated Sectors requests, PostgreSQL migrations/connectivity, and Gemini inference require operator credentials. None should be marked verified solely from schema fixtures or mocked tests.
- The app analyzes an explicitly configured universe, default 15 companies, maximum 40. This is not a whole-IDX scanner. Peer percentiles depend on that universe.
- Demo values and peer classifications are synthetic. Demo weekdays include exchange holidays and are not historical market records.
- Financial ratios and P/E/P/B are historical annual values. Periods are shown; the MVP does not synchronize every company's reporting year or impose an annual age cutoff.
- Daily prices are unadjusted. Corporate actions, stale prices, suspensions and illiquidity can affect returns and anomaly signals.
- A historical volatility Z-score with overlapping windows is descriptive, not a calibrated significance probability. Normality is not assumed or established.
- Sector residuals use equal-weight peers available on matching intervals. Changing membership can shift that baseline.
- The integrated Sectors daily endpoint does not provide transaction value/frequency; the trading-activity factor is omitted. No fabricated substitute is used.
- Live ingestion is an explicit job, not a public request. Run it from a worker or developer machine with enough runtime. In-process cache and AI rate limiting are per process; deployment scale multiplies the provider budget. Use provider quotas and a distributed rate limiter before heavy public traffic.
- The brief validator enforces a constrained numeric/reference vocabulary and blocks clear prohibited claims, but cannot prove that every qualitative sentence is true. Invalid output falls back to deterministic text. No live Gemini success is claimed without an account-level test.
- No authentication, saved cloud screeners, portfolio management, trading, or personalized advice is provided.
- There is no public deployment yet. Follow the runbook and verify live source labels, persistence across restart, stale fallback, and Gemini before presenting a live demo.
