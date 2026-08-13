# Handoff: Cuemaster — Splash, Login & Sign-up (crimson direction, 3A)

## Overview
Cuemaster is a billiards coaching app. This handoff covers three auth screens: **splash**, **login**, **sign-up**. The approved direction is **3A** — near-black ground, a single crimson accent, solid-filled primary buttons, elevated cards.

The design file also contains earlier directions (2A photo-led, 2B typographic in a blurple palette). **Those are out of scope** — build 3A only.

## About the design files
`reference/Cuemaster Login.dc.html` is a **design prototype authored in a design tool**, not production code. It will not render standalone and should not be copied. This README is the source of truth; open the reference only to check an exact value.

## Target stack
- **Next.js (App Router)**, TypeScript. Auth screens are client components.
- Styling: CSS Modules or Tailwind — token values below are binding either way.
- Font: **Inter** via `next/font/google`, weights 400 / 500 / 600.
- Icons: **Phosphor** (`@phosphor-icons/react`) — Eye/EyeSlash, Check.
- Routes: `/` (splash), `/login`, `/signup`.

## Fidelity
**High fidelity.** Recreate accurately at a 402 × 874 logical viewport, then scale per Responsive.

---

## Tokens (binding)

### Color
| Name | Hex | Use |
| --- | --- | --- |
| `--bg` | #0a0a0c | page ground |
| `--surface` | #141417 | inputs, cards, secondary buttons |
| `--surface-hover` | #1b1b1f | secondary button hover |
| `--border` | #26262b | input and card borders, dividers |
| `--border-strong` | #3a3a42 | secondary button hover border |
| `--crimson` | #E5123F | accent: primary fill, links, focus, checkbox, glow |
| `--crimson-hover` | #ff2853 | primary hover |
| `--crimson-bright` | #ff3d63 | link hover |
| `--text` | #f4f4f6 | headings, input text |
| `--text-2` | #e8e8ec | secondary button labels |
| `--text-3` | #b8b8c0 | body on dark surfaces |
| `--muted` | #8a8a93 | subheads, field labels |
| `--muted-2` | #6e6e78 | helper text, icon rest, "or" |
| `--on-crimson` | #ffffff | text/icons on crimson fills |

No other colors. Crimson is the only hue — no secondary accent, no success green in auth.

### Type
Inter throughout. Display headings **600**; labels/buttons 500; body 400.
Scale: 44 / 34 / 20 / 16 / 14 / 13 / 12 / 11 px.
Tracking: −0.04em at 44px, −0.035em at 34px, −0.03em at 20px, −0.01em on buttons; uppercase micro-labels at +0.10em, kickers at +0.30em.

### Radius & elevation
Buttons and inputs **8px**; checkbox 5px. One shadow only: the primary button's crimson glow `0 10px 30px rgba(229,18,63,.30)`. No generic drop shadows.

### The crimson bloom
Login and sign-up each carry one blurred radial as atmosphere, not decoration:
```css
position:absolute; top:-140px; width:420px; height:420px; border-radius:50%;
background: radial-gradient(circle, rgba(229,18,63,.32), transparent 66%);
filter: blur(20px);
```
Login: `left:-90px`, alpha .32. Sign-up: `right:-110px`, alpha .28. Behind content (`pointer-events:none`), never scrolls with the form.

### Global states
- `:focus-visible { outline: 2px solid #E5123F; outline-offset: 2px; }` — never the browser default.
- Input focus additionally sets `border-color: #E5123F`.
- Transitions 160ms ease-out on color/background/border.
- Disabled: 45% opacity, no pointer events.

---

## Screen 1 — Splash

