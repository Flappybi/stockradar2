# StockRadar engineering instructions

StockRadar is Indonesian market research for the Sectors Track 3 hackathon. Maintain separate deterministic Signal and Anomaly Scores; Gemini explains finished measurements.

Architecture: Sectors -> Zod -> canonical inputs -> pure analytics -> saved snapshots -> Next.js UI / grounded AI brief. Keep the modular monolith and existing TypeScript contracts.

- Never invent Sectors endpoints. Verify against official docs and update `docs/sectors-data-map.md` before changing adapters.
- Never calculate financial scores with an LLM.
- Never replace missing analytical values with zero.
- Never expose server credentials. Provider, database and service modules use `server-only`.
- Never silently replace failed live data with fixtures. Fixture mode is explicit and labeled.
- Retain source dates, financial/valuation periods, retrieval time, calculation time and analytical version.
- Preserve exact historical interval alignment and exclude current observations from anomaly baselines.
- Use strict TypeScript, Zod at external boundaries, pure small calculation functions, named constants and readable components.
- POST explanation accepts a ticker only; retrieve facts server-side. Do not enable a generic model proxy or web-search tools.
- Always run relevant tests after analytics changes. Add regression tests for quantitative and provider-boundary fixes.

Important directories: `lib/analytics`, `lib/sectors`, `lib/data`, `lib/db`, `lib/cache`, `lib/ai`, `components`, `app`, `tests`, `e2e`, `scripts`, `docs`.

Commands: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm db:migrate`, `pnpm ingest`, `pnpm scores`. Test the production build at desktop and mobile widths. Run database scripts with the documented server conditions. Never print environment values or provider authentication headers.

Definition of done: code and docs agree, local checks pass, core user workflows work, no invalid numeric display, and live integration/deployment claims have authenticated evidence. Missing credentials must be reported as unverified acceptance gates. Do not claim that a fixture test verifies a live provider.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
