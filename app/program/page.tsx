import Link from "next/link";
import { Lock, Check } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { Badge, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { groupNameFor, loadProgram } from "@/lib/program";

export const dynamic = "force-dynamic";

/** The ten levels as a path. A locked level can be previewed but not started. */
export default async function ProgramPage() {
  const supabase = await createClient();
  const program = await loadProgram(supabase);

  return (
    <AppShell active="program">
      <h1 className="text-[30px] font-medium tracking-tight text-ink">The program</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Ten levels, each building on the one before. Pass every required drill in a level
        to unlock the next.
      </p>

      <ol className="mt-8 space-y-3">
        {program.levels.map((level) => {
          const standing = program.statuses.get(level.id);
          const status = standing?.status ?? "locked";
          const drills = program.drillsByLevel.get(level.id) ?? [];
          const locked = status === "locked";

          return (
            <li key={level.id}>
              <Link
                href={`/program/${level.level_number}`}
                aria-disabled={undefined}
                className={`block rounded-[14px] border p-5 transition-colors ${
                  locked
                    ? "border-line bg-canvas hover:border-line-strong"
                    : "border-line bg-surface hover:border-accent"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-faint">
                      Level {level.level_number} · {groupNameFor(level, program.groups)}
                    </p>
                    <h2
                      className={`mt-2 text-[18px] font-medium leading-snug ${
                        locked ? "text-muted" : "text-ink"
                      }`}
                    >
                      {level.title}
                    </h2>
                  </div>

                  <StatusBadge status={status} />
                </div>

                {!locked && (
                  <div className="mt-4">
                    <ProgressBar
                      value={standing?.percentage ?? 0}
                      label={`Level ${level.level_number} progress`}
                    />
                  </div>
                )}

                <p className="mt-3 text-[12px] text-faint">
                  {locked
                    ? "Preview only until the level before it is complete"
                    : `${Math.round(standing?.percentage ?? 0)}% · ${drills.length} drill${drills.length === 1 ? "" : "s"}`}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}

/** Status carries an icon and a word, never colour alone. */
function StatusBadge({ status }: { status: "locked" | "current" | "completed" }) {
  if (status === "completed") {
    return (
      <Badge tone="good">
        <Check size={11} weight="bold" className="mr-1" />
        Completed
      </Badge>
    );
  }
  if (status === "current") return <Badge tone="accent">Current</Badge>;
  return (
    <Badge>
      <Lock size={11} className="mr-1" />
      Locked
    </Badge>
  );
}
