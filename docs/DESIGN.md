# Design

No design or brand file existed in the repository, so this is a new direction: **"Stripe-dense, calm"** for enterprise inventory work. All values live in `src/styles/tokens.css`; Tailwind maps to them in `tailwind.config.js`. Components never hard-code a colour, size or spacing.

## Principles
- **One accent** (blue) for the active screen, links, focus and the primary action. Everything else is neutral slate.
- **Semantic colour only where it means something**: green/red for KPI direction and variance, amber for warnings (the WAPE note, backtest badge), info blue for notes.
- **Data first**: tabular numerals everywhere, numerics right-aligned, 40px rows, sticky table headers, dividers at 10% alpha.
- **Depth by surface in dark mode**, not shadow: canvas < surface < raised.

## Tokens
| Group | Values |
|---|---|
| Type | Inter / system-ui stack; 12 / 14 / 16 / 20 / 24 / 32; tabular numerals on `body` |
| Spacing | 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 |
| Radius | 6px (`sm`: badges, rows), 10px (`md`: cards, controls) |
| Elevation | `shadow-1` card, `shadow-2` popover, `shadow-3` dialog |
| Controls | 36px high (40px on phones for touch) |
| Motion | 180ms, `cubic-bezier(0.2,0,0,1)`; 0ms under `prefers-reduced-motion` |
| Layout | page max-width 80rem, 16px page padding |
| Focus | 2px accent ring, 2px offset, on every interactive element |

## Colour
Triplets (`r g b`) so alpha modifiers work. Light and dark are separately designed; `[data-theme]` on `<html>`, following the system until the user toggles (stored in `localStorage`; an inline script sets it before paint).

- Surfaces: `canvas`, `surface`, `raised`, `sunken`; text: `ink`, `muted`, `subtle`; lines are `line` at 10-20% alpha.
- Semantic: `success`, `warning`, `danger`, `info`, each with a `-soft` tint for backgrounds.
- **Categorical chart palette**: 8 hues (`--series-1..8`) with separate light and dark values; charts read them at render time and re-read on theme change.
- Contrast checked by script on the token values: all text pairs are at least 4.5:1 in both themes (the light accent-on-accent-soft pair was 4.24 and the soft tint was lightened to reach 4.54).

## Components
Panel (header, subtitle, actions), KPI tile (value, definition, deltas, sparkline), Segmented control (radio group), Select, DataTable (TanStack Table + virtualised rows, sortable, keyboard-focusable rows), Notice (info, warning, danger), Badge, Skeleton, EmptyState, ErrorState, Chart wrapper (ECharts, token colours, `role="img"` with a label), dialog for the material detail (Esc closes, focus returns).

## States
Loading is a skeleton in the final layout; errors are inline with Retry; empty states say what goes there and offer the next action; a schema version mismatch blocks start with a specific message.

## Responsive
Mobile (390): filters in a 2-column grid, tiles one per row, nav scrolls inside its own strip, tables scroll inside their own box so the page never scrolls sideways. Desktop (1440): filters in one row, tiles 4 across, two-column chart grids.

## Accessibility
Keyboard reachable everywhere (visible focus, sortable headers are buttons, table rows open with Enter/Space); tile definitions are focusable; change direction is spoken, not colour only; charts carry labels; targets are 40px on phones.
