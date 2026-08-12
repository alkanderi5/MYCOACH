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
| `/practice` | Search, level, quick filters, personalized rows, categories |
| `/practice/[category]` | Drills in that category |
| `/practice/[category]/[drill]` | Drill info, timer, performance sheet, drill history |
| `/library` | Every drill, with combinable filters and grouped results |
| `/programs` | Training programs |
| `/programs/[program]` | A program, week by week |
| `/progress` | Overall progress, per-drill progress, full history |
| `/profile` | Display name, level, practice summary, sign out |

## Two ways in

**Training programs** tell a player what to practise and in what order.
**The drill library** is for players who want to choose for themselves. Both
surface the same drill rows.

Every row on the Practice page is computed from the player's own saved
sessions — what they practised last, what they have not tried at their level,
where their averages are lowest. Rows with nothing in them render nothing at
all rather than an empty shelf.

`proxy.ts` guards every route outside `/`, `/login` and `/signup`, and bounces a
signed-in player away from the auth screens.

## Data model

| Table | Purpose |
| --- | --- |
| `profiles` | One row per player, created automatically on signup; holds their level |
| `categories` | The seven confirmed categories |
| `drills` | Drill content, level, difficulty, duration, and which sheet it uses |
| `tags` / `drill_tags` | Skill, shot type, goal, game and equipment — many per drill |
| `practice_sessions` | One saved session: player, category, drill, date/time, duration, sheet values, calculated percentage |
| `drill_favourites` | Saved drills, private to the player |
| `programs` / `program_items` | Training programs; items reference shared drill rows |
| `program_enrollments` | Which programs a player is following |
| `coach_assignments` | Schema only — no coach role or UI is built in Phase 1 |

**One drill is one row.** A drill is never duplicated to appear in another
category, program or search result; everything joins back to the same row.

**Privacy.** RLS is on for all four tables. A player can read and write only
their own `profiles` row and their own `practice_sessions`. `categories` and
`drills` are read-only reference data for any signed-in player; they are
maintained by the project owner through the Supabase dashboard.

### The practice timer

The clock never moves the player on by itself. When a practice period runs out
it **stops** and waits on a decision:

- **Take a break** — runs the chosen break length. When that ends it stops
  again and offers *Back to practice*.
- **Continue** — runs another practice period of the same length. Time from
  every period accumulates into one session.
- **Finish** — ends the session and points the player at the sheet.

Nothing reaches history until the sheet is filled in and saved, so a stopped
session with no result recorded is simply discarded. The saved duration is the
total time actually spent practising, excluding breaks and paused time.

### Performance sheets

Sheets are **tapped, not typed** — the phone sits beside the table and the
player hits one big button per shot. Both sheets have an undo, and impossible
results cannot be entered because nothing is typed in.

`drills.sheet_type` + `drills.sheet_config` let each drill carry a different
structure, so new sheet designs need no schema change.

**`shot_attempt`** — a set number of single shots. One tap of **Made** or
**Missed** per shot; the row of pips shows the session so far.

The count is **a ladder, not a fixed number**:

```json
{ "total_shots": { "beginner": 10, "intermediate": 15, "advanced": 20 } }
```

The same drill asks more of a stronger player, so a level is a different target
rather than a different drill — there is still one row per drill. It resolves
against the signed-in player's level, falling back down the ladder if a rung is
missing, and a plain number still works for a drill that should ask everyone
the same. Existing drills were laddered as base / half again / double, rounded
up to the nearest five.

```
failed  = recorded − made
success = (made / recorded) × 100
```

**`progressive`** — many balls per attempt, no fixed shot count. Tap **Potted**
for each ball; the attempt only counts when the table is cleared without a
miss.

```
cleared % = tables cleared / attempts × 100
```

With `sheet_config = {"balls_per_rack": 3}` the attempt closes itself once the
rack is cleared. With `{}` the player taps **Table cleared** — for drills where
the number of balls varies. The saved record keeps each run's length, so a
session retains its shape and not just a total.

A drill whose `sheet_type` has no implementation renders a clear "not supplied
yet" panel rather than guessing at a sheet.

## What is deliberately absent

Per the brief: no coach role, no coach dashboard or notes, no AI assistant, no
AI feedback or reports, no non-billiards subjects, no social sign-in. Progress
figures are computed from saved records only — nothing is generated or inferred.

## Content still needed from the project owner

The catalogue ships with 22 drills across the seven categories and three
levels, plus three training programs. **All of this copy is a draft** — it
carries `content_status = 'draft'`, and each drill page says so. It exists so
the library, filters and programs have something real to organise. Replace or
approve it before players see it, then set `content_status = 'approved'`.

Still missing entirely, and not invented anywhere:

- **Instructional videos** — the section is hidden until a `video_url` exists.
- **Sheet designs** beyond the two implemented.

### Table setup diagrams

Every drill carries a `setup` column holding normalised ball positions, and
the drill page draws them as an SVG table — cushions, pockets, spots, baulk
line, the balls, and any cue-ball target zone. It is a diagram rather than a
photograph: the design ships no raster assets, and a drill needs exact
positions more than it needs a picture of a table.

`setup_image_url` still takes precedence, so supplying a real photograph or
your own artwork replaces the diagram for that drill without any code change.

Rows can be edited in the Supabase dashboard (`drills`, `tags`, `drill_tags`,
`programs`, `program_items`) or via a migration.
