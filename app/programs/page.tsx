import Link from "next/link";
import { ArrowRight, Check, Lock, Path, Robot, Sliders } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { Badge, ProgressBar, SectionTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { groupNameFor, loadProgram } from "@/lib/program";
import { loadPrograms } from "@/lib/programs";
import { PROGRAM_TYPE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROUTES = [
  {
    href: "/programs/mycoach",
    Icon: Path,
    title: "Choose a Cuemaster program",
    body: "Ready-made paths for beginner, intermediate and advanced.",
  },
  {
    href: "/programs/ai",
    Icon: Robot,
    title: "Create with AI",
    body: "Three short questions, then a program picked from the drill library.",
  },
  {
    href: "/programs/custom",
    Icon: Sliders,
    title: "Build my own program",
    body: "Choose drills from the whole library and set their order.",
  },
];

export default async function ProgramsPage() {
  const supabase = await createClient();
  const [program, programs] = await Promise.all([
    loadProgram(supabase),
    loadPrograms(supabase),
  ]);

  const saved = programs.mine;

  return (
    <AppShell active="program">
      <h1 className="text-[30px] font-medium tracking-tight text-ink">Programs</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        A program decides what you practise and in what order. Keep as many as you like;
        one is active at a time.
      </p>

      <div className="mt-7 space-y-3">
        {ROUTES.map(({ href, Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-accent"
          >
            <Icon size={22} className="mt-0.5 shrink-0 text-accent" />
            <span className="min-w-0">
              <span className="block text-[16px] font-medium text-ink">{title}</span>
              <span className="mt-1.5 block text-[13px] leading-relaxed text-muted">{body}</span>
            </span>
            <ArrowRight size={16} className="ml-auto mt-1 shrink-0 text-faint" />
          </Link>
        ))}
      </div>

      <section className="mt-11">
        <SectionTitle>My programs</SectionTitle>
        {saved.length === 0 ? (
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            Nothing saved yet. Choose one above and it will appear here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {saved.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/programs/${entry.id}`}
                  className="block rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-accent"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-faint">
                        {PROGRAM_TYPE_LABEL[entry.program_type]} · {entry.ability}
                      </p>
                      <p className="mt-2 text-[17px] font-medium text-ink">{entry.name}</p>
                    </div>
                    {entry.saved?.is_active && <Badge tone="accent">Active</Badge>}
                  </div>
                  <p className="mt-3 text-[12px] text-faint">
                    {entry.drills.length} drill{entry.drills.length === 1 ? "" : "s"}
                    {entry.saved?.last_practiced_at
                      ? ` · last practised ${formatDate(entry.saved.last_practiced_at)}`
                      : " · not practised yet"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-11">
        <SectionTitle>Level path</SectionTitle>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Ten levels that unlock as you pass their required drills, whichever program you
          are following.
        </p>

        <ol className="mt-5 space-y-3">
          {program.levels.map((level) => {
            const standing = program.statuses.get(level.id);
            const status = standing?.status ?? "locked";
            const locked = status === "locked";

            return (
              <li key={level.id}>
                <Link
                  href={`/program/${level.level_number}`}
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
                      <h3
                        className={`mt-2 text-[17px] font-medium leading-snug ${
                          locked ? "text-muted" : "text-ink"
                        }`}
                      >
                        {level.title}
                      </h3>
                    </div>
                    {status === "completed" ? (
                      <Badge tone="good">
                        <Check size={11} weight="bold" className="mr-1" />
                        Completed
                      </Badge>
                    ) : status === "current" ? (
                      <Badge tone="accent">Current</Badge>
                    ) : (
                      <Badge>
                        <Lock size={11} className="mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>

                  {!locked && (
                    <div className="mt-4">
                      <ProgressBar
                        value={standing?.percentage ?? 0}
                        label={`Level ${level.level_number} progress`}
                      />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </AppShell>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
