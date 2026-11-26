import { useMemo, useState } from 'react'
import { useCore, useDataset } from '../app/DataContext'
import { useFilters, useParam } from '../app/url'
import { BacktestPanel } from '../components/BacktestPanel'
import { ForecastByMonthChart, ForecastTotalsChart } from '../components/ForecastCharts'
import { ForecastMaterialTable } from '../components/ForecastMaterialTable'
import { ForecastModelCard } from '../components/ForecastModelCard'
import { MaterialDetail } from '../components/MaterialDetail'
import { Badge } from '../components/ui/Delta'
import { Notice, PageHeader } from '../components/ui/Panel'
import { Segmented } from '../components/ui/Select'
import { EmptyState, Gate } from '../components/ui/States'
import { formatMonth } from '../data/format'
import { availableHorizons, byMaterial, byPlantMonth, forecastPlants, forecastRows, monthsOf, totalsBy } from '../data/selectors/forecast'
import type { ForecastFile, MaterialRow } from '../data/types'

function ForecastBody({ fc, plantsMsg, onOpen }: { fc: ForecastFile; plantsMsg: string; onOpen: (id: string, plant: string) => void }) {
  const [f, update] = useFilters()
  const horizons = availableHorizons(fc)
  const [hp, setHp] = useParam('h')
  const h = horizons.includes(Number(hp)) ? Number(hp) : horizons[horizons.length - 1]
  const scope = { plant: f.plant, type: f.type, group: f.group }
  const rows = useMemo(() => forecastRows(fc.rows, h, scope), [fc, h, f.plant, f.type, f.group]) // eslint-disable-line react-hooks/exhaustive-deps
  const plantMonth = useMemo(() => byPlantMonth(fc, h, scope), [fc, h, f.plant, f.type, f.group]) // eslint-disable-line react-hooks/exhaustive-deps
  const months = monthsOf(rows)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1 text-xs font-medium text-muted">
          Horizon
          <Segmented label="Forecast horizon" value={String(h)} onChange={(v) => setHp(v)} options={horizons.map((x) => ({ value: String(x), label: `${x} mo` }))} />
        </div>
        <div className="flex flex-col gap-1 text-xs font-medium text-muted">
          Material type
          <Segmented label="Material type" value={f.type} onChange={(v) => update({ type: v })} options={[{ value: '', label: 'All' }, { value: 'ZSPR', label: 'ZSPR' }, { value: 'ZSPN', label: 'ZSPN' }]} />
        </div>
        {months.length > 0 && (
          <p className="pb-2 text-sm text-muted">
            Covers <strong className="text-ink">{`${formatMonth(months[0])} to ${formatMonth(months[months.length - 1])}`}</strong> · {h}-month horizon · 10–90% band on the material table
          </p>
        )}
      </div>
      <Notice tone="info">
        {plantsMsg} The forecast covers plant HZL_DEMO_01 only and always shows its full horizon, so the criticality and month-range filters do not apply to it (the month range does apply to the backtest below).
      </Notice>
      {rows.length === 0 ? (
        <div className="rounded-md border border-line/10 bg-surface">
          <EmptyState title="No forecast for this selection">The forecast covers {forecastPlants(fc).join(', ')} only. Choose All plants or that plant, or clear the type and group filters.</EmptyState>
        </div>
      ) : (
        <>
          <ForecastByMonthChart rows={plantMonth} horizon={h} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ForecastTotalsChart title="By material type" totals={totalsBy(rows, 'materialType')} raw />
            <ForecastTotalsChart title="By material group" totals={totalsBy(rows, 'materialGroup')} />
          </div>
          <ForecastMaterialTable build={(m) => byMaterial(rows, m)} months={months} onOpen={onOpen} />
        </>
      )}
    </div>
  )
}

export default function ForecastPage() {
  const { manifest } = useCore()
  const [f] = useFilters()
  const forecast = useDataset('forecast')
  const holdout = useDataset('forecast_holdout')
  const materials = useDataset('materials')
  const [open, setOpen] = useState<MaterialRow | null>(null)
  const openMaterial = (id: string, plant: string) => {
    if (materials.status === 'ready') setOpen(materials.data.rows.find((m) => m.materialId === id && m.plantId === plant) ?? null)
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Demand forecast"
        description={`Net consumption quantity (issues 261 minus reversals 262) for stores and spares. Forecast months are future months; the backtest is a separate check on held-out past months.`}
      >
        {manifest.forecast && <Badge tone="warn">WAPE {manifest.forecast.backtestError.wape.toFixed(2)} · indicative only</Badge>}
      </PageHeader>
      <ForecastModelCard />
      <Gate state={forecast}>
        {(fc) =>
          fc.available ? (
            <ForecastBody fc={fc} plantsMsg={`${fc.note ?? ''}`} onOpen={openMaterial} />
          ) : (
            <Notice tone="warning" title="No forecast available">{fc.reason ?? 'The forecast file is marked unavailable.'}</Notice>
          )
        }
      </Gate>
      <Gate state={holdout}>{(h) => <BacktestPanel data={h} f={f} />}</Gate>
      {open && <MaterialDetail m={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
