# MYCOACH

A guided billiards practice program. A player follows ten levels, records every
result, and unlocks the next level by passing the required drills.

The interface answers three questions and little else: what should I practise
now, how did I perform, and am I ready for the next level.

Built to `MyCoach_Complete_Claude_Build_Prompt_v2.md`.

## Stack

- **Next.js 16** (App Router, TypeScript) with **Tailwind CSS v4**
- **Supabase** — Postgres, email/password auth, row-level security
- **Vitest** for the progression rules
- Deployment target: Vercel

## Running locally

```bash
npm install
```

```bash
npm run dev
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

```bash
npm test
```

## Routes

| Route | Screen |
| --- | --- |
| `/` | Opening animation, then routes by session |
| `/signin`, `/signup` | Authentication |
| `/home` | Level, progress, recommended drill, Continue Practice |
| `/program` | The ten levels as a path |
| `/program/[level]` | Objective and the categories at that level |
| `/program/[level]/[category]` | Drill cards |
| `/drill/[id]` | Media, instructions, timer, sheet, result |
| `/progress` | Level, overall, category standing, history |
| `/profile` | Name, email, notifications, sign out |

Navigation is four destinations. Practice history lives inside Progress rather
than taking a slot of its own.

## Progression

All deterministic — no model decides what a player practises.

- **A drill passes** when its target is met in **two of the most recent three**
  attempts, so one lucky result cannot carry a player forward. The rule is
  stored per drill in `passing_rule`, so it can be tuned without a code change.
- **Level progress** counts required drills only; optional drills never block a
  level.
- **The next level unlocks** when every required drill in the current one is
  passed.
- **Recommendation** follows a fixed priority: resume an unfinished session,
  repeat a drill close to passing, repeat one that is declining, start the next
  unattempted drill, then an optional drill in a weak area. The reason shown to
  the player is the rule that actually fired.
- **Trends** compare the three most recent attempts with the three before them,
  and only across the same sheet template — a percentage from an attempts sheet
  and one from a best-run sheet are not the same measurement.

These live in `lib/progression/`, free of React and Supabase, so they are unit
tested and can be swapped for something smarter later.

## Scoring is not trusted from the browser

`normalized_score` and `passed` are recomputed by a database trigger from the
submitted `raw_result`, so a tampered request cannot award itself a pass. Every
template normalises onto 0–100. A unique index on `practice_session_id` means a
retry after a network failure cannot create a second attempt.

Sheet templates: **attempts**, **sets** (aggregated across all attempts, never
an average of averages), **best run**, and **completion**.

## Data model

`difficulty_groups`, `levels`, `categories`, `level_categories`, `drills`,
`practice_sessions`, `drill_attempts`, `player_drill_progress`,
`player_level_progress`, `profiles`.

Curriculum tables are readable by any signed-in player. Everything carrying a
`player_id` is restricted to `auth.uid()` by RLS.

## Table setups

Each drill stores normalised ball positions in `setup`, drawn as an SVG table:
cushions, pockets, the baulk line and D, the balls, and any cue-ball target
zone. A drill needs exact positions more than a photograph, and the app ships
no raster assets. `image_url` takes precedence when real artwork is supplied.

## Sample content

The 41 drills, their wording and their diagrams are **sample data**. They exist
so the program has something real to organise. The project owner supplies the
final curriculum: drill names, table layouts, explanations, scoring rules,
images and videos.

Videos are the one thing absent everywhere — the section stays hidden until a
drill has an `optional_video_url`.
