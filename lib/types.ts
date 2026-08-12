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

/** The performance-sheet structures a drill may carry. Only 'shot_attempt' is
 *  confirmed by the project owner; further types are added as they arrive. */
export type SheetType = "shot_attempt";

export type ShotAttemptConfig = { total_shots: number };

export type Drill = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  setup_image_url: string | null;
  explanation: string | null;
  skill_learned: string | null;
  improvement_target: string | null;
  instructions: string | null;
  video_url: string | null;
  sheet_type: SheetType;
  sheet_config: ShotAttemptConfig;
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

/** Values recorded on the confirmed shot-attempt sheet. */
export type ShotAttemptPerformance = {
  total_shots: number;
  successful_shots: number;
  failed_shots: number;
};

export type PracticeSession = {
  id: string;
  player_id: string;
  category_id: string;
  drill_id: string;
  performed_at: string;
  practice_duration_seconds: number;
  break_duration_seconds: number;
  sheet_type: SheetType;
  performance: ShotAttemptPerformance;
  result_percentage: number | null;
};

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
