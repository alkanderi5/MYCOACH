import type { Drill, DrillAttempt, DrillProgress, PracticeSession } from "@/lib/types";
import { trendFor } from "./trend";

export type Recommendation = {
  drill: Drill | null;
  /** Plain language, shown to the player as the reason. */
  reason: string;
  kind:
    | "resume"
    | "close_to_passing"
    | "declining"
    | "next_unattempted"
    | "optional_weak"
    | "level_complete";
  /** Set when an unfinished session should be picked back up. */
  sessionId?: string;
};

/** How near a pass counts as "close". */
const CLOSE_MARGIN = 15;

/**
 * One action at a time, chosen by the priority in the brief.
 *
 * Deterministic on purpose: no model decides what a player practises, and the
 * reason shown is the rule that actually fired.
 */
export function recommendNext({
  drills,
  progress,
  attemptsByDrill,
  activeSession,
}: {
  /** Required and optional drills of the current level, in order. */
  drills: Drill[];
  progress: Map<string, DrillProgress>;
  attemptsByDrill: Map<string, DrillAttempt[]>;
  activeSession?: Pick<PracticeSession, "id" | "drill_id"> | null;
}): Recommendation {
  // 1. Resume an unfinished session.
  if (activeSession) {
    const drill = drills.find((d) => d.id === activeSession.drill_id) ?? null;
    if (drill) {
      return {
        drill,
        reason: "Continue where you stopped",
        kind: "resume",
        sessionId: activeSession.id,
      };
    }
  }

  const required = drills.filter((d) => d.is_required);
  const unpassed = required.filter((d) => progress.get(d.id)?.status !== "passed");

  // 2. A required drill close to passing.
  const close = unpassed
    .map((drill) => ({ drill, best: progress.get(drill.id)?.best_normalized_score ?? null }))
    .filter(
      (entry) =>
        entry.best !== null &&
        drillTarget(entry.drill) - entry.best <= CLOSE_MARGIN &&
        entry.best < drillTarget(entry.drill),
    )
    .sort((a, b) => (b.best ?? 0) - (a.best ?? 0))[0];

  if (close) {
    return {
      drill: close.drill,
      reason: "Repeat this drill to improve consistency",
      kind: "close_to_passing",
    };
  }

  // 3. A required drill whose recent results are going backwards.
  const declining = unpassed.find(
    (drill) => trendFor(attemptsByDrill.get(drill.id) ?? []).direction === "declining",
  );
  if (declining) {
    return {
      drill: declining,
      reason: "This drill strengthens a weak skill",
      kind: "declining",
    };
  }

  // 4. The next required drill never attempted.
  const unattempted = unpassed.find(
    (drill) => (progress.get(drill.id)?.attempt_count ?? 0) === 0,
  );
  if (unattempted) {
    return {
      drill: unattempted,
      reason: "You are ready for the next drill",
      kind: "next_unattempted",
    };
  }

  // 5. Anything required still short of a pass.
  if (unpassed.length > 0) {
    return {
      drill: unpassed[0],
      reason: "Repeat this drill to improve consistency",
      kind: "close_to_passing",
    };
  }

  // 6. An optional drill in a category that is lagging.
  const optional = drills
    .filter((d) => !d.is_required && progress.get(d.id)?.status !== "passed")
    .sort(
      (a, b) =>
        (progress.get(a.id)?.best_normalized_score ?? 0) -
        (progress.get(b.id)?.best_normalized_score ?? 0),
    )[0];

  if (optional) {
    return {
      drill: optional,
      reason: "This drill strengthens a weak skill",
      kind: "optional_weak",
    };
  }

  return {
    drill: null,
    reason: "Every required drill at this level is passed",
    kind: "level_complete",
  };
}

/** The score this drill counts as a pass, for "close to passing" maths. */
function drillTarget(drill: Drill): number {
  if (drill.passing_rule.type === "min_percentage") return drill.passing_rule.value;
  // Run and completion targets normalise to 100.
  return 100;
}
