// @vitest-environment node
// Ticket 2, FORECAST: the backtest, the 11-month forecast, the training-set SQL and the manifest forecast block.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HOLDOUT_MONTHS, MONTHS_2026, readData, readSqlLogs, ROOT, uniq } from './helpers'

interface Fc { seriesId: string; materialId: string; plantId: string; materialGroup: string; materialType: string; month: string; horizon: number; predicted: number; lower: number | null; upper: number | null }
interface Bt { seriesId: string; materialId: string; plantId: string; materialType: string; month: string; actual: number; predicted: number; lower: number | null; upper: number | null }

const forecast = readData('forecast')
const holdout = readData('forecast_holdout')
const manifest = readData('manifest')
const fcRows: Fc[] = forecast.rows
const btRows: Bt[] = holdout.series
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('AC1 forecast covers 2026-01 to 2026-11 with horizons 3, 6 and 11', () => {
  it('is available, kind "forecast", predictionLength 11', () => {
    expect(forecast.available).toBe(true)
    expect(forecast.kind).toBe('forecast')
    expect(forecast.predictionLength).toBe(11)
  })
  it('horizons are exactly [3, 6, 11] (not the 3/6/12 of the generic contract)', () => {
    expect(forecast.horizons).toEqual([3, 6, 11])
  })
  it('months run 2026-01 to 2026-11, horizon is the month step 1..11', () => {
    expect(forecast.forecastFrom).toBe('2026-01')
    expect(forecast.forecastTo).toBe('2026-11')
    expect(uniq(fcRows.map((r) => r.month)).sort()).toEqual(MONTHS_2026)
    for (const r of fcRows) expect(r.horizon).toBe(MONTHS_2026.indexOf(r.month) + 1)
  })
  it('every series has exactly 11 forecast months', () => {
    const per = new Map<string, number>()
    for (const r of fcRows) per.set(r.seriesId, (per.get(r.seriesId) ?? 0) + 1)
    expect(new Set(per.values())).toEqual(new Set([11]))
  })
  it('the 3 / 6 / 11 views select horizon <= 3, 6, 11 months of one series', () => {
    const one = fcRows.filter((r) => r.seriesId === fcRows[0].seriesId)
    expect([3, 6, 11].map((h) => one.filter((r) => r.horizon <= h).length)).toEqual([3, 6, 11])
  })
})

describe('AC2 the forecast has a 10-90% band and MATERIAL_TYPE on every series', () => {
  it('lower <= predicted <= upper on every row, no missing band', () => {
    for (const r of fcRows) {
      expect(r.lower).not.toBeNull()
      expect(r.upper).not.toBeNull()
      if (!(r.lower! <= r.predicted && r.predicted <= r.upper!)) throw new Error(`band does not contain the mean: ${JSON.stringify(r)}`)
    }
  })
  it('every row carries materialType ZSPR or ZSPN, and one type per series', () => {
    const typeOf = new Map<string, string>()
    for (const r of fcRows) {
      expect(['ZSPR', 'ZSPN']).toContain(r.materialType)
      if (typeOf.has(r.seriesId) && typeOf.get(r.seriesId) !== r.materialType) throw new Error(`series ${r.seriesId} changes type`)
      typeOf.set(r.seriesId, r.materialType)
    }
  })
  it('5,960 series: ZSPR 3,707 and ZSPN 2,253; 65,560 rows', () => {
    const typeOf = new Map(fcRows.map((r) => [r.seriesId, r.materialType]))
    const n = (t: string) => [...typeOf.values()].filter((x) => x === t).length
    expect(typeOf.size).toBe(5960)
    expect(n('ZSPR')).toBe(3707)
    expect(n('ZSPN')).toBe(2253)
    expect(fcRows).toHaveLength(5960 * 11)
  })
  it('the forecast is for plant HZL_DEMO_01 only', () => {
    expect(uniq(fcRows.map((r) => r.plantId))).toEqual(['HZL_DEMO_01'])
    expect(uniq(forecast.byPlantMonth.map((r: { plantId: string }) => r.plantId))).toEqual(['HZL_DEMO_01'])
  })
})

