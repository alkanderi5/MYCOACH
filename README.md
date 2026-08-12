# MyCoach — Phase 1

A practice-tracking web app for billiards. Phase 1 is single-role: the **player**
signs in, browses drills by category, runs a practice/break timer, records the
result on the drill's performance sheet, and reviews their progress over time.

Built to `MyCoach_Phase_1_Claude_Build_Brief.md` (scope) and
`design_handoff_mycoach_login/README.md` (visual system).

## Stack

- **Next.js 16** (App Router, TypeScript), CSS Modules
- **Supabase** — Postgres, email/password auth, row-level security
- **Inter** via `next/font/google` (300/400/500), **Phosphor** icons
- Deployment target: Vercel

## Running locally

```bash
npm install
```

```bash
npm run dev
```

The app expects `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

These are already filled in for the `mycoach` Supabase project.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Splash — holds ≥800ms, then routes by session |
| `/login` | Email/password sign-in |
| `/signup` | Account creation |
| `/practice` | The seven practice categories |
| `/practice/[category]` | Drills in that category |
| `/practice/[category]/[drill]` | Drill info, timer, performance sheet, drill history |
| `/progress` | Overall progress, per-drill progress, full history |

`proxy.ts` guards every route outside `/`, `/login` and `/signup`, and bounces a
signed-in player away from the auth screens.

## Data model

| Table | Purpose |
| --- | --- |
| `profiles` | One row per player, created automatically on signup |
| `categories` | The seven confirmed categories |
| `drills` | Drill content + which performance sheet it uses |
| `practice_sessions` | One saved session: player, category, drill, date/time, duration, sheet values, calculated percentage |

**Privacy.** RLS is on for all four tables. A player can read and write only
their own `profiles` row and their own `practice_sessions`. `categories` and
`drills` are read-only reference data for any signed-in player; they are
maintained by the project owner through the Supabase dashboard.

### Performance sheets

`drills.sheet_type` + `drills.sheet_config` let each drill carry a different
sheet structure, so new sheet designs can be added without a schema change.

Only one type is implemented, the confirmed shot-attempt sheet
(`sheet_type = 'shot_attempt'`, `sheet_config = {"total_shots": 20}`):

```
failed  = total attempted − successful
success = (successful / total attempted) × 100
```

The UI refuses impossible entries (successful > total, negatives,
non-integers) — the save button stays disabled and no result is calculated.

A drill whose `sheet_type` has no implementation renders a clear "not supplied
yet" panel rather than guessing at a sheet.

## What is deliberately absent

Per the brief: no coach role, no coach dashboard or notes, no AI assistant, no
AI feedback or reports, no non-billiards subjects, no social sign-in. Progress
figures are computed from saved records only — nothing is generated or inferred.

## Content still needed from the project owner

The catalogue ships with the seven categories and the one confirmed drill
(**Behind the Wall**, under Safety Shots). Its content fields are intentionally
empty — the app renders "Awaiting content from the project owner" wherever copy
is missing, and a placeholder frame where the setup image will go.

For each drill, supply: name, setup image, explanation, skill learned,
improvement target, instructions, optional video URL, and which performance
sheet it uses. Rows can be added in the Supabase dashboard (`drills` table) or
via a seed migration.
