/** Product entities, matching the Phase 1 data structure. */

export type Level = "beginner" | "intermediate" | "advanced";

export const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  position: number;
};

/** Tag kinds. A drill carries many tags, which is what lets one drill row
 *  answer several different searches without being duplicated. */
export type TagKind = "skill" | "shot_type" | "goal" | "game" | "equipment";

export const TAG_KIND_LABEL: Record<TagKind, string> = {
  skill: "Skill",
  shot_type: "Shot type",
  goal: "Goal",
  game: "Game",
  equipment: "Equipment",
};

export type Tag = {
  id: string;
  kind: TagKind;
  name: string;
  slug: string;
  position: number;
};

/** The performance-sheet structures a drill may carry.
 *  - 'shot_attempt' — a fixed number of single shots, each made or missed.
 *  - 'progressive'  — many balls per attempt; the attempt only counts when the
 *    table is cleared without a miss, and there is no fixed shot count. */
export type SheetType = "shot_attempt" | "progressive";

export type SheetConfig = {
  /** shot_attempt: how many shots make up one session. */
  total_shots?: number;
  /** progressive: pots needed to clear the table, when it is a fixed number. */
  balls_per_rack?: number;
};

/** @deprecated kept for older call sites; prefer SheetConfig. */
export type ShotAttemptConfig = SheetConfig;

/** Ball positions for the generated table diagram. Coordinates are normalised:
 *  x runs the length of the table from the baulk end, y runs across it. */
export type DrillSetup = {
  table?: "pool" | "snooker";
  balls?: { role: "cue" | "object" | "blocker"; x: number; y: number; label?: string }[];
  /** Where the cue ball should finish. */
  zones?: { x: number; y: number; w: number; h: number; label?: string }[];
  aims?: { from: [number, number]; to: [number, number] }[];
};

export type Drill = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  setup_image_url: string | null;
  setup: DrillSetup | null;
  explanation: string | null;
  skill_learned: string | null;
  improvement_target: string | null;
  instructions: string | null;
  video_url: string | null;
  sheet_type: SheetType;
  sheet_config: SheetConfig;
  position: number;
  is_placeholder: boolean;
  level: Level;
  difficulty: number;
  duration_minutes: number;
  /** 'draft' copy was written to get the library moving and awaits the
   *  project owner's approval; 'approved' is their own wording. */
  content_status: "draft" | "approved";
  coach_recommended: boolean;
  created_at: string;
};

/** A drill joined to the pieces the browse screens need. */
export type DrillCard = Drill & {
  categories: { name: string; slug: string } | null;
  drill_tags: { tags: Tag }[];
};

/** Values recorded on the shot-attempt sheet. */
export type ShotAttemptPerformance = {
  total_shots: number;
  successful_shots: number;
  failed_shots: number;
};

/** Values recorded on the progressive sheet. `runs` holds the number of balls
 *  potted in each attempt, so a session keeps its shape and not just a total. */
export type ProgressivePerformance = {
  attempts: number;
  clearances: number;
  best_run: number;
  total_balls: number;
  runs: number[];
};

export type Performance = ShotAttemptPerformance | ProgressivePerformance;

export type PracticeSession = {
  id: string;
  player_id: string;
  category_id: string;
  drill_id: string;
  performed_at: string;
  practice_duration_seconds: number;
  break_duration_seconds: number;
  sheet_type: SheetType;
  performance: Performance;
  result_percentage: number | null;
};

/** One-line summary of a saved session, whichever sheet produced it. */
export function describePerformance(session: {
  sheet_type: SheetType;
  performance: Performance;
}): string {
  const p = session.performance;
  if (session.sheet_type === "progressive" && "attempts" in p) {
    return `${p.clearances}/${p.attempts} cleared · best run ${p.best_run}`;
  }
  if ("total_shots" in p && p.total_shots) {
    return `${p.successful_shots}/${p.total_shots}`;
  }
  return "";
}

export type Program = {
  id: string;
  name: string;
  slug: string;
  level: Level;
  summary: string | null;
  position: number;
  content_status: "draft" | "approved";
};

export type ProgramItem = {
  id: string;
  program_id: string;
  drill_id: string;
  week: number;
  position: number;
  focus: string | null;
};

/** Flattens the tag join into a plain list. */
export function tagsOf(drill: Pick<DrillCard, "drill_tags">): Tag[] {
  return (drill.drill_tags ?? []).map((link) => link.tags).filter(Boolean);
}

export function tagsOfKind(drill: Pick<DrillCard, "drill_tags">, kind: TagKind): Tag[] {
  return tagsOf(drill).filter((tag) => tag.kind === kind);
}
