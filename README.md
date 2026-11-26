# Vedanta-Inventory-Analytics

## Tests

One command runs everything the pipeline runs:

```bash
npm ci
npx playwright install chromium   # once; the browser suite needs it
npm run test:all
```

| Command | What it runs | Needs |
|---|---|---|
| `npm test` | Vitest: unit and screen tests under `src/` plus the data-contract tests under `tests/data/` (about 140 tests, under 30 s) | Node 20 |
| `npm run test:data` | Only `tests/data/`: the published JSON, `manifest.json`, `SCHEMA.md` and `work/sql/` | Node 20 |
| `npm run test:e2e` | Playwright: builds the app, serves the production build and walks all six screens at 1440 and 390 wide | Chromium |

Environment: `E2E_PORT` (default 4173) is the port the Playwright preview server binds. With `CI` unset an already-running server on that port is reused; with `CI=true` the port must be free.

### What the tests cover

They are written from the acceptance criteria, not from the implementation.

- `tests/data/refresh.test.ts`: the six refresh files, manifest and `SCHEMA.md` exist; `asOf` is the data date (2025-12-31) and 2023 backcast is present; the disclaimer says the figures are simulated; only HZL_DEMO_01..06 and ZSPR/ZSPN are published; manifest row counts equal the `work/sql` headers and the files; the SQL in the manifest is the SQL on disk; summary reconciles to materials; `variancePct` is null (not 0) when the plan is 0.
- `tests/data/forecast.test.ts`: forecast covers 2026-01 to 2026-11 with horizons 3, 6 and 11 and a 10-90% band; `materialType` (ZSPR/ZSPN) on every series; 5,960 series (3,707 / 2,253); the backtest is a separate file, never overlaps forecast months and is marked "not a forecast"; the published MAE and WAPE are recomputed from the published rows; the training SQL uses `DIM_MATERIAL.MATERIAL_TYPE` (not `PR_TYPE`), net consumption 261 minus 262, and is not pre-split.
- `tests/data/sql-log.test.ts`: every statement under `work/sql/` is numbered without gaps, has Purpose / Result rows / Data asset id headers, and is a single read-only SELECT.
- `tests/e2e/dashboard.spec.ts`: six screens with disclaimer and as-of date and no console errors; the global filters (plant, type, group, criticality, month range) and the URL state; the plant -> group -> material drill-down; the 3 / 6 / 11-month selector and the ZSPR / ZSPN filter; the backtest label and the WAPE warning; light and dark themes; failure paths (missing file, wrong `schemaVersion`, forecast unavailable); no sideways scroll at 390 wide.

### Not covered by these tests

Values inside Context Flow cannot be read from the repository, so these are not asserted: that the experiment's `createdAt` is after the run started (only that it is a valid time before the file was generated), the experiment's train and test files (148,999 / 65,560 rows and the `MATERIAL_TYPE` column in them), and the pre-sync training-set totals (5,960 series, 743,264.327 target total), which are only checked as far as the `work/sql` headers record them. Visual quality (layout, spacing, colour) is judged by eye in the browser, not by these tests.
