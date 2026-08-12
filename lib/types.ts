/** Product entities, matching the Phase 1 data structure. */

export type Category = {
  id: string;
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
