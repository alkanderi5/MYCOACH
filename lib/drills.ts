import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrillCard, Level, PracticeSession } from "./types";
import { tagsOf } from "./types";

/** Every field the library can filter on. All optional — an empty object
 *  returns the whole catalogue. */
export type DrillFilters = {
  q?: string;
  level?: Level;
  category?: string;
  skill?: string;
  shotType?: string;
  goal?: string;
  game?: string;
  equipment?: string;
  /** Upper bound in minutes. */
  maxDuration?: number;
  difficulty?: number;
  savedOnly?: boolean;
  /** 'yes' = practised at least once, 'no' = never recorded. */
  completed?: "yes" | "no";
};

const DRILL_SELECT =
  "*, categories(name, slug), drill_tags(tags(id, kind, name, slug, position))";

/**
 * Column filters run in Postgres; tag filters are applied here afterwards.
 *
 * Requiring *several* tags at once is awkward to express in one PostgREST
 * join — the join matches a row if any linked tag matches, not all of them —
 * so the intersection is done in code. The payload stays small because the
 * column filters have already run.
 */
export async function fetchDrillCards(
  supabase: SupabaseClient,
  filters: DrillFilters = {},
  favouriteIds?: Set<string>,
  practisedIds?: Set<string>,
): Promise<DrillCard[]> {
  let query = supabase.from("drills").select(DRILL_SELECT);

  if (filters.level) query = query.eq("level", filters.level);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.maxDuration) query = query.lte("duration_minutes", filters.maxDuration);

  if (filters.q?.trim()) {
    const term = filters.q.trim();
    // Search the drill's own words; tag matches are folded in below.
    query = query.or(
      [
        `name.ilike.%${term}%`,
        `explanation.ilike.%${term}%`,
        `skill_learned.ilike.%${term}%`,
        `improvement_target.ilike.%${term}%`,
      ].join(","),
    );
  }

  const { data, error } = await query
    .order("level")
    .order("position")
    .returns<DrillCard[]>();

  if (error || !data) return [];

  let drills = data;

  if (filters.category) {
    drills = drills.filter((d) => d.categories?.slug === filters.category);
  }

  const tagFilters: [string | undefined, string][] = [
    [filters.skill, "skill"],
    [filters.shotType, "shot_type"],
    [filters.goal, "goal"],
    [filters.game, "game"],
    [filters.equipment, "equipment"],
  ];

  for (const [slug, kind] of tagFilters) {
    if (!slug) continue;
    drills = drills.filter((d) =>
      tagsOf(d).some((tag) => tag.kind === kind && tag.slug === slug),
    );
  }

  if (filters.savedOnly && favouriteIds) {
    drills = drills.filter((d) => favouriteIds.has(d.id));
  }

  if (filters.completed && practisedIds) {
    drills = drills.filter((d) =>
      filters.completed === "yes" ? practisedIds.has(d.id) : !practisedIds.has(d.id),
    );
  }

  return drills;
}

/** A free-text search should also match a drill by its tags, which the
 *  Postgres `or` above cannot reach. */
export function matchesTag(drill: DrillCard, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return false;
  return tagsOf(drill).some((tag) => tag.name.toLowerCase().includes(needle));
}

export type PlayerStats = {
  /** Drills with at least one saved session. */
  practisedIds: Set<string>;
  /** Most recently practised first. */
  recentDrillIds: string[];
  /** drill id → mean result percentage across saved sessions. */
  averageByDrill: Map<string, number>;
  /** drill id → number of saved sessions. */
  countByDrill: Map<string, number>;
};

/** Everything the personalized rows are computed from. RLS scopes these rows
 *  to the signed-in player, so nothing here can leak between accounts. */
export async function fetchPlayerStats(
  supabase: SupabaseClient,
): Promise<PlayerStats> {
  const { data } = await supabase
    .from("practice_sessions")
    .select("drill_id, performed_at, result_percentage")
    .order("performed_at", { ascending: false })
    .returns<Pick<PracticeSession, "drill_id" | "performed_at" | "result_percentage">[]>();

  const sessions = data ?? [];
  const practisedIds = new Set<string>();
  const recentDrillIds: string[] = [];
  const totals = new Map<string, { sum: number; scored: number; count: number }>();

  for (const session of sessions) {
    practisedIds.add(session.drill_id);
    if (!recentDrillIds.includes(session.drill_id)) {
      recentDrillIds.push(session.drill_id);
    }

    const entry = totals.get(session.drill_id) ?? { sum: 0, scored: 0, count: 0 };
    entry.count += 1;
    if (session.result_percentage !== null) {
      entry.sum += Number(session.result_percentage);
      entry.scored += 1;
    }
    totals.set(session.drill_id, entry);
  }

  const averageByDrill = new Map<string, number>();
  const countByDrill = new Map<string, number>();
  for (const [drillId, entry] of totals) {
    countByDrill.set(drillId, entry.count);
    if (entry.scored > 0) averageByDrill.set(drillId, entry.sum / entry.scored);
  }

  return { practisedIds, recentDrillIds, averageByDrill, countByDrill };
}

export async function fetchFavouriteIds(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const { data } = await supabase.from("drill_favourites").select("drill_id");
  return new Set((data ?? []).map((row) => row.drill_id as string));
}
