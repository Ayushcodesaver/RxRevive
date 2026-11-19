# Design: RxRevive

The locked system. Every Hallmark run reads this first and pages share it.
Change it on purpose; the file is the rule.

## System
- Genre: editorial
- Shape of the first page: Split Studio (Poster hero)
- Theme: Ink (catalog) — white paper, a black with no hue, Epilogue, hairline
  rules and state pills, one teal that means in
- Axes: light/grotesk-sans/chromatic-teal · posture: restrained
- Colourway: `ink: paper` on marketing pages; app screens share the same tokens

## Tokens
`frontend/static/css/tokens.css` is the source of truth. The roles:
```css
:root {
  --color-paper: oklch(99.5% 0.003 100);  --color-paper-2: oklch(97% 0.004 100);  --color-paper-3: oklch(94% 0.006 100);
  --color-ink: oklch(16% 0 0);  --color-ink-2: oklch(28% 0 0);  --color-muted: oklch(44% 0 0);
  --color-rule: oklch(89% 0.004 100);  --color-rule-2: oklch(93.5% 0.003 100);
  --color-accent: oklch(50% 0.095 188);  --color-accent-ink: oklch(99.5% 0.003 100);
  --color-accent-soft: oklch(93% 0.05 190);  --color-accent-soft-ink: oklch(27% 0.045 190);
  --color-focus: oklch(50% 0.095 188);
  --font-display: "Epilogue", ui-sans-serif, system-ui, sans-serif;  --font-body: var(--font-display);
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 12px;  --radius-pill: 999px;  --rule-hair: 1px;
}
```
The spacing scale, the type scale, the easings and the durations are the
scaffold's and live in `tokens.css`.

## Controls
- Primary: ink fill, paper text · 10px radius · 48px (marketing) / 36px (app UI)
- Secondary: 1px rule border on paper-2 · same radius and height
- States: ink `--color-ink-2` on hover, 1px press on active, ring at 3:1

## Semantics (theme law)
- Teal means **in / matched / open**: state pills, the matched figure, link
  hover, the focus ring. Never a teal surface or teal running text.
- Out / missing / off: outlined pill in the rule colour, never red.
- Warnings (invalid file, model unavailable): `--color-warn` ochre, one use.
- Rules: a list opens on a 1px ink rule, continues on hairlines. A well is
  paper-2 with a hairline edge, radius 12. No resting shadows on paper.

## Type
- Epilogue 700 display / 400 body, three weights max (400, 600, 700).
- IBM Plex Mono only inside code and on figures that compare in a column.
- Labels, captions, table heads: body face a step smaller, sentence case,
  untracked. Never mono, never caps.

## Motion
- Character: still. Nothing moves but state; one reveal at most (the hero's
  two halves, 60–100 ms apart). Under reduced motion everything ends at once.

## Exports
`web/app/globals.css` (tokens + component system) in this project.
