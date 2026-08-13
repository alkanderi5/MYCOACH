import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { Badge, ButtonLink, Card, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { groupNameFor, loadActiveSession, loadAttempts, loadProgram } from "@/lib/program";
import { loadPrograms, orderedDrills } from "@/lib/programs";
import { PROGRAM_TYPE_LABEL } from "@/lib/types";
import { currentLevel } from "@/lib/progression/level";
import { recommendNext } from "@/lib/progression/recommendation";

export const dynamic = "force-dynamic";

/** Home is a decision screen: what to practise now, and one button to start. */
export default async function HomePage() {
  const supabase = await createClient();
  const [program, programs] = await Promise.all([
    loadProgram(supabase),
    loadPrograms(supabase),
  ]);

  const level = currentLevel(program.levels, program.statuses);
  const levelDrills = level ? (program.drillsByLevel.get(level.id) ?? []) : [];
  const standing = level ? program.statuses.get(level.id) : undefined;

  // The active program decides what to practise next. Without one, the current
  // level stands in, so a player who skipped the choice is never stuck.
  const activeProgram = programs.active;
  const programDrills = orderedDrills(activeProgram, program.drills);
  const sourceDrills = programDrills.length > 0 ? programDrills : levelDrills;

  const [attemptsByDrill, activeSession] = await Promise.all([
    loadAttempts(supabase, sourceDrills.map((d) => d.id)),
    loadActiveSession(supabase),
  ]);

  const recommendation = recommendNext({
    drills: sourceDrills,
    progress: program.progress,
    attemptsByDrill,
    activeSession,
  });

  const lastAttempt = [...attemptsByDrill.values()]
    .flat()
    .sort((a, b) => +new Date(b.completed_at) - +new Date(a.completed_at))[0];
  const lastDrill = lastAttempt
    ? program.drills.find((d) => d.id === lastAttempt.drill_id)
    : undefined;

  const name = program.profile?.display_name?.trim() || program.profile?.email.split("@")[0];

  return (
    <AppShell active="home">
      <p className="text-sm text-muted">Hello{name ? `, ${name}` : ""}</p>

      {level ? (
        <>
          <div className="mt-5 flex items-baseline justify-between gap-4">
            <h1 className="text-[30px] font-medium tracking-tight text-ink">
              Level {level.level_number}
            </h1>
            <Badge tone="accent">{groupNameFor(level, program.groups)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">{level.title}</p>

          {activeProgram ? (
            <p className="mt-4 text-[12px] text-faint">
              Following{" "}
              <Link href="/programs" className="text-accent-ink hover:text-accent">
                {activeProgram.name}
              </Link>{" "}
              · {PROGRAM_TYPE_LABEL[activeProgram.program_type]}
            </p>
          ) : (
            <p className="mt-4 text-[12px] text-faint">
              No active program ·{" "}
              <Link href="/programs" className="text-accent-ink hover:text-accent">
                choose one
              </Link>
            </p>
          )}

          <div className="mt-5">
            <ProgressBar
              value={standing?.percentage ?? 0}
              label={`Level ${level.level_number} progress`}
            />
            <p className="mt-2 text-[12px] text-faint">
              {Math.round(standing?.percentage ?? 0)}% of this level complete
            </p>
          </div>

          <section className="mt-10">
            <SectionTitle>Practise next</SectionTitle>

            {recommendation.drill ? (
              <Card className="mt-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-accent-ink">
                  {recommendation.reason}
                </p>
                <h2 className="mt-3 text-[21px] font-medium leading-snug text-ink">
                  {recommendation.drill.name}
                </h2>
                {recommendation.drill.short_objective && (
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    {recommendation.drill.short_objective}
                  </p>
                )}
                <p className="mt-4 text-[12px] text-faint">
                  {categoryName(program.categories, recommendation.drill.category_id)} ·{" "}
                  about {recommendation.drill.duration_minutes} min
                </p>

                <ButtonLink
                  href={`/drill/${recommendation.drill.id}`}
                  size="lg"
                  className="mt-6 w-full"
                >
                  Continue Practice
                  <ArrowRight size={17} />
                </ButtonLink>
              </Card>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Every required drill at this level is passed"
                  action={
                    <ButtonLink href="/program" variant="outline">
                      Open the program
                    </ButtonLink>
                  }
                >
                  Open the program to move on to the next level.
                </EmptyState>
              </div>
            )}
          </section>

          <section className="mt-10">
            <SectionTitle>Last session</SectionTitle>
            {lastAttempt && lastDrill ? (
              <Card className="mt-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-[15px] text-ink">{lastDrill.name}</p>
                  <p className="mt-1 text-[12px] text-faint">
                    {formatDate(lastAttempt.completed_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-medium text-accent-ink">
                    {lastAttempt.normalized_score === null
                      ? "—"
                      : `${Math.round(lastAttempt.normalized_score)}%`}
                  </p>
                  <p className="text-[11px] text-faint">
                    {lastAttempt.passed ? "Target met" : "Below target"}
                  </p>
                </div>
              </Card>
            ) : (
              <p className="mt-4 text-[13px] text-muted">
                Nothing recorded yet. Your first result will show here.
              </p>
            )}
          </section>

          <p className="mt-10 text-center">
            <Link href="/programs" className="text-[13px] text-muted hover:text-accent">
              Explore programs and levels
            </Link>
          </p>
        </>
      ) : (
        <div className="mt-8">
          <EmptyState title="The program is not ready yet">
            No published levels were found. Add levels and drills in Supabase to begin.
          </EmptyState>
        </div>
      )}
    </AppShell>
  );
}

function categoryName(categories: { id: string; name: string }[], id: string) {
  return categories.find((c) => c.id === id)?.name ?? "";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
