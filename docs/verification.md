# Verification and acceptance status

Verified locally on 22 September 2026, including the welcome splash. The runnable demo is complete; authenticated external-service acceptance remains pending.

| Check | Result |
|---|---|
| `pnpm lint` | Passed, exit 0 |
| `pnpm typecheck` | Passed, exit 0 |
| `pnpm test --maxWorkers=1` | 96 tests passed in 10 files |
| `pnpm build` | Next.js production build passed, exit 0 |
| `PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_REUSE_SERVER=1 pnpm test:e2e` | 6 tests passed against the fresh production preview at desktop and mobile widths, exit 0 |
| Missing live credentials | API returns 503 with a generic message; page displays unavailable state; no synthetic fallback |
| In-app browser | Splash and overview rendered correctly, including a compact desktop viewport |
| Authenticated Sectors | Not verified: API key not configured |
| Authenticated Gemini | Not verified: API key not configured |
| PostgreSQL migration and restart persistence | Not verified: database connection not configured |
| Public deployment | Not performed |

The browser workflow covers welcome entry, keyboard focus, session memory, splash preview, direct research links, reduced motion, overview, rankings, Growth preset, saved weights after reload, invalid custom totals, sorting, empty search, company navigation, both score breakdowns, chart period changes, deterministic brief fallback, radar filtering, methodology, global search, and horizontal overflow. Request tests reject fabricated explanation context and unsupported tickers. The latest browser run reused a newly started production preview and exited normally. The first concurrent unit run hit a worker-start timeout after 94 passing tests; the full rerun with one worker passed all 96 tests.

## Independent review

A separate read-only review of analytics, persistence, provider boundaries and provenance identified three issues, now fixed and regression-tested:

1. Saved market scores survived their seven-day freshness cutoff. Reads now re-evaluate the peer universe at current time when a previously fresh history expires.
2. Process-cached refresh flags concealed failures and recovery in other processes. Status reads now bypass memory and use durable storage; unknown status is stale.
3. Cached Sectors responses were relabeled with a new ingestion timestamp. Cache envelopes now retain actual source retrieval times, which flow through canonical inputs, freshness checks, stock displays and AI context.

The review and mocked tests do not establish authenticated provider behavior or actual PostgreSQL execution.

## Visual inspection

The welcome screen's desktop/mobile comparison and intentional differences are recorded in [splash-design.md](splash-design.md).

Compared the 1536 × 1024 concept with the production screenshot at the same desktop viewport and inspected the 375px mobile layout. Five concrete comparisons:

- The left navigation, search header, editorial heading and two-column research tables preserve the concept's hierarchy.
- Serif headings and compact sans-serif controls preserve the intended typography; computed numerical values use tabular alignment.
- Green Signal styling, amber anomaly styling, light gray surfaces and thin borders preserve the intended color system.
- The four-stat band and five-row tables retain the intended structure; actual company names use two lines for readability.
- Mobile replaces the sidebar with a top navigation row, stacks tables and uses a two-column stat grid without horizontal overflow.

Intentional differences are the explicit synthetic-data notice, actual computed scores and dates, research-ranking language, accessible controls, and removal of the inactive avatar. These make the production page taller than the concept. Zero companies above the high-Signal threshold is a genuine fixture calculation and is not replaced with a fabricated positive count.

## Local tooling note

A pnpm dependency relink stalled in this Windows workspace. Existing locked package files and their links were repaired locally; all final commands above passed afterward. `verifyDepsBeforeRun: false` keeps run commands from implicitly reinstalling dependencies. Install explicitly with `pnpm install` after extracting the portable archive or changing dependencies. Dependency caches, local environment files, build output and browser traces are excluded from the archive.

## Remaining operator steps

Configure Sectors, Gemini and PostgreSQL credentials in the server environment, run migrations and ingestion, and execute the live smoke tests in [deployment.md](deployment.md). Check persistence after restart, source dates, failed-refresh behavior and one valid Gemini response before calling the live MVP fully accepted. No credentials should be pasted into a public issue or committed to source control.
