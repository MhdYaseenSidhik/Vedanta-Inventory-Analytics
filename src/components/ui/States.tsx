import { AlertTriangle, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Async } from '../../app/DataContext'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-sunken ${className}`} />
}

/** Skeleton in the final layout: a row of tiles and a chart block. */
export function ScreenSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-[var(--chart-h)]" />
      <Skeleton className="h-[var(--chart-h-sm)]" />
      <span className="sr-only">Loading data…</span>
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <SearchX aria-hidden className="h-6 w-6 text-subtle" />
      <p className="text-base font-semibold text-ink">{title}</p>
      {children && <p className="max-w-md text-sm text-muted">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ title = 'Could not load the data', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-danger/40 bg-danger-soft p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <div>
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

/** Renders the loading skeleton, the error state, or the ready content of a lazy dataset. */
export function Gate<T>({ state, children }: { state: Async<T>; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') return <ScreenSkeleton />
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.retry} />
  return <>{children(state.data)}</>
}
