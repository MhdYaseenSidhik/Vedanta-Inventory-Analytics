import { useState } from 'react'
import { useCore, useDataset } from '../app/DataContext'
import { useFilters } from '../app/url'
import { DrillDown } from '../components/DrillDown'
import { HealthBreakdowns } from '../components/HealthBreakdowns'
import { MaterialDetail } from '../components/MaterialDetail'
import { PageHeader } from '../components/ui/Panel'
import { Gate } from '../components/ui/States'
import { formatDate } from '../data/format'
import type { MaterialRow } from '../data/types'

export default function HealthPage() {
  const { dims, manifest } = useCore()
  const [f] = useFilters()
  const summary = useDataset('inventory_summary')
  const materials = useDataset('materials')
  const [open, setOpen] = useState<MaterialRow | null>(null)
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory health" description={`Where the value sits by type, movement, status, criticality and ABC class, then drill from plant to material group to material. Real plants only; All plants sums them. As of ${formatDate(manifest.asOf)}.`} />
      <Gate state={summary}>
        {(s) => (
          <>
            <HealthBreakdowns rows={s.rows} f={f} />
            <Gate state={materials}>{(m) => <DrillDown summary={s.rows} materials={m.rows} dims={dims} f={f} onOpen={setOpen} />}</Gate>
          </>
        )}
      </Gate>
      {open && <MaterialDetail m={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
