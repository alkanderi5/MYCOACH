import type { DrillAttempt } from "@/lib/types";

export type TrendDirection = "improving" | "stable" | "declining" | "unknown";

export type Trend = {
  direction: TrendDirection;
  /** Points of change, positive or negative. Null until comparable. */
  change: number | null;
  recentAverage: number | null;
};

/** Change smaller than this is noise, not a trend. Configurable per the brief. */
export const DEFAULT_TREND_THRESHOLD = 5;
/** How many attempts on each side of the comparison. */
export const TREND_WINDOW = 3;

/**
 * Compare the most recent attempts with the ones before them.
 *
 * Only attempts on the same template are compared: a percentage from an
 * attempts sheet and one from a best-run sheet measure different things, and
 * showing them as one line would be a misleading statistic.
 *
 * `attempts` is newest-first. Returns "unknown" until there is enough to say.
 */
export function trendFor(
  attempts: Pick<DrillAttempt, "normalized_score" | "template_type">[],
  threshold: number = DEFAULT_TREND_THRESHOLD,
): Trend {
  const scored = attempts.filter(
    (a): a is typeof a & { normalized_score: number } => a.normalized_score !== null,
  );

  if (scored.length === 0) return { direction: "unknown", change: null, recentAverage: null };

  // Comparable means same template as the latest attempt.
  const template = scored[0].template_type;
  const comparable = scored.filter((a) => a.template_type === template);

  const recent = comparable.slice(0, TREND_WINDOW);
  const previous = comparable.slice(TREND_WINDOW, TREND_WINDOW * 2);

  const recentAverage = average(recent.map((a) => a.normalized_score));

  if (previous.length === 0) {
    return { direction: "unknown", change: null, recentAverage };
  }

  const previousAverage = average(previous.map((a) => a.normalized_score));
  const change = round1((recentAverage ?? 0) - (previousAverage ?? 0));

  const direction: TrendDirection =
    change >= threshold ? "improving" : change <= -threshold ? "declining" : "stable";

  return { direction, change, recentAverage };
}

/** Category health, from the same rules, for the Progress screen. */
export function categoryStanding(trend: Trend, recentAverage: number | null): {
  label: "Weak" | "Improving" | "Strong" | "Not enough data";
} {
  if (recentAverage === null) return { label: "Not enough data" };
  if (trend.direction === "improving") return { label: "Improving" };
  if (recentAverage >= 75) return { label: "Strong" };
  if (recentAverage < 55) return { label: "Weak" };
  return { label: "Improving" };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
