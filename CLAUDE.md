# MyCoach — working notes

## Scope discipline

`MyCoach_Phase_1_Claude_Build_Brief.md` is the scope authority and it is
deliberately strict. Do not add features, roles, fields, screens, gamification,
social features or AI that it does not name. In particular Phase 1 excludes:
coach accounts/dashboards/notes, AI assistant, AI feedback, monthly reports,
non-billiards subjects, and social sign-in.

Two parts of the brief have since been revised by the project owner:

- **Drill copy.** The brief reserved all drill wording for the owner. They have
  since asked for drafted content, so the catalogue ships with copy written to
  get the library moving. Anything written this way carries
  `content_status = 'draft'` and says so on the drill page. Never quietly
  promote a row to `'approved'` — that is the owner's call. Imagery and video
  are still entirely theirs; missing ones show a placeholder rather than a
  substitute.
- **Coach features.** Still excluded from the UI, but `coach_assignments` and
  `drills.coach_recommended` exist so the data has somewhere to live. Do not
  build a coach role, dashboard or authoring UI without asking.

The seven categories named in the brief are still the categories. The nine
skill groups the owner later described are **tags**, not a replacement
taxonomy — that was their explicit choice.

## Design system

`design_handoff_mycoach_login/README.md` is the visual authority; the token
values in it are binding. The `:root` block in `app/globals.css` is lifted from
`design_handoff_mycoach_login/reference/nocturne.css`.

Rules that are easy to break by accident:

- Build from the CSS variables. No hard-coded colours, and nothing outside the
  token list — no pure black, no pure white.
- `--color-made` and `--color-miss` were added at the project owner's request
  for the tally buttons, and are the **only** sanctioned green and red. They
  mean "this shot went in" / "it did not" and nothing else: an invalid form
  field still takes an accent underline plus a message, never `--color-miss`.
  Never let either colour be the only signal — the tally buttons pair them with
  an icon and a word so they read for a colour-blind player.
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

## How drills are organised

One drill is **one row**. It is never copied to appear in another list.

- `drills` carries the single-valued attributes: category, level, difficulty,
  duration, sheet type.
- `tags` + `drill_tags` carry everything a drill can have several of: skill,
  shot type, goal, game, equipment. This is what lets one drill answer many
  different searches.
- `program_items` point at drill rows, so a drill used by three programs — or
  by two weeks of the same program — is still one row.

Filtering lives in `lib/drills.ts`. Column filters run in Postgres; tag filters
are intersected in code, because a PostgREST join matches a row when *any*
linked tag matches, not all of them. Keep that split unless the catalogue grows
enough to justify a database function.

The library is URL-driven — every filter is a query parameter — so a filtered
view can be linked to and shared.

## Performance sheets

Sheets are tapped, not typed. The phone sits by the table, so the targets are
large, the labels are one word, and every sheet has an undo.

- `shot_attempt` — a fixed number of single shots. Made / missed per shot;
  percentage = made ÷ recorded.
- `progressive` — many balls per attempt, no fixed shot count. The attempt only
  counts when the table is cleared without a miss, so percentage = tables
  cleared ÷ attempts. With `balls_per_rack` set the attempt closes itself once
  the rack is cleared; without it the player taps "table cleared".

**Every tally handler must be a functional state update.** Taps arrive faster
than React re-renders, and computing the next value from a captured variable
silently drops all but one tap of a quick run. This was a real bug once.

### Adding a new sheet

1. Add the type to `SheetType` in `lib/types.ts` and give it a performance shape
   in the `Performance` union.
2. Teach `describePerformance()` how to summarise it — history rows and the
   progress screen both go through it.
3. Render it from `PerformanceSheet` in `components/DrillPractice.tsx`, which
   falls back to a "not supplied yet" panel for unknown types.
4. Set `sheet_type` / `sheet_config` on the drill row.

The saved percentage is only meaningful for sheets that produce one; leave
`result_percentage` null for sheets that don't.

## Verifying

```bash
npm run build
```

```bash
npx eslint app components lib proxy.ts
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
