import { useCore, useDataset } from '../app/DataContext'
import { useFilters } from '../app/url'
import { PlanByMonthChart, VarianceChart } from '../components/PlanCharts'
import { PlanTable } from '../components/PlanTables'
import { PageHeader } from '../components/ui/Panel'
import { EmptyState, Gate } from '../components/ui/States'
import { formatInr, formatInrFull, formatMonth, formatSignedPct } from '../data/format'
import { filterPlan, groupPlan, totalPlan } from '../data/selectors/plan'
import { monthsOf } from '../data/selectors/forecast'

export default function PlanPage() {
  const { dims } = useCore()
  const [f] = useFilters()
  const state = useDataset('plan_vs_actual')
  const groupName = (c: string) => dims.materialGroups.find((g) => g.code === c)?.name ?? c
  return (
    <div className="space-y-6">
      <PageHeader title="Plan vs actual" description="Business plan value against actual PO and GR value, with variance, by month, plant and material group. Real plants only; All plants sums them. Criticality does not apply to this file." />
      <Gate state={state}>
        {(d) => {
          const rows = filterPlan(d.rows, f)
          if (rows.length === 0) {
            return (
              <div className="rounded-md border border-line/10 bg-surface">
                <EmptyState title="No plan data for this selection">Plan data covers Jan 2024 to Dec 2025. Widen the plant, type, group or month range.</EmptyState>
              </div>
            )
          }
          const t = totalPlan(rows)
          const months = monthsOf(rows)
          const stats: [string, string, string][] = [
            ['Plan', formatInr(t.planValueInr), formatInrFull(t.planValueInr)],
            ['PO value', formatInr(t.actualPoValueInr), formatInrFull(t.actualPoValueInr)],
            ['GR value', formatInr(t.actualGrValueInr), formatInrFull(t.actualGrValueInr)],
            ['Variance', `${formatInr(t.varianceInr)}${t.variancePct === null ? '' : ` (${formatSignedPct(t.variancePct)})`}`, formatInrFull(t.varianceInr)],
          ]
          return (
            <>
              <p className="text-sm text-muted">{formatMonth(months[0])} to {formatMonth(months[months.length - 1])} · {rows.length.toLocaleString('en-IN')} source rows</p>
              <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {stats.map(([k, v, full]) => (
                  <div key={k} className="min-w-0 rounded-md border border-line/10 bg-surface p-4 shadow-1">
                    <dt className="text-sm text-muted">{k}</dt>
                    <dd className="mt-1 truncate text-xl font-semibold" title={full}>{v}</dd>
                  </div>
                ))}
              </dl>
              <PlanByMonthChart rows={groupPlan(rows, 'month')} />
              <VarianceChart rows={groupPlan(rows, 'month')} />
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <PlanTable title="By plant" label="Plant" rows={groupPlan(rows, 'plantId')} />
                <PlanTable title="By material group" label="Material group" rows={groupPlan(rows, 'materialGroup')} nameOf={groupName} />
              </div>
              <PlanTable title="By month" label="Month" rows={groupPlan(rows, 'month')} nameOf={formatMonth} initialSort={[{ id: 'key', desc: true }]} />
            </>
          )
        }}
      </Gate>
    </div>
  )
}
