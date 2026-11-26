import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public/data/manifest.json'), 'utf8'))

const SCREENS = [
  { route: 'overview', heading: 'Overview', link: 'Overview' },
  { route: 'scorecard', heading: 'KPI scorecard', link: 'KPI scorecard' },
  { route: 'health', heading: 'Inventory health', link: 'Inventory health' },
  { route: 'replenishment', heading: 'Replenishment', link: 'Replenishment' },
  { route: 'forecast', heading: 'Demand forecast', link: 'Demand forecast' },
  { route: 'plan', heading: 'Plan vs actual', link: 'Plan vs actual' },
] as const

/** Collects console errors and failed requests so a screen that renders but logs an error still fails. */
function watch(page: Page) {
  const problems: string[] = []
  page.on('console', (m: ConsoleMessage) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`) })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${r.url()}`) })
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`) })
  return problems
}

async function open(page: Page, route: string, query = '') {
  await page.goto(`/${query}#/${route}`)
  await expect(page.getByRole('navigation', { name: 'Screens' })).toBeVisible()
}

async function noHorizontalOverflow(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over, 'page scrolls sideways').toBeLessThanOrEqual(1)
}

test.describe('AC1 six screens, each with the disclaimer and the as-of date', () => {
  for (const s of SCREENS) {
    test(`${s.heading} renders real data without console errors`, async ({ page }) => {
      const problems = watch(page)
      await open(page, s.route)
      await expect(page.getByRole('heading', { name: s.heading, level: 1 }).or(page.getByRole('heading', { name: s.heading }).first())).toBeVisible()
      await expect(page.getByLabel('Disclaimer')).toContainText(manifest.disclaimer)
      await expect(page.getByLabel('Disclaimer')).toContainText('31 Dec 2025')
      await expect(page.getByLabel('Disclaimer')).toContainText('simulated backcast')
      await page.waitForLoadState('networkidle')
      expect(problems).toEqual([])
    })
    test(`${s.heading}: no sideways scroll`, async ({ page }) => {
      await open(page, s.route)
      await page.waitForLoadState('networkidle')
      await noHorizontalOverflow(page)
    })
  }
  test('the navigation reaches every screen', async ({ page }) => {
    await open(page, 'overview')
    for (const s of SCREENS) {
      await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: s.link }).click()
      await expect(page).toHaveURL(new RegExp(`#/${s.route}`))
      await expect(page.getByRole('link', { name: s.link })).toHaveAttribute('aria-current', 'page')
    }
  })
})

test.describe('AC2 global filters: plant, material type, group, criticality and month range', () => {
  test('the filter bar exposes all six controls', async ({ page }) => {
    await open(page, 'overview')
    const bar = page.getByRole('form', { name: 'Global filters' })
    for (const l of ['Plant', 'Material type', 'Material group', 'Criticality', 'From month', 'To month']) await expect(bar.getByLabel(l)).toBeVisible()
  })
  test('plant lists the six demo plants', async ({ page }) => {
    await open(page, 'overview')
    const opts = await page.getByRole('form', { name: 'Global filters' }).getByLabel('Plant').locator('option').allTextContents()
    expect(opts).toEqual(['All plants', 'DEMO_01', 'DEMO_02', 'DEMO_03', 'DEMO_04', 'DEMO_05', 'DEMO_06'])
  })
  test('material type offers ZSPR and ZSPN only', async ({ page }) => {
    await open(page, 'overview')
    const opts = await page.getByLabel('Material type').first().locator('option').allTextContents()
    expect(opts).toEqual(['All types', 'ZSPN', 'ZSPR'])
  })
  test('month range covers 2023-01 to 2025-12 (backcast included)', async ({ page }) => {
    await open(page, 'overview')
    const opts = await page.getByLabel('From month').locator('option').allTextContents()
    expect(opts).toContain('Jan 2023')
    expect(opts).toContain('Dec 2025')
    expect(opts).toHaveLength(37)
  })
  test('a filter is kept in the URL, survives a screen change and Reset clears it', async ({ page }) => {
    await open(page, 'health')
    await page.getByLabel('Material type').first().selectOption('ZSPR')
    await expect(page).toHaveURL(/type=ZSPR/)
    await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Replenishment' }).click()
    await expect(page).toHaveURL(/type=ZSPR/)
    await expect(page.getByLabel('Material type').first()).toHaveValue('ZSPR')
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page).not.toHaveURL(/type=/)
  })
  test('a plant filter narrows the inventory; an impossible filter shows the empty state', async ({ page }) => {
    await open(page, 'health')
    await page.getByLabel('Plant').first().selectOption('HZL_DEMO_02')
    await expect(page).toHaveURL(/plant=HZL_DEMO_02/)
    await expect(page.getByRole('navigation', { name: 'Drill-down breadcrumb' })).toBeVisible()
    await open(page, 'health', '?group=NOPE')
    await expect(page.getByText('No inventory matches these filters')).toBeVisible()
  })
  test('KPI screens say plainly that KPIs ignore the material filters', async ({ page }) => {
    await open(page, 'overview', '?type=ZSPR')
    await expect(page.getByText(/not filtered by material type, group or criticality/)).toBeVisible()
  })
})

