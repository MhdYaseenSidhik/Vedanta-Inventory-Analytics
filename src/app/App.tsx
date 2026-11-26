import { Suspense, lazy } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Disclaimer } from '../components/Disclaimer'
import { FilterBar } from '../components/FilterBar'
import { ErrorState, ScreenSkeleton } from '../components/ui/States'
import { DataProvider, useCoreState } from './DataContext'
import { useRoute } from './url'

const Overview = lazy(() => import('../pages/OverviewPage'))
const Scorecard = lazy(() => import('../pages/ScorecardPage'))
const Health = lazy(() => import('../pages/HealthPage'))
const Replenishment = lazy(() => import('../pages/ReplenishmentPage'))
const Forecast = lazy(() => import('../pages/ForecastPage'))
const Plan = lazy(() => import('../pages/PlanPage'))

function Screen() {
  const [route] = useRoute()
  const page = { overview: <Overview />, scorecard: <Scorecard />, health: <Health />, replenishment: <Replenishment />, forecast: <Forecast />, plan: <Plan /> }[route]
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      {page}
      <Disclaimer />
    </Suspense>
  )
}

function Shell() {
  const { state, retry } = useCoreState()
  if (state.status === 'error') {
    return (
      <main className="mx-auto max-w-page p-4">
        <ErrorState title="The dashboard cannot start" message={state.message} onRetry={retry} />
      </main>
    )
  }
  if (state.status === 'loading') {
    return (
      <main className="mx-auto max-w-page p-4">
        <ScreenSkeleton />
      </main>
    )
  }
  return (
    <>
      <AppHeader />
      <FilterBar />
      <main id="main" tabIndex={-1} className="mx-auto max-w-page px-4 py-6 focus:outline-none">
        <Screen />
      </main>
    </>
  )
}

export function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  )
}
