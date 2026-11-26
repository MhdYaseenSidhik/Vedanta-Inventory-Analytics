import { RotateCcw } from 'lucide-react'
import { useCore } from '../app/DataContext'
import { useFilters } from '../app/url'
import { kpiMonths } from '../data/selectors/kpi'
import { formatMonth } from '../data/format'
import { ALL } from '../data/types'
import { Select } from './ui/Select'

/** Global filters. State lives in the URL query string so a view can be shared. */
export function FilterBar() {
  const { dims, kpis } = useCore()
  const [f, update, reset] = useFilters()
  const months = kpiMonths(kpis.rows)
  const monthOpts = (blank: string) => [{ value: '', label: blank }, ...months.map((m) => ({ value: m, label: formatMonth(m) }))]
  const dirty = f.plant !== ALL || f.type || f.group || f.crit || f.from || f.to
  return (
    <form aria-label="Global filters" onSubmit={(e) => e.preventDefault()} className="border-b border-line/10 bg-surface">
      <div className="mx-auto grid max-w-page grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-[repeat(7,minmax(0,1fr))_auto] lg:items-end">
        <Select label="Plant" value={f.plant} onChange={(v) => update({ plant: v })} options={[{ value: ALL, label: 'All plants' }, ...dims.plants.map((p) => ({ value: p.plantId, label: p.plantId.replace('HZL_', '') }))]} />
        <Select label="Material type" value={f.type} onChange={(v) => update({ type: v })} options={[{ value: '', label: 'All types' }, ...dims.materialTypes.map((t) => ({ value: t.code, label: t.name }))]} />
        <Select label="Material group" value={f.group} onChange={(v) => update({ group: v })} options={[{ value: '', label: 'All groups' }, ...dims.materialGroups.map((g) => ({ value: g.code, label: g.name }))]} />
        <Select label="Criticality" value={f.crit} onChange={(v) => update({ crit: v })} options={[{ value: '', label: 'All' }, ...dims.criticality.map((c) => ({ value: c.code, label: c.name }))]} />
        <Select label="From month" value={f.from} onChange={(v) => update({ from: v })} options={monthOpts('Earliest')} />
        <Select label="To month" value={f.to} onChange={(v) => update({ to: v })} options={monthOpts('Latest')} />
        <div className="hidden lg:block" />
        <button type="button" className="btn col-span-2 sm:col-span-1" onClick={reset} disabled={!dirty}>
          <RotateCcw aria-hidden className="h-4 w-4" />
          Reset
        </button>
      </div>
    </form>
  )
}
