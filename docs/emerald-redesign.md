# Emerald workspace and device watchlist

26 September 2026. The user selected an emerald premium direction: dark sidebar, light content and green accents, with a watchlist saved on the device. The existing Sectors/Gemini integrations and score calculations are preserved.

## Design system

Reference: [emerald-concept.png](emerald-concept.png), 1536 × 1024. Sidebar `#092f28`, workspace `#f3f6f5`, white panels, mint primary action `#c5efbc`, emerald scores and amber anomaly accents. Georgia editorial headings pair with Arial interface text. Panels use 13–15px corners, fine cool-green borders and restrained shadows. Lucide supplies the existing brand and navigation icons. The main surfaces remain tables rather than a card grid.

The shared CSS treatment applies to overview, screener, radar, company details, methodology and watchlist. Mobile turns the sidebar into a five-item navigation strip and stacks research tables. Motion is limited to hover transitions and honors reduced-motion preferences.

## Watchlist behavior

Only valid four-letter ticker identifiers are stored in `stockradar-watchlist-v1` in localStorage, with a maximum of 200. Buttons show their current state, have ticker-specific accessible names and use `aria-pressed`. Same-tab changes update immediately; storage events update other open tabs. Every mutation reads the latest stored list. Simultaneous writes in different tabs are still last-write-wins; this is a browser convenience feature, not a synchronized account database.

Corrupt stored values are ignored. Failed writes display an explicit error and do not claim a successful save. A saved ticker outside the current universe remains removable, with unavailable scores rather than invented values. The page retains the saved list if provider data is unavailable. Clearing browser data removes it; other browsers and devices have separate lists.

## Visual fidelity ledger

The concept and production captures were inspected with `view_image`, with browser checks in IAB and Playwright captures at 1536 × 1024 and 375 × 812 viewports.

| Comparison | Implementation and reason |
|---|---|
| Layout | Preserves dark left navigation, search bar, emerald hero, four-stat band, two research tables and learning band. Mobile stacks the tables. |
| Palette | Preserves cool gray workspace, pure white panels, emerald surfaces, mint actions and amber anomaly scores. |
| Typography | Preserves serif editorial headings and compact sans-serif controls; tables retain tabular numeric alignment. |
| Controls and copy | Navigation and both hero actions match the design direction. Existing complete synthetic-data disclosure and score definitions remain; mockup-only keyboard shortcut and dropdown controls are omitted. |
| Brand and icons | Uses the application's existing Lucide Radar mark and neutral ticker monograms, rather than invented company logos. |
| Data and spacing | Actual rankings, dates and numeric anomaly scores replace illustrative concept values. Existing Momentum column, observation notes and full explanations remain, so the desktop page is taller than the concept. |

Above-the-fold copy was checked against existing product copy and the concept. Intentional differences are the retained detailed demo disclosure, actual calculated values and dates, retained stat notes and functional watchlist entry. No speculative live market claims or decorative controls were added. The implementation follows the selected composition with these documented adaptations.

## Verification

Production build, ESLint, TypeScript, 100 unit tests and all 12 browser tests passed. Browser coverage includes existing research and splash workflows plus saving from company pages and the screener, reload persistence, removal, cross-tab synchronization, malformed saved data, out-of-universe tickers and blocked browser storage. Browser checks use explicit fixture mode and do not establish authenticated live-provider behavior.
