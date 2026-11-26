// @vitest-environment node
// Ticket 1, DASHBOARD DATA REFRESH: the six data files, manifest, SCHEMA.md and the SQL log.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dataFileExists, DATA_DIR, PLANTS, readData, readSqlLogs, uniq } from './helpers'

const manifest = readData('manifest')
const REFRESH = ['dims', 'kpis', 'inventory_summary', 'materials', 'reorder', 'plan_vs_actual']
const rowsOf = (name: string): number => {
  const d = readData(name)
  return Array.isArray(d.rows) ? d.rows.length : NaN
}

describe('AC1 every refresh file is published with a manifest entry', () => {
  it.each(REFRESH)('%s.json exists and is listed in manifest.files', (name) => {
    expect(dataFileExists(name)).toBe(true)
    expect(manifest.files.map((f: { name: string }) => f.name)).toContain(`${name}.json`)
  })
  it('manifest.json and SCHEMA.md exist', () => {
    expect(dataFileExists('manifest')).toBe(true)
    expect(existsSync(join(DATA_DIR, 'SCHEMA.md'))).toBe(true)
  })
  it('SCHEMA.md documents every published file and the manifest', () => {
    const schema = readFileSync(join(DATA_DIR, 'SCHEMA.md'), 'utf8')
    for (const n of [...REFRESH, 'forecast_holdout', 'forecast', 'manifest']) expect(schema).toContain(`${n}.json`)
  })
  it('manifest declares schemaVersion 3 (the version the dashboard loader requires)', () => {
    expect(manifest.schemaVersion).toBe(3)
  })
  it('every manifest file entry carries integration, sync, asset and sql provenance', () => {
    for (const f of manifest.files) {
      expect(f.rows, f.name).toBeGreaterThan(0)
      expect(f.source.integrationId, f.name).toMatch(/^[0-9a-f]{24}$/)
      expect(f.source.assetId, f.name).toMatch(/^[0-9a-f]{24}$/)
      expect(f.source.sql, f.name).toBeTruthy()
    }
  })
})

describe('AC2 asOf is the data date and the 2023 backcast is included', () => {
  it('manifest.asOf is 2025-12-31, not the run date', () => {
    expect(manifest.asOf).toBe('2025-12-31')
    expect(manifest.generatedAt.slice(0, 10) > manifest.asOf).toBe(true)
  })
  it('inventory files carry the same asOf', () => {
    for (const n of ['inventory_summary', 'materials', 'reorder']) expect(readData(n).asOf, n).toBe(manifest.asOf)
  })
  it('kpis cover 36 months from 2023-01 to 2025-12 and manifest says backcast is included', () => {
    const months = uniq<string>(readData('kpis').rows.map((r: { month: string }) => r.month)).sort()
    expect(months).toHaveLength(36)
    expect(months[0]).toBe('2023-01')
    expect(months.at(-1)).toBe('2025-12')
    expect(manifest.backcastIncluded).toBe(true)
  })
})

describe('AC3 disclaimer: every figure is a simulated POC figure', () => {
  it('manifest.disclaimer states the figures are simulated', () => {
    expect(manifest.disclaimer).toMatch(/simulated/i)
    expect(manifest.disclaimer).toMatch(/POC/)
  })
})

describe('AC4 scope: HZL_DEMO_01..06, ZSPR and ZSPN only', () => {
  it('dims lists the six real plants and never ALL_PLANTS', () => {
    const d = readData('dims')
    expect(d.plants.map((p: { plantId: string }) => p.plantId)).toEqual(PLANTS)
  })
  it('dims material types are exactly ZSPN and ZSPR', () => {
    expect(readData('dims').materialTypes.map((t: { code: string }) => t.code).sort()).toEqual(['ZSPN', 'ZSPR'])
  })
  it.each(['inventory_summary', 'materials', 'reorder', 'plan_vs_actual'])('%s holds only the six plants and the two types', (n) => {
    const rows = readData(n).rows as { plantId: string; materialType: string }[]
    expect(uniq(rows.map((r) => r.plantId)).sort()).toEqual(PLANTS)
    expect(uniq(rows.map((r) => r.materialType)).sort()).toEqual(['ZSPN', 'ZSPR'])
  })
  it('kpis keeps ALL_PLANTS as the published portfolio value, plus the six plants', () => {
    const plants = uniq<string>(readData('kpis').rows.map((r: { plantId: string }) => r.plantId)).sort()
    expect(plants).toEqual(['ALL_PLANTS', ...PLANTS])
  })
})

