import { useCore, useDataset } from '../app/DataContext'
import { useFilters, useParam } from '../app/url'
import { ReorderTable } from '../components/ReorderTable'
import { ReorderTotals } from '../components/ReorderTotals'
import { PageHeader } from '../components/ui/Panel'
import { Segmented } from '../components/ui/Select'
import { EmptyState, Gate } from '../components/ui/States'
import { formatDate } from '../data/format'
import { filterReorder, reorderTotals, sortReorder, totalsByPriority } from '../data/selectors/reorder'

export default function ReplenishmentPage() {
  const { manifest } = useCore()
  const [f] = useFilters()
  const [priority, setPriority] = useParam('priority')
  const [shutdown, setShutdown] = useParam('shutdown')
  const state = useDataset('reorder')
  return (
    <div className="space-y-6">
      <PageHeader title="Replenishment" description={`Reorder recommendations by priority with the recommended PR date, quantity, value and reason. Real plants only; All plants sums them. As of ${formatDate(manifest.asOf)}.`}>
        <Segmented label="Priority" value={priority} onChange={(v) => setPriority(v || null)} options={[{ value: '', label: 'All' }, { value: 'HIGH', label: 'High' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'LOW', label: 'Low' }]} />
        <Segmented label="Shutdown linkage" value={shutdown ? 'y' : ''} onChange={(v) => setShutdown(v ? '1' : null)} options={[{ value: '', label: 'Any' }, { value: 'y', label: 'Shutdown-linked' }]} />
      </PageHeader>
      <Gate state={state}>
        {(d) => {
          const q = { priority, shutdownOnly: Boolean(shutdown) }
          const rows = sortReorder(filterReorder(d.rows, f, q))
          return (
            <>
              <ReorderTotals total={reorderTotals(rows)} byPriority={totalsByPriority(filterReorder(d.rows, f, { ...q, priority: '' }))} />
              <ReorderTable
                rows={rows}
                empty={<EmptyState title="No reorder recommendations match" action={<button type="button" className="btn" onClick={() => { setPriority(null); setShutdown(null) }}>Clear priority and shutdown filters</button>}>Change the global filters or clear the priority and shutdown choices.</EmptyState>}
              />
            </>
          )
        }}
      </Gate>
    </div>
  )
}
