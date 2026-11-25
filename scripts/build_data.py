#!/usr/bin/env python3
"""Convert the Context Flow data assets (CSV) into public/data/*.json (schemaVersion 3).

Usage: python3 scripts/build_data.py <csv_dir> <sources.json>
  csv_dir      holds dims.csv kpis.csv invsum.csv materials.csv reorder.csv pva.csv
  sources.json {"integrationId":..., "files": {"dims": {"syncId":..,"assetId":..,"sql":..}, ...}}
Writes public/data/{dims,kpis,inventory_summary,materials,reorder,plan_vs_actual}.json and manifest.json (last).
Existing forecast.json / forecast_holdout.json are kept untouched (manifest entries are carried over).
"""
import csv, json, os, sys, datetime as dt

OUT = "public/data"
REAL = {f"HZL_DEMO_0{i}" for i in range(1, 7)}


def rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def num(v):
    if v is None or v == "":
        return None
    f = float(v)
    return int(f) if f.is_integer() and "." not in v else f


def month(v):
    return v[:7]


def date(v):
    return v[:10] if v else None


def dump(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)


LOWER = ("excess", "non_moving", "non-moving", "slow_moving", "slow-moving", "obsolete", "backorder", "stockout",
         "understock", "delayed", "days_on_hand", "days_excess", "value", "shortage")
HIGHER = ("turnover", "availability", "potential", "target_reduction", "opportunity", "reduction")


def direction(code):
    c = code.lower()
    if any(k in c for k in HIGHER):
        return "higher_is_better"
    if any(k in c for k in ("po_", "pr_", "consumption", "count", "volume")) and not any(k in c for k in LOWER[:-2]):
        return "neutral"
    if any(k in c for k in LOWER):
        return "lower_is_better"
    return "neutral"


def build_dims(d):
    g = lambda k: [r for r in d if r["K"] == k]
    one = lambda k: g(k)[0]["NAME"]
    dims = {
        "plants": [{"plantId": r["CODE"], "name": r["NAME"], "type": r["EXTRA"], "region": r["EXTRA2"]}
                   for r in g("PLANT") if r["CODE"] in REAL],
        "materialGroups": [{"code": r["CODE"], "name": r["CODE"].replace("_", " ").title()} for r in g("GROUP")],
        "materialTypes": [{"code": r["CODE"], "name": r["CODE"]} for r in g("TYPE")],
        "criticality": [{"code": r["CODE"], "name": r["CODE"].title()} for r in g("CRITICALITY")],
        "movementClasses": [r["CODE"] for r in g("MOVEMENT_CLASS")],
        "inventoryStatuses": [r["CODE"] for r in g("INVENTORY_STATUS")],
    }
    return dims, one("DISCLAIMER"), one("ASOF")


def build_kpis(k):
    codes = sorted({r["KPI_CODE"] for r in k})
    uom = {r["KPI_CODE"]: r["KPI_UOM"] for r in k}
    catalog = [{"code": c, "label": c.replace("_", " ").title(), "uom": uom[c], "direction": direction(c),
                "definition": f"Monthly {c.replace('_', ' ').lower()} as published by INVENTORY_KPI_MONTHLY."}
               for c in codes]
    out = [{"month": month(r["MONTH"]), "plantId": r["PLANT_ID"], "kpiCode": r["KPI_CODE"],
            "value": num(r["KPI_VALUE"]), "scenario": r["SCENARIO"]} for r in k]
    return {"catalog": catalog, "rows": out}


def real_only(rs):
    return [r for r in rs if r["PLANT_ID"] in REAL]


