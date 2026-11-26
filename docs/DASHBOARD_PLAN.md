# Dashboard plan

Source: `public/data/` only (schemaVersion 3, asOf 2025-12-31). See `DATA_PROFILE.md` for the numbers behind each binding.
Every screen shows `manifest.disclaimer` and the as-of date (footer panel, plus the header). Every screen has a loading skeleton, an error state with Retry, and an empty state.

## Global rules
- **Filters** (URL query string): `plant` (All plants / HZL_DEMO_01..06), `type` (ZSPR/ZSPN), `group`, `crit`, `from`, `to` (months from kpis.json). Screen is in the hash (`#/overview`). Horizon is `h`, replenishment choices are `priority` and `shutdown`, drill-down is `dp` and `dg`.
- **All plants**: kpis.json uses its `ALL_PLANTS` rows as published (never summed). Every other file holds real plants only, so All plants sums them.
- **KPIs ignore type, group and criticality**: when one is set, a note says KPI values are per plant and not filtered by it.
- **INR** as ₹ Cr / L with the full value in the tooltip (`title`); percentages one decimal; quantities with `qty` (the data carries no unit of measure).
- **Direction colour**: `lower_is_better` fall = green, rise = red; `higher_is_better` the reverse; `neutral` never green or red. Meaning is also spoken (screen reader text), not colour only.
- **Backtest** (forecast_holdout.json) is labelled "Backtest, not a forecast" everywhere. Forecast (forecast.json) is shown with horizon, covered months and the 10-90% band; bounds are never summed.

## 1. Overview (Module A)
Purpose: portfolio health at a glance.
- **Tiles (12)** from kpis.json, scenario rows as stored, plant = `ALL_PLANTS` or the chosen plant, month = latest up to `to`: GROSS_INVENTORY_VALUE_INR, NON_MOVING_VALUE_INR, SLOW_MOVING_VALUE_INR, OBSOLETE_VALUE_INR, EXCESS_INVENTORY_VALUE_INR, DAYS_ON_HAND, INVENTORY_TURNOVER_RATIO, CRITICAL_SPARE_AVAILABILITY_PCT, STOCKOUT_MATERIAL_COUNT, UNDERSTOCK_MATERIAL_COUNT, POTENTIAL_INVENTORY_REDUCTION_INR, WORKING_CAPITAL_OPPORTUNITY_INR. Each: value + unit, definition (catalog), as-of month, change vs prior month coloured by direction, 36-month sparkline.
- **Trend chart**: five INR KPIs by month (line), month range applied, tooltip with full INR.
- **Top alerts** (inventory_summary.json + reorder.json, follows plant/type/group): VITAL stockout and critical-shortage counts (sum of `materials` where criticality VITAL, status STOCKOUT / CRITICAL_SHORTAGE), count and value of HIGH-priority reorders of VITAL spares, and the six earliest such reorders (sorted by PR date) with a link to Replenishment.
- States: criticality set to non-VITAL => "Alerts cover VITAL spares"; nothing matching => empty state.

## 2. KPI scorecard
- **Tiles for all 25 catalog KPIs**: latest, trend, change vs prior month and vs the same month last year (both coloured by direction).
- **Trend by plant**: one KPI (selector, KPIs with more than one month only), a line per plant plus a heavier All plants line.
- **By plant matrix**: KPI rows x (All plants + 6 plants), latest value and % change vs prior month coloured by direction; All plants column is the published portfolio row.
- Opportunity and target KPIs exist for 2025-12 only, so comparisons show "-".

