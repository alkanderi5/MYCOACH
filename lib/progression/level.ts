import type { Drill, DrillProgress, LevelStatus } from "@/lib/types";

/**
 * Level progress counts required drills only.
 *
 * Optional drills are practice a player may want but must never be a barrier
 * to finishing a level.
 */
export function levelProgressPercentage(
  drills: Pick<Drill, "id" | "is_required">[],
  progress: Map<string, DrillProgress>,
): number {
  const required = drills.filter((d) => d.is_required);
  if (required.length === 0) return 0;
  const passed = required.filter((d) => progress.get(d.id)?.status === "passed").length;
  return Math.round((passed / required.length) * 1000) / 10;
}

export function levelIsComplete(
  drills: Pick<Drill, "id" | "is_required">[],
  progress: Map<string, DrillProgress>,
): boolean {
  const required = drills.filter((d) => d.is_required);
  if (required.length === 0) return false;
  return required.every((d) => progress.get(d.id)?.status === "passed");
}

/**
 * Which levels are locked, current, or completed.
 *
 * A level unlocks only when every required drill in the level before it is
 * passed, so the ten levels stay a sequence rather than a menu.
 */
export function computeLevelStatuses(
  levels: { id: string; level_number: number }[],
  drillsByLevel: Map<string, Pick<Drill, "id" | "is_required">[]>,
  progress: Map<string, DrillProgress>,
): Map<string, { status: LevelStatus; percentage: number }> {
  const ordered = [...levels].sort((a, b) => a.level_number - b.level_number);
  const result = new Map<string, { status: LevelStatus; percentage: number }>();

  let previousComplete = true; // level 1 is always open
  for (const level of ordered) {
    const drills = drillsByLevel.get(level.id) ?? [];
    const percentage = levelProgressPercentage(drills, progress);
    const complete = levelIsComplete(drills, progress);

    const status: LevelStatus = complete
      ? "completed"
      : previousComplete
        ? "current"
        : "locked";

    result.set(level.id, { status, percentage });
    previousComplete = complete;
  }

  return result;
}

/** The level the player is working on: the first that is not yet completed. */
export function currentLevel<T extends { id: string; level_number: number }>(
  levels: T[],
  statuses: Map<string, { status: LevelStatus }>,
): T | null {
  const ordered = [...levels].sort((a, b) => a.level_number - b.level_number);
  return ordered.find((l) => statuses.get(l.id)?.status === "current") ?? null;
}
