import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  DifficultyGroup,
  Drill,
  DrillAttempt,
  DrillProgress,
  Level,
  Profile,
} from "@/lib/types";
import { computeLevelStatuses } from "@/lib/progression/level";

const DRILL_COLUMNS =
  "id, level_id, category_id, name, slug, short_objective, learning_outcome, " +
  "setup_instructions, execution_instructions, success_condition_text, image_url, " +
  "optional_video_url, sheet_template_type, sheet_configuration, passing_rule, " +
  "is_required, sort_order, duration_minutes, setup";

/** Everything the shell of any screen needs: curriculum plus this player's
 *  standing in it. RLS keeps the progress rows to the signed-in player. */
export async function loadProgram(supabase: SupabaseClient) {
  const [levels, groups, categories, drills, drillProgress, profile] = await Promise.all([
    supabase
      .from("levels")
      .select("*")
      .eq("is_published", true)
      .order("level_number")
      .returns<Level[]>(),
    supabase.from("difficulty_groups").select("*").order("sort_order").returns<DifficultyGroup[]>(),
    supabase.from("categories").select("id, name, slug, description, sort_order, accent_color").order("sort_order").returns<Category[]>(),
    supabase
      .from("drills")
      .select(DRILL_COLUMNS)
      .eq("is_published", true)
      .not("level_id", "is", null)
      .order("sort_order")
      .returns<Drill[]>(),
    supabase
      .from("player_drill_progress")
      .select("drill_id, status, best_normalized_score, attempt_count, passed_at")
      .returns<DrillProgress[]>(),
    supabase
      .from("profiles")
      .select("id, email, display_name, current_level_id, notification_preference, created_at")
      .maybeSingle<Profile>(),
  ]);

  const allDrills = drills.data ?? [];
  const progress = new Map((drillProgress.data ?? []).map((p) => [p.drill_id, p]));

  const drillsByLevel = new Map<string, Drill[]>();
  for (const drill of allDrills) {
    const list = drillsByLevel.get(drill.level_id);
    if (list) list.push(drill);
    else drillsByLevel.set(drill.level_id, [drill]);
  }

  const levelList = levels.data ?? [];
  const statuses = computeLevelStatuses(levelList, drillsByLevel, progress);

  return {
    levels: levelList,
    groups: groups.data ?? [],
    categories: categories.data ?? [],
    drills: allDrills,
    drillsByLevel,
    progress,
    statuses,
    profile: profile.data ?? null,
  };
}

export type Program = Awaited<ReturnType<typeof loadProgram>>;

/** Attempts for a set of drills, newest first, keyed by drill. */
export async function loadAttempts(
  supabase: SupabaseClient,
  drillIds: string[],
): Promise<Map<string, DrillAttempt[]>> {
  if (drillIds.length === 0) return new Map();

  const { data } = await supabase
    .from("drill_attempts")
    .select(
      "id, drill_id, practice_session_id, template_type, raw_result, normalized_score, passed, player_note, completed_at",
    )
    .in("drill_id", drillIds)
    .order("completed_at", { ascending: false })
    .returns<DrillAttempt[]>();

  const byDrill = new Map<string, DrillAttempt[]>();
  for (const attempt of data ?? []) {
    const list = byDrill.get(attempt.drill_id);
    if (list) list.push(attempt);
    else byDrill.set(attempt.drill_id, [attempt]);
  }
  return byDrill;
}

/** An unfinished session, so the player can be offered it back. */
export async function loadActiveSession(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("practice_sessions")
    .select("id, drill_id, started_at, intended_practice_seconds, intended_break_seconds, status")
    .in("status", ["active", "practice_complete", "break_complete"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export function groupNameFor(level: Level | null, groups: DifficultyGroup[]): string {
  if (!level) return "";
  return groups.find((g) => g.id === level.difficulty_group_id)?.name ?? "";
}