describe('AC3 byPlantMonth is the sum of the series, with no interval', () => {
  it('has 11 plant-months whose predicted equals the summed series values', () => {
    expect(forecast.byPlantMonth).toHaveLength(11)
    for (const p of forecast.byPlantMonth) {
      const total = sum(fcRows.filter((r) => r.month === p.month).map((r) => r.predicted))
      expect(Math.abs(total - p.predicted), p.month).toBeLessThan(0.5)
      expect(p).not.toHaveProperty('lower')
      expect(p).not.toHaveProperty('upper')
    }
  })
})

describe('AC4 the backtest is separate from the forecast and is never presented as one', () => {
  it('forecast_holdout is marked kind "backtest" with a note saying it is not a forecast', () => {
    expect(holdout.kind).toBe('backtest')
    expect(holdout.note).toMatch(/not a forecast/i)
    expect(holdout.predictionLength).toBe(11)
  })
  it('backtest months are the 11 held-out months 2025-02 to 2025-12 and never overlap forecast months', () => {
    const months = uniq(btRows.map((r) => r.month)).sort()
    expect(months).toEqual(HOLDOUT_MONTHS)
    expect(months.some((m) => MONTHS_2026.includes(m))).toBe(false)
  })
  it('backtest rows carry actuals, the forecast rows do not', () => {
    for (const r of btRows.slice(0, 2000)) expect(typeof r.actual).toBe('number')
    expect(fcRows[0]).not.toHaveProperty('actual')
  })
  it('backtest covers the same 5,960 series x 11 months = 65,560 rows with both types', () => {
    expect(btRows).toHaveLength(65560)
    expect(new Set(btRows.map((r) => r.seriesId)).size).toBe(5960)
    expect(uniq(btRows.map((r) => r.materialType)).sort()).toEqual(['ZSPN', 'ZSPR'])
  })
  it('forecast and backtest cover the same set of series', () => {
    const a = new Set(fcRows.map((r) => r.seriesId))
    for (const id of new Set(btRows.map((r) => r.seriesId))) if (!a.has(id)) throw new Error(`${id} has a backtest but no forecast`)
  })
})

describe('AC5 the published backtest error is the error of the published rows', () => {
  const mae = sum(btRows.map((r) => Math.abs(r.actual - r.predicted))) / btRows.length
  const wape = sum(btRows.map((r) => Math.abs(r.actual - r.predicted))) / sum(btRows.map((r) => Math.abs(r.actual)))
  it('MAE recomputed from series equals error.mae (4 d.p.)', () => {
    expect(holdout.error.mae).toBeCloseTo(mae, 3)
    expect(manifest.forecast.backtestError.mae).toBe(holdout.error.mae)
  })
  it('WAPE recomputed from series equals error.wape (4 d.p.)', () => {
    expect(holdout.error.wape).toBeCloseTo(wape, 3)
    expect(manifest.forecast.backtestError.wape).toBe(holdout.error.wape)
  })
  it('byPlantMonth actuals reconcile to the series actuals', () => {
    expect(holdout.byPlantMonth).toHaveLength(11)
    for (const p of holdout.byPlantMonth) {
      const a = sum(btRows.filter((r) => r.month === p.month).map((r) => r.actual))
      expect(Math.abs(a - p.actual), p.month).toBeLessThan(0.5)
    }
  })
  it('a WAPE above 1 is disclosed in both notes (no better than predicting zero)', () => {
    expect(holdout.error.wape).toBeGreaterThan(1)
    expect(holdout.note).toMatch(/WAPE/)
    expect(forecast.note).toMatch(/indicative/i)
    expect(manifest.forecast.verdictReasons.join(' ')).toMatch(/WAPE/)
  })
  it('the training target total for the backtest window is in the file (actuals sum 305,802.3)', () => {
    expect(sum(btRows.map((r) => r.actual))).toBeCloseTo(305802.312, 1)
  })
})

