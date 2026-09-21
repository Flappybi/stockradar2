# StockRadar implementation plan

Goal: a deployable modular Next.js research application implementing the supplied StockRadar brief.
Spec: original user master engineering prompt, preserved in work/request.md outside deliverables.

## Architecture and decisions
Server-only Sectors v2 adapter -> canonical snapshots -> pure TypeScript analytics -> stored analyses -> server-rendered routes and client controls. Gemini receives only curated calculated context. PostgreSQL/Drizzle persists snapshots and explanation cache; fixture mode also works without a database. Live mode never falls back to fixtures. Research universe is an explicit configurable ticker list, not a claim to cover all IDX companies.

## Tasks
- [x] Foundation and verified data map: strict TS, Next, pnpm, environment config, Zod boundary schemas, adapters, deterministic fixtures. Verify invalid/null payloads and historical selection.
- [x] Analytics: test percentile ties, winsorization, absent values, invalid ratios, coverage, weights, Z-score and zero variance, past-only anomaly baselines, date-aligned sector divergence. Implement pure functions and check expected values.
- [x] Pipeline: bounded Sectors requests, 90-calendar-day chunks, request caching, idempotent Postgres persistence, stale fallback with provenance. Add ingest and recalculation commands.
- [x] AI: schema, curated context, semantic validation, bounded retry, timeout, cache, concurrent request coalescing, rate limit, deterministic fallback. Test invalid facts and provider failures.
- [x] Product: overview, screener with six presets/custom weights/filter/sort, radar, stock details/charts/brief, methodology, global search and responsive states.
- [x] Verification: lint, types, unit/integration tests, production build, desktop/mobile Playwright flow, browser inspection, independent whole-project review, documentation and deployment runbook.

## Review focus
Local implementation and validation are complete. Authenticated Sectors, Gemini, PostgreSQL and deployment gates remain pending; see verification.md.

Missing observations must never become zero. Peer distributions must have enough valid observations. The current session must be excluded from anomaly baselines. Sector series must be aligned by date. AI cache must include the full context, model, prompt and score version. A failed live refresh must visibly identify stale data. No API key may enter client imports or errors.

## Visual system
Reference: docs/design-concept.png (1536 x 1024). White main surface, cool gray sidebar, ink #101c26, green #075c40, amber #a96708, border #dfe5e9. Editorial serif headings, system sans controls, tabular numbers. Sidebar 220px, main gutter 28px, fine bordered tables and horizontal stats. Lucide outline icons, 6px radii. Native CSS responsive tables preserve company and headline scores. Intentional changes: populate computed values, remove nonfunctional avatar, use exact research-ranking language instead of attractiveness, label synthetic fixtures, show real data freshness.


