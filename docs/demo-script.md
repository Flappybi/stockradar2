# Three-minute StockRadar demonstration

Before starting, choose the source mode honestly. For fixture mode say: “This demonstration uses clearly labeled synthetic inputs; the same analytical pipeline accepts validated Sectors data.” For live mode, first complete the runbook's authenticated checks and ingest a current snapshot.

**0:00–0:20 — Problem.** “Financial data is abundant, but deciding which companies deserve deeper research requires connecting fundamentals and market behavior. StockRadar makes that connection transparent.”

**0:20–0:40 — Overview.** Show company count and source date. “These are companies in our configured research universe. Signal and Anomaly are distinct questions.” Point to the two ranked lists.

**0:40–1:20 — Screener.** Open Screener, switch Balanced to Growth, and show the weights and ranking changing. Sort a column and filter a sector. Briefly make the total invalid: “The model refuses to calculate until weights total 100%. Missing source inputs also reduce coverage rather than becoming zero.” Reset filters.

**1:20–2:00 — Company evidence.** Open BBCA or a company selected from the results. Show both scores, the factor profile, financial periods, raw metrics and peer-group detail. Explain that the stock page uses Balanced regardless of custom screener weights. Show the historical price and volume chart.

**2:00–2:25 — Market Radar.** Show a high-anomaly company and its primary trigger. “The current observation is compared with prior history. A high score means unusual behavior, not a prediction or a recommendation.” Show signed Z-score and baseline observation count.

**2:25–2:45 — Research brief.** Generate the brief or show cached text. If Gemini is unavailable, explicitly identify the deterministic fallback. “Gemini only translates calculated evidence. It cannot choose or modify the score, invent a cause, or search for outside facts.”

**2:45–3:00 — Transparency.** Open Methodology. “Sectors provides the market data. StockRadar creates the derived intelligence. Gemini explains it. All three roles are visible and testable.”
