import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";
import { ResultPills } from "@/components/ResultPills";
import { createClient } from "@/lib/supabase/server";
import { groupNameFor, loadAttempts, loadProgram } from "@/lib/program";
import { currentLevel } from "@/lib/progression/level";
import { categoryStanding, trendFor } from "@/lib/progression/trend";
import type { DrillAttempt } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const supabase = await createClient();
  const program = await loadProgram(supabase);

  const attemptsByDrill = await loadAttempts(
    supabase,
    program.drills.map((d) => d.id),
  );
  const allAttempts = [...attemptsByDrill.values()]
    .flat()
    .sort((a, b) => +new Date(b.completed_at) - +new Date(a.completed_at));

  const level = currentLevel(program.levels, program.statuses);
  const levelStanding = level ? program.statuses.get(level.id) : undefined;


  // Overall program progress: passed required drills across every level.
  const requiredDrills = program.drills.filter((d) => d.is_required);
  const passedRequired = requiredDrills.filter(
    (d) => program.progress.get(d.id)?.status === "passed",
  ).length;
  const overall = requiredDrills.length
    ? (passedRequired / requiredDrills.length) * 100
    : 0;

  if (allAttempts.length === 0) {
    return (
      <AppShell active="progress">
        <h1 className="text-[30px] font-medium tracking-tight text-ink">Progress</h1>
        <div className="mt-8">
          <EmptyState title="Nothing recorded yet">
            Run a drill and save the result. Your levels, trends and history all build from
            your own sessions.
          </EmptyState>
        </div>
      </AppShell>
    );
  }

  // Category standing, from attempts on drills in that category.
  const categoryRows = program.categories
    .map((category) => {
      const drills = program.drills.filter((d) => d.category_id === category.id);
      const attempts = drills.flatMap((d) => attemptsByDrill.get(d.id) ?? []);
      if (attempts.length === 0) return null;

      const sorted = [...attempts].sort(
        (a, b) => +new Date(b.completed_at) - +new Date(a.completed_at),
      );
      const trend = trendFor(sorted);
      const passed = drills.filter(
        (d) => program.progress.get(d.id)?.status === "passed",
      ).length;

      return {
        category,
        passed,
        total: drills.length,
        trend,
        recent: sorted.slice(0, 5),
        standing: categoryStanding(trend, trend.recentAverage),
      };
    })
    .filter(Boolean) as {
    category: { id: string; name: string };
    passed: number;
    total: number;
    trend: ReturnType<typeof trendFor>;
    recent: { passed: boolean }[];
    standing: { label: string };
  }[];

  return (
    <AppShell active="progress">
      <h1 className="text-[30px] font-medium tracking-tight text-ink">Progress</h1>

      {level && (
        <Card className="mt-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-faint">
                Level {level.level_number} · {groupNameFor(level, program.groups)}
              </p>
              <p className="mt-1.5 text-[17px] text-ink">{level.title}</p>
            </div>
            <p className="text-[22px] font-medium tabular-nums text-accent-ink">
              {Math.round(levelStanding?.percentage ?? 0)}%
            </p>
          </div>
          <div className="mt-4">
            <ProgressBar value={levelStanding?.percentage ?? 0} label="Current level" />
          </div>
        </Card>
      )}

      <section className="mt-8">
        <SectionTitle>Whole program</SectionTitle>
        <div className="mt-4">
          <ProgressBar value={overall} label="Overall program progress" />
          <p className="mt-2 text-[12px] text-faint">
            {passedRequired} of {requiredDrills.length} required drills passed
          </p>
        </div>
      </section>

      {categoryRows.length > 0 && (
        <section className="mt-10">
          <SectionTitle>By category</SectionTitle>
          <ul className="mt-4 space-y-3">
            {categoryRows.map((row) => (
              <li key={row.category.id}>
                <Card>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[16px] font-medium text-ink">{row.category.name}</p>
                      <p className="mt-1 text-[12px] text-faint">
                        {row.passed} of {row.total} drills passed
                        {row.trend.recentAverage !== null &&
                          ` · recent average ${Math.round(row.trend.recentAverage)}%`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        tone={
                          row.standing.label === "Strong"
                            ? "good"
                            : row.standing.label === "Weak"
                              ? "bad"
                              : "neutral"
                        }
                      >
                        {row.standing.label}
                      </Badge>
                      <ResultPills results={row.recent} />
                    </div>
                  </div>
                  {row.trend.change !== null && (
                    <p className="mt-3 text-[12px] text-muted">
                      {row.trend.direction === "improving"
                        ? "Improving"
                        : row.trend.direction === "declining"
                          ? "Declining"
                          : "Stable"}{" "}
                      · {row.trend.change > 0 ? "+" : ""}
                      {row.trend.change} points against your previous attempts
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <SectionTitle>Practice history</SectionTitle>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {allAttempts.slice(0, 30).map((attempt) => (
            <HistoryRow
              key={attempt.id}
              attempt={attempt}
              name={program.drills.find((d) => d.id === attempt.drill_id)?.name ?? "Drill"}
              previous={previousScore(attemptsByDrill, attempt)}
            />
          ))}
        </ul>
      </section>
    </AppShell>
  );
}

function HistoryRow({
  attempt,
  name,
  previous,
}: {
  attempt: DrillAttempt;
  name: string;
  previous: number | null;
}) {
  const score = attempt.normalized_score;
  const change = score !== null && previous !== null ? Math.round(score - previous) : null;

  return (
    <li className="py-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <Link href={`/drill/${attempt.drill_id}`} className="min-w-0 flex-1 hover:text-accent">
          <span className="block truncate text-[14px] text-ink">{name}</span>
        </Link>
        <span className="tabular-nums text-[15px] text-accent-ink">
          {score === null ? "—" : `${Math.round(score)}%`}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-faint">
        {new Date(attempt.completed_at).toLocaleString(undefined, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {change !== null && ` · ${change > 0 ? "+" : change < 0 ? "−" : "±"}${Math.abs(change)}`}
        {attempt.passed && " · target met"}
      </p>
    </li>
  );
}

/** The score before this one on the same drill, for the change figure. */
function previousScore(
  byDrill: Map<string, DrillAttempt[]>,
  attempt: DrillAttempt,
): number | null {
  const list = byDrill.get(attempt.drill_id) ?? [];
  const index = list.findIndex((a) => a.id === attempt.id);
  if (index === -1) return null;
  const earlier = list
    .slice(index + 1)
    .find((a) => a.normalized_score !== null && a.template_type === attempt.template_type);
  return earlier?.normalized_score ?? null;
}