test.describe('AC3 inventory health drill-down: plant -> material group -> material', () => {
  test('drills down through all three levels and back via the breadcrumb', async ({ page }) => {
    await open(page, 'health')
    const crumbs = page.getByRole('navigation', { name: 'Drill-down breadcrumb' })
    await expect(crumbs.getByText('All plants')).toBeVisible()
    await page.getByRole('region', { name: 'Inventory by plant' }).getByRole('row').filter({ hasText: 'HZL_DEMO_01' }).click()
    await expect(page).toHaveURL(/dp=HZL_DEMO_01/)
    await expect(crumbs.getByText('HZL_DEMO_01')).toBeVisible()
    await page.getByRole('region', { name: 'Inventory by material group in HZL_DEMO_01' }).getByRole('row').filter({ hasText: 'Bearing Components' }).click()
    await expect(page).toHaveURL(/dg=BEARING_COMPONENTS/)
    await expect(page.getByLabel('Search material id or description')).toBeVisible()
    await crumbs.getByText('All plants').click()
    await expect(page).not.toHaveURL(/dp=/)
  })
})

test.describe('AC4 replenishment', () => {
  test('shows totals and a recommendation list from reorder.json', async ({ page }) => {
    await open(page, 'replenishment')
    await expect(page.getByText('Estimated value').first()).toBeVisible()
    await expect(page.getByText(/3,916/).first()).toBeVisible()
  })
  test('a priority that matches nothing shows the empty state', async ({ page }) => {
    await open(page, 'replenishment', '?plant=HZL_DEMO_01&priority=NONE')
    await expect(page.getByText('No reorder recommendations match')).toBeVisible()
  })
})

test.describe('AC5 demand forecast: 3 / 6 / 11-month selector, type filter and the backtest', () => {
  test('offers exactly 3, 6 and 11 months (no 12)', async ({ page }) => {
    await open(page, 'forecast')
    const group = page.getByRole('radiogroup', { name: 'Forecast horizon' })
    await expect(group.getByRole('radio')).toHaveText(['3 mo', '6 mo', '11 mo'])
    await expect(group.getByRole('radio', { name: '11 mo' })).toHaveAttribute('aria-checked', 'true')
  })
  test('the covered months follow the selector: Jan-Mar, Jan-Jun, Jan-Nov 2026', async ({ page }) => {
    await open(page, 'forecast')
    const group = page.getByRole('radiogroup', { name: 'Forecast horizon' })
    const covers = page.getByText(/Covers/).first()
    await group.getByRole('radio', { name: '3 mo' }).click()
    await expect(covers).toContainText('Jan 2026 to Mar 2026')
    await expect(page).toHaveURL(/h=3/)
    await group.getByRole('radio', { name: '6 mo' }).click()
    await expect(covers).toContainText('Jan 2026 to Jun 2026')
    await group.getByRole('radio', { name: '11 mo' }).click()
    await expect(covers).toContainText('Jan 2026 to Nov 2026')
  })
  test('a ZSPR / ZSPN type filter is available and applies', async ({ page }) => {
    await open(page, 'forecast')
    const type = page.getByRole('radiogroup', { name: 'Material type' })
    await expect(type.getByRole('radio')).toHaveText(['All', 'ZSPR', 'ZSPN'])
    await type.getByRole('radio', { name: 'ZSPN' }).click()
    await expect(page).toHaveURL(/type=ZSPN/)
    await expect(type.getByRole('radio', { name: 'ZSPN' })).toHaveAttribute('aria-checked', 'true')
  })
  test('the backtest is labelled "not a forecast" and the poor WAPE is disclosed', async ({ page }) => {
    await open(page, 'forecast')
    await expect(page.getByText('Backtest · not a forecast').first()).toBeVisible()
    await expect(page.getByText(/Backtest WAPE is 1\.1722, above 1/)).toBeVisible()
    await expect(page.getByText('WAPE 1.17 · indicative only')).toBeVisible()
    await expect(page.getByText('1.1722').first()).toBeVisible()
    await expect(page.getByText('5.4769').first()).toBeVisible()
  })
  test('a plant with no forecast shows an explanatory empty state, not a blank chart', async ({ page }) => {
    await open(page, 'forecast', '?plant=HZL_DEMO_05')
    await expect(page.getByText('No forecast for this selection')).toBeVisible()
    await expect(page.getByText(/HZL_DEMO_01/).first()).toBeVisible()
  })
  test('the model card names the experiment', async ({ page }) => {
    await open(page, 'forecast')
    await expect(page.getByText(manifest.forecast.experimentId).first()).toBeVisible()
    await expect(page.getByText(manifest.forecast.bestModel).first()).toBeVisible()
  })
})

