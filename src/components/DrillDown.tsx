import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useParam } from '../app/url'
import { setParams } from '../app/url'
import type { Filters } from '../data/filters'
import type { Dims, InventorySummaryRow, MaterialRow } from '../data/types'
import { ALL } from '../data/types'
import { filterMaterials, filterSummary, groupSummary, queryMaterials, DOH_NO_CONSUMPTION } from '../data/selectors/inventory'
import { formatInr, formatInrFull, formatInt, formatQty, humanize } from '../data/format'
import { Badge } from './ui/Delta'
import { DataTable, type Col } from './ui/DataTable'
import { Panel } from './ui/Panel'
import { Select } from './ui/Select'
import { EmptyState } from './ui/States'
import type { Bucket } from '../data/selectors/inventory'

interface Props { summary: InventorySummaryRow[]; materials: MaterialRow[]; dims: Dims; f: Filters; onOpen: (m: MaterialRow) => void }

const bucketCols = (label: string, name: (k: string) => string): Col<Bucket>[] => [
  { id: 'key', header: label, width: 220, value: (b) => name(b.key) },
  { id: 'materials', header: 'Materials', width: 110, num: true, value: (b) => b.materials, cell: (b) => formatInt(b.materials) },
  { id: 'qty', header: 'Available qty', width: 130, num: true, value: (b) => b.availableQty, cell: (b) => formatQty(b.availableQty) },
  { id: 'value', header: 'Value', width: 130, num: true, value: (b) => b.valueInr, cell: (b) => formatInr(b.valueInr), title: (b) => formatInrFull(b.valueInr) },
]

/** Plant -> material group -> material list -> material detail, with a breadcrumb. State lives in the URL (dp, dg). */
export function DrillDown({ summary, materials, dims, f, onOpen }: Props) {
  const [dp] = useParam('dp')
  const [dg] = useParam('dg')
  const plant = f.plant !== ALL ? f.plant : dp
  const group = f.group || dg
  const groupName = (c: string) => dims.materialGroups.find((g) => g.code === c)?.name ?? c
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const sel = filterSummary(summary, f)
  const crumbs: { label: string; go: () => void }[] = [{ label: 'All plants', go: () => setParams({ plant: null, dp: null, dg: null, group: null }) }]
  if (plant) crumbs.push({ label: plant, go: () => setParams({ dg: null, group: null }) })
  if (plant && group) crumbs.push({ label: groupName(group), go: () => undefined })

  let body: React.ReactNode
  if (!plant) {
    body = <DataTable rows={groupSummary(sel, 'plantId')} cols={bucketCols('Plant', (k) => k)} rowKey={(b) => b.key} label="Inventory by plant" onRowClick={(b) => setParams({ dp: b.key })} height="18rem" />
  } else if (!group) {
    const rows = groupSummary(sel.filter((r) => r.plantId === plant), 'materialGroup')
    body = <DataTable rows={rows} cols={bucketCols('Material group', groupName)} rowKey={(b) => b.key} label={`Inventory by material group in ${plant}`} onRowClick={(b) => setParams({ dg: b.key })} height="26rem" empty={<EmptyState title="No material groups">Nothing in this plant matches the filters.</EmptyState>} />
  } else {
    const base = filterMaterials(materials, { ...f, plant, group })
    const list = queryMaterials(base, { search, status, movement: '' })
    body = (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Search material id or description
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Bush Assembly" className="ctl w-full" />
          </label>
          <Select label="Inventory status" value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...dims.inventoryStatuses.map((s) => ({ value: s, label: humanize(s) }))]} />
        </div>
        <DataTable<MaterialRow>
          rows={list}
          rowKey={(m) => `${m.materialId}|${m.plantId}`}
          label={`Materials of ${groupName(group)} in ${plant}`}
          onRowClick={onOpen}
          initialSort={[{ id: 'value', desc: true }]}
          empty={<EmptyState title="No materials match" action={<button type="button" className="btn" onClick={() => { setSearch(''); setStatus('') }}>Clear search and status</button>}>Try another search or status.</EmptyState>}
          cols={[
            { id: 'id', header: 'Material', width: 120, value: (m) => m.materialId },
            { id: 'desc', header: 'Description', width: 240, value: (m) => m.description, title: (m) => m.description },
            { id: 'type', header: 'Type', width: 80, value: (m) => m.materialType },
            { id: 'crit', header: 'Criticality', width: 110, value: (m) => m.criticality, cell: (m) => <Badge tone={m.criticality === 'VITAL' ? 'bad' : m.criticality === 'ESSENTIAL' ? 'warn' : 'neutral'}>{humanize(m.criticality)}</Badge> },
            { id: 'status', header: 'Status', width: 150, value: (m) => m.inventoryStatus, cell: (m) => humanize(m.inventoryStatus) },
            { id: 'qty', header: 'Available', width: 100, num: true, value: (m) => m.availableQty, cell: (m) => formatQty(m.availableQty, 'qty', 1) },
            { id: 'doh', header: 'Days on hand', width: 120, num: true, value: (m) => m.daysOnHand, cell: (m) => (m.daysOnHand >= DOH_NO_CONSUMPTION ? <span title="9999 in the source: no consumption">9999+</span> : formatInt(m.daysOnHand)) },
            { id: 'value', header: 'Value', width: 120, num: true, value: (m) => m.valueInr, cell: (m) => formatInr(m.valueInr), title: (m) => formatInrFull(m.valueInr) },
          ]}
        />
      </div>
    )
  }

  const hint = !plant ? 'Pick a plant to see its material groups.' : !group ? 'Pick a material group to list its materials.' : 'Pick a material for its detail.'
  return (
    <Panel
      title="Drill-down"
      subtitle={hint}
      actions={
        <nav aria-label="Drill-down breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 text-subtle" />}
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="font-semibold text-ink">{c.label}</span>
                ) : (
                  <button type="button" onClick={c.go} className="rounded-sm px-1 text-accent hover:underline">{c.label}</button>
                )}
              </li>
            ))}
          </ol>
        </nav>
      }
    >
      {body}
    </Panel>
  )
}
