# MyCoach — working notes

## Scope discipline

`MyCoach_Phase_1_Claude_Build_Brief.md` is the scope authority and it is
deliberately strict. Do not add features, roles, fields, screens, gamification,
social features or AI that it does not name. In particular Phase 1 excludes:
coach accounts/dashboards/notes, AI assistant, AI feedback, monthly reports,
non-billiards subjects, and social sign-in.

Drill names, copy, imagery and sheet designs come from the project owner. Where
content is missing the UI says so — never invent drill content to fill a gap.

## Design system

`design_handoff_mycoach_login/README.md` is the visual authority; the token
values in it are binding. The `:root` block in `app/globals.css` is lifted from
`design_handoff_mycoach_login/reference/nocturne.css`.

Rules that are easy to break by accident:

- Build from the CSS variables. No hard-coded colours, and nothing outside the
  token list — no pure black, no pure white, no red (the palette is mono; an
  invalid field takes an accent underline plus a message, never a red one).
- Font weight ceiling is **500**.
- The primary button is **outlined at rest** — never a solid fill until hover.
- Focus is the global `:focus-visible` accent ring, never the browser default.
- Accent `#9184d9` on the ground is ~3:1 — fine for the CTA border and large
  text, not for body copy. Use `--color-accent-300` for accent text at body size.
- Transitions: 160ms for colour/border, 240ms for screen fades, all `ease-out`.

Ask before adding a colour, a heavier weight, or a UI element the handoff
doesn't describe.

## Conventions

- Screens are server components that fetch through `lib/supabase/server.ts`;
  anything with timers, form state or auth calls is a client component.
- All auth goes through `signIn()` in `components/AuthForm.tsx` — one seam to
  swap if the provider changes.
- Styling is CSS Modules, one module per screen family, colocated in
  `components/`.
- Never trust the client for privacy: `practice_sessions` is protected by RLS,
  and queries rely on it rather than filtering by player id in the UI.

## Adding a new performance sheet

1. Add the type to `SheetType` in `lib/types.ts` and give it a performance shape.
2. Render it in `PerformanceSheet` in `components/DrillPractice.tsx` — the
   component already falls back to a "not supplied yet" panel for unknown types.
3. Set `sheet_type` / `sheet_config` on the drill row.

The saved percentage is only meaningful for sheets that produce one; leave
`result_percentage` null for sheets that don't.

## Verifying

```bash
npm run build
```

```bash
npx eslint app components lib proxy.ts
```
