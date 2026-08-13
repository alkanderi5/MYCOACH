import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, EmptyState, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { groupNameFor, loadProgram } from "@/lib/program";

export const dynamic = "force-dynamic";

export default async function LevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level: levelParam } = await params;
  const levelNumber = Number(levelParam);
  if (!Number.isInteger(levelNumber)) notFound();

  const supabase = await createClient();
  const program = await loadProgram(supabase);

  const level = program.levels.find((l) => l.level_number === levelNumber);
  if (!level) notFound();

  const standing = program.statuses.get(level.id);
  const locked = standing?.status === "locked";
  const drills = program.drillsByLevel.get(level.id) ?? [];

  // Categories exist at a level only where a drill actually lives.
  const categories = program.categories
    .filter((category) => drills.some((d) => d.category_id === category.id))
    .map((category) => {
      const inCategory = drills.filter((d) => d.category_id === category.id);
      const done = inCategory.filter(
        (d) => program.progress.get(d.id)?.status === "passed",
      ).length;
      return { category, total: inCategory.length, done };
    });

  return (
    <AppShell active="program">
      <Link
        href="/program"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted hover:text-accent"
      >
        <ArrowLeft size={12} />
        Program
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-faint">
            Level {level.level_number} · {groupNameFor(level, program.groups)}
          </p>
          <h1 className="mt-2 text-[28px] font-medium leading-tight tracking-tight text-ink">
            {level.title}
          </h1>
        </div>
        {locked && (
          <Badge>
            <Lock size={11} className="mr-1" />
            Locked
          </Badge>
        )}
      </div>

      {level.objective && (
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">{level.objective}</p>
      )}

      {!locked && (
        <div className="mt-6">
          <ProgressBar value={standing?.percentage ?? 0} label="Level progress" />
          <p className="mt-2 text-[12px] text-faint">
            {Math.round(standing?.percentage ?? 0)}% complete
          </p>
        </div>
      )}

      {locked ? (
        <div className="mt-8">
          <EmptyState title="This level is a preview">
            Finish every required drill in the levels before it and this one unlocks. You can
            see what it covers, but not start its drills yet.
          </EmptyState>
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          Categories at this level
        </h2>

        {categories.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted">No drills have been added yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {categories.map(({ category, total, done }) => {
              const body = (
                <>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-[16px] font-medium text-ink">{category.name}</h3>
                    <span className="shrink-0 text-[12px] text-faint">
                      {done} of {total} passed
                    </span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar
                      value={total ? (done / total) * 100 : 0}
                      label={`${category.name} progress`}
                    />
                  </div>
                </>
              );

              return (
                <li key={category.id}>
                  {locked ? (
                    <Card className="opacity-60">{body}</Card>
                  ) : (
                    <Link
                      href={`/program/${level.level_number}/${category.slug}`}
                      className="block rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-accent"
                    >
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
