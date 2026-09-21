# Deployment

Use Node.js 22 or newer, pnpm, a PostgreSQL database and the Next.js runtime. Vercel is the intended web host; a separate scheduled worker or developer machine runs ingestion. The repository is deployable, but no production site or authenticated provider connection is claimed without credentials and a successful smoke test.

## Local demo

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and set `DATA_MODE=fixture`.
3. Run `pnpm dev`; open the local URL printed by Next.js.
4. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm test:e2e` before shipping.

Fixture mode requires neither PostgreSQL nor API keys. The UI labels all generated prices, financials and scores as synthetic. `pnpm scores` recalculates the deterministic fixture universe in memory.

## Live setup

Keep the following only in the server environment:

```dotenv
DATA_MODE=sectors
SECTORS_API_KEY=<your Sectors key>
SECTORS_API_BASE_URL=https://api.sectors.app/v2
SECTORS_TICKERS=BBCA,BBRI,BMRI,BBNI,BBTN,ICBP,INDF,MYOR,UNVR,ROTI,ADRO,PTBA,ITMG,MEDC,PGAS
DATABASE_URL=<PostgreSQL connection string>
GEMINI_API_KEY=<optional Gemini key>
GEMINI_MODEL=<currently available model configured by the operator>
```

Use a trusted server role for the database; never expose its connection string or API keys as `NEXT_PUBLIC_*`. On Supabase, use the provider-recommended direct or pooler connection and its TLS requirements. Prepared statements are disabled. Web requests use at most three connections per process, so account for host concurrency when sizing the database.

Run these commands from the repository root:

```sh
pnpm db:migrate
pnpm ingest
pnpm scores
```

The scripts load `.env.local`. Ingest and score scripts need Node's `react-server` condition because they import modules guarded with `server-only`; the package scripts supply `--conditions=react-server`. For a worker with environment variables supplied externally, omit the environment-file option:

```sh
pnpm exec tsx --conditions=react-server scripts/ingest.ts
```

`db:migrate` applies checked-in SQL migrations transactionally and is safe to repeat. `db:generate` generates proposed Drizzle migrations into `lib/db/generated`; review generated SQL and add an ordered migration to `lib/db/migrations` before deployment. Generated migrations are not applied automatically.

`ingest` validates the fixed Sectors origin and ticker list, fetches report and daily data, computes scores and commits a complete universe. It requires `DATABASE_URL` before consuming upstream API quota. The default 15 companies require at most 90 cold-cache requests before retries (one report plus five daily windows per company). Requests are sequential to bound pressure. Allow several minutes and confirm the Sectors plan permits the configured endpoints, symbols and volume. Forty companies is the enforced maximum for this MVP.

A failed ingestion returns a nonzero exit code even when an older snapshot remains available. The prior complete snapshot is retained and labeled stale. Without a prior snapshot, the web UI shows an explicit configuration/ingestion state. Inspect command output for `source: sectors`, `stale: false`, expected company count and sensible timestamps. Do not equate fixture-mode success with authenticated Sectors validation.

`scores` reads saved canonical inputs and recomputes the current analytics version without querying Sectors. Live scores are written transactionally; input timestamps remain unchanged. If the analytics version or configured universe changes, run a new ingestion to establish that universe's snapshot.

## Web hosting

1. Import the project into Vercel as Next.js and select the `stockradar` directory as the root if the repository wraps this folder.
2. Add the server variables in the correct preview/production environment. Add `NEXT_PUBLIC_APP_URL` only for the public application origin if needed.
3. Run migrations and ingestion against the same database before inviting users. The web build must not perform ingestion.
4. Deploy after lint, type checking, unit tests, production build and the fixture E2E flow pass.
5. Check dashboard, screener, radar, one stock detail and explanation generation. Confirm source badges, dates and no exposed credentials in network responses.

Run ingestion from an external scheduled worker after market close and as often as the product's freshness promise requires. It is intentionally not attached to a public HTTP route or a short-lived serverless request. Market data retrieved over six hours ago or reports retrieved over 24 hours ago make a snapshot visibly stale. Cache hits preserve original retrieval times. Reads re-evaluate market-based scores when saved history crosses the seven-day cutoff. Refresh status bypasses process memory so web instances can observe job failures and recovery. Configure job failure notifications at the scheduler.

## Operations and retention

The in-memory fallback is per process and temporary. Use PostgreSQL for durable snapshots, raw input history and explanations. Keep database backups. All tables are server-only and RLS is enabled without anonymous-access policies.

Expired cache rows can be pruned periodically by an authorized database maintenance task:

```sql
DELETE FROM response_cache WHERE expires_at < now();
```

Versioned raw snapshots and scores grow on each new successful ingestion. Choose and document a retention period before long-term use; do not remove the latest complete dataset or the source inputs required to reproduce retained scores. Review logs for generic cache/database availability warnings; raw provider payloads and connection strings must not be logged.

## Required live smoke tests

- Confirm the configured Sectors account authorizes report and daily endpoints with raw `Authorization` authentication.
- Run migrations twice to verify permissions and idempotency against your PostgreSQL service.
- Ingest, restart the web process, and verify the persisted complete snapshot loads.
- Force a failed refresh in a nonproduction environment and verify the old timestamp and stale warning remain visible.
- Test Gemini generation with the selected account/model and verify deterministic fallback when credentials or quota are unavailable.

Authenticated Sectors, Gemini and hosted PostgreSQL checks require operator credentials; documentation and local fixture tests cannot substitute for these checks.