def main():
    csvdir, src = sys.argv[1], json.load(open(sys.argv[2]))
    os.makedirs(OUT, exist_ok=True)
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    dims, disclaimer, asof = build_dims(rows(f"{csvdir}/dims.csv"))
    dump("dims.json", dims)
    counts = {"dims.json": sum(len(v) for v in dims.values())}
    kp = build_kpis(rows(f"{csvdir}/kpis.csv"))
    dump("kpis.json", kp)
    counts["kpis.json"] = len(kp["rows"])
    s = [{"plantId": r["PLANT_ID"], "materialGroup": r["MATERIAL_GROUP"], "materialType": r["MATERIAL_TYPE"],
          "criticality": r["CRITICALITY"], "movementClass": r["MOVEMENT_CLASS"],
          "inventoryStatus": r["INVENTORY_STATUS"], "abcClass": r["ABC_CLASS"], "materials": num(r["MATERIALS"]),
          "availableQty": num(r["AVAILABLE_QTY"]), "valueInr": num(r["VALUE_INR"])}
         for r in real_only(rows(f"{csvdir}/invsum.csv"))]
    dump("inventory_summary.json", {"asOf": asof, "rows": s})
    counts["inventory_summary.json"] = len(s)
    m = [{"materialId": r["MATERIAL_ID"], "plantId": r["PLANT_ID"], "description": r["DESCRIPTION"],
          "materialGroup": r["MATERIAL_GROUP"], "materialType": r["MATERIAL_TYPE"], "criticality": r["CRITICALITY"],
          "abcClass": r["ABC_CLASS"], "xyzClass": r["XYZ_CLASS"], "movementClass": r["MOVEMENT_CLASS"],
          "inventoryStatus": r["INVENTORY_STATUS"], "availableQty": num(r["AVAILABLE_QTY"]),
          "valueInr": num(r["VALUE_INR"]), "daysOnHand": num(r["DAYS_ON_HAND"]),
          "daysSinceLastConsumption": num(r["DAYS_SINCE_LAST_CONSUMPTION"]),
          "safetyStockQty": num(r["SAFETY_STOCK_QTY"]), "reorderPointQty": num(r["REORDER_POINT_QTY"]),
          "maxStockQty": num(r["MAX_STOCK_QTY"]), "trailing12mDemandQty": num(r["TRAILING_12M_DEMAND_QTY"])}
         for r in real_only(rows(f"{csvdir}/materials.csv"))]
    dump("materials.json", {"asOf": asof, "rows": m})
    counts["materials.json"] = len(m)
    ro = [{"recommendationId": r["RECOMMENDATION_ID"], "materialId": r["MATERIAL_ID"], "plantId": r["PLANT_ID"],
           "materialGroup": r["MATERIAL_GROUP"], "materialType": r["MATERIAL_TYPE"], "criticality": r["CRITICALITY"],
           "priority": r["PRIORITY"], "recommendedPrDate": date(r["RECOMMENDED_PR_DATE"]),
           "recommendedQty": num(r["RECOMMENDED_QTY"]), "estimatedValueInr": num(r["ESTIMATED_VALUE_INR"]),
           "availableQty": num(r["AVAILABLE_QTY"]), "openPrQty": num(r["OPEN_PR_QTY"]),
           "openPoQty": num(r["OPEN_PO_QTY"]), "safetyStockQty": num(r["SAFETY_STOCK_QTY"]),
           "reorderPointQty": num(r["REORDER_POINT_QTY"]), "reason": r["REASON"],
           "shutdownId": r["SHUTDOWN_ID"] or None} for r in real_only(rows(f"{csvdir}/reorder.csv"))]
    dump("reorder.json", {"asOf": asof, "rows": ro})
    counts["reorder.json"] = len(ro)
    p = [{"month": month(r["MONTH"]), "plantId": r["PLANT_ID"], "materialGroup": r["MATERIAL_GROUP"],
          "materialType": r["MATERIAL_TYPE"], "shutdownDriven": r["SHUTDOWN_DRIVEN"],
          "planValueInr": num(r["PLAN_VALUE_INR"]), "actualPoValueInr": num(r["ACTUAL_PO_VALUE_INR"]),
          "actualGrValueInr": num(r["ACTUAL_GR_VALUE_INR"]), "varianceInr": num(r["VARIANCE_INR"]),
          "variancePct": num(r["VARIANCE_PCT"])} for r in real_only(rows(f"{csvdir}/pva.csv"))]
    dump("plan_vs_actual.json", {"rows": p})
    counts["plan_vs_actual.json"] = len(p)
    keymap = {"dims.json": "dims", "kpis.json": "kpis", "inventory_summary.json": "invsum",
              "materials.json": "materials", "reorder.json": "reorder", "plan_vs_actual.json": "pva"}
    files = [{"name": n, "rows": c, "generatedAt": now,
              "source": {"integrationId": src["integrationId"], **src["files"][keymap[n]]}} for n, c in counts.items()]
    old = {}
    if os.path.exists(f"{OUT}/manifest.json"):
        old = json.load(open(f"{OUT}/manifest.json"))
    files += [f for f in old.get("files", []) if f["name"] not in counts]
    dump("manifest.json", {"schemaVersion": 3, "generatedAt": now, "asOf": asof, "disclaimer": disclaimer,
                           "backcastIncluded": True, "files": files, "forecast": old.get("forecast")})
    print(json.dumps(counts, indent=1), "asOf", asof)


if __name__ == "__main__":
    main()
