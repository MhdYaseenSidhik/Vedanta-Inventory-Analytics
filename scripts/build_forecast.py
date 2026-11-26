#!/usr/bin/env python3
"""Build public/data/forecast_holdout.json and forecast.json from Context Flow downloads, update manifest.json.

Usage: python3 scripts/build_forecast.py <dl_dir> <meta.json>
  dl_dir  holds train_full.csv (training asset), holdout.csv (forecast-evaluation), forecast.csv (forecast asset)
  meta    {"experiment": {...}, "forecastAssetId":..., "trainAssetId":..., "trainSyncId":..., "integrationId":...,
           "leaderboard": [...], "generatedAt": ...}
Never computes a forecast: every predicted/lower/upper value is copied from the Context Flow files.
"""
import json, os, sys
import pandas as pd

OUT = "public/data"
dl, meta = sys.argv[1], json.load(open(sys.argv[2]))
exp = meta["experiment"]
PL = exp["predictionLength"]
HORIZONS = [h for h in (3, 6, 11) if h <= PL]


def dump(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)


def r(x, n=4):
    return None if pd.isna(x) else round(float(x), n)


# material attributes from the already published materials.json (same DIM_MATERIAL source)
mat = pd.DataFrame(json.load(open(f"{OUT}/materials.json"))["rows"])[["materialId", "materialGroup", "materialType"]].drop_duplicates("materialId")
train = pd.read_csv(f"{dl}/train_full.csv")
types = train[["SERIES_ID", "MATERIAL_TYPE"]].drop_duplicates()
assert types.MATERIAL_TYPE.notna().all() and set(types.MATERIAL_TYPE) == {"ZSPR", "ZSPN"}


def attach(df, sid):
    df = df.copy()
    df["seriesId"] = df[sid]
    df["materialId"] = df.seriesId.str.split("|").str[0]
    df["plantId"] = df.seriesId.str.split("|").str[1]
    df = df.merge(mat, on="materialId", how="left").merge(types.rename(columns={"SERIES_ID": "seriesId"}), on="seriesId", how="left")
    assert df.materialGroup.notna().all() and (df.materialType == df.MATERIAL_TYPE).all()
    return df


# ---- holdout (backtest)
h = pd.read_csv(f"{dl}/holdout.csv")
h["month"] = h.timestamp.str[:7]
h = attach(h, "item_id")
mae = float(h.absolute_error.mean())
wape = float(h.absolute_error.sum() / h.actual.abs().sum())
act, pred = float(h.actual.sum()), float(h.predicted.sum())
reasons = []
if wape >= 1:
    reasons.append(f"WAPE {wape:.4f} is above 1: the backtest is no better than predicting zero on the held-out months.")
if not (0.5 * act <= pred <= 2 * act):
    reasons.append("Predicted total is outside 0.5x-2x of the actual total.")
else:
    reasons.append(f"Summed predicted {pred:,.1f} is {pred / act:.2f}x summed actual {act:,.1f} (the model under-forecasts demand).")
pm = h.groupby(["plantId", "month"], as_index=False)[["actual", "predicted"]].sum()
hold = {
    "kind": "backtest",
    "note": "Predictions for held-out months the model did not see; not a forecast of future months. "
            f"Months {h.month.min()} to {h.month.max()} ({PL} months). WAPE {wape:.4f} is above 1, i.e. no better than predicting zero.",
    "experimentId": exp["id"], "predictionLength": PL,
    "metric": exp["metric"], "error": {"mae": round(mae, 4), "wape": round(wape, 4)},
    "leaderboard": meta["leaderboard"],
    "byPlantMonth": [{"plantId": a.plantId, "month": a.month, "actual": r(a.actual), "predicted": r(a.predicted)} for a in pm.itertuples()],
    "series": [
        {"seriesId": a.seriesId, "materialId": a.materialId, "plantId": a.plantId, "materialGroup": a.materialGroup,
         "materialType": a.materialType, "month": a.month, "actual": r(a.actual), "predicted": r(a.predicted),
         "lower": r(a.lower), "upper": r(a.upper)} for a in h.itertuples()],
}
dump("forecast_holdout.json", hold)

