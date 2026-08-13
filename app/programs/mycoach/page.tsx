import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { ActivateButton } from "@/components/ActivateButton";
import { Badge, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadProgram } from "@/lib/program";
import { loadPrograms, orderedDrills } from "@/lib/programs";

export const dynamic = "force-dynamic";

export default async function OfficialProgramsPage() {
  const supabase = await createClient();
  const [catalogue, programs] = await Promise.all([
    loadProgram(supabase),
    loadPrograms(supabase),
  ]);

  return (
    <AppShell active="program">
      <Link
        href="/programs"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted hover:text-accent"
      >
        <ArrowLeft size={12} />
        Programs
      </Link>

      <h1 className="mt-6 text-[28px] font-medium tracking-tight text-ink">
        Cuemaster programs
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Complete paths put together for each ability. Pick one and it becomes your active
        program.
      </p>

      <ul className="mt-8 space-y-4">
        {programs.official.map((program) => {
          const drills = orderedDrills(program, catalogue.drills);
          const minutes = drills.reduce((sum, d) => sum + d.duration_minutes, 0);

          return (
            <li key={program.id}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-faint">
                      {program.ability}
                    </p>
                    <h2 className="mt-2 text-[19px] font-medium text-ink">{program.name}</h2>
                  </div>
                  {program.saved?.is_active && <Badge tone="accent">Active</Badge>}
                </div>

                {program.description && (
                  <p className="mt-3 text-[13px] leading-relaxed text-muted">
                    {program.description}
                  </p>
                )}
                {program.objective && (
                  <p className="mt-3 text-[13px] leading-relaxed text-accent-ink">
                    {program.objective}
                  </p>
                )}

                <p className="mt-4 text-[12px] text-faint">
                  {drills.length} drills · about {Math.round(minutes / 60)}h of practice in total
                </p>

                <ul className="mt-4 space-y-1.5">
                  {drills.slice(0, 4).map((drill) => (
                    <li key={drill.id} className="text-[13px] text-muted">
                      {drill.name}
                    </li>
                  ))}
                  {drills.length > 4 && (
                    <li className="text-[12px] text-faint">
                      and {drills.length - 4} more
                    </li>
                  )}
                </ul>

                <div className="mt-6">
                  <ActivateButton
                    trainingProgramId={program.id}
                    isActive={Boolean(program.saved?.is_active)}
                  />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
