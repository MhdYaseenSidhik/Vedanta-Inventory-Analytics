import { useCore } from '../app/DataContext'
import { useFilters } from '../app/url'
import { KpiFilterNote } from '../components/Disclaimer'
import { KpiPlantTrend } from '../components/KpiPlantTrend'
import { KpiTile } from '../components/KpiTile'
import { ScorecardMatrix } from '../components/ScorecardMatrix'
import { PageHeader } from '../components/ui/Panel'
import { hasMaterialFilter } from '../data/filters'
import { formatDate } from '../data/format'
import { summarizeAll } from '../data/selectors/kpi'
import { ALL } from '../data/types'

export default function ScorecardPage() {
  const { kpis, manifest, dims } = useCore()
  const [f] = useFilters()
  const tiles = summarizeAll(kpis.rows, kpis.catalog, f.plant, f.to, f.from)
  return (
    <div className="space-y-6">
      <PageHeader
        title="KPI scorecard"
        description={`Every KPI in the catalog: latest value, monthly trend, change vs the prior month and vs the same month last year. Green is favourable and red unfavourable against each KPI's direction; neutral KPIs are never coloured. ${f.plant === ALL ? 'All plants' : f.plant} · as of ${formatDate(manifest.asOf)}.`}
      />
      <KpiFilterNote show={hasMaterialFilter(f)} />
      <section aria-label="All KPIs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tiles.map((s) => (
          <KpiTile key={s.code} s={s} asOf={formatDate(manifest.asOf)} />
        ))}
      </section>
      <p className="text-xs text-muted">Modelled-opportunity and target KPIs exist for one month only, so they have no prior-month or last-year comparison (shown as –).</p>
      <KpiPlantTrend rows={kpis.rows} catalog={kpis.catalog} plants={dims.plants} from={f.from} to={f.to} />
      <ScorecardMatrix rows={kpis.rows} catalog={kpis.catalog} plants={dims.plants} upTo={f.to} />
    </div>
  )
}
