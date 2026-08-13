/** Cuemaster domain types. */

export type GroupName = "Beginner" | "Intermediate" | "Advanced";

export type DifficultyGroup = {
  id: string;
  name: GroupName;
  min_level: number;
  max_level: number;
  sort_order: number;
};

export type Level = {
  id: string;
  level_number: number;
  title: string;
  objective: string | null;
  difficulty_group_id: string;
  sort_order: number;
  is_published: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

/** The four scoring shapes a drill can use. */
export type TemplateType = "attempts" | "sets" | "best_run" | "completion";

export type SheetConfiguration = {
  /** attempts: how many attempts make up a session. */
  total_attempts?: number;
  /** sets: how many sets, and how many attempts in each. */
  set_count?: number;
  attempts_per_set?: number;
  /** best_run: the run length that counts as a pass. */
  target_run?: number;
};

export type PassingRule = {
  type: "min_percentage" | "target_run" | "completion";
  value: number;
  /** How many recent attempts are considered. */
  of_recent: number;
  /** How many of those must meet the target. */
  required_passes: number;
};

/** Ball positions for the generated table diagram, normalised 0–1. */
export type DrillSetup = {
  table?: "pool" | "snooker";
  balls?: { role: "cue" | "object" | "blocker"; x: number; y: number; label?: string }[];
  zones?: { x: number; y: number; w: number; h: number; label?: string }[];
  aims?: { from: [number, number]; to: [number, number] }[];
};

export type Drill = {
  id: string;
  level_id: string;
  category_id: string;
  name: string;
  slug: string;
  short_objective: string | null;
  learning_outcome: string | null;
  setup_instructions: string | null;
  execution_instructions: string | null;
  success_condition_text: string | null;
  image_url: string | null;
  optional_video_url: string | null;
  sheet_template_type: TemplateType;
  sheet_configuration: SheetConfiguration;
  passing_rule: PassingRule;
  is_required: boolean;
  sort_order: number;
  duration_minutes: number;
  setup: DrillSetup | null;
};

export type DrillStatus = "not_started" | "in_progress" | "passed";

export type DrillProgress = {
  drill_id: string;
  status: DrillStatus;
  best_normalized_score: number | null;
  attempt_count: number;
  passed_at: string | null;
};

export type LevelStatus = "locked" | "current" | "completed";

export type LevelProgress = {
  level_id: string;
  progress_percentage: number;
  status: LevelStatus;
};

export type SessionStatus =
  | "active"
  | "practice_complete"
  | "break_complete"
  | "finished"
  | "abandoned";

export type PracticeSession = {
  id: string;
  player_id: string;
  drill_id: string;
  started_at: string | null;
  intended_practice_seconds: number | null;
  intended_break_seconds: number | null;
  actual_practice_seconds: number | null;
  status: SessionStatus;
};

export type DrillAttempt = {
  id: string;
  drill_id: string;
  practice_session_id: string | null;
  template_type: TemplateType;
  raw_result: RawResult;
  normalized_score: number | null;
  passed: boolean;
  player_note: string | null;
  completed_at: string;
};

/** What each template records. The database recomputes the score from this. */
export type RawResult =
  | { total_attempts: number; successful_attempts: number }
  | { sets: { total: number; successful: number }[] }
  | { runs_attempted: number; best_run: number }
  | { completed: boolean; attempts: number; completion_seconds?: number };

export type Ability = "beginner" | "intermediate" | "advanced";

export const ABILITIES: Ability[] = ["beginner", "intermediate", "advanced"];

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  selected_ability: Ability | null;
  onboarded_at: string | null;
  current_level_id: string | null;
  notification_preference: boolean;
  created_at: string;
};

/** The three kinds of program. Kept distinct throughout the product: an
 *  official Cuemaster programme, one the AI selected, or one the player built. */
export type ProgramType = "mycoach" | "ai" | "custom";

export const PROGRAM_TYPE_LABEL: Record<ProgramType, string> = {
  mycoach: "Cuemaster",
  ai: "AI",
  custom: "Custom",
};

export type TrainingProgram = {
  id: string;
  owner_player_id: string | null;
  name: string;
  description: string | null;
  program_type: ProgramType;
  ability: Ability;
  objective: string | null;
  is_published: boolean;
  created_at: string;
};

export type ProgramDrill = {
  id: string;
  training_program_id: string;
  drill_id: string;
  sort_order: number;
  selection_reason: string | null;
};

export type PlayerProgram = {
  id: string;
  player_id: string;
  training_program_id: string;
  is_active: boolean;
  saved_at: string;
  last_practiced_at: string | null;
};

export const GROUP_FOR_LEVEL = (levelNumber: number): GroupName =>
  levelNumber <= 3 ? "Beginner" : levelNumber <= 7 ? "Intermediate" : "Advanced";
