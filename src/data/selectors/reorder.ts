import type { ReorderRow } from '../types'
import type { Filters } from '../filters'
import { matchesDims } from './inventory'

export const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

export interface ReorderQuery {
  priority: string // '' = all
  shutdownOnly: boolean
}

export function filterReorder(rows: ReorderRow[], f: Filters, q: ReorderQuery): ReorderRow[] {
  return rows.filter((r) => matchesDims(r, f) && (!q.priority || r.priority === q.priority) && (!q.shutdownOnly || r.shutdownId !== null))
}

/** Priority first (HIGH, MEDIUM, LOW), then earliest recommended PR date, then largest value. */
export function sortReorder(rows: ReorderRow[]): ReorderRow[] {
  return [...rows].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
      a.recommendedPrDate.localeCompare(b.recommendedPrDate) ||
      b.estimatedValueInr - a.estimatedValueInr,
  )
}

export interface ReorderTotals { count: number; qty: number; valueInr: number; shutdown: number }

export function reorderTotals(rows: ReorderRow[]): ReorderTotals {
  return rows.reduce(
    (t, r) => ({ count: t.count + 1, qty: t.qty + r.recommendedQty, valueInr: t.valueInr + r.estimatedValueInr, shutdown: t.shutdown + (r.shutdownId ? 1 : 0) }),
    { count: 0, qty: 0, valueInr: 0, shutdown: 0 },
  )
}

export interface PriorityTotal extends ReorderTotals { priority: string }

export function totalsByPriority(rows: ReorderRow[]): PriorityTotal[] {
  const m = new Map<string, PriorityTotal>()
  for (const r of rows) {
    const t = m.get(r.priority) ?? { priority: r.priority, count: 0, qty: 0, valueInr: 0, shutdown: 0 }
    t.count += 1
    t.qty += r.recommendedQty
    t.valueInr += r.estimatedValueInr
    t.shutdown += r.shutdownId ? 1 : 0
    m.set(r.priority, t)
  }
  return [...m.values()].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
}

/** Top alerts: HIGH-priority reorders of VITAL spares, earliest PR date first. */
export function topAlerts(rows: ReorderRow[], limit = 6): ReorderRow[] {
  return sortReorder(rows.filter((r) => r.priority === 'HIGH' && r.criticality === 'VITAL')).slice(0, limit)
}
