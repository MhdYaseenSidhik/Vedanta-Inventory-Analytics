#!/usr/bin/env python3
"""Verify the MATERIAL_TYPE covariate and the split sizes of a Context Flow forecasting experiment.

Usage: python3 scripts/verify_experiment_files.py <training_asset.csv> <holdout.csv>
  training_asset.csv  /api/v1/assets/<trainAssetId>/dataset (the file the experiment was created on)
  holdout.csv         /api/v1/automl/experiments/<id>/forecast-evaluation (the backtest)

Context Flow's own train/test files are not an approved prepare_download route, so the split is derived from
the training asset with the documented rule (chronological, last predictionLength months of every series held
out) and checked against the backtest file. Baselines are diagnostics only and are never published.
"""
import sys
import pandas as pd

PL = 11
d = pd.read_csv(sys.argv[1])
h = pd.read_csv(sys.argv[2])
cut = sorted(d.MONTH_START.unique())[-PL - 1]
tr, te = d[d.MONTH_START <= cut], d[d.MONTH_START > cut]
print("asset", d.shape, "series", d.SERIES_ID.nunique(), "months", d.MONTH_START.nunique(), d.MONTH_START.min(), d.MONTH_START.max())
print("MATERIAL_TYPE in columns:", "MATERIAL_TYPE" in d.columns, "| nulls:", int(d.MATERIAL_TYPE.isna().sum()), "| values:", sorted(d.MATERIAL_TYPE.unique()))
print("target total", round(d.NET_CONSUMPTION_QTY.sum(), 3), d.groupby("MATERIAL_TYPE").NET_CONSUMPTION_QTY.sum().round(3).to_dict())
print("derived train", len(tr), tr.MONTH_START.min(), tr.MONTH_START.max(), tr.MATERIAL_TYPE.value_counts().to_dict())
print("derived test ", len(te), te.MONTH_START.min(), te.MONTH_START.max(), te.MATERIAL_TYPE.value_counts().to_dict())
print("backtest rows", len(h), "series", h.item_id.nunique(), "has MATERIAL_TYPE column:", "MATERIAL_TYPE" in h.columns)
a = h.actual.abs().sum()
print("MAE", round(h.absolute_error.mean(), 4), "WAPE", round(h.absolute_error.sum() / a, 4), "sum actual", round(h.actual.sum(), 1), "sum predicted", round(h.predicted.sum(), 1))
for c in ["PLANNED_MAINT_QTY", "PLANNED_SHUTDOWN_QTY", "PLANT_SHUTDOWN_FLAG", "SEASON_INDEX", "MONTH_OF_YEAR"]:
    print(f"covariate {c}: non-zero share {(d[c] != 0).mean():.4f}, distinct {d[c].nunique()}, corr with target {d[c].corr(d.NET_CONSUMPTION_QTY):.4f}")
print("target zero share", round((d.NET_CONSUMPTION_QTY == 0).mean(), 4), "| held-out zero share", round((h.actual == 0).mean(), 4))
print("annual target totals", d.assign(y=d.MONTH_START.str[:4]).groupby("y").NET_CONSUMPTION_QTY.sum().round(1).to_dict())
base = {
    "zero": pd.Series(0.0, index=tr.SERIES_ID.unique()),
    "train mean": tr.groupby("SERIES_ID").NET_CONSUMPTION_QTY.mean(),
    "last 12m mean": tr[tr.MONTH_START > sorted(d.MONTH_START.unique())[-PL - 13]].groupby("SERIES_ID").NET_CONSUMPTION_QTY.mean(),
    "last value": tr[tr.MONTH_START == cut].set_index("SERIES_ID").NET_CONSUMPTION_QTY,
}
for n, s in base.items():
    p = h.item_id.map(s)
    print(f"baseline {n}: WAPE {(h.actual - p).abs().sum() / a:.4f}, predicted/actual {p.sum() / h.actual.sum():.3f}")
