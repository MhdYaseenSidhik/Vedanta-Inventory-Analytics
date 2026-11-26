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


# code -> (label, direction, definition). Explicit so the dashboard never relies on a name heuristic.
L, H, N = "lower_is_better", "higher_is_better", "neutral"
CATALOG = {
    "BACKORDER_VALUE_INR": ("Backorder value", L, "Value of demand that could not be filled from stock and is waiting on supply."),
    "CONSUMPTION_VALUE_INR": ("Consumption value", N, "Value of spares and stores issued to consumption in the month."),
    "CRITICAL_SPARE_AVAILABILITY_PCT": ("Critical spare availability", H, "Share of critical spares that are available on the shelf when needed."),
    "DAYS_ON_HAND": ("Days on hand", L, "Days of average consumption covered by the stock on hand."),
    "DELAYED_PO_COUNT": ("Delayed purchase orders", L, "Number of open purchase orders past their promised delivery date."),
    "DUPLICATE_SKU_OPPORTUNITY_INR": ("Duplicate SKU opportunity", H, "Modelled inventory value that could be released by consolidating duplicate material codes."),
    "EXCESS_INVENTORY_VALUE_INR": ("Excess inventory value", L, "Value of stock above the maximum stock level."),
    "GROSS_INVENTORY_VALUE_INR": ("Gross inventory value", N, "Total value of stock on hand before any adjustment."),
    "INVENTORY_TURNOVER_RATIO": ("Inventory turnover", H, "Annualised consumption value divided by average inventory value."),
    "NON_MOVING_VALUE_INR": ("Non-moving inventory value", L, "Value of stock with no consumption within the non-moving threshold."),
    "OBSOLETE_VALUE_INR": ("Obsolete inventory value", L, "Value of stock classified as obsolete."),
    "OPEN_PO_QTY": ("Open PO quantity", N, "Quantity on purchase orders not yet fully received."),
    "OPEN_PO_VALUE_INR": ("Open PO value", N, "Value of purchase orders not yet fully received."),
    "OPEN_PR_COUNT": ("Open requisitions", N, "Number of purchase requisitions not yet converted to purchase orders."),
    "OPEN_PR_QTY": ("Open PR quantity", N, "Quantity on purchase requisitions not yet converted to purchase orders."),
    "POTENTIAL_INVENTORY_REDUCTION_INR": ("Potential inventory reduction", H, "Modelled value of inventory that could be reduced without raising stockout risk."),
    "POTENTIAL_INVENTORY_REDUCTION_PCT": ("Potential inventory reduction %", H, "Modelled inventory reduction potential as a share of gross inventory value."),
    "PO_COUNT": ("Purchase orders", N, "Number of purchase orders raised in the month."),
    "PO_VALUE_INR": ("Purchase order value", N, "Value of purchase orders raised in the month."),
    "PR_COUNT": ("Purchase requisitions", N, "Number of purchase requisitions raised in the month."),
    "SLOW_MOVING_VALUE_INR": ("Slow-moving inventory value", L, "Value of stock with low consumption relative to the stock held."),
    "STOCKOUT_MATERIAL_COUNT": ("Stockout materials", L, "Number of materials with zero available stock and demand."),
    "TARGET_INVENTORY_REDUCTION_PCT": ("Target inventory reduction %", H, "Reduction target set for the scenario as a share of gross inventory value."),
    "UNDERSTOCK_MATERIAL_COUNT": ("Understock materials", L, "Number of materials below their safety stock level."),
    "WORKING_CAPITAL_OPPORTUNITY_INR": ("Working-capital opportunity", H, "Modelled working capital that could be released by the recommended actions."),
}


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
    missing = [c for c in codes if c not in CATALOG]
    if missing:
        raise SystemExit(f"KPI codes without catalog entry: {missing}")
    catalog = [{"code": c, "label": CATALOG[c][0], "uom": uom[c], "direction": CATALOG[c][1],
                "definition": CATALOG[c][2]} for c in codes]
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
    counts = {"dims.json": len(rows(f"{csvdir}/dims.csv"))}  # source rows (37), as in work/sql/01 header
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
