import { SCHEMA_VERSION, type DatasetMap, type DatasetName } from './types'

// The one place that knows where data lives. Move the source (e.g. Cloud Storage)
// by changing dataUrl only; no component fetches or knows a file path.
export function dataUrl(name: DatasetName): string {
  return `${import.meta.env.BASE_URL}data/${name}.json`
}

const cache = new Map<DatasetName, Promise<unknown>>()

export class SchemaMismatchError extends Error {
  constructor(public found: unknown, public expected: number) {
    super(`manifest.json schemaVersion is ${String(found)} but this dashboard was built for schemaVersion ${expected} (SCHEMA.md).`)
    this.name = 'SchemaMismatchError'
  }
}

export function loadDataset<K extends DatasetName>(name: K): Promise<DatasetMap[K]> {
  const hit = cache.get(name)
  if (hit) return hit as Promise<DatasetMap[K]>
  const p = fetch(dataUrl(name)).then(async (res) => {
    if (!res.ok) throw new Error(`Could not load ${name}.json (HTTP ${res.status}).`)
    return (await res.json()) as DatasetMap[K]
  })
  // a failed load must not be cached, so "Retry" really retries
  p.catch(() => cache.delete(name))
  cache.set(name, p)
  return p
}

export function checkSchema(manifest: { schemaVersion: number }): void {
  if (manifest.schemaVersion !== SCHEMA_VERSION) throw new SchemaMismatchError(manifest.schemaVersion, SCHEMA_VERSION)
}

export function clearDatasetCache(): void {
  cache.clear()
}
