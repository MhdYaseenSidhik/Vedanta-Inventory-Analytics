import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { EmptyState } from './States'

export interface Col<T> {
  id: string
  header: string
  width: number // px basis; the table scrolls inside its own box on phones
  num?: boolean
  value: (r: T) => string | number | null
  cell?: (r: T) => React.ReactNode
  title?: (r: T) => string
}

/** Sortable, row-virtualised table. Scrolls inside its own box, so the page never scrolls sideways. */
export function DataTable<T>({
  rows,
  cols,
  rowKey,
  label,
  empty,
  onRowClick,
  initialSort,
  height = 'var(--table-h)',
}: {
  rows: T[]
  cols: Col<T>[]
  rowKey: (r: T) => string
  label: string
  empty?: React.ReactNode
  onRowClick?: (r: T) => void
  initialSort?: SortingState
  height?: string
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? [])
  const columns: ColumnDef<T>[] = cols.map((c) => ({
    id: c.id,
    header: c.header,
    accessorFn: (r) => c.value(r),
    sortUndefined: 'last',
    cell: (ctx) => (c.cell ? c.cell(ctx.row.original) : ((v) => (v === null || v === undefined ? '–' : String(v)))(ctx.getValue())),
    meta: c,
  }))
  const table = useReactTable({ data: rows, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getRowId: (r) => rowKey(r) })
  const sorted = table.getRowModel().rows
  const parent = useRef<HTMLDivElement>(null)
  const virt = useVirtualizer({ count: sorted.length, getScrollElement: () => parent.current, estimateSize: () => 40, overscan: 12 })
  const total = cols.reduce((s, c) => s + c.width, 0)
  const grid = cols.map((c) => `minmax(${c.width}px, ${c.width}fr)`).join(' ')

  if (rows.length === 0) return <div className="rounded-md border border-line/10 bg-surface">{empty ?? <EmptyState title="Nothing matches" />}</div>

  return (
    <div className="overflow-hidden rounded-md border border-line/10 bg-surface">
      <div ref={parent} style={{ height, maxHeight: '70vh' }} className="overflow-auto" role="region" aria-label={label} tabIndex={0}>
        <div style={{ minWidth: total }} role="table" aria-rowcount={sorted.length + 1}>
          <div role="rowgroup" className="sticky top-0 z-10 border-b border-line/15 bg-sunken">
            {table.getHeaderGroups().map((hg) => (
              <div key={hg.id} role="row" className="grid" style={{ gridTemplateColumns: grid }}>
                {hg.headers.map((h) => {
                  const c = (h.column.columnDef.meta as Col<T>) ?? undefined
                  const dir = h.column.getIsSorted()
                  return (
                    <div key={h.id} role="columnheader" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'} className={`px-3 ${c?.num ? 'text-right' : ''}`}>
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className={`inline-flex h-control items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink ${c?.num ? 'flex-row-reverse' : ''}`}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === 'asc' ? <ArrowUp aria-hidden className="h-3 w-3" /> : dir === 'desc' ? <ArrowDown aria-hidden className="h-3 w-3" /> : <ChevronsUpDown aria-hidden className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div role="rowgroup" style={{ height: virt.getTotalSize(), position: 'relative' }}>
            {virt.getVirtualItems().map((vi) => {
              const row = sorted[vi.index]
              const clickable = Boolean(onRowClick)
              return (
                <div
                  key={row.id}
                  role="row"
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onRowClick?.(row.original) : undefined}
                  onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick?.(row.original)) : undefined}
                  className={`grid items-center border-b border-line/10 text-sm ${clickable ? 'cursor-pointer hover:bg-accent-soft/50' : 'hover:bg-sunken/60'}`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)`, gridTemplateColumns: grid }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const c = cell.column.columnDef.meta as Col<T>
                    return (
                      <div key={cell.id} role="cell" title={c.title?.(row.original)} className={`truncate px-3 ${c.num ? 'num' : ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <p className="border-t border-line/10 bg-sunken px-3 py-1.5 text-xs text-muted">{sorted.length.toLocaleString('en-IN')} rows</p>
    </div>
  )
}
