import { BarChart3, ClipboardList, Gauge, LayoutDashboard, LineChart, Moon, PackageSearch, Sun, Wallet } from 'lucide-react'
import { useCore } from '../app/DataContext'
import { useTheme } from '../app/theme'
import { ROUTES, useRoute, type Route } from '../app/url'
import { formatDate } from '../data/format'

export const NAV: Record<Route, { label: string; icon: typeof BarChart3 }> = {
  overview: { label: 'Overview', icon: LayoutDashboard },
  scorecard: { label: 'KPI scorecard', icon: Gauge },
  health: { label: 'Inventory health', icon: PackageSearch },
  replenishment: { label: 'Replenishment', icon: ClipboardList },
  forecast: { label: 'Demand forecast', icon: LineChart },
  plan: { label: 'Plan vs actual', icon: Wallet },
}

export function AppHeader() {
  const { manifest } = useCore()
  const [route, go] = useRoute()
  const [theme, toggle] = useTheme()
  return (
    <header className="sticky top-0 z-30 border-b border-line/10 bg-surface/95 backdrop-blur">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-40 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-ink">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-page items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">Inventory control</p>
          <p className="truncate text-xs text-muted">Stores &amp; spares (ZSPR / ZSPN) · as of {formatDate(manifest.asOf)}</p>
        </div>
        <button type="button" className="btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-pressed={theme === 'dark'}>
          {theme === 'dark' ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <nav aria-label="Screens" className="mx-auto max-w-page overflow-x-auto px-4">
        <ul className="flex min-w-max gap-1">
          {ROUTES.map((r) => {
            const { label, icon: Icon } = NAV[r]
            const on = r === route
            return (
              <li key={r}>
                <a
                  href={`#/${r}${window.location.search}`}
                  onClick={(e) => {
                    e.preventDefault()
                    go(r)
                  }}
                  aria-current={on ? 'page' : undefined}
                  className={`flex h-control items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors ${on ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
