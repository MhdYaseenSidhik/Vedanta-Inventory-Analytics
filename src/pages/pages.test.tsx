import { render, screen, waitFor } from '@testing-library/react'
import { App } from '../app/App'
import { clearDatasetCache } from '../data/loader'
import type { Dims, ForecastFile, ForecastHoldoutFile, InventorySummaryFile, KpisFile, Manifest, MaterialsFile, PlanActualFile, ReorderFile } from '../data/types'

// Small fixtures that follow SCHEMA.md; one render test per screen.
const manifest: Manifest = {
  schemaVersion: 3, generatedAt: '2026-11-26T00:00:00Z', asOf: '2025-12-31', disclaimer: 'Simulated POC figure.', backcastIncluded: true, files: [],
  forecast: { experimentId: 'exp1', experimentCreatedAt: '2026-11-25T14:26:35.911Z', problemType: 'time_series', predictionLength: 11, seriesCount: 1, bestModel: 'WeightedEnsemble', metric: { name: 'RMSE', value: 11.9 }, backtestError: { mae: 5.4769, wape: 1.1722 }, verdict: 'unavailable', verdictReasons: ['WAPE above 1'], forecastAssetId: 'a', forecastFrom: '2026-01', forecastTo: '2026-11' },
}
const dims: Dims = {
  plants: [{ plantId: 'HZL_DEMO_01', name: 'P1', type: 'MINE', region: 'N' }],
  materialGroups: [{ code: 'FILTERS', name: 'Filters' }], materialTypes: [{ code: 'ZSPR', name: 'ZSPR' }, { code: 'ZSPN', name: 'ZSPN' }],
  criticality: [{ code: 'VITAL', name: 'Vital' }], movementClasses: ['ACTIVE'], inventoryStatuses: ['STOCKOUT', 'NORMAL'],
}
const kpiRow = (month: string, plantId: string, kpiCode: string, value: number) => ({ month, plantId, kpiCode, value, scenario: 'SIMULATED_BASELINE' })
const kpis: KpisFile = {
  catalog: [
    { code: 'GROSS_INVENTORY_VALUE_INR', label: 'Gross inventory value', uom: 'INR', direction: 'neutral', definition: 'Total value of stock.' },
    { code: 'DAYS_ON_HAND', label: 'Days on hand', uom: 'DAYS', direction: 'lower_is_better', definition: 'Days of cover.' },
  ],
  rows: [
    kpiRow('2025-11', 'ALL_PLANTS', 'GROSS_INVENTORY_VALUE_INR', 5e9), kpiRow('2025-12', 'ALL_PLANTS', 'GROSS_INVENTORY_VALUE_INR', 5.125e9),
    kpiRow('2025-11', 'ALL_PLANTS', 'DAYS_ON_HAND', 190), kpiRow('2025-12', 'ALL_PLANTS', 'DAYS_ON_HAND', 187),
    kpiRow('2025-12', 'HZL_DEMO_01', 'DAYS_ON_HAND', 150),
  ],
}
const summary: InventorySummaryFile = { asOf: '2025-12-31', rows: [{ plantId: 'HZL_DEMO_01', materialGroup: 'FILTERS', materialType: 'ZSPR', criticality: 'VITAL', movementClass: 'ACTIVE', inventoryStatus: 'STOCKOUT', abcClass: 'A', materials: 4, availableQty: 0, valueInr: 1.25e7 }] }
const materials: MaterialsFile = { asOf: '2025-12-31', rows: [{ materialId: 'HZL1', plantId: 'HZL_DEMO_01', description: 'Bush', materialGroup: 'FILTERS', materialType: 'ZSPR', criticality: 'VITAL', abcClass: 'A', xyzClass: 'X', movementClass: 'ACTIVE', inventoryStatus: 'STOCKOUT', availableQty: 0, valueInr: 0, daysOnHand: 0, daysSinceLastConsumption: 5, safetyStockQty: 1, reorderPointQty: 1, maxStockQty: 2, trailing12mDemandQty: 3 }] }
const reorder: ReorderFile = { asOf: '2025-12-31', rows: [{ recommendationId: 'RC1', materialId: 'HZL1', plantId: 'HZL_DEMO_01', materialGroup: 'FILTERS', materialType: 'ZSPR', criticality: 'VITAL', priority: 'HIGH', recommendedPrDate: '2026-01-10', recommendedQty: 5, estimatedValueInr: 430000, availableQty: 0, openPrQty: 0, openPoQty: 0, safetyStockQty: 1, reorderPointQty: 1, reason: 'Below reorder point.', shutdownId: null }] }
const plan: PlanActualFile = { rows: [{ month: '2025-01', plantId: 'HZL_DEMO_01', materialGroup: 'FILTERS', materialType: 'ZSPR', shutdownDriven: 'N', planValueInr: 1e7, actualPoValueInr: 8e6, actualGrValueInr: 7e6, varianceInr: 2e6, variancePct: 20 }] }
const mk = (id: string, month: string, h: number) => ({ seriesId: id, materialId: 'HZL1', plantId: 'HZL_DEMO_01', materialGroup: 'FILTERS', materialType: 'ZSPR', month, horizon: h, predicted: 3, lower: 1, upper: 5 })
const forecast: ForecastFile = { available: true, reason: null, kind: 'forecast', predictionLength: 11, forecastFrom: '2026-01', forecastTo: '2026-11', horizons: [3, 6, 11], note: 'Indicative only.', byPlantMonth: [{ plantId: 'HZL_DEMO_01', month: '2026-01', horizon: 1, predicted: 3 }], rows: [mk('HZL1|HZL_DEMO_01', '2026-01', 1)] }
const holdout: ForecastHoldoutFile = { kind: 'backtest', note: 'Predictions for held-out months.', experimentId: 'exp1', predictionLength: 11, metric: { name: 'RMSE', value: 11.9 }, error: { mae: 5.4769, wape: 1.1722 }, leaderboard: [], byPlantMonth: [], series: [{ seriesId: 'HZL1|HZL_DEMO_01', materialId: 'HZL1', plantId: 'HZL_DEMO_01', materialGroup: 'FILTERS', materialType: 'ZSPR', month: '2025-02', actual: 4, predicted: 2, lower: 0, upper: 3 }] }

