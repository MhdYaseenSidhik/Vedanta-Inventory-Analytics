import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function current(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(current)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      // follow the system until the user picks a theme explicitly
      if (!localStorage.getItem('theme')) {
        const t: Theme = mq.matches ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', t)
        setTheme(t)
        window.dispatchEvent(new Event('themechange'))
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const toggle = useCallback(() => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* private mode: theme still applies for this session */
    }
    setTheme(next)
    window.dispatchEvent(new Event('themechange'))
  }, [])
  return [theme, toggle]
}

/** Re-renders charts when the theme changes so they re-read the token colours. */
export function useThemeVersion(): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    const l = () => setV((x) => x + 1)
    window.addEventListener('themechange', l)
    return () => window.removeEventListener('themechange', l)
  }, [])
  return v
}

/** Read a colour token (an "r g b" triplet) as a CSS colour string, optionally with alpha. */
export function token(name: string, alpha = 1): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
  if (!raw) return 'transparent'
  return alpha === 1 ? `rgb(${raw})` : `rgb(${raw} / ${alpha})`
}

export function seriesColors(): string[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((i) => token(`series-${i}`))
}
