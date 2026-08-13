import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveSession, loadAttempts, loadProgram } from "@/lib/program";
import { loadPrograms, orderedDrills } from "@/lib/programs";
import { currentLevel } from "@/lib/progression/level";
import { recommendNext } from "@/lib/progression/recommendation";

/**
 * The centre button in the navigation: start practising, from anywhere.
 *
 * Resolving the recommendation here rather than in the shell keeps every other
 * page from having to load program data just to render a button.
 */
export async function GET() {
  const supabase = await createClient();
  const [program, programs] = await Promise.all([
    loadProgram(supabase),
    loadPrograms(supabase),
  ]);

  const level = currentLevel(program.levels, program.statuses);
  const levelDrills = level ? (program.drillsByLevel.get(level.id) ?? []) : [];
  const programDrills = orderedDrills(programs.active, program.drills);
  const source = programDrills.length > 0 ? programDrills : levelDrills;

  const [attemptsByDrill, activeSession] = await Promise.all([
    loadAttempts(supabase, source.map((d) => d.id)),
    loadActiveSession(supabase),
  ]);

  const recommendation = recommendNext({
    drills: source,
    progress: program.progress,
    attemptsByDrill,
    activeSession,
  });

  // Nothing to recommend means the level is done — send them somewhere useful
  // rather than to a dead end.
  redirect(recommendation.drill ? `/drill/${recommendation.drill.id}` : "/programs");
}
