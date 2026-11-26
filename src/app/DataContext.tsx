import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { checkSchema, clearDatasetCache, loadDataset } from '../data/loader'
import type { DatasetMap, DatasetName, Dims, KpisFile, Manifest } from '../data/types'

export interface Core { manifest: Manifest; dims: Dims; kpis: KpisFile }

type CoreState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; core: Core }

const Ctx = createContext<{ state: CoreState; retry: () => void } | null>(null)

/** Loads manifest, dims and kpis at start; every other file loads when its screen opens. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CoreState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    ;(async () => {
      try {
        const manifest = await loadDataset('manifest')
        checkSchema(manifest)
        const [dims, kpis] = await Promise.all([loadDataset('dims'), loadDataset('kpis')])
        if (live) setState({ status: 'ready', core: { manifest, dims, kpis } })
      } catch (e) {
        if (live) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    })()
    return () => {
      live = false
    }
  }, [attempt])
  const retry = useCallback(() => {
    clearDatasetCache()
    setAttempt((a) => a + 1)
  }, [])
  return <Ctx.Provider value={{ state, retry }}>{children}</Ctx.Provider>
}

export function useCoreState() {
  const c = useContext(Ctx)
  if (!c) throw new Error('DataProvider missing')
  return c
}

export function useCore(): Core {
  const { state } = useCoreState()
  if (state.status !== 'ready') throw new Error('core data not ready')
  return state.core
}

export type Async<T> = { status: 'loading' } | { status: 'error'; message: string; retry: () => void } | { status: 'ready'; data: T }

/** Lazy dataset hook for the large files. */
export function useDataset<K extends DatasetName>(name: K): Async<DatasetMap[K]> {
  const [s, setS] = useState<Async<DatasetMap[K]>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setS({ status: 'loading' })
    loadDataset(name).then(
      (data) => live && setS({ status: 'ready', data }),
      (e) => live && setS({ status: 'error', message: e instanceof Error ? e.message : String(e), retry: () => setAttempt((a) => a + 1) }),
    )
    return () => {
      live = false
    }
  }, [name, attempt])
  return s
}