# ---- forecast
f = pd.read_csv(f"{dl}/forecast.csv")
f["month"] = f.MONTH_START.str[:7]
months = sorted(f.month.unique())
assert len(months) == PL and months[0] == "2026-01" and months[-1] == "2026-11", months
assert f.groupby("SERIES_ID").size().eq(PL).all()
f["horizon"] = f.month.map({m: i + 1 for i, m in enumerate(months)})
f = attach(f, "SERIES_ID")
tcol = [c for c in f.columns if c.endswith("_forecast")][0]
fpm = f.groupby(["plantId", "month", "horizon"], as_index=False)[tcol].sum()
fc = {
    "available": True, "reason": None, "kind": "forecast", "experimentId": exp["id"], "assetId": meta["forecastAssetId"],
    "predictionLength": PL, "forecastFrom": months[0], "forecastTo": months[-1], "horizons": HORIZONS,
    "note": f"Mean forecast (predicted) with the 10-90% band (lower = 0.1 quantile, upper = 0.9 quantile) for {months[0]} to {months[-1]}, "
            "plant HZL_DEMO_01 only, net consumption quantity (261 minus 262). horizon 1 = first month after the last history month (2025-12). "
            "The 3 / 6 / 11-month view shows rows with horizon up to 3, 6 or 11. byPlantMonth has no interval (quantiles cannot be summed). "
            f"Backtest WAPE is {wape:.4f} (above 1): treat this forecast as indicative only. Values are not clipped.",
    "byPlantMonth": [{"plantId": a.plantId, "month": a.month, "horizon": int(a.horizon), "predicted": r(getattr(a, tcol))} for a in fpm.itertuples()],
}
# itertuples cannot name numeric columns; build rows with explicit column access
q1, q9 = f["0.1"].tolist(), f["0.9"].tolist()
rows = []
for i, a in enumerate(f[["seriesId", "materialId", "plantId", "materialGroup", "materialType", "month", "horizon", tcol]].itertuples(index=False)):
    rows.append({"seriesId": a[0], "materialId": a[1], "plantId": a[2], "materialGroup": a[3], "materialType": a[4],
                 "month": a[5], "horizon": int(a[6]), "predicted": r(a[7]), "lower": r(q1[i]), "upper": r(q9[i])})
fc["rows"] = rows
dump("forecast.json", fc)

# ---- manifest (written last)
man = json.load(open(f"{OUT}/manifest.json"))
man["files"] = [x for x in man["files"] if x["name"] not in ("forecast_holdout.json", "forecast.json")]
sql = "work/sql/09_forecast_training.sql"
src = {"integrationId": meta["integrationId"], "syncId": meta["trainSyncId"], "assetId": meta["trainAssetId"], "sql": sql}
man["files"].append({"name": "forecast_holdout.json", "rows": len(hold["series"]), "generatedAt": meta["generatedAt"],
                     "source": {**src, "experimentId": exp["id"], "download": "/api/v1/automl/experiments/%s/forecast-evaluation" % exp["id"]}})
man["files"].append({"name": "forecast.json", "rows": len(rows), "generatedAt": meta["generatedAt"],
                     "source": {**src, "assetId": meta["forecastAssetId"], "trainAssetId": meta["trainAssetId"], "experimentId": exp["id"]}})
man["forecast"] = {
    "experimentId": exp["id"], "experimentCreatedAt": exp["createdAt"], "problemType": "time_series", "predictionLength": PL,
    "seriesCount": int(f.seriesId.nunique()), "bestModel": exp["bestModel"], "metric": exp["metric"],
    "backtestError": {"mae": round(mae, 4), "wape": round(wape, 4)},
    "verdict": exp["verdict"], "verdictReasons": reasons + exp.get("extraReasons", []),
    "forecastAssetId": meta["forecastAssetId"], "forecastFrom": months[0], "forecastTo": months[-1],
}
man["generatedAt"] = meta["generatedAt"]
dump("manifest.json", man)
print(json.dumps({"mae": mae, "wape": wape, "actual": act, "pred": pred, "holdRows": len(hold["series"]), "fcRows": len(rows),
                  "byPlantMonthHold": len(hold["byPlantMonth"]), "byPlantMonthFc": len(fc["byPlantMonth"]), "months": months}))