## 3. Inventory health and drill-down
- **Breakdowns** (inventory_summary.json, filtered, sum of `valueInr` and `materials`): material type, movement class, inventory status, criticality, ABC class. Bars sorted by value, tooltip count + full INR.
- **Drill-down** plant -> material group -> material list -> material detail, with a breadcrumb (URL `dp`, `dg`). Plant level: groupSummary by plant. Group level: by material group within the plant. Material level (materials.json): virtualised sortable table (id, description, type, criticality, status, available, days on hand, value), search and status filter. DOH 9999 is shown as "9999+" (source sentinel for no consumption).
- **Material detail** (dialog, Esc closes): classification, stock, reorder recommendation (reorder.json), backtest series and forecast with band (HZL_DEMO_01 materials only; otherwise a note).

## 4. Replenishment (reorder.json)
- Totals: count, quantity, estimated value, shutdown-linked; per-priority split (ignores the priority choice itself).
- Filters: priority (All/High/Medium/Low), shutdown-linked, plus global plant/type/group/criticality.
- Table (virtualised, sortable): priority, material, plant, type, criticality, PR date, qty, value, shutdown id, reason. Default sort: priority, PR date, value.
- Empty state offers "Clear priority and shutdown filters".

## 5. Demand forecast (Module B)
- **Model card** (manifest.forecast): best model, validation RMSE, backtest MAE and WAPE, forecast months, prediction length, experiment id, date. **Visible warning when WAPE > 1** (1.1722): model did no better than predicting zero, under-forecast about 0.52x, treat as indicative.
- **Selectors**: horizon 3 / 6 / 11 months (only those in `forecast.horizons`), ZSPR / ZSPN / All type.
- **By plant and month**: `byPlantMonth` (no band) when no type/group filter, else summed from rows. **By material type** and **by material group**: sum of `predicted` over the horizon. **By material**: horizon total, plus mean and 10-90% band (`lower`/`upper`) for a chosen month; row opens the material detail.
- **Backtest panel**: actual vs predicted by month (sums of series), MAE, WAPE, predicted/actual ratio, series-months; labelled as a backtest; follows plant/type/group/month range.
- States: no forecast rows (e.g. another plant) => empty state naming the covered plant; `available:false` => `forecast.reason` plus the backtest.

## 6. Plan vs actual (plan_vs_actual.json)
- Totals: plan, PO, GR, variance (value and %).
- Charts: plan/PO/GR by month; variance by month.
- Tables: by plant, by material group, by month. Variance is as published (plan minus PO); percentage is recomputed from sums and shown "-" when plan is 0.
- Filters: plant, type, group, month range (criticality does not exist in this file).

## GAPS (the data cannot support these; nothing is invented)
1. **Forecast covers HZL_DEMO_01 only** (5,960 series). Plants 02-06 have no forecast or backtest; the page says so.
2. **Forecast quality is poor**: backtest WAPE 1.1722, MAE 5.4769, predictions about 0.52x actual; Context Flow reports covariate importance 0 (MATERIAL_TYPE included), and `verdict` is "unavailable". Shown as indicative only.
3. **No band on summed values**: `byPlantMonth` has none and quantiles cannot be summed, so bands exist per material only.
4. **Train/test files not verified by the Data Agent** (MATERIAL_TYPE inside Context Flow's own train/test files; 148,999 vs 149,000 train rows). The dashboard cannot show it.
5. **No unit of measure** in any file, so quantities carry the label "qty".
6. **Criticality and month range do not apply to the forecast**, and criticality does not apply to plan vs actual (the fields are not in those files). Notes are on the page.
7. **KPIs cannot honour type, group or criticality** (kpis.json is per plant); the dashboard keeps plant values and says so.
8. **Modelled opportunity and target KPIs exist for 2025-12 only**: no trend, month-on-month or year-on-year.
9. **2023 is a simulated backcast** (kpis.json starts 2023-01), so year-on-year for 2024 compares against simulated data.
10. **Days on hand uses a 9999 sentinel** for no consumption; shown as "9999+", never averaged.
11. **Forecast is monthly quantity only**: no forecast value in INR (the files hold no unit price).
12. **No intra-month or per-day data**: all views are monthly or as-of 2025-12-31.
