# Forecast ticket (HZL_DEMO_01, 11 months) - run status 2026-11-25

Run started 2026-11-25T14:24:55Z. Everything below was read back from Context Flow in this run.

## Training set
- Asset `6b06d4af5be48659f48aca60`, sync `1cd81896-a42b-40a7-96dd-38715a99bedb`, 214,560 rows, 9 columns (SQL: `work/sql/09_forecast_training.sql`).
- Verified with query_preview before the sync (`07_*`, `08_*`): 5,960 series (ZSPR 3,707 / ZSPN 2,253), 214,560 rows (133,452 / 81,108), 36 months 2023-01-01..2025-12-01, MATERIAL_TYPE only ZSPR and ZSPN, target total 743,264.327 (478,717.143 / 264,547.184). All match the ticket.

## Experiment
- `6b06f01b16aa18df48697254`, createdAt 2026-11-25T14:26:35.911Z (after run start), status succeeded.
- predictionLength 11, preset fast, primaryMetric RMSE, covariateColumns MATERIAL_TYPE, PLANNED_MAINT_QTY, PLANNED_SHUTDOWN_QTY, PLANT_SHUTDOWN_FLAG, SEASON_INDEX, MONTH_OF_YEAR.
- Best model WeightedEnsemble, RMSE 11.924287 (validation). Next: DirectTabular 12.082721, ETS 13.308679.
- Context Flow's own backtest metrics (metrics.json): rows 65,560, series 5,960, MAE 5.476878, WAPE 1.172162, RMSE 44.989866.
  WAPE is above 1, i.e. no better than predicting zero on the held-out months. Do not present the backtest as accurate.

## Forecast
- `create_forecast` returned asset `6b06f0f116aa18df48697265` (`hzl01-netcons-11m-20261125-1958-v1-forecast.csv`, 65,560 rows, predictionLength 11).

## NOT done: forecast_holdout.json, forecast.json, manifest.json
The sandbox proxy returns 403 for the Context Flow download host and for storage.googleapis.com,
so the train/test/backtest/forecast CSVs could not be downloaded and converted by script.
Not verified for that reason: MATERIAL_TYPE in Context Flow's train/test files (148,999 / 65,560 rows) and the forecast months (2026-01..2026-11).
Nothing was hand-typed. See the PR description.
