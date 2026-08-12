# Handoff: Mycoach — Splash & Login (direction 2B)

## Overview
Mycoach is a billiards coaching app. This handoff covers the first two screens: a **splash / loading screen** and a **login screen**. Direction **2B** is the approved one — typographic, no photography, dark neutral ground. (Direction 2A, a photo-led variant, is present in the reference file for context only; do not build it.)

## About the design files
The files in `reference/` are **design references created in HTML** — a prototype showing intended look and behavior, not production code to copy. The task is to **recreate these screens in Next.js** using the tokens and specs below. The reference HTML is authored for a design tool and will not render standalone; treat this README as the source of truth and use the HTML only to check exact values.

## Target stack
- **Next.js (App Router)**, TypeScript, React Server Components where sensible; the login form is a client component.
- Styling: your choice of CSS Modules or Tailwind — but **the token values below are binding**. If Tailwind, map them into `theme.extend`; if CSS, paste `reference/nocturne.css`'s `:root` block into `globals.css`.
- Font: **Inter** via `next/font/google`, weights 300 / 400 / 500.
- Icons: **Phosphor** (`@phosphor-icons/react`) — the eye and arrow icons in the design are Phosphor.
- Suggested routes: `/` (splash, redirects when session resolves), `/login`.

## Fidelity
**High fidelity.** Colors, type, spacing and states are final. Recreate pixel-accurately at a 402 × 874 logical viewport (iPhone), then let it scale up as described under Responsive.

---

## Design tokens (binding)

### Color
| Token | Hex | Use |
| --- | --- | --- |
| `--color-bg` | #161826 | page ground |
| `--color-surface` | #232532 | raised surfaces |
| `--color-text` | #e9e9ed | primary text |
| `--color-accent` | #9184d9 | CTA border/label, accent rule, focus ring, checkbox |
| `--color-accent-300` | #d2cefd | accent-colored body-size text (links) |
| `--color-neutral-200` | #e4e7f5 | button labels on outlined social buttons |
| `--color-neutral-300` | #cfd3e5 | secondary text |
| `--color-neutral-400` | #b2b6ca | muted text, field labels |
| `--color-neutral-500` | #9397ab | icon rest state, "or" label |
| `--color-neutral-700` | #595d6c | field underlines, outlined button borders |
| `--color-neutral-800` | #3f424d | gradient light pool |
| `--color-neutral-900` | #292b31 | gradient falloff |

Never introduce a color outside this list. No pure black or pure white.

### Type
- Family: Inter for both heading and body.
- Heading weight ceiling is **500** — do not go heavier.
- Scale used here: 58 / 38 / 17 / 15 / 14 / 13 / 11 / 10 px.

### Radius
`--radius-sm` 4px · `--radius-md` 8px · `--radius-lg` 14px. Buttons use `--radius-md`.

### States (global, not per-component)
- `:focus-visible { outline: 2px solid #9184d9; outline-offset: 2px; }` — never the browser default.
- `::selection` = accent at 30%.
- Disabled = 45% opacity.

---

## Screen 1 — Splash / loading

**Purpose:** shown while the session/token check resolves; routes to `/login` or the home screen.

**Layout:** full viewport, flex column, centered both axes. No safe-area chrome of its own beyond the status bar.

**Ground:** `radial-gradient(115% 60% at 50% 30%, #3f424d 0%, #161826 58%, #292b31 100%)`

**Contents (centered stack, in order):**
1. Wordmark — "MYCOACH", Inter 500, **38px**, `letter-spacing: 0.16em`, `padding-left: 0.16em` (optical compensation for the trailing tracking), uppercase, color #e9e9ed.
2. Accent rule — 26 × 1px solid #9184d9, **22px** below the wordmark.
3. Kicker — "Billiard practice", 11px, `letter-spacing: 0.26em`, uppercase, #b2b6ca, **22px** below the rule.

There is deliberately **no spinner and no progress bar** — the screen holds still. If the session check exceeds ~2s, fade the kicker between "Billiard practice" and "Loading…" rather than adding an indicator.

**Behavior:** minimum display 800ms (avoid a flash), then push. Fade out over 240ms, `ease-out`.

---

## Screen 2 — Login

**Purpose:** email/password sign-in, with Google and Apple as alternates.

**Ground:** `radial-gradient(125% 55% at 18% 6%, #3f424d 0%, #161826 50%, #292b31 100%)` — the light pool sits top-left, behind the brand row.

**Container:** flex column, `padding: 96px 34px 46px` (top padding clears the status bar / dynamic island; use `env(safe-area-inset-*)` on top of it in the real app).

**Vertical order and spacing:**