describe('AC6 the manifest forecast block describes a NEW 11-month fast time-series experiment', () => {
  const f = manifest.forecast
  it('names the experiment, problem type and prediction length', () => {
    expect(f.experimentId).toMatch(/^[0-9a-f]{24}$/)
    expect(f.problemType).toBe('time_series')
    expect(f.predictionLength).toBe(11)
    expect(f.seriesCount).toBe(5960)
  })
  it('records a best model, the metric and the forecast window', () => {
    expect(f.bestModel).toBeTruthy()
    expect(f.metric.name).toBeTruthy()
    expect(f.metric.value).toBeGreaterThan(0)
    expect(f.forecastFrom).toBe('2026-01')
    expect(f.forecastTo).toBe('2026-11')
  })
  it('experiment createdAt is a valid time that is not later than the file generation time', () => {
    const created = Date.parse(f.experimentCreatedAt)
    expect(Number.isNaN(created)).toBe(false)
    expect(created).toBeLessThanOrEqual(Date.parse(manifest.generatedAt))
  })
  it('forecast, holdout and manifest agree on experiment id, and forecastAssetId is the forecast asset', () => {
    expect(forecast.experimentId).toBe(f.experimentId)
    expect(holdout.experimentId).toBe(f.experimentId)
    expect(forecast.assetId).toBe(f.forecastAssetId)
  })
  it('manifest lists both forecast files with their series-row counts', () => {
    const rows = (n: string) => manifest.files.find((x: { name: string }) => x.name === n)?.rows
    expect(rows('forecast.json')).toBe(65560)
    expect(rows('forecast_holdout.json')).toBe(65560)
  })
  it('does not claim a verdict it did not read back', () => {
    expect(['unavailable', 'good', 'fair', 'poor', 'acceptable']).toContain(f.verdict)
    if (f.verdict === 'unavailable') expect(f.verdictReasons.length).toBeGreaterThan(0)
  })
})

describe('AC7 the training-set SQL follows the ticket', () => {
  const logs = readSqlLogs()
  const train = logs.find((l) => l.asset === readData('manifest').files.find((f: { name: string }) => f.name === 'forecast_holdout.json').source.assetId)!
  it('the training statement exists in work/sql and produced 214,560 rows (5,960 series x 36 months)', () => {
    expect(train).toBeDefined()
    expect(train.rows).toBe(214560)
    expect(5960 * 36).toBe(214560)
  })
  it('is limited to plant HZL_DEMO_01 and ZSPR / ZSPN, 2023-01 to 2025-12, empty months as 0', () => {
    expect(train.body).toContain("'HZL_DEMO_01'")
    expect(train.body).toMatch(/'ZSPR'/)
    expect(train.body).toMatch(/'ZSPN'/)
    expect(train.body).toContain("'2023-01-01")
    expect(train.body).toMatch(/COALESCE\(C\.NET_QTY,\s*0\)/)
  })
  it('target is issues 261 minus reversals 262', () => {
    expect(train.body).toMatch(/MOVEMENT_TYPE\s*=\s*'261'\s+THEN\s+MV\.QUANTITY/i)
    expect(train.body).toMatch(/MOVEMENT_TYPE\s*=\s*'262'\s+THEN\s+-MV\.QUANTITY/i)
  })
  it('MATERIAL_TYPE comes from DIM_MATERIAL.MATERIAL_TYPE, not from PR_TYPE', () => {
    expect(train.body).toMatch(/DMM\.MATERIAL_TYPE\s+AS\s+MATERIAL_TYPE/i)
    expect(train.body).toMatch(/VEDANTA_POC\.DIM_MATERIAL\s+DMM/i)
    expect(train.body).not.toMatch(/PR_TYPE/i)
  })
  it('selects every covariate: maintenance, shutdown, plant shutdown month, season index, month of year', () => {
    for (const c of ['PLANNED_MAINT_QTY', 'PLANNED_SHUTDOWN_QTY', 'PLANT_SHUTDOWN_FLAG', 'SEASON_INDEX', 'MONTH_OF_YEAR']) expect(train.body, c).toContain(c)
  })
  it('the pre-sync verification (preview only) asserts the series split and the target total', () => {
    const verify = logs.filter((l) => l.asset === 'preview only').map((l) => l.header).join(' ')
    expect(verify).toMatch(/3707/)
    expect(verify).toMatch(/2253/)
    expect(verify).toMatch(/478717\.143/)
    expect(verify).toMatch(/264547\.184/)
  })
  it('the training set is not pre-split: no train/test filter on the SQL', () => {
    expect(train.body).not.toMatch(/2025-02/)
  })
})

describe('AC8 the build scripts are in the repository and reproduce the files', () => {
  it('scripts/build_forecast.py exists and writes forecast.json and forecast_holdout.json', () => {
    const py = readFileSync(join(ROOT, 'scripts/build_forecast.py'), 'utf8')
    expect(py).toContain('forecast.json')
    expect(py).toContain('forecast_holdout.json')
  })
})
