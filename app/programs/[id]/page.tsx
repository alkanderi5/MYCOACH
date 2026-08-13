import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { ActivateButton } from "@/components/ActivateButton";
import { DrillCard } from "@/components/DrillCard";
import { Badge, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadProgram } from "@/lib/program";
import { loadPrograms, orderedDrills } from "@/lib/programs";
import { PROGRAM_TYPE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SavedProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [catalogue, programs] = await Promise.all([
    loadProgram(supabase),
    loadPrograms(supabase),
  ]);

  const program = programs.byId.get(id);
  if (!program) notFound();

  const drills = orderedDrills(program, catalogue.drills);
  const minutes = drills.reduce((sum, d) => sum + d.duration_minutes, 0);
  const reasons = new Map(program.drills.map((d) => [d.drill_id, d.selection_reason]));

  return (
    <AppShell active="program">
      <Link
        href="/programs"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted hover:text-accent"
      >
        <ArrowLeft size={12} />
        Programs
      </Link>

      <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-faint">
        {PROGRAM_TYPE_LABEL[program.program_type]} program · {program.ability}
      </p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <h1 className="text-[28px] font-medium leading-tight tracking-tight text-ink">
          {program.name}
        </h1>
        {program.saved?.is_active && <Badge tone="accent">Active</Badge>}
      </div>

      {program.objective && (
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">{program.objective}</p>
      )}
      {program.description && (
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
          {program.description}
        </p>
      )}

      <p className="mt-5 text-[12px] text-faint">
        {drills.length} drills · about {Math.max(1, Math.round(minutes / 60))}h in total
      </p>

      <div className="mt-6">
        <Card>
          <ActivateButton
            trainingProgramId={program.id}
            isActive={Boolean(program.saved?.is_active)}
            label="Make this my active program"
          />
        </Card>
      </div>

      <ul className="mt-8 space-y-3">
        {drills.map((drill, index) => (
          <li key={drill.id}>
            <div className="mb-1.5 flex items-baseline gap-2 text-[11px] text-faint">
              <span className="tabular-nums">{index + 1}</span>
              {reasons.get(drill.id) && (
                <span className="text-accent-ink">{reasons.get(drill.id)}</span>
              )}
            </div>
            <DrillCard drill={drill} progress={catalogue.progress.get(drill.id)} />
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
