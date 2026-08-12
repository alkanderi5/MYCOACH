import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABEL, type Program } from "@/lib/types";
import shell from "@/components/shell.module.css";
import styles from "@/components/browse.module.css";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const supabase = await createClient();

  const [{ data: programs }, { data: items }, { data: enrollments }] =
    await Promise.all([
      supabase
        .from("programs")
        .select("*")
        .order("position")
        .returns<Program[]>(),
      supabase.from("program_items").select("program_id, week, drill_id"),
      supabase.from("program_enrollments").select("program_id"),
    ]);

  const enrolled = new Set(
    (enrollments ?? []).map((row) => row.program_id as string),
  );

  const shape = new Map<string, { weeks: Set<number>; drills: number }>();
  for (const item of items ?? []) {
    const entry = shape.get(item.program_id as string) ?? {
      weeks: new Set<number>(),
      drills: 0,
    };
    entry.weeks.add(item.week as number);
    entry.drills += 1;
    shape.set(item.program_id as string, entry);
  }

  return (
    <AppShell active="programs">
      <p className={shell.kicker}>Training programs</p>
      <h1 className={shell.title}>Follow a path</h1>
      <p className={shell.lede}>
        A program tells you what to practise and in what order. The drill library is there
        when you want to choose for yourself.
      </p>

      {(programs ?? []).length === 0 ? (
        <p className={styles.empty}>No programs have been added yet.</p>
      ) : (
        <div className={styles.drillList}>
          {(programs ?? []).map((program) => {
            const info = shape.get(program.id);
            return (
              <Link
                key={program.id}
                href={`/programs/${program.slug}`}
                className={styles.programCard}
              >
                <span className={styles.drillMetaTop}>
                  <span className={styles.drillLevel}>{LEVEL_LABEL[program.level]}</span>
                  {enrolled.has(program.id) && (
                    <>
                      <span>·</span>
                      <span>Started</span>
                    </>
                  )}
                </span>
                <span className={styles.programName}>{program.name}</span>
                {program.summary && (
                  <span className={styles.programSummary}>{program.summary}</span>
                )}
                <span className={styles.programMeta}>
                  {info ? `${info.weeks.size} weeks · ${info.drills} drills` : "No drills yet"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
