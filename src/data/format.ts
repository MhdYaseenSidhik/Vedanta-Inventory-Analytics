const IN = 'en-IN'
const CR = 1e7
const LAKH = 1e5

const grouped = new Intl.NumberFormat(IN, { maximumFractionDigits: 0 })
const grouped2 = new Intl.NumberFormat(IN, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fixed = (d: number) => new Intl.NumberFormat(IN, { minimumFractionDigits: d, maximumFractionDigits: d })

/** Short Indian INR: ₹1.25 Cr, ₹4.3 L, ₹45,230. */
export function formatInr(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= CR) return `${sign}₹${fixed(2).format(a / CR)} Cr`
  if (a >= LAKH) return `${sign}₹${fixed(1).format(a / LAKH)} L`
  return `${sign}₹${grouped.format(a)}`
}

/** Full INR value for tooltips: ₹12,34,56,789.50 */
export function formatInrFull(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  return `${v < 0 ? '-' : ''}₹${grouped2.format(Math.abs(v))}`
}

export function formatInt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  return grouped.format(v)
}

/** Quantities carry a unit label, e.g. "1,250 EA". The data holds no unit per row, so callers pass "qty" or the unit they know. */
export function formatQty(v: number | null | undefined, unit = 'qty', digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  return `${fixed(digits).format(v)} ${unit}`
}

export function formatDecimal(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  return fixed(digits).format(v)
}

/** Percentages with one decimal. Input is already on a 0-100 scale. */
export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  return `${fixed(1).format(v)}%`
}

export function formatSignedPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  return `${v > 0 ? '+' : ''}${fixed(1).format(v)}%`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** 2025-12 -> "Dec 2025" */
export function formatMonth(m: string | null | undefined): string {
  if (!m) return '–'
  const [y, mo] = m.split('-')
  const i = Number(mo) - 1
  return i >= 0 && i < 12 ? `${MONTHS[i]} ${y}` : m
}

/** 2025-12-31 -> "31 Dec 2025" */
export function formatDate(d: string | null | undefined): string {
  if (!d) return '–'
  const [y, mo, da] = d.split('-')
  const i = Number(mo) - 1
  return i >= 0 && i < 12 ? `${Number(da)} ${MONTHS[i]} ${y}` : d
}

export interface KpiValue { value: number; uom: string }

/** Format a KPI value by its catalog unit. */
export function formatKpi(v: number | null | undefined, uom: string): string {
  if (v === null || v === undefined) return '–'
  switch (uom) {
    case 'INR': return formatInr(v)
    case 'PCT': return formatPct(v)
    case 'DAYS': return `${fixed(1).format(v)} days`
    case 'RATIO': return `${fixed(2).format(v)}×`
    case 'COUNT': return formatInt(v)
    case 'QTY': return formatQty(v)
    default: return formatDecimal(v)
  }
}

export function formatKpiFull(v: number | null | undefined, uom: string): string {
  if (v === null || v === undefined) return '–'
  return uom === 'INR' ? formatInrFull(v) : formatKpi(v, uom)
}

export function uomLabel(uom: string): string {
  return ({ INR: 'INR', PCT: '%', DAYS: 'days', RATIO: 'ratio', COUNT: 'count', QTY: 'qty' } as Record<string, string>)[uom] ?? uom
}

/** SNAKE_CASE or UPPER -> "Snake case" */
export function humanize(s: string): string {
  const t = s.replace(/_/g, ' ').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