test.describe('AC6 plan vs actual', () => {
  test('shows totals and the breakdown tables', async ({ page }) => {
    await open(page, 'plan')
    await expect(page.getByText('By material group')).toBeVisible()
  })
})

test.describe('AC7 light and dark themes', () => {
  test('the toggle switches the theme, persists it and charts still render', async ({ page }) => {
    const problems = watch(page)
    await open(page, 'overview')
    const html = page.locator('html')
    const before = await html.getAttribute('data-theme')
    await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).click()
    const after = await html.getAttribute('data-theme')
    expect(after).not.toBe(before)
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', after!)
    expect(problems).toEqual([])
  })
  for (const scheme of ['light', 'dark'] as const) {
    test(`follows the system ${scheme} preference and body text stays legible`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme })
      const page = await ctx.newPage()
      await open(page, 'overview')
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
      const [fg, bg] = await page.evaluate(() => {
        const s = getComputedStyle(document.body)
        return [s.color, s.backgroundColor]
      })
      const lum = (c: string) => {
        const [r, g, b] = c.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
      expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5)
      await ctx.close()
    })
  }
})

test.describe('AC8 failure paths', () => {
  test('a missing data file shows an error with a retry, not a blank page', async ({ page }) => {
    await page.route('**/data/kpis.json', (r) => r.fulfill({ status: 404, body: 'nope' }))
    await page.goto('/#/overview')
    await expect(page.getByText('The dashboard cannot start')).toBeVisible()
    await expect(page.getByText(/Could not load kpis\.json \(HTTP 404\)/)).toBeVisible()
    await page.unroute('**/data/kpis.json')
    await page.getByRole('button', { name: /retry/i }).click()
    await expect(page.getByRole('navigation', { name: 'Screens' })).toBeVisible()
  })
  test('a manifest with another schemaVersion is refused with the versions named', async ({ page }) => {
    await page.route('**/data/manifest.json', async (r) => {
      const res = await r.fetch()
      const body = await res.json()
      await r.fulfill({ response: res, json: { ...body, schemaVersion: 2 } })
    })
    await page.goto('/#/overview')
    await expect(page.getByText(/schemaVersion is 2 but this dashboard was built for schemaVersion 3/)).toBeVisible()
  })
  test('forecast marked unavailable shows the reason, and the backtest still shows', async ({ page }) => {
    await page.route('**/data/forecast.json', (r) => r.fulfill({ json: { available: false, reason: 'Experiment not finished.', kind: 'forecast', horizons: [3, 6, 11], byPlantMonth: [], rows: [] } }))
    await open(page, 'forecast')
    await expect(page.getByText('No forecast available')).toBeVisible()
    await expect(page.getByText('Experiment not finished.')).toBeVisible()
    await expect(page.getByText('Backtest · not a forecast').first()).toBeVisible()
  })
})

test.describe('AC9 phone layout (390 wide)', () => {
  test('navigation scrolls inside itself and the filters stay reachable', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone-390', 'phone only')
    await open(page, 'forecast')
    await noHorizontalOverflow(page)
    await expect(page.getByLabel('Plant').first()).toBeVisible()
    const target = await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).boundingBox()
    expect(target!.height).toBeGreaterThanOrEqual(36)
  })
})
