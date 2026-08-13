import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { DrillExperience } from "@/components/DrillExperience";
import { TableDiagram } from "@/components/TableDiagram";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadProgram } from "@/lib/program";
import type { DrillAttempt } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DrillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const program = await loadProgram(supabase);

  const drill = program.drills.find((d) => d.id === id);
  if (!drill) notFound();

  const level = program.levels.find((l) => l.id === drill.level_id);
  const category = program.categories.find((c) => c.id === drill.category_id);
  const locked = level ? program.statuses.get(level.id)?.status === "locked" : false;

  const { data: attempts } = await supabase
    .from("drill_attempts")
    .select("id, drill_id, practice_session_id, template_type, raw_result, normalized_score, passed, player_note, completed_at")
    .eq("drill_id", drill.id)
    .order("completed_at", { ascending: false })
    .limit(5)
    .returns<DrillAttempt[]>();

  const history = attempts ?? [];
  const progress = program.progress.get(drill.id);

  return (
    <AppShell active="program">
      {level && (
        <Link
          href={`/program/${level.level_number}/${category?.slug ?? ""}`}
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted hover:text-accent"
        >
          <ArrowLeft size={12} />
          {category?.name ?? "Back"}
        </Link>
      )}

      <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-faint">
        Level {level?.level_number} · {category?.name}
      </p>
      <h1 className="mt-2 text-[28px] font-medium leading-tight tracking-tight text-ink">
        {drill.name}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={progress?.status === "passed" ? "good" : "neutral"}>
          {progress?.status === "passed"
            ? "Passed"
            : progress?.status === "in_progress"
              ? "In progress"
              : "Not started"}
        </Badge>
        <Badge>{drill.is_required ? "Required" : "Optional"}</Badge>
        <Badge>{drill.duration_minutes} min</Badge>
      </div>

      {/* media: owner artwork wins, otherwise the generated diagram */}
      <section className="mt-8">
        {drill.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={drill.image_url}
            alt={`Table setup for ${drill.name}`}
            className="w-full rounded-[14px] border border-line"
          />
        ) : drill.setup?.balls?.length ? (
          <TableDiagram setup={drill.setup} title={drill.name} />
        ) : (
          <div className="grid aspect-[16/10] place-items-center rounded-[14px] border border-dashed border-line-strong p-6 text-center text-[12px] text-faint">
            No table setup has been added for this drill yet.
          </div>
        )}
      </section>

      {drill.optional_video_url ? (
        <section className="mt-8">
          <SectionTitle>Watch it played</SectionTitle>
          <iframe
            src={drill.optional_video_url}
            title={`Instructional video for ${drill.name}`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="mt-4 aspect-video w-full rounded-[14px] border border-line"
          />
        </section>
      ) : null}

      <Prose title="What this teaches" body={drill.learning_outcome} />
      <Prose title="How to set it up" body={drill.setup_instructions} />
      <Prose title="How to perform it" body={drill.execution_instructions} />
      <Prose title="What counts as a pass" body={drill.success_condition_text} />

      <section className="mt-10">
        {locked ? (
          <Card>
            <p className="text-[13px] leading-relaxed text-muted">
              This level is locked. Finish the levels before it to practise this drill.
            </p>
          </Card>
        ) : (
          <DrillExperience
            drill={drill}
            previousBest={progress?.best_normalized_score ?? null}
            lastScore={history[0]?.normalized_score ?? null}
          />
        )}
      </section>

      {history.length > 0 && (
        <section className="mt-10">
          <SectionTitle>Recent attempts</SectionTitle>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {history.map((attempt) => (
              <li key={attempt.id} className="flex items-baseline justify-between gap-4 py-3">
                <span className="text-[13px] text-muted">
                  {new Date(attempt.completed_at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-[12px] text-faint">
                  {attempt.passed ? "Target met" : "Below target"}
                </span>
                <span className="tabular-nums text-[15px] text-accent-ink">
                  {attempt.normalized_score === null
                    ? "—"
                    : `${Math.round(attempt.normalized_score)}%`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}

function Prose({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <section className="mt-9">
      <SectionTitle>{title}</SectionTitle>
      <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-muted">{body}</p>
    </section>
  );
}
