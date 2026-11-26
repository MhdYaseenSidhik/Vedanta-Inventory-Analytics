import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Tone } from '../../data/selectors/kpi'
import { formatSignedPct } from '../../data/format'

const TONE: Record<Tone, string> = { good: 'text-success', bad: 'text-danger', neutral: 'text-muted' }
const SR: Record<Tone, string> = { good: 'favourable', bad: 'unfavourable', neutral: 'not rated' }

/** Percentage change with an arrow, coloured by tone. The meaning is also spoken, not colour-only. */
export function Delta({ pct, tone, label }: { pct: number | null; tone: Tone; label: string }) {
  if (pct === null) return <span className="text-xs text-subtle">{label} –</span>
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${TONE[tone]}`}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {formatSignedPct(pct)}
      <span className="font-normal text-subtle">{label}</span>
      <span className="sr-only">({SR[tone]})</span>
    </span>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'info' | 'accent'; children: React.ReactNode }) {
  const c = {
    neutral: 'bg-sunken text-muted',
    good: 'bg-success-soft text-success',
    bad: 'bg-danger-soft text-danger',
    warn: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
    accent: 'bg-accent-soft text-accent',
  }[tone]
  return <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${c}`}>{children}</span>
}
