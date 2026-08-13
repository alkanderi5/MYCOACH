import { ArrowDown, ArrowUp } from "@phosphor-icons/react/dist/ssr";
import { Card } from "./ui";

export type DaySlice = { label: string; seconds: number };

/**
 * This week's practice time, day by day, against last week.
 *
 * Bars are drawn from the player's own saved sessions. A week with no practice
 * shows an empty axis rather than a flat line pretending to be data.
 */
export function PracticeChart({
  days,
  thisWeekSeconds,
  lastWeekSeconds,
}: {
  days: DaySlice[];
  thisWeekSeconds: number;
  lastWeekSeconds: number;
}) {
  const peak = Math.max(...days.map((d) => d.seconds), 1);
  // Round the axis up to a whole hour so the labels stay readable.
  const axisTop = Math.max(Math.ceil(peak / 3600) * 3600, 3600);
  const change = thisWeekSeconds - lastWeekSeconds;
  const hasComparison = lastWeekSeconds > 0 || thisWeekSeconds > 0;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-muted">This week&apos;s practice time</p>
          <p className="mt-1.5 text-[30px] font-semibold tabular-nums tracking-tight text-ink">
            {formatHours(thisWeekSeconds)}
          </p>
        </div>

        {hasComparison && (
          <p
            className="mt-1 inline-flex items-center gap-1.5 text-[12px] tabular-nums"
            style={{ color: change >= 0 ? "var(--color-made)" : "var(--color-muted)" }}
          >
            {change >= 0 ? <ArrowUp size={12} weight="bold" /> : <ArrowDown size={12} weight="bold" />}
            {formatHours(Math.abs(change))} vs last week
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <div className="flex h-28 flex-1 items-end gap-2">
          {days.map((day) => {
            const height = (day.seconds / axisTop) * 100;
            return (
              <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-full transition-[height] duration-500 ease-out"
                    style={{
                      height: `${Math.max(day.seconds > 0 ? 4 : 2, height)}%`,
                      background:
                        day.seconds > 0 ? "var(--color-made)" : "var(--color-line)",
                    }}
                    title={`${day.label}: ${formatHours(day.seconds)}`}
                  />
                </div>
                <span className="text-[10px] text-faint">{day.label}</span>
              </div>
            );
          })}
        </div>

        {/* Axis, aligned to the bars rather than the labels beneath them. */}
        <div className="flex h-28 flex-col justify-between text-right text-[10px] text-faint">
          <span>{axisLabel(axisTop)}</span>
          <span>{axisLabel(axisTop / 2)}</span>
          <span>0</span>
        </div>
      </div>
    </Card>
  );
}

/** Axis ticks in whole hours where they are whole, otherwise minutes — a
 *  half-hour tick rounded to "1h" would mislabel the scale. */
function axisLabel(seconds: number) {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  return `${Math.round(seconds / 60)}m`;
}

/** Practice time reads better as 3:25 than as 205 minutes. */
function formatHours(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

/** The last few results as pass/fail pills, newest last. */
export function ResultPills({
  results,
  max = 5,
}: {
  results: { passed: boolean }[];
  max?: number;
}) {
  const recent = results.slice(0, max).reverse();
  if (recent.length === 0) return null;

  return (
    <span className="inline-flex gap-1.5">
      {recent.map((result, index) => (
        <span
          key={index}
          className="grid h-6 w-6 place-items-center rounded-md text-[11px] font-semibold text-white"
          style={{
            background: result.passed ? "var(--color-made)" : "var(--color-miss)",
          }}
          title={result.passed ? "Target met" : "Below target"}
        >
          {/* The letter carries the meaning, so the colour is never alone. */}
          {result.passed ? "P" : "M"}
        </span>
      ))}
    </span>
  );
}
