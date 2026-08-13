import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Drill,
  PlayerProgram,
  ProgramDrill,
  TrainingProgram,
} from "@/lib/types";

export type ProgramWithDrills = TrainingProgram & {
  drills: ProgramDrill[];
  saved?: PlayerProgram;
};

const PROGRAM_COLUMNS =
  "id, owner_player_id, name, description, program_type, ability, objective, is_published, created_at";

/**
 * Every program the player can see: the published Cuemaster ones and their own.
 * RLS does the filtering, so this cannot leak another player's program.
 */
export async function loadPrograms(supabase: SupabaseClient) {
  const [{ data: programs }, { data: programDrills }, { data: saved }] =
    await Promise.all([
      supabase
        .from("training_programs")
        .select(PROGRAM_COLUMNS)
        .order("created_at")
        .returns<TrainingProgram[]>(),
      supabase
        .from("training_program_drills")
        .select("id, training_program_id, drill_id, sort_order, selection_reason")
        .order("sort_order")
        .returns<ProgramDrill[]>(),
      supabase
        .from("player_programs")
        .select("id, player_id, training_program_id, is_active, saved_at, last_practiced_at")
        .returns<PlayerProgram[]>(),
    ]);

  const drillsByProgram = new Map<string, ProgramDrill[]>();
  for (const row of programDrills ?? []) {
    const list = drillsByProgram.get(row.training_program_id);
    if (list) list.push(row);
    else drillsByProgram.set(row.training_program_id, [row]);
  }

  const savedByProgram = new Map((saved ?? []).map((s) => [s.training_program_id, s]));

  const all: ProgramWithDrills[] = (programs ?? []).map((program) => ({
    ...program,
    drills: drillsByProgram.get(program.id) ?? [],
    saved: savedByProgram.get(program.id),
  }));

  return {
    official: all.filter((p) => p.program_type === "mycoach"),
    mine: all.filter((p) => p.owner_player_id !== null || p.saved),
    active: all.find((p) => p.saved?.is_active) ?? null,
    byId: new Map(all.map((p) => [p.id, p])),
  };
}

/**
 * Save a program to the player's account and make it the one they are working
 * on. Only one can be active, so the others are stood down first.
 */
export async function activateProgram(
  supabase: SupabaseClient,
  playerId: string,
  trainingProgramId: string,
) {
  await supabase
    .from("player_programs")
    .update({ is_active: false })
    .eq("player_id", playerId)
    .eq("is_active", true);

  const { error } = await supabase.from("player_programs").upsert(
    {
      player_id: playerId,
      training_program_id: trainingProgramId,
      is_active: true,
      saved_at: new Date().toISOString(),
    },
    { onConflict: "player_id,training_program_id" },
  );

  return error;
}

/** The drills of a program, in its order, resolved against the catalogue. */
export function orderedDrills(
  program: ProgramWithDrills | null,
  drills: Drill[],
): Drill[] {
  if (!program) return [];
  const byId = new Map(drills.map((d) => [d.id, d]));
  return [...program.drills]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => byId.get(row.drill_id))
    .filter((d): d is Drill => Boolean(d));
}
