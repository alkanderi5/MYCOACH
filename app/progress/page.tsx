import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { describePerformance, type PracticeSession } from "@/lib/types";
import shell from "@/components/shell.module.css";
import styles from "@/components/progress.module.css";

export const dynamic = "force-dynamic";

type SessionRow = PracticeSession & {
  drills: { name: string; slug: string } | null;
  categories: { name: string } | null;
};

export default async function ProgressPage() {
  const supabase = await createClient();

  // RLS scopes this to the signed-in player.
  const { data } = await supabase
    .from("practice_sessions")
    .select("*, drills(name, slug), categories(name)")
    .order("performed_at", { ascending: false })
    .returns<SessionRow[]>();

  const sessions = data ?? [];

  if (sessions.length === 0) {
    return (
      <AppShell active="progress">
        <p className={shell.kicker}>Progress</p>
        <h1 className={shell.title}>Your practice</h1>
        <p className={styles.empty}>
          Nothing recorded yet. Run a drill, save the result, and your progress will build here
          from your own sessions.
        </p>
      </AppShell>
    );
  }

  // — overall figures, all derived from saved records —
  const totalSeconds = sessions.reduce((sum, s) => sum + s.practice_duration_seconds, 0);
  const scored = sessions.filter((s) => s.result_percentage !== null);
  const overallAverage =
    scored.length > 0
      ? scored.reduce((sum, s) => sum + Number(s.result_percentage), 0) / scored.length
      : null;

  // Oldest-first for trend maths.
  const chronological = [...scored].reverse();
  const recentWindow = chronological.slice(-5);
  const earlierWindow = chronological.slice(0, Math.max(0, chronological.length - 5));
  const recentAverage = average(recentWindow.map((s) => Number(s.result_percentage)));
  const earlierAverage = average(earlierWindow.map((s) => Number(s.result_percentage)));
  const overallTrend =
    recentAverage !== null && earlierAverage !== null ? recentAverage - earlierAverage : null;

  // — per-drill grouping —
  const byDrill = new Map<string, SessionRow[]>();
  for (const session of sessions) {
    const bucket = byDrill.get(session.drill_id);
    if (bucket) bucket.push(session);
    else byDrill.set(session.drill_id, [session]);
  }

  const drillSummaries = [...byDrill.entries()]
    .map(([drillId, rows]) => {
      const ordered = [...rows].reverse(); // oldest → newest
      const percentages = ordered
        .map((s) => (s.result_percentage === null ? null : Number(s.result_percentage)))
        .filter((value): value is number => value !== null);

      return {
        drillId,
        name: rows[0].drills?.name ?? "Drill",
        category: rows[0].categories?.name ?? "",
        sessionCount: rows.length,
        totalSeconds: rows.reduce((sum, s) => sum + s.practice_duration_seconds, 0),
        latest: percentages.at(-1) ?? null,
        first: percentages[0] ?? null,
        best: percentages.length > 0 ? Math.max(...percentages) : null,
        average: average(percentages),
        percentages,
        lastPractised: rows[0].performed_at,
      };
    })
    .sort((a, b) => +new Date(b.lastPractised) - +new Date(a.lastPractised));

  return (
    <AppShell active="progress">
      <p className={shell.kicker}>Progress</p>
      <h1 className={shell.title}>Your practice</h1>

      <div className={styles.summary}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Sessions</p>
          <p className={styles.statValue}>{sessions.length}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Practice time</p>
          <p className={styles.statValue}>{formatDurationShort(totalSeconds)}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Average</p>
          <p className={styles.statValue}>
            {overallAverage === null ? "—" : `${formatPercent(overallAverage)}%`}
          </p>
          <p className={styles.statNote}>across {scored.length} scored sessions</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Recent trend</p>
          <p className={styles.statValue}>
            {overallTrend === null ? "—" : formatDelta(overallTrend)}
          </p>
          <p className={styles.statNote}>
            {overallTrend === null
              ? "needs more sessions"
              : "last 5 vs. everything before"}
          </p>
        </div>
      </div>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Progress by drill</p>
        <div className={styles.rule} aria-hidden="true" />

        <div className={styles.drillList}>
          {drillSummaries.map((drill) => {
            const change =
              drill.latest !== null && drill.first !== null && drill.percentages.length > 1
                ? drill.latest - drill.first
                : null;

            return (
              <article key={drill.drillId} className={styles.drillCard}>
                <div className={styles.drillHead}>
                  <div>
                    <p className={styles.drillName}>{drill.name}</p>
                    <p className={styles.drillCategory}>{drill.category}</p>
                  </div>
                  <p className={styles.drillLatest}>
                    {drill.latest === null ? "—" : `${formatPercent(drill.latest)}%`}
                  </p>
                </div>

                {drill.percentages.length > 1 && <Sparkline values={drill.percentages} />}

                <div className={styles.drillMetrics}>
                  <span className={styles.metric}>
                    Sessions <span className={styles.metricValue}>{drill.sessionCount}</span>
                  </span>
                  <span className={styles.metric}>
                    Best{" "}
                    <span className={styles.metricValue}>
                      {drill.best === null ? "—" : `${formatPercent(drill.best)}%`}
                    </span>
                  </span>
                  <span className={styles.metric}>
                    Average{" "}
                    <span className={styles.metricValue}>
                      {drill.average === null ? "—" : `${formatPercent(drill.average)}%`}
                    </span>
                  </span>
                  <span className={styles.metric}>
                    Time{" "}
                    <span className={styles.metricValue}>
                      {formatDurationShort(drill.totalSeconds)}
                    </span>
                  </span>
                  {change !== null && (
                    <span
                      className={`${styles.metric} ${
                        change === 0 ? styles.trendFlat : styles.trendUp
                      }`}
                    >
                      Since first <span className={styles.metricValue}>{formatDelta(change)}</span>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>History</p>
        <div className={styles.rule} aria-hidden="true" />

        <div className={styles.historyList}>
          {sessions.map((session) => (
            <div key={session.id} className={styles.historyRow}>
              <div className={styles.historyMain}>
                <p className={styles.historyDrill}>{session.drills?.name ?? "Drill"}</p>
                <p className={styles.historyMeta}>
                  {formatDateTime(session.performed_at)} ·{" "}
                  {formatDurationShort(session.practice_duration_seconds)}
                  {describePerformance(session) ? ` · ${describePerformance(session)}` : ""}
                </p>
              </div>
              <span className={styles.historyResult}>
                {session.result_percentage === null
                  ? "—"
                  : `${formatPercent(Number(session.result_percentage))}%`}
              </span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

/** Plain SVG polyline over the drill's saved percentages, oldest to newest. */
function Sparkline({ values }: { values: number[] }) {
  const width = 100;
  const height = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    // Flat series sit mid-height rather than pinned to the floor.
    const y = max === min ? height / 2 : height - ((value - min) / span) * height;
    return { x, y };
  });

  const last = points.at(-1)!;

  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Results over time: ${values.map((v) => `${formatPercent(v)}%`).join(", ")}`}
    >
      <polyline
        className={styles.sparkLine}
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
      />
      <circle className={styles.sparkDot} cx={last.x} cy={last.y} r={2} />
    </svg>
  );
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDelta(value: number) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  if (rounded === 0) return "±0";
  return `${rounded > 0 ? "+" : "−"}${formatPercent(Math.abs(rounded))}`;
}

function formatDurationShort(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
