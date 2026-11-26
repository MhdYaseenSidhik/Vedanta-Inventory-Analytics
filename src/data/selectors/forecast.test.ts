import type { BacktestRow, ForecastFile, ForecastRow } from '../types'
import { EMPTY_FILTERS } from '../filters'
import { availableHorizons, backtestByMonth, backtestError, byMaterial, byPlantMonth, filterBacktest, forecastRows, sumByMonth, totalsBy } from './forecast'

const fr = (seriesId: string, type: string, group: string, month: string, horizon: number, predicted: number): ForecastRow => ({
  seriesId, materialId: seriesId.split('|')[0], plantId: 'HZL_DEMO_01', materialGroup: group, materialType: type, month, horizon, predicted, lower: predicted - 1, upper: predicted + 1,
})
const rows: ForecastRow[] = []
for (let h = 1; h <= 11; h++) {
  const mo = `2026-${String(h).padStart(2, '0')}`
  rows.push(fr('A|HZL_DEMO_01', 'ZSPR', 'FILTERS', mo, h, 10))
  rows.push(fr('B|HZL_DEMO_01', 'ZSPN', 'SAFETY', mo, h, 5))
}
const file: ForecastFile = {
  available: true, reason: null, kind: 'forecast', horizons: [3, 6, 11], rows,
  byPlantMonth: Array.from({ length: 11 }, (_, i) => ({ plantId: 'HZL_DEMO_01', month: `2026-${String(i + 1).padStart(2, '0')}`, horizon: i + 1, predicted: 15 })),
}
const scope = { plant: 'ALL', type: '', group: '' }

describe('horizon filtering', () => {
  it('lists only the horizons in the file, and none when unavailable', () => {
    expect(availableHorizons(file)).toEqual([3, 6, 11])
    expect(availableHorizons({ ...file, available: false })).toEqual([])
    expect(availableHorizons(null)).toEqual([])
  })
  it('keeps rows with horizon up to 3, 6 or 11', () => {
    expect(forecastRows(rows, 3, scope)).toHaveLength(6)
    expect(forecastRows(rows, 6, scope)).toHaveLength(12)
    expect(forecastRows(rows, 11, scope)).toHaveLength(22)
    expect(sumByMonth(forecastRows(rows, 3, scope)).map((p) => p.month)).toEqual(['2026-01', '2026-02', '2026-03'])
  })
})

describe('type filter and aggregation', () => {
  it('filters ZSPR / ZSPN', () => {
    expect(forecastRows(rows, 11, { ...scope, type: 'ZSPR' })).toHaveLength(11)
    expect(forecastRows(rows, 11, { ...scope, type: 'ZSPN' }).every((r) => r.materialType === 'ZSPN')).toBe(true)
  })
  it('an unknown plant matches nothing (empty state)', () => {
    expect(forecastRows(rows, 11, { ...scope, plant: 'HZL_DEMO_05' })).toEqual([])
  })
  it('sums predicted by type and group, not the bounds', () => {
    const t = totalsBy(forecastRows(rows, 3, scope), 'materialType')
    expect(t).toEqual([{ key: 'ZSPR', predicted: 30, series: 1 }, { key: 'ZSPN', predicted: 15, series: 1 }])
    expect(totalsBy(rows, 'materialGroup').map((x) => x.key)).toEqual(['FILTERS', 'SAFETY'])
  })
  it('byPlantMonth uses the file when unfiltered, and sums rows when a type is set', () => {
    expect(byPlantMonth(file, 3, scope).map((r) => r.predicted)).toEqual([15, 15, 15])
    expect(byPlantMonth(file, 3, { ...scope, type: 'ZSPR' }).map((r) => r.predicted)).toEqual([10, 10, 10])
  })
  it('byMaterial totals the horizon and carries the chosen month band', () => {
    const m = byMaterial(forecastRows(rows, 3, scope), '2026-03')
    expect(m[0]).toMatchObject({ seriesId: 'A|HZL_DEMO_01', total: 30, predicted: 10, lower: 9, upper: 11 })
  })
})

describe('backtest', () => {
  const bt: BacktestRow[] = [
    { seriesId: 'A', materialId: 'A', plantId: 'HZL_DEMO_01', materialGroup: 'FILTERS', materialType: 'ZSPR', month: '2025-02', actual: 10, predicted: 4, lower: 0, upper: 8 },
    { seriesId: 'B', materialId: 'B', plantId: 'HZL_DEMO_01', materialGroup: 'SAFETY', materialType: 'ZSPN', month: '2025-02', actual: 0, predicted: 2, lower: 0, upper: 8 },
    { seriesId: 'A', materialId: 'A', plantId: 'HZL_DEMO_01', materialGroup: 'FILTERS', materialType: 'ZSPR', month: '2025-03', actual: 10, predicted: 14, lower: 0, upper: 8 },
  ]
  it('computes MAE and WAPE from rows', () => {
    const e = backtestError(bt)
    expect(e.mae).toBeCloseTo((6 + 2 + 4) / 3)
    expect(e.wape).toBeCloseTo(12 / 20)
    expect(e.bias).toBeCloseTo(20 / 20)
  })
  it('WAPE is null when actual is zero', () => {
    expect(backtestError([{ actual: 0, predicted: 1 }]).wape).toBeNull()
  })
  it('aggregates by month and filters by type and month range', () => {
    expect(backtestByMonth(bt)).toEqual([{ month: '2025-02', actual: 10, predicted: 6 }, { month: '2025-03', actual: 10, predicted: 14 }])
    expect(filterBacktest(bt, { ...EMPTY_FILTERS, type: 'ZSPR', from: '2025-03' })).toHaveLength(1)
  })
})
