import type { InventorySummaryRow, MaterialRow, PlanActualRow, ReorderRow } from '../types'
import { EMPTY_FILTERS, inRange, shiftMonth } from '../filters'
import { filterSummary, groupSummary, queryMaterials, totalSummary } from './inventory'
import { filterReorder, reorderTotals, sortReorder, topAlerts, totalsByPriority } from './reorder'
import { filterPlan, groupPlan, totalPlan } from './plan'

const s = (plantId: string, type: string, status: string, materials: number, valueInr: number): InventorySummaryRow => ({
  plantId, materialGroup: 'FILTERS', materialType: type, criticality: 'VITAL', movementClass: 'ACTIVE', inventoryStatus: status, abcClass: 'A', materials, availableQty: materials * 2, valueInr,
})
const sum = [s('HZL_DEMO_01', 'ZSPR', 'NORMAL', 3, 300), s('HZL_DEMO_02', 'ZSPR', 'EXCESS', 2, 200), s('HZL_DEMO_02', 'ZSPN', 'EXCESS', 1, 50)]

describe('inventory summary: All plants sums real plants', () => {
  it('All plants sums every plant', () => {
    expect(totalSummary(filterSummary(sum, EMPTY_FILTERS))).toEqual({ materials: 6, valueInr: 550, availableQty: 12 })
  })
  it('a plant filter narrows, and so does type', () => {
    expect(totalSummary(filterSummary(sum, { ...EMPTY_FILTERS, plant: 'HZL_DEMO_02' })).valueInr).toBe(250)
    expect(totalSummary(filterSummary(sum, { ...EMPTY_FILTERS, type: 'ZSPN' })).valueInr).toBe(50)
  })
  it('a filter that matches nothing gives no rows', () => {
    expect(filterSummary(sum, { ...EMPTY_FILTERS, group: 'NOPE' })).toEqual([])
  })
  it('groups by a dimension, largest value first', () => {
    expect(groupSummary(sum, 'inventoryStatus')).toEqual([
      { key: 'NORMAL', materials: 3, valueInr: 300, availableQty: 6 },
      { key: 'EXCESS', materials: 3, valueInr: 250, availableQty: 6 },
    ])
  })
})

const mat = (id: string, desc: string, status: string): MaterialRow => ({
  materialId: id, plantId: 'HZL_DEMO_01', description: desc, materialGroup: 'FILTERS', materialType: 'ZSPR', criticality: 'VITAL', abcClass: 'A', xyzClass: 'X', movementClass: 'ACTIVE', inventoryStatus: status,
  availableQty: 1, valueInr: 1, daysOnHand: 1, daysSinceLastConsumption: 1, safetyStockQty: 1, reorderPointQty: 1, maxStockQty: 1, trailing12mDemandQty: 1,
})
describe('material list query', () => {
  const m = [mat('HZL1', 'Bush Assembly', 'STOCKOUT'), mat('HZL2', 'Oil filter', 'NORMAL')]
  it('searches id and description case-insensitively and filters status', () => {
    expect(queryMaterials(m, { search: 'bush', status: '', movement: '' })).toHaveLength(1)
    expect(queryMaterials(m, { search: 'hzl2', status: '', movement: '' })).toHaveLength(1)
    expect(queryMaterials(m, { search: '', status: 'NORMAL', movement: '' })[0].materialId).toBe('HZL2')
    expect(queryMaterials(m, { search: 'zzz', status: '', movement: '' })).toEqual([])
  })
})

const ro = (id: string, priority: string, date: string, value: number, crit = 'VITAL', plantId = 'HZL_DEMO_01', shutdownId: string | null = null): ReorderRow => ({
  recommendationId: id, materialId: id, plantId, materialGroup: 'FILTERS', materialType: 'ZSPR', criticality: crit, priority, recommendedPrDate: date, recommendedQty: 2, estimatedValueInr: value, availableQty: 0, openPrQty: 0, openPoQty: 0, safetyStockQty: 1, reorderPointQty: 1, reason: 'r', shutdownId,
})
describe('reorder', () => {
  const rows = [ro('a', 'LOW', '2026-01-01', 5), ro('b', 'HIGH', '2026-03-01', 10), ro('c', 'HIGH', '2026-02-01', 20, 'VITAL', 'HZL_DEMO_02', 'SD1'), ro('d', 'MEDIUM', '2026-01-01', 1, 'ESSENTIAL')]
  it('sorts by priority, then date, then value', () => {
    expect(sortReorder(rows).map((r) => r.recommendationId)).toEqual(['c', 'b', 'd', 'a'])
  })
  it('filters by priority and shutdown linkage', () => {
    expect(filterReorder(rows, EMPTY_FILTERS, { priority: 'HIGH', shutdownOnly: false })).toHaveLength(2)
    expect(filterReorder(rows, EMPTY_FILTERS, { priority: '', shutdownOnly: true }).map((r) => r.recommendationId)).toEqual(['c'])
    expect(filterReorder(rows, { ...EMPTY_FILTERS, plant: 'HZL_DEMO_05' }, { priority: '', shutdownOnly: false })).toEqual([])
  })
  it('totals and splits by priority', () => {
    expect(reorderTotals(rows)).toEqual({ count: 4, qty: 8, valueInr: 36, shutdown: 1 })
    expect(totalsByPriority(rows).map((p) => p.priority)).toEqual(['HIGH', 'MEDIUM', 'LOW'])
  })
  it('top alerts are HIGH-priority VITAL reorders, earliest first', () => {
    expect(topAlerts(rows).map((r) => r.recommendationId)).toEqual(['c', 'b'])
  })
})

const pl = (month: string, plantId: string, plan: number, po: number): PlanActualRow => ({
  month, plantId, materialGroup: 'FILTERS', materialType: 'ZSPR', shutdownDriven: 'N', planValueInr: plan, actualPoValueInr: po, actualGrValueInr: po, varianceInr: plan - po, variancePct: plan === 0 ? null : ((plan - po) / plan) * 100,
})
describe('plan vs actual', () => {
  const rows = [pl('2025-01', 'HZL_DEMO_01', 100, 80), pl('2025-01', 'HZL_DEMO_02', 100, 150), pl('2025-02', 'HZL_DEMO_01', 0, 10)]
  it('All plants sums plants; month range filters', () => {
    expect(totalPlan(filterPlan(rows, EMPTY_FILTERS)).planValueInr).toBe(200)
    expect(filterPlan(rows, { ...EMPTY_FILTERS, from: '2025-02' })).toHaveLength(1)
    expect(filterPlan(rows, { ...EMPTY_FILTERS, plant: 'HZL_DEMO_02' })).toHaveLength(1)
  })
  it('percentage is recomputed from sums and null when the plan is 0, never 0', () => {
    const m = groupPlan(rows, 'month')
    expect(m[0]).toMatchObject({ key: '2025-01', planValueInr: 200, varianceInr: -30 })
    expect(m[0].variancePct).toBeCloseTo(-15)
    expect(m[1].variancePct).toBeNull()
  })
})

describe('month helpers', () => {
  it('shifts months across years and checks ranges', () => {
    expect(shiftMonth('2025-12', -12)).toBe('2024-12')
    expect(shiftMonth('2025-01', -1)).toBe('2024-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(inRange('2025-06', '2025-01', '2025-06')).toBe(true)
    expect(inRange('2025-07', '', '2025-06')).toBe(false)
  })
})