Full-bleed **crimson** (#E5123F) — the one screen that inverts. Centered wordmark: an 20px white dot (`box-shadow: 0 0 26px rgba(255,255,255,.6)`), 14px gap, "Cuemaster" at 44px/600, −0.04em, white. 26px below: "BILLIARD PRACTICE", 11px/500, +0.30em, uppercase, `rgba(255,255,255,.7)`.

Behind it: `radial-gradient(90% 55% at 50% 42%, rgba(255,255,255,.14), transparent 70%)` — a soft light pool, top-centre.

No spinner, no progress bar. Hold ≥800ms while the session resolves, then route (`/login` or home) with a 240ms fade-out.

## Screen 2 — Login

Ground `--bg`, container `padding: 92px 26px 40px` (add `env(safe-area-inset-*)`), flex column. Bloom top-left.

| # | Element | Spec |
| --- | --- | --- |
| 1 | Wordmark | 9px crimson dot + "Cuemaster" 20px/600, −0.03em, `--text`; gap 7px; dot glows `0 0 9px rgba(229,18,63,.55)` |
| 2 | Headline | "Welcome back." 34px/600, line-height 1.08, −0.035em. `margin-top: 40px` |
| 3 | Subhead | "Pick your drills up where you left them." 14px, lh 1.6, `--muted`, max-width 260px, `margin-top: 10px` |
| 4 | Fields | `margin-top: 38px`, column, gap 12px |
| 5 | Options row | `margin-top: 16px`, space-between |
| 6 | Primary CTA | `margin-top: 28px` |
| 7 | Divider | `margin-top: 26px` |
| 8 | Social row | `margin-top: 18px`, gap 10px |
| 9 | Sign-up line | `margin-top: auto; padding-top: 26px`, centered |

**Fields** — label 11px/500 +0.10em uppercase `--muted`, 8px above. Input height 54px, `--surface` fill, `1px solid --border`, radius 8px, 16px text `--text`, `padding: 0 16px`. Password: `letter-spacing: .26em`, right padding 48px, a 40 × 54 Eye button inset 6px right, `--muted-2` → crimson on hover, toggles type and swaps to EyeSlash. Ship inputs empty — the mock's values are sample data; labels carry meaning, no placeholders.

**Options row** — left: 18px crimson-filled checkbox, radius 5px, white 11px Check, 9px gap, "Stay signed in" 13px `--text-3`. Unchecked: `--surface` fill, `1px solid --border`, no tick. Never a native checkbox. Right: "Forgot?" 13px/500 crimson → `--crimson-bright`.

**Primary CTA** — "Log in", full width, height 56px, radius 8px, **solid crimson**, no border, white 16px/600, the crimson glow shadow. Hover `--crimson-hover`; active `#c8103a` and glow dropped to `0 4px 14px`.

**Divider** — 1px rules flanking an 11px +0.16em uppercase "or" (`--muted-2`), gap 14px; each rule fades to transparent at its outer end (`linear-gradient(90deg, transparent, #26262b)` left, mirrored right).

**Social row** — two equal buttons, height 52px, radius 8px, `--surface` fill, `1px solid --border`, label 14px/500 `--text-2`, 18px glyph, gap 9px. Hover: border `--border-strong`, background `--surface-hover`. Google keeps its four-color glyph; Apple's is `currentColor`.

**Sign-up line** — "New to Cuemaster? **Create an account**" 13px `--muted`, link crimson/500 → `--crimson-bright`, routes to `/signup`.

## Screen 3 — Sign-up

Same shell; bloom mirrored to top-right at alpha .28. Headline "Create your / account." (explicit line break) 34px/600. Subhead "Two minutes, then you're on the table." max-width 250px.

Fields `margin-top: 34px`, gap 12px: **Name** (text), **Email**, **Password** — password carries a 12px `--muted-2` helper "8 characters minimum." directly under it.

CTA "Create account" `margin-top: 24px`, identical crimson button. Below it (`margin-top: 16px`) a centered 12px `--muted-2` legal line, "Terms" and "Privacy Policy" in `--text-3` → crimson on hover. Foot: "Already have an account? **Log in**", same pattern as login's, `margin-top: auto; padding-top: 24px`.

No social buttons on sign-up — one path in keeps the screen short; users who signed up with Google arrive via login.

---

## Interactions
- **Submit:** CTA goes disabled, label stays, a 17px white indeterminate spinner appears left of it (800ms linear).
- **Validation:** email on blur, password on submit (≥8 chars). Error = input `border-color: #E5123F` + a 12px crimson message under the field. Crimson doubles as the error color — the palette is mono; do not add a red or green token.
- **Auth failure:** one 13px crimson line above the CTA. No toast, no modal.
- **Success:** route to home. No success state here.

## State
`email`, `password`, `name` (sign-up), `showPassword`, `staySignedIn`, `status: 'idle' | 'submitting' | 'error'`, `errorMessage`. Stub the network behind a single `signIn()` / `signUp()` function — Auth.js with Credentials + Google + Apple matches the entry points shown.

## Responsive
Designed at 402 × 874. Under 380px: headline 30px. Over 600px: cap the form column at 420px, centered; ground and bloom stay full-bleed.

## Accessibility
Real `<label>` per input; `aria-label` + `aria-pressed` on the eye toggle; a visually-hidden real checkbox behind the custom box. White on crimson passes at all sizes; crimson on `--bg` is ~4.3:1 — fine for links and labels, and it is the only accent-colored text used.

## Assets
None. No photography. Google and Apple glyphs are inline SVG in the reference file. The identity is the wordmark plus its crimson dot — an 8-ball mark was explored and rejected.
