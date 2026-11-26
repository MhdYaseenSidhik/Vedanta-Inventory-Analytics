# Forecast ticket (HZL_DEMO_01, 11 months) - run status

Run 1 (2026-11-25): trained experiment and forecast; downloads were blocked by the sandbox proxy.
Run 2 (2026-11-26T07:40Z): downloads worked; forecast_holdout.json, forecast.json, manifest.json and SCHEMA.md built by `scripts/build_forecast.py`.

## Read back from Context Flow
- Experiment `6b06f01b16aa18df48697254`, createdAt 2026-11-25T14:26:35.911Z, succeeded, best model WeightedEnsemble (RMSE 11.924287), predictionLength 11, 5,960 series.
- Backtest (`/forecast-evaluation`, 65,560 rows, 5,960 series, 2025-02..2025-12): MAE 5.4769, WAPE 1.1722 (above 1), summed predicted 158,402 vs actual 305,802.
- Forecast asset `6b06f0f116aa18df48697265`: 65,560 rows, 5,960 series x 11 months, 2026-01..2026-11.
- Training asset `6b06d4af5be48659f48aca60` (214,560 rows): MATERIAL_TYPE only ZSPR (133,452) and ZSPN (81,108), no nulls.

## Not verifiable
- Context Flow's own train/test files are not an approved prepare_download route (only `/assets/<id>/dataset` and `/automl/experiments/<id>/forecast-evaluation` are). MATERIAL_TYPE in those files and their row counts (148,999 / 65,560) were NOT read back. Derived from the training asset with the documented split (last 11 months held out): train 149,000 rows (5,960 x 25), test 65,560 rows; test = the backtest file row count.
- generalization.verdict not read back (experiment response too large).
