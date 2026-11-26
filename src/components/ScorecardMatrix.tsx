import type { KpiCatalogEntry, KpiRow, Plant } from '../data/types'
import { ALL_PLANTS_ID } from '../data/types'
import { formatKpi, formatKpiFull, formatSignedPct, uomLabel } from '../data/format'
import { summarizeKpi } from '../data/selectors/kpi'
import { Panel } from './ui/Panel'

const TONE = { good: 'text-success', bad: 'text-danger', neutral: 'text-muted' } as const

/** KPI x plant matrix of the latest value, with the change vs prior month coloured by direction. ALL_PLANTS is the source portfolio row. */
export function ScorecardMatrix({ rows, catalog, plants, upTo }: { rows: KpiRow[]; catalog: KpiCatalogEntry[]; plants: Plant[]; upTo: string }) {
  const cols = [{ id: 'ALL', plantId: ALL_PLANTS_ID, label: 'All plants' }, ...plants.map((p) => ({ id: p.plantId, plantId: p.plantId, label: p.plantId.replace('HZL_', '') }))]
  return (
    <Panel title="By plant" subtitle="Latest value and change vs prior month for every KPI. The All plants column is the portfolio value published by the source, never a sum of the plants.">
      <div role="region" aria-label="KPI by plant" tabIndex={0} className="max-h-[70vh] overflow-auto rounded-md border border-line/10">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-sunken">
            <tr>
              <th scope="col" className="sticky left-0 z-20 bg-sunken px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">KPI</th>
              {cols.map((c) => (
                <th key={c.id} scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.map((entry) => (
              <tr key={entry.code} className="border-t border-line/10 hover:bg-sunken/60">
                <th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left font-medium" title={entry.definition}>
                  {entry.label}
                  <span className="ml-1 text-xs font-normal text-subtle">{uomLabel(entry.uom)}</span>
                </th>
                {cols.map((c) => {
                  const s = summarizeKpi(rows, entry, c.id === 'ALL' ? 'ALL' : c.plantId, upTo)
                  return (
                    <td key={c.id} className="num px-3 py-2" title={s.value === null ? 'No data' : formatKpiFull(s.value, entry.uom)}>
                      <div>{s.value === null ? <span className="text-subtle">–</span> : formatKpi(s.value, entry.uom)}</div>
                      <div className={`text-xs ${TONE[s.momTone]}`}>{s.momPct === null ? '' : formatSignedPct(s.momPct)}</div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
