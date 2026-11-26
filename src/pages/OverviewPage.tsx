import { useCore } from '../app/DataContext'
import { useFilters } from '../app/url'
import { AlertsPanel } from '../components/AlertsPanel'
import { KpiFilterNote } from '../components/Disclaimer'
import { KpiTile } from '../components/KpiTile'
import { KpiTrendChart } from '../components/KpiTrendChart'
import { PageHeader, Panel } from '../components/ui/Panel'
import { hasMaterialFilter } from '../data/filters'
import { formatDate } from '../data/format'
import { OVERVIEW_KPIS, summarizeKpi } from '../data/selectors/kpi'
import { ALL } from '../data/types'

const TREND_CODES = ['GROSS_INVENTORY_VALUE_INR', 'EXCESS_INVENTORY_VALUE_INR', 'SLOW_MOVING_VALUE_INR', 'NON_MOVING_VALUE_INR', 'OBSOLETE_VALUE_INR']

export default function OverviewPage() {
  const { kpis, manifest } = useCore()
  const [f] = useFilters()
  const byCode = new Map(kpis.catalog.map((c) => [c.code, c]))
  const tiles = OVERVIEW_KPIS.map((c) => byCode.get(c)).filter((c): c is NonNullable<typeof c> => Boolean(c)).map((c) => summarizeKpi(kpis.rows, c, f.plant, f.to, f.from))
  const labels = TREND_CODES.map((c) => byCode.get(c)?.label ?? c)
  const scope = f.plant === ALL ? 'All plants (portfolio values from the source, not a sum of plants)' : f.plant
  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description={`Inventory value, ageing, availability and opportunity. ${scope}. As of ${formatDate(manifest.asOf)}.`} />
      <KpiFilterNote show={hasMaterialFilter(f)} />
      <section aria-label="Key figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((s) => (
          <KpiTile key={s.code} s={s} asOf={formatDate(manifest.asOf)} />
        ))}
      </section>
      <p className="text-xs text-muted">
        Potential reduction and working-capital opportunity are modelled for {formatDate(manifest.asOf)} only, so they show no month-on-month change.
      </p>
      <Panel title="Inventory value over time" subtitle="Gross, excess, slow-moving, non-moving and obsolete value by month (INR). Hover for the full value.">
        <KpiTrendChart rows={kpis.rows} codes={TREND_CODES} labels={labels} plant={f.plant} from={f.from} to={f.to} />
      </Panel>
      <AlertsPanel f={f} />
    </div>
  )
}
