import { token } from '../../app/theme'

/** Tiny dependency-free SVG trend line, coloured by tone. */
export function Sparkline({ points, tone }: { points: number[]; tone: 'good' | 'bad' | 'neutral' }) {
  if (points.length < 2) return <div className="h-[var(--spark-h)]" aria-hidden />
  const w = 120
  const h = 32
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${((i / (points.length - 1)) * w).toFixed(1)},${(h - 2 - ((p - min) / span) * (h - 4)).toFixed(1)}`).join(' ')
  const stroke = tone === 'good' ? token('success') : tone === 'bad' ? token('danger') : token('accent')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[var(--spark-h)] w-full" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
