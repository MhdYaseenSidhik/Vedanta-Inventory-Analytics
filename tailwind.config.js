const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** Every value maps to a CSS variable defined in src/styles/tokens.css. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: rgb('canvas'),
        surface: rgb('surface'),
        raised: rgb('raised'),
        sunken: rgb('sunken'),
        line: rgb('line'),
        ink: rgb('ink'),
        muted: rgb('muted'),
        subtle: rgb('subtle'),
        accent: rgb('accent'),
        'accent-ink': rgb('accent-ink'),
        'accent-soft': rgb('accent-soft'),
        success: rgb('success'),
        'success-soft': rgb('success-soft'),
        warning: rgb('warning'),
        'warning-soft': rgb('warning-soft'),
        danger: rgb('danger'),
        'danger-soft': rgb('danger-soft'),
        info: rgb('info'),
        'info-soft': rgb('info-soft'),
      },
      fontFamily: { sans: 'var(--font-sans)', mono: 'var(--font-mono)' },
      fontSize: {
        xs: ['var(--text-xs)', 'var(--leading-xs)'],
        sm: ['var(--text-sm)', 'var(--leading-sm)'],
        base: ['var(--text-base)', 'var(--leading-base)'],
        lg: ['var(--text-lg)', 'var(--leading-lg)'],
        xl: ['var(--text-xl)', 'var(--leading-xl)'],
        '2xl': ['var(--text-2xl)', 'var(--leading-2xl)'],
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', DEFAULT: 'var(--radius-md)', lg: 'var(--radius-md)' },
      boxShadow: { 1: 'var(--shadow-1)', 2: 'var(--shadow-2)', 3: 'var(--shadow-3)' },
      height: { control: 'var(--control-h)' },
      minHeight: { control: 'var(--control-h)' },
      maxWidth: { page: 'var(--page-max)' },
      transitionDuration: { DEFAULT: 'var(--motion-duration)' },
      transitionTimingFunction: { DEFAULT: 'var(--motion-ease)' },
    },
  },
  plugins: [],
}