const files: Record<string, unknown> = { manifest, dims, kpis, inventory_summary: summary, materials, reorder, plan_vs_actual: plan, forecast, forecast_holdout: holdout }

beforeEach(() => {
  clearDatasetCache()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const name = /data\/(\w+)\.json/.exec(url)?.[1] ?? ''
    return name in files ? { ok: true, status: 200, json: async () => files[name] } : { ok: false, status: 404, json: async () => ({}) }
  }))
  // jsdom has no ResizeObserver / canvas; charts are not under test here
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { vi.unstubAllGlobals(); window.location.hash = ''; window.history.replaceState(null, '', '/') })

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="chart" /> }))

async function open(route: string, query = '') {
  window.history.replaceState(null, '', `/${query}`)
  window.location.hash = `/${route}`
  render(<App />)
  await screen.findByRole('navigation', { name: 'Screens' })
}

describe('screens render with fixture data', () => {
  it('Overview: KPI tiles, change colouring, alerts, disclaimer and as-of', async () => {
    await open('overview')
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(await screen.findByText('Gross inventory value')).toBeInTheDocument()
    expect(screen.getAllByText(/512\.50 Cr/).length).toBeGreaterThan(0)
    expect(await screen.findByText(/VITAL stockouts/)).toBeInTheDocument()
    expect(screen.getAllByText(/Simulated POC figure/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/31 Dec 2025/).length).toBeGreaterThan(0)
  })
  it('Overview: says KPIs are not filtered by material type when one is set', async () => {
    await open('overview', '?type=ZSPR')
    expect(await screen.findByText(/not filtered by material type, group or criticality/)).toBeInTheDocument()
  })
  it('KPI scorecard: lists the catalog and the by-plant matrix', async () => {
    await open('scorecard')
    expect(await screen.findByRole('heading', { name: 'KPI scorecard' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'KPI by plant' })).toBeInTheDocument()
  })
  it('Inventory health: breakdowns and drill-down start at plants', async () => {
    await open('health')
    expect(await screen.findByRole('heading', { name: 'Inventory health' })).toBeInTheDocument()
    expect(await screen.findByRole('navigation', { name: 'Drill-down breadcrumb' })).toBeInTheDocument()
    expect(await screen.findByText('Movement class')).toBeInTheDocument()
  })
  it('Inventory health: a filter that matches nothing shows the empty state', async () => {
    await open('health', '?group=NOPE')
    expect(await screen.findByText('No inventory matches these filters')).toBeInTheDocument()
  })
  it('Replenishment: totals and the empty state', async () => {
    await open('replenishment')
    expect(await screen.findByRole('heading', { name: 'Replenishment' })).toBeInTheDocument()
    expect(await screen.findByText('Estimated value')).toBeInTheDocument()
    expect(screen.getAllByText('₹4.3 L').length).toBeGreaterThan(0)
  })
  it('Replenishment: nothing matching shows the empty state', async () => {
    await open('replenishment', '?priority=LOW')
    expect(await screen.findByText('No reorder recommendations match')).toBeInTheDocument()
  })
  it('Demand forecast: horizon selector, backtest label and the WAPE note', async () => {
    await open('forecast')
    expect(await screen.findByRole('heading', { name: 'Demand forecast' })).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: '3 mo' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '6 mo' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '11 mo' })).toBeInTheDocument()
    expect(await screen.findByText(/Backtest WAPE is 1\.1722, above 1/)).toBeInTheDocument()
    expect((await screen.findAllByText(/Backtest · not a forecast/)).length).toBeGreaterThan(0)
  })
  it('Plan vs actual: totals and breakdown tables', async () => {
    await open('plan')
    expect(await screen.findByRole('heading', { name: 'Plan vs actual' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('By material group')).toBeInTheDocument())
  })
  it('schema mismatch shows an error naming the versions', async () => {
    files.manifest = { ...manifest, schemaVersion: 2 }
    clearDatasetCache()
    render(<App />)
    expect(await screen.findByText(/schemaVersion is 2 but this dashboard was built for schemaVersion 3/)).toBeInTheDocument()
    files.manifest = manifest
  })
})
