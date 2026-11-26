import { ChevronDown } from 'lucide-react'

export interface Opt { value: string; label: string }

export function Select({ label, value, onChange, options, className = '' }: { label: string; value: string; onChange: (v: string) => void; options: Opt[]; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-xs font-medium text-muted ${className}`}>
      {label}
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="ctl w-full min-w-0 appearance-none pr-8">
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      </span>
    </label>
  )
}

/** Segmented control (radio group) for small fixed choices such as the horizon. */
export function Segmented({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line/20 bg-sunken p-0.5">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`h-[calc(var(--control-h)-0.25rem)] min-w-[2.75rem] rounded-sm px-3 text-sm font-medium transition-colors ${on ? 'bg-surface text-ink shadow-1' : 'text-muted hover:text-ink'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
