// @vitest-environment node
// Both data tickets: every SQL statement run is saved under work/sql/, numbered, headed and read-only.
import { readSqlLogs } from './helpers'

const logs = readSqlLogs()
const FORBIDDEN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|MERGE|GRANT|REVOKE|CALL|EXEC)\b/i

describe('work/sql log', () => {
  it('is numbered 01.. with no gaps and snake_case names', () => {
    expect(logs.length).toBeGreaterThanOrEqual(9)
    logs.forEach((l, i) => expect(l.file).toMatch(new RegExp(`^${String(i + 1).padStart(2, '0')}_[a-z0-9_]+\\.sql$`)))
  })
  it.each(logs.map((l) => [l.file, l] as const))('%s has a purpose, a row count and a data asset id (or "preview only")', (_f, l) => {
    expect(l.purpose, 'Purpose header').toBeTruthy()
    expect(l.rows, 'Result rows header').not.toBeNull()
    expect(l.asset, 'Data asset id header').not.toBeNull()
  })
  it.each(logs.map((l) => [l.file, l] as const))('%s is a single read-only SELECT / WITH statement', (_f, l) => {
    expect(l.body).toMatch(/^(SELECT|WITH)\b/i)
    const withoutLiterals = l.body.replace(/'([^']|'')*'/g, "''")
    expect(withoutLiterals).not.toMatch(FORBIDDEN)
    expect(withoutLiterals.replace(/;\s*$/, '')).not.toContain(';')
  })
  it('data asset ids are unique across statements (one asset per synced query)', () => {
    const ids = logs.map((l) => l.asset).filter((a) => a && a !== 'preview only')
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every statement targets the VEDANTA_POC schema', () => {
    for (const l of logs) expect(l.body, l.file).toContain('VEDANTA_POC.')
  })
})
