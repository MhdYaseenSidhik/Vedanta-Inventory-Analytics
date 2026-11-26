// Typed models that mirror public/data/SCHEMA.md (schemaVersion 3) exactly.

export const SCHEMA_VERSION = 3
export const ALL = 'ALL'
export const ALL_PLANTS_ID = 'ALL_PLANTS'

export type Direction = 'higher_is_better' | 'lower_is_better' | 'neutral'

export interface ManifestFile {
  name: string
  rows: number
  generatedAt: string
  source: { integrationId?: string; syncId?: string; assetId?: string; sql?: string; experimentId?: string; download?: string; trainAssetId?: string }
}

export interface ManifestForecast {
  experimentId: string
  experimentCreatedAt: string
  problemType: string
  predictionLength: number
  seriesCount: number
  bestModel: string
  metric: { name: string; value: number }
  backtestError: { mae: number; wape: number }
  verdict: string
  verdictReasons: string[]
  forecastAssetId: string
  forecastFrom: string
  forecastTo: string
}

export interface Manifest {
  schemaVersion: number
  generatedAt: string
  asOf: string
  disclaimer: string
  backcastIncluded: boolean
  files: ManifestFile[]
  forecast: ManifestForecast | null
}

export interface Plant { plantId: string; name: string; type: string; region: string }
export interface Coded { code: string; name: string }
export interface Dims {
  plants: Plant[]
  materialGroups: Coded[]
  materialTypes: Coded[]
  criticality: Coded[]
  movementClasses: string[]
  inventoryStatuses: string[]
}

export interface KpiCatalogEntry { code: string; label: string; uom: string; direction: Direction; definition: string }
export interface KpiRow { month: string; plantId: string; kpiCode: string; value: number; scenario: string }
export interface KpisFile { catalog: KpiCatalogEntry[]; rows: KpiRow[] }

export interface InventorySummaryRow {
  plantId: string
  materialGroup: string
  materialType: string
  criticality: string
  movementClass: string
  inventoryStatus: string
  abcClass: string
  materials: number
  availableQty: number
  valueInr: number
}
export interface InventorySummaryFile { asOf: string; rows: InventorySummaryRow[] }

export interface MaterialRow {
  materialId: string
  plantId: string
  description: string
  materialGroup: string
  materialType: string
  criticality: string
  abcClass: string
  xyzClass: string
  movementClass: string
  inventoryStatus: string
  availableQty: number
  valueInr: number
  daysOnHand: number
  daysSinceLastConsumption: number
  safetyStockQty: number
  reorderPointQty: number
  maxStockQty: number
  trailing12mDemandQty: number
}
export interface MaterialsFile { asOf: string; rows: MaterialRow[] }

export interface ReorderRow {
  recommendationId: string
  materialId: string
  plantId: string
  materialGroup: string
  materialType: string
  criticality: string
  priority: string
  recommendedPrDate: string
  recommendedQty: number
  estimatedValueInr: number
  availableQty: number
  openPrQty: number
  openPoQty: number
  safetyStockQty: number
  reorderPointQty: number
  reason: string
  shutdownId: string | null
}
export interface ReorderFile { asOf: string; rows: ReorderRow[] }

export interface PlanActualRow {
  month: string
  plantId: string
  materialGroup: string
  materialType: string
  shutdownDriven: string
  planValueInr: number
  actualPoValueInr: number
  actualGrValueInr: number
  varianceInr: number
  variancePct: number | null
}
export interface PlanActualFile { rows: PlanActualRow[] }

export interface SeriesKey { seriesId: string; materialId: string; plantId: string; materialGroup: string; materialType: string; month: string }
export interface BacktestRow extends SeriesKey { actual: number; predicted: number; lower: number | null; upper: number | null }
export interface ForecastRow extends SeriesKey { horizon: number; predicted: number; lower: number | null; upper: number | null }

export interface ForecastHoldoutFile {
  kind: 'backtest'
  note: string
  experimentId: string
  predictionLength: number
  metric: { name: string; value: number }
  error: { mae: number; wape: number }
  leaderboard: { model: string; metric: number }[]
  byPlantMonth: { plantId: string; month: string; actual: number; predicted: number }[]
  series: BacktestRow[]
}

export interface ForecastFile {
  available: boolean
  reason: string | null
  kind: 'forecast'
  experimentId?: string
  assetId?: string
  predictionLength?: number
  forecastFrom?: string
  forecastTo?: string
  horizons: number[]
  note?: string
  byPlantMonth: { plantId: string; month: string; horizon: number; predicted: number }[]
  rows: ForecastRow[]
}

export interface DatasetMap {
  manifest: Manifest
  dims: Dims
  kpis: KpisFile
  inventory_summary: InventorySummaryFile
  materials: MaterialsFile
  reorder: ReorderFile
  plan_vs_actual: PlanActualFile
  forecast_holdout: ForecastHoldoutFile
  forecast: ForecastFile
}
export type DatasetName = keyof DatasetMap