describe('AC5 row counts reconcile: manifest, work/sql headers and the files', () => {
  const sql = readSqlLogs()
  const byName = (n: string) => manifest.files.find((f: { name: string }) => f.name === `${n}.json`)
  it.each(REFRESH)('%s: manifest.rows equals the work/sql header and the parsed file', (n) => {
    const entry = byName(n)
    const log = sql.find((s) => s.asset === entry.source.assetId)
    expect(log, `no work/sql file carries asset ${entry.source.assetId}`).toBeDefined()
    expect(log!.rows).toBe(entry.rows)
    // dims.json holds 37 dictionary rows folded into six lists, so only its manifest and header counts apply.
    if (n !== 'dims') expect(rowsOf(n)).toBe(entry.rows)
  })
  it('dims.json folds exactly the 37 dictionary rows into its lists', () => {
    const d = readData('dims')
    const folded = d.plants.length + d.materialGroups.length + d.materialTypes.length + d.criticality.length + d.movementClasses.length + d.inventoryStatuses.length
    expect(byName('dims').rows).toBe(37)
    expect(folded).toBe(35) // the other two dictionary rows are the DISCLAIMER and ASOF rows, read into the manifest
  })
  it('the SQL in the manifest is the SQL in work/sql, statement for statement', () => {
    const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/;\s*$/, '').trim()
    for (const n of REFRESH) {
      const entry = byName(n)
      const log = sql.find((s) => s.asset === entry.source.assetId)!
      expect(norm(log.body), n).toBe(norm(entry.source.sql))
    }
  })
})

describe('AC6 internal consistency of the published data', () => {
  it('inventory_summary reconciles to materials (count, value, quantity)', () => {
    const s = readData('inventory_summary').rows as { materials: number; valueInr: number; availableQty: number }[]
    const m = readData('materials').rows as { valueInr: number; availableQty: number }[]
    const sum = (xs: number[]) => xs.reduce((a, b) => a + (b ?? 0), 0)
    expect(sum(s.map((r) => r.materials))).toBe(m.length)
    expect(Math.abs(sum(s.map((r) => r.valueInr)) - sum(m.map((r) => r.valueInr)))).toBeLessThan(1)
    expect(Math.abs(sum(s.map((r) => r.availableQty)) - sum(m.map((r) => r.availableQty)))).toBeLessThan(1)
  })
  it('materials has one row per material x plant', () => {
    const m = readData('materials').rows as { materialId: string; plantId: string }[]
    expect(new Set(m.map((r) => `${r.materialId}|${r.plantId}`)).size).toBe(m.length)
  })
  it('reorder recommendation ids are unique and priorities are HIGH / MEDIUM / LOW', () => {
    const r = readData('reorder').rows as { recommendationId: string; priority: string }[]
    expect(new Set(r.map((x) => x.recommendationId)).size).toBe(r.length)
    expect(uniq(r.map((x) => x.priority)).sort()).toEqual(['HIGH', 'LOW', 'MEDIUM'])
  })
  it('plan_vs_actual: variancePct is null exactly when the plan is 0, never coerced to 0', () => {
    const rows = readData('plan_vs_actual').rows as { planValueInr: number; variancePct: number | null }[]
    for (const r of rows) expect(r.variancePct === null).toBe(r.planValueInr === 0)
  })
  it('kpis: one value per month x plant x KPI x scenario, and every KPI has a catalog entry', () => {
    const k = readData('kpis')
    const keys = new Set(k.rows.map((r: { month: string; plantId: string; kpiCode: string; scenario: string }) => `${r.month}|${r.plantId}|${r.kpiCode}|${r.scenario}`))
    expect(keys.size).toBe(k.rows.length)
    const codes = new Set(k.catalog.map((c: { code: string }) => c.code))
    expect(codes.size).toBe(k.catalog.length)
    for (const r of k.rows) expect(codes.has(r.kpiCode), r.kpiCode).toBe(true)
    for (const c of k.catalog) expect(['higher_is_better', 'lower_is_better', 'neutral']).toContain(c.direction)
  })
})
