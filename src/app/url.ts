import { useCallback, useEffect, useState } from 'react'
import { filtersToParams, parseFilters, type Filters } from '../data/filters'

export type Route = 'overview' | 'scorecard' | 'health' | 'replenishment' | 'forecast' | 'plan'
export const ROUTES: Route[] = ['overview', 'scorecard', 'health', 'replenishment', 'forecast', 'plan']

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0] as Route
  return ROUTES.includes(h) ? h : 'overview'
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** Shared, URL-backed state: the screen in the hash, filters and view params in the query string. */
function useUrlTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick((t) => t + 1)
    listeners.add(l)
    window.addEventListener('hashchange', l)
    window.addEventListener('popstate', l)
    return () => {
      listeners.delete(l)
      window.removeEventListener('hashchange', l)
      window.removeEventListener('popstate', l)
    }
  }, [])
  return tick
}

export function setParams(patch: Record<string, string | null>): void {
  const p = new URLSearchParams(window.location.search)
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === '') p.delete(k)
    else p.set(k, v)
  }
  const qs = p.toString()
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', url)
  notify()
}

export function useRoute(): [Route, (r: Route) => void] {
  useUrlTick()
  const go = useCallback((r: Route) => {
    window.location.hash = `/${r}`
  }, [])
  return [readRoute(), go]
}

export function useFilters(): [Filters, (patch: Partial<Filters>) => void, () => void] {
  useUrlTick()
  const filters = parseFilters(window.location.search)
  const update = useCallback((patch: Partial<Filters>) => {
    setParams(filtersToParams({ ...parseFilters(window.location.search), ...patch }))
  }, [])
  const reset = useCallback(() => {
    setParams(filtersToParams({ plant: 'ALL', type: '', group: '', crit: '', from: '', to: '' }))
  }, [])
  return [filters, update, reset]
}

/** A single view-specific query param (horizon, priority, drill-down...). */
export function useParam(key: string, fallback = ''): [string, (v: string | null) => void] {
  useUrlTick()
  const v = new URLSearchParams(window.location.search).get(key) ?? fallback
  const set = useCallback((next: string | null) => setParams({ [key]: next }), [key])
  return [v, set]
}
