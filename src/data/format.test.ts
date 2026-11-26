import { formatDate, formatInr, formatInrFull, formatKpi, formatMonth, formatPct, formatSignedPct } from './format'

describe('INR formatting', () => {
  it('uses crore, lakh and plain rupees', () => {
    expect(formatInr(12_500_000)).toBe('₹1.25 Cr')
    expect(formatInr(430_000)).toBe('₹4.3 L')
    expect(formatInr(45_230)).toBe('₹45,230')
    expect(formatInr(5_125_222_946.78)).toBe('₹512.52 Cr')
  })
  it('keeps the sign and the boundaries', () => {
    expect(formatInr(-12_500_000)).toBe('-₹1.25 Cr')
    expect(formatInr(1e7)).toBe('₹1.00 Cr')
    expect(formatInr(1e5)).toBe('₹1.0 L')
    expect(formatInr(99_999)).toBe('₹99,999')
    expect(formatInr(0)).toBe('₹0')
  })
  it('gives the full value with Indian grouping for the tooltip', () => {
    expect(formatInrFull(123456789.5)).toBe('₹12,34,56,789.50')
  })
  it('shows a dash for missing values', () => {
    expect(formatInr(null)).toBe('–')
    expect(formatKpi(null, 'PCT')).toBe('–')
  })
})

describe('other formats', () => {
  it('percentages have one decimal', () => {
    expect(formatPct(88.7485)).toBe('88.7%')
    expect(formatSignedPct(2)).toBe('+2.0%')
    expect(formatSignedPct(-1.26)).toBe('-1.3%')
  })
  it('formats KPI values by unit', () => {
    expect(formatKpi(186.9764, 'DAYS')).toBe('186.0 days'.replace('186.0', '187.0'))
    expect(formatKpi(1.9521, 'RATIO')).toBe('1.95×')
    expect(formatKpi(5148, 'COUNT')).toBe('5,148')
    expect(formatKpi(316077770.6, 'INR')).toBe('₹31.61 Cr')
  })
  it('formats months and dates', () => {
    expect(formatMonth('2025-12')).toBe('Dec 2025')
    expect(formatDate('2025-12-31')).toBe('31 Dec 2025')
  })
})