| # | Element | Spec |
| --- | --- | --- |
| 1 | Brand row | "MYCOACH", Inter 500, 15px, `letter-spacing: 0.2em`, uppercase, #e9e9ed |
| 2 | Headline | "Rack up." — Inter **500, 58px**, `line-height: 0.94`, `letter-spacing: -0.045em`, #e9e9ed. `margin-top: 54px` |
| 3 | Subhead | "Sign in and pick your drills up where you left them." — 14px, `line-height: 1.65`, #b2b6ca, `max-width: 250px`, `margin-top: 16px` |
| 4 | Fields | `margin-top: 52px`, column, `gap: 32px` |
| 5 | Options row | `margin-top: 26px`, space-between |
| 6 | Primary CTA | `margin-top: 38px` |
| 7 | Divider | `margin-top: 34px` |
| 8 | Social buttons | `margin-top: 22px`, row, `gap: 12px` |
| 9 | Sign-up line | pushed to the bottom (`margin-top: auto`, `padding-top: 30px`), centered |

### Fields
Underline-only, no boxes.
- Label: 10px, `letter-spacing: 0.26em`, uppercase, #b2b6ca, 12px above the input.
- Input: height 34px, no border except `border-bottom: 1px solid #595d6c`, transparent background, 17px, color #e9e9ed, no horizontal padding.
- Focus: `border-bottom-color: #9184d9` (plus the global focus ring on keyboard focus).
- Password field: `letter-spacing: 0.3em`, `padding-right: 36px`; a 20px Phosphor **Eye** button pinned bottom-right, #9397ab at rest → #9184d9 on hover, toggling `type` between password/text (swap to **EyeSlash** when visible).
- Placeholder copy in the mock is sample data: `you@mycoach.app`, `brk1234`. Ship as empty inputs with no placeholders (labels carry the meaning).

### Options row
- Left: custom checkbox + "Stay signed in", 13px #cfd3e5. Checkbox is 16 × 16, `border-radius: 3px`, `1px solid #9184d9`, fill `color-mix(in srgb, #9184d9 16%, transparent)`, 10px Phosphor **Check** in #9184d9 when on. Unchecked = same box, no fill, border #595d6c. **Never a native checkbox.**
- Right: "Forgot?" link, 13px #b2b6ca → #9184d9 on hover.

### Primary CTA
"BREAK" + Phosphor **ArrowRight** (17px), gap 12px. Height 58px, full width, `border-radius: 8px`, `border: 1px solid #9184d9`, transparent background, label Inter 500 15px, `letter-spacing: 0.1em`, uppercase, color #9184d9.
- Hover: background #9184d9, label #161826 (`transition: background .16s, color .16s`).
- Active: background `color-mix(in srgb, #9184d9 22%, transparent)`.
- **Never a solid fill at rest** — the outlined primary is a system rule.

### Divider
`1px` rules either side of a 10px `letter-spacing: 0.26em` uppercase "or" (#9397ab), gap 16px. Each rule fades to transparent at its outer end: `linear-gradient(90deg, transparent, #595d6c)` on the left, mirrored on the right.

### Social buttons
Two equal buttons, height 50px, `border-radius: 8px`, `1px solid #595d6c`, transparent, label 14px #e4e7f5, 17px brand glyph, gap 9px. Hover: `border-color: #9184d9`. Google keeps its four-color glyph; Apple's glyph is `currentColor`.

### Sign-up line
"New to Mycoach? **Create an account**" — 13px #b2b6ca, link #d2cefd → #9184d9 on hover.

---

## Interactions & behavior
- **Submit:** disable the CTA and swap the arrow for a 17px indeterminate spinner (accent, 800ms linear). Keep the label.
- **Validation:** on blur for email (RFC-ish), on submit for both. Invalid field → underline #9184d9 is replaced by a red-free treatment: use `--color-accent` underline + a 12px message under the field in #b2b6ca. The palette is mono; do not introduce a red token without adding it to the system first.
- **Auth error:** a single line above the CTA, 13px, #e4e7f5, with a 1px accent rule to its left — no toast, no modal.
- **Success:** route to the home screen; no success state on this screen.
- **Transitions:** 160ms for color/border, 240ms for screen fades, all `ease-out`.

## State
`email`, `password`, `showPassword`, `staySignedIn`, `status: 'idle' | 'submitting' | 'error'`, `errorMessage`. Auth provider is not specified by the design — NextAuth/Auth.js with Credentials + Google + Apple providers fits the three entry points shown.

## Responsive
Designed at 402 × 874. Below 380px, drop the headline to 46px. Above 600px, cap the content column at 420px and center it; the ground gradient stays full-bleed.

## Accessibility
- Every input has a real `<label>`; the eye toggle has `aria-label` and `aria-pressed`.
- The checkbox is a real `<input type="checkbox">` visually hidden behind the custom box (or a `role="checkbox"` button with `aria-checked`).
- Accent-on-ground is ~3:1 — fine for the CTA border and large text, **not** for body copy. Use #d2cefd (accent-300) for any accent-colored text at body size.

## Assets
None. No photography, no raster assets — the screens are type and rules only. Google and Apple glyphs are inline SVG (in the reference file). The 8-ball mark was explored and removed; the wordmark is the identity.

## Files
- `reference/Mycoach Login.dc.html` — the design prototype. Direction **2B** is the second option block (badge "2B"); 2A above it is not in scope.
- `reference/nocturne.css` — the Nocturne design system stylesheet. Its `:root` block is the token source; lift it wholesale.
