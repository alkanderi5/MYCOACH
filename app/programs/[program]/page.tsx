import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { DrillCardLink } from "@/components/DrillCardLink";
import { EnrollButton } from "@/components/EnrollButton";
import { createClient } from "@/lib/supabase/server";
import { fetchDrillCards, fetchFavouriteIds, fetchPlayerStats } from "@/lib/drills";
import { LEVEL_LABEL, type Program } from "@/lib/types";
import shell from "@/components/shell.module.css";
import styles from "@/components/browse.module.css";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ program: string }>;
}) {
  const { program: slug } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<Program>();

  if (!program) notFound();

  const [{ data: items }, allDrills, favouriteIds, stats, { data: enrollment }] =
    await Promise.all([
      supabase
        .from("program_items")
        .select("id, drill_id, week, position, focus")
        .eq("program_id", program.id)
        .order("week")
        .order("position"),
      fetchDrillCards(supabase),
      fetchFavouriteIds(supabase),
      fetchPlayerStats(supabase),
      supabase
        .from("program_enrollments")
        .select("program_id")
        .eq("program_id", program.id)
        .maybeSingle(),
    ]);

  const byId = new Map(allDrills.map((drill) => [drill.id, drill]));

  // Group into weeks. Items reference shared drill rows — the same drill can
  // appear in more than one week without being copied.
  const weeks = new Map<number, { focus: string | null; drillIds: string[] }>();
  for (const item of items ?? []) {
    const week = item.week as number;
    const entry = weeks.get(week) ?? { focus: item.focus as string | null, drillIds: [] };
    entry.drillIds.push(item.drill_id as string);
    if (!entry.focus) entry.focus = item.focus as string | null;
    weeks.set(week, entry);
  }

  const totalItems = (items ?? []).length;
  const doneItems = (items ?? []).filter((item) =>
    stats.practisedIds.has(item.drill_id as string),
  ).length;

  return (
    <AppShell active="programs">
      <Link href="/programs" className={shell.backLink}>
        <ArrowLeft size={12} />
        Programs
      </Link>

      <p className={shell.kicker}>{LEVEL_LABEL[program.level]} program</p>
      <h1 className={shell.title}>{program.name}</h1>
      {program.summary && <p className={shell.lede}>{program.summary}</p>}

      <p className={styles.resultCount}>
        {doneItems} of {totalItems} drills recorded
      </p>

      <div className={styles.chipRow}>
        <EnrollButton programId={program.id} initiallyEnrolled={Boolean(enrollment)} />
      </div>

      {[...weeks.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([week, entry]) => (
          <section key={week}>
            <div className={styles.weekHead}>
              <span className={styles.weekNumber}>Week {week}</span>
              {entry.focus && <span className={styles.weekFocus}>{entry.focus}</span>}
            </div>

            <div className={styles.drillList}>
              {entry.drillIds.map((drillId) => {
                const drill = byId.get(drillId);
                if (!drill) return null;
                return (
                  <DrillCardLink
                    key={`${week}-${drillId}`}
                    drill={drill}
                    saved={favouriteIds.has(drill.id)}
                    averagePercent={stats.averageByDrill.get(drill.id)}
                    sessionCount={stats.countByDrill.get(drill.id)}
                  />
                );
              })}
            </div>

            {entry.drillIds.every((id) => stats.practisedIds.has(id)) && (
              <p className={styles.sectionNote}>
                <Check size={12} /> Every drill this week has a recorded session.
              </p>
            )}
          </section>
        ))}
    </AppShell>
  );
}
