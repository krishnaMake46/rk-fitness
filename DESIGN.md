# RK FITNESS Design System

## Direction

Use Ghost's supplied reference as a cue for a restrained, readable analytics interface. Adapt its clear hierarchy and muted surfaces to RK FITNESS; keep the app's own lime training accent, compact mobile-first navigation, exercise imagery, and workout actions. Avoid copying Ghost branding or page structure.

## Tokens

```css
:root {
  --rk-bg: #15171a;
  --rk-surface: #1d2124;
  --rk-raised: #252a2d;
  --rk-line: #343f44;
  --rk-text: #f1f4f3;
  --rk-muted: #a3adaf;
  --rk-subtle: #738a94;
  --rk-lime: #d1ff19;
  --rk-teal: #009c7e;
  --rk-danger: #f05230;
  --rk-radius-sm: 6px;
  --rk-radius: 10px;
  --rk-radius-lg: 16px;
  --rk-space: 4px;
  --rk-font: Inter, InterVariable, ui-sans-serif, system-ui, sans-serif;
}
```

## Type and spacing

Use a system sans-serif stack so the interface remains legible offline. Body copy is 14–15px with a 1.5 line height; labels and captions should stay at least 11px on phones. Headings use a compact, clear scale instead of the reference's oversized desktop hero. Build spacing from 4px steps, with 12–24px between content groups.

## Components

- Use a near-black app canvas, quiet raised panels, thin cool-grey borders, and restrained lime highlights for selected, active, or progress states.
- Keep one clear primary action per section. Use solid lime for primary actions and raised dark surfaces for secondary actions.
- Keep touch targets at least 44px high. Preserve safe-area spacing and prevent horizontal overflow on narrow devices.
- Use charts and stats as readable data blocks with labels and units; don't rely on color alone.
- Use photos only where the product already has relevant media. Never present a generic image as a verified exercise demonstration.
