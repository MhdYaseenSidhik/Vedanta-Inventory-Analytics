<!--
Purpose: verification of experiment 6b06f01b16aa18df48697254 (MATERIAL_TYPE covariate, train/test sizes, createdAt) - read back from Context Flow on 2026-11-26.
Result rows: no SQL was run in this check (0 query_preview, 0 sync). Nothing new was created in Context Flow.
Data asset id: none produced. Reads: training asset 6b06d4af5be48659f48aca60 (12,067,132 bytes, sha256 20975457be642944d57e18db566dfb5f0073dc57ae092f8e81616cbb8277f23a), backtest file of the experiment (11,645,251 bytes, sha256 85997156cf0097ae879f5d17bfc5758e2b2ee4c11a22888ad68118ccabd802f3).
Script: scripts/verify_experiment_files.py
-->
# Experiment 6b06f01b16aa18df48697254: file verification (run started 2026-11-26T08:49:49Z)

| Check | Result |
|---|---|
| Experiment status / createdAt | succeeded, createdAt **2026-11-25T14:26:35.911Z** (read back with get_experiment). This is **before** this run started (2026-11-26T08:49Z), but it is the experiment the ticket pointed at, created in the earlier session of the same goal. It is not a new experiment. |
| Experiment config (read back) | time_series, preset fast, predictionLength 11, RMSE, `covariateColumns` = MATERIAL_TYPE, PLANNED_MAINT_QTY, PLANNED_SHUTDOWN_QTY, PLANT_SHUTDOWN_FLAG, SEASON_INDEX, MONTH_OF_YEAR; dataset rows 214,560, cols 9, seriesCount 5,960, splitStrategy chronological_last_horizon, validationRowsPerSeries 11 |
| MATERIAL_TYPE in the training asset | present; values ZSPR 133,452 rows and ZSPN 81,108 rows; **0 nulls** |
| Training set pre-sync figures | 5,960 series, 36 months (2023-01 to 2025-12), 214,560 rows, target 743,264.327 (ZSPR 478,717.143, ZSPN 264,547.184): all match the ticket |
| Test file (derived: 2025-02 to 2025-12) | 65,560 rows (ZSPR 40,777, ZSPN 24,783). Matches the experiment's `diagnostics.rows` = 65,560 and the backtest file's 65,560 rows |
| Train file (derived: 2023-01 to 2025-01) | **149,000 rows** (5,960 x 25; ZSPR 92,675, ZSPN 56,325). The ticket quotes **148,999**: a difference of 1 row that I **cannot explain** |
| MATERIAL_TYPE in Context Flow's own train and test files | **NOT read back.** `prepare_download` only accepts `/assets/<id>/dataset` and `/automl/experiments/<id>/forecast-evaluation`; `/train`, `/train-data` and the data-diagnostics route were refused ("not an approved Context Flow binary download" / "failed experiments only"). The backtest file has no MATERIAL_TYPE column (it carries item_id, timestamp, actual, predicted, lower, upper and error columns only), so it is not evidence either way |
| Evidence that the covariate was passed | The experiment's stored `covariateColumns` and `cols: 9` include MATERIAL_TYPE, and its `featureImportance` lists MATERIAL_TYPE (score 0). So Context Flow received the column as a feature |

## Decision: no retrain
The ticket says to retrain only if MATERIAL_TYPE is **missing** or the counts **differ**. MATERIAL_TYPE is configured and was listed as a feature by Context Flow; the only difference is 1 train row (149,000 derived vs 148,999 quoted), which a retrain with the same SQL and the same `covariateColumns` would not change. A new experiment would reproduce the same setup, so I did not create one. forecast_holdout.json, forecast.json and manifest.json are unchanged. If someone can read the train file from Context Flow's UI, the two open points are: MATERIAL_TYPE in it, and the 148,999 count.

## Do the zero importances and the WAPE of 1.1722 trace to the covariate setup?
**Zero importance (all six covariates, incl. MATERIAL_TYPE): not caused by a wrong or missing covariate column; probable causes below, none proven.**
- Four of five numeric covariates carry almost no signal in this data. Non-zero share and correlation with the target: PLANNED_MAINT_QTY 1.0% / 0.007, PLANNED_SHUTDOWN_QTY 1.3% / 0.034, PLANT_SHUTDOWN_FLAG 19.4% / -0.004, SEASON_INDEX 144 distinct values (one per group x month) / 0.036, MONTH_OF_YEAR 12 values / -0.007. MATERIAL_TYPE has 2 values and is a series-level constant.
- The winning model is a WeightedEnsemble whose components include ETS, SeasonalNaive and Naive, which ignore covariates. Permutation importance of an ensemble that leans on those components is plausibly 0. The ensemble weights were not read back, so this stays a hypothesis.
- Open setup caveat, not verified: the training set ends 2025-12 and holds no rows for 2026. I did not read how Context Flow fills the covariates for the 11 forecast months. Known-future covariates (shutdown flag, planned maintenance and shutdown quantities) are not supplied by us. The forecast therefore relies on the target history for those months.

**WAPE 1.1722: not traced to the covariates.**
- Every point forecast tried on the same 65,560 held-out rows is at or above WAPE 1.0: always predict zero 1.0000; per-series training mean 1.2544; last-12-month mean 1.2786; last value 1.3646. The model's 1.1722 beats all three non-zero baselines. 71.2% of all target values are 0 (60.1% in the held-out months), so a mean forecast of an intermittent series pays an absolute error in every zero month, while predicting zero scores 1.0. A WAPE above 1 is expected for a mean forecast optimised for RMSE here.
- Level shift: annual target totals are 175,716 (2023), 235,668 (2024), 331,880 (2025). The held-out 11 months total 305,802 against 213,011 in the same months a year earlier (+44%). The model predicts 158,402 (0.52x the actual). All its history sits below the level of the test period, which is a trend and level problem, not a covariate problem.
- The error is the same for both material types (WAPE ZSPR 1.1754, ZSPN 1.1659), so MATERIAL_TYPE makes no visible difference. It is a little higher in shutdown months (1.241 against 1.151), which is consistent with the shutdown covariates being too sparse to help.
