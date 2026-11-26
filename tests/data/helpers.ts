import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const ROOT = resolve(__dirname, '../..')
export const DATA_DIR = join(ROOT, 'public/data')
export const SQL_DIR = join(ROOT, 'work/sql')

const cache = new Map<string, unknown>()

/** Reads one published JSON file from public/data once per test file. */
export function readData<T = any>(name: string): T { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!cache.has(name)) cache.set(name, JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8')))
  return cache.get(name) as T
}

export const dataFileBytes = (name: string): number => statSync(join(DATA_DIR, `${name}.json`)).size
export const dataFileExists = (name: string): boolean => existsSync(join(DATA_DIR, `${name}.json`))

export interface SqlLog { file: string; purpose: string | null; rows: number | null; asset: string | null; header: string; body: string }

/** Parses every numbered statement under work/sql/ into its header fields and its SQL text. */
export function readSqlLogs(): SqlLog[] {
  return readdirSync(SQL_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const text = readFileSync(join(SQL_DIR, file), 'utf8')
      const lines = text.split(/\r?\n/)
      const header = lines.filter((l) => l.startsWith('--'))
      const rows = /^-- Result rows:\s*([\d,]+)/m.exec(text)
      const asset = /^-- Data asset id:\s*([0-9a-f]{24}|preview only)/m.exec(text)
      return {
        file,
        purpose: header.find((l) => l.startsWith('-- Purpose:'))?.slice(11).trim() ?? null,
        rows: rows ? Number(rows[1].replace(/,/g, '')) : null,
        asset: asset ? asset[1] : null,
        header: header.join(' '),
        body: lines.filter((l) => !l.startsWith('--')).join('\n').trim(),
      }
    })
}

export const MONTHS_2026 = Array.from({ length: 11 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)
export const HOLDOUT_MONTHS = ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12']
export const PLANTS = ['HZL_DEMO_01', 'HZL_DEMO_02', 'HZL_DEMO_03', 'HZL_DEMO_04', 'HZL_DEMO_05', 'HZL_DEMO_06']
export const uniq = <T,>(xs: Iterable<T>): T[] => [...new Set(xs)]
