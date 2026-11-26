import { ALL, type InventorySummaryRow, type MaterialRow } from '../types'
import type { Filters } from '../filters'

type Dimmed = { plantId: string; materialType: string; materialGroup: string; criticality: string }

/** Plant (ALL = every real plant, summed), type, group and criticality. */
export function matchesDims(r: Dimmed, f: Pick<Filters, 'plant' | 'type' | 'group' | 'crit'>): boolean {
  if (f.plant !== ALL && r.plantId !== f.plant) return false
  if (f.type && r.materialType !== f.type) return false
  if (f.group && r.materialGroup !== f.group) return false
  if (f.crit && r.criticality !== f.crit) return false
  return true
}

export function filterSummary(rows: InventorySummaryRow[], f: Filters): InventorySummaryRow[] {
  return rows.filter((r) => matchesDims(r, f))
}

export interface Bucket { key: string; materials: number; valueInr: number; availableQty: number }

export type SummaryDim = 'materialType' | 'movementClass' | 'inventoryStatus' | 'criticality' | 'abcClass' | 'materialGroup' | 'plantId'

/** Sum value, count and quantity by one dimension. Sorted by value, descending. */
export function groupSummary(rows: InventorySummaryRow[], dim: SummaryDim): Bucket[] {
  const m = new Map<string, Bucket>()
  for (const r of rows) {
    const k = r[dim]
    const b = m.get(k) ?? { key: k, materials: 0, valueInr: 0, availableQty: 0 }
    b.materials += r.materials
    b.valueInr += r.valueInr
    b.availableQty += r.availableQty
    m.set(k, b)
  }
  return [...m.values()].sort((a, b) => b.valueInr - a.valueInr)
}

export function totalSummary(rows: InventorySummaryRow[]): Omit<Bucket, 'key'> {
  return rows.reduce((t, r) => ({ materials: t.materials + r.materials, valueInr: t.valueInr + r.valueInr, availableQty: t.availableQty + r.availableQty }), { materials: 0, valueInr: 0, availableQty: 0 })
}

export function filterMaterials(rows: MaterialRow[], f: Filters): MaterialRow[] {
  return rows.filter((r) => matchesDims(r, f))
}

export interface MaterialQuery { search: string; status: string; movement: string }

export function queryMaterials(rows: MaterialRow[], q: MaterialQuery): MaterialRow[] {
  const s = q.search.trim().toLowerCase()
  return rows.filter(
    (r) =>
      (!q.status || r.inventoryStatus === q.status) &&
      (!q.movement || r.movementClass === q.movement) &&
      (!s || r.materialId.toLowerCase().includes(s) || r.description.toLowerCase().includes(s)),
  )
}

/** Cap for DOH = 9999 in the source means "no consumption"; flag rather than treat as a real number of days. */
export const DOH_NO_CONSUMPTION = 9999
