import type { KpiCatalogEntry, KpiRow } from '../types'
import { kpiPlantId, summarizeKpi, toneFor } from './kpi'

const cat = (direction: KpiCatalogEntry['direction']): KpiCatalogEntry => ({ code: 'X', label: 'X', uom: 'INR', direction, definition: 'd' })
const row = (month: string, plantId: string, value: number): KpiRow => ({ month, plantId, kpiCode: 'X', value, scenario: 'SIMULATED_BASELINE' })

// Plants deliberately do NOT sum to ALL_PLANTS: ALL_PLANTS must be used as published.
const rows: KpiRow[] = [
  row('2024-12', 'ALL_PLANTS', 200),
  row('2025-11', 'ALL_PLANTS', 100),
  row('2025-12', 'ALL_PLANTS', 110),
  row('2025-12', 'HZL_DEMO_01', 40),
  row('2025-11', 'HZL_DEMO_01', 50),
  row('2025-12', 'HZL_DEMO_02', 30),
]

describe('All plants rule', () => {
  it('maps All plants to the ALL_PLANTS rows and a plant to itself', () => {
    expect(kpiPlantId('ALL')).toBe('ALL_PLANTS')
    expect(kpiPlantId('HZL_DEMO_03')).toBe('HZL_DEMO_03')
  })
  it('shows the published ALL_PLANTS value, never a sum of plants', () => {
    const s = summarizeKpi(rows, cat('lower_is_better'), 'ALL')
    expect(s.value).toBe(110)
    expect(s.value).not.toBe(40 + 30)
  })
  it('shows a single plant value for a plant', () => {
    expect(summarizeKpi(rows, cat('neutral'), 'HZL_DEMO_01').value).toBe(40)
  })
})

describe('changes and direction colouring', () => {
  it('computes change vs prior month and same month last year', () => {
    const s = summarizeKpi(rows, cat('lower_is_better'), 'ALL')
    expect(s.prior).toBe(100)
    expect(s.momChange).toBe(10)
    expect(s.momPct).toBeCloseTo(10)
    expect(s.yearAgo).toBe(200) // 2024-12 is 12 months before 2025-12
    expect(s.yoyChange).toBe(-90)
    expect(s.yoyTone).toBe('good') // lower_is_better and it fell
    expect(summarizeKpi(rows, cat('lower_is_better'), 'HZL_DEMO_01').yearAgo).toBeNull()
  })
  it('lower_is_better: a fall is good, a rise is bad', () => {
    expect(toneFor('lower_is_better', -5)).toBe('good')
    expect(toneFor('lower_is_better', 5)).toBe('bad')
  })
  it('higher_is_better: a rise is good, a fall is bad', () => {
    expect(toneFor('higher_is_better', 5)).toBe('good')
    expect(toneFor('higher_is_better', -5)).toBe('bad')
  })
  it('neutral is never green or red; no change or no data is neutral', () => {
    expect(toneFor('neutral', 100)).toBe('neutral')
    expect(toneFor('neutral', -100)).toBe('neutral')
    expect(toneFor('higher_is_better', 0)).toBe('neutral')
    expect(toneFor('higher_is_better', null)).toBe('neutral')
  })
  it('the tile tone follows the catalog direction', () => {
    expect(summarizeKpi(rows, cat('lower_is_better'), 'ALL').momTone).toBe('bad')
    expect(summarizeKpi(rows, cat('higher_is_better'), 'ALL').momTone).toBe('good')
    expect(summarizeKpi(rows, cat('neutral'), 'ALL').momTone).toBe('neutral')
  })
  it('honours the month-range upper bound and returns null for a missing plant', () => {
    expect(summarizeKpi(rows, cat('neutral'), 'ALL', '2025-11').value).toBe(100)
    const none = summarizeKpi(rows, cat('neutral'), 'HZL_DEMO_09')
    expect(none.value).toBeNull()
    expect(none.momPct).toBeNull()
  })
})
