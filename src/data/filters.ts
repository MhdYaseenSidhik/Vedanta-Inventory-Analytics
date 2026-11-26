import { ALL } from './types'

/** Global filters; they live in the URL query string. */
export interface Filters {
  plant: string // ALL or a plantId
  type: string // '' or ZSPR / ZSPN
  group: string // '' or a material group code
  crit: string // '' or a criticality code
  from: string // '' or YYYY-MM
  to: string // '' or YYYY-MM
}

export const EMPTY_FILTERS: Filters = { plant: ALL, type: '', group: '', crit: '', from: '', to: '' }

export function parseFilters(search: string): Filters {
  const p = new URLSearchParams(search)
  return {
    plant: p.get('plant') || ALL,
    type: p.get('type') || '',
    group: p.get('group') || '',
    crit: p.get('crit') || '',
    from: p.get('from') || '',
    to: p.get('to') || '',
  }
}

export function filtersToParams(f: Filters): Record<string, string | null> {
  return {
    plant: f.plant === ALL ? null : f.plant,
    type: f.type || null,
    group: f.group || null,
    crit: f.crit || null,
    from: f.from || null,
    to: f.to || null,
  }
}

export const isAll = (plant: string) => plant === ALL

export function inRange(month: string, from: string, to: string): boolean {
  if (from && month < from) return false
  if (to && month > to) return false
  return true
}

/** Month YYYY-MM shifted by n months (n may be negative). */
export function shiftMonth(m: string, n: number): string {
  const [y, mo] = m.split('-').map(Number)
  const idx = y * 12 + (mo - 1) + n
  const ny = Math.floor(idx / 12)
  const nm = (idx % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

/** True when a material type, group or criticality filter is active (KPIs ignore these). */
export function hasMaterialFilter(f: Filters): boolean {
  return Boolean(f.type || f.group || f.crit)
}
