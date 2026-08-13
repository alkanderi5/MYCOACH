import type { PassingRule, RawResult, SheetConfiguration, TemplateType } from "@/lib/types";

/**
 * Client-side mirror of the database scoring functions.
 *
 * The database is the authority — it recomputes both values on insert, so a
 * tampered request cannot award itself a pass. These exist so the sheet can
 * show a running score before saving, and so the rules are unit-testable
 * without a database.
 */

/** Every template normalises onto 0–100 so trends never compare incompatible
 *  measurements. Returns null when there is nothing meaningful to score. */
export function normalizeScore(
  template: TemplateType,
  raw: RawResult,
  config: SheetConfiguration = {},
): number | null {
  switch (template) {
    case "attempts": {
      const { total_attempts, successful_attempts } = raw as {
        total_attempts: number;
        successful_attempts: number;
      };
      if (!isPositive(total_attempts)) return null;
      return round2((successful_attempts / total_attempts) * 100);
    }

    case "sets": {
      const { sets } = raw as { sets: { total: number; successful: number }[] };
      if (!Array.isArray(sets) || sets.length === 0) return null;
      // Overall percentage from all attempts — never an average of averages,
      // which would weight a short set the same as a long one.
      const total = sets.reduce((sum, s) => sum + (s.total || 0), 0);
      const made = sets.reduce((sum, s) => sum + (s.successful || 0), 0);
      if (!isPositive(total)) return null;
      return round2((made / total) * 100);
    }

    case "best_run": {
      const { best_run } = raw as { runs_attempted: number; best_run: number };
      const target = config.target_run;
      if (!isPositive(target)) return null;
      return round2(Math.min((best_run / target!) * 100, 100));
    }

    case "completion": {
      const { completed } = raw as { completed: boolean };
      return completed ? 100 : 0;
    }
  }
}

/** Did this single attempt meet the drill's target? */
export function attemptPasses(
  rule: PassingRule,
  raw: RawResult,
  normalized: number | null,
): boolean {
  switch (rule.type) {
    case "min_percentage":
      return normalized !== null && normalized >= rule.value;
    case "target_run":
      return ((raw as { best_run?: number }).best_run ?? 0) >= rule.value;
    case "completion":
      return (raw as { completed?: boolean }).completed === true;
  }
}

/**
 * Is the drill passed overall?
 *
 * A single lucky result must not carry a player up a level, so the target has
 * to be met in several of the most recent attempts. `attempts` is newest-first.
 */
export function drillIsPassed(rule: PassingRule, attempts: { passed: boolean }[]): boolean {
  const span = Math.max(rule.of_recent ?? 3, 1);
  const needed = Math.max(rule.required_passes ?? 2, 1);
  const recent = attempts.slice(0, span);
  return recent.filter((a) => a.passed).length >= needed;
}

/** Validation shared by the sheet and any server-side check. */
export function validateAttempts(total: number, successful: number): string | null {
  if (!Number.isInteger(total) || total <= 0) return "Total attempts must be a whole number above zero.";
  if (!Number.isInteger(successful) || successful < 0) return "Successful attempts cannot be negative.";
  if (successful > total) return "Successful attempts cannot exceed total attempts.";
  return null;
}

function isPositive(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
