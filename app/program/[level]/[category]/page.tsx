import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { DrillCard } from "@/components/DrillCard";
import { createClient } from "@/lib/supabase/server";
import { loadProgram } from "@/lib/program";

export const dynamic = "force-dynamic";

export default async function CategoryDrillsPage({
  params,
}: {
  params: Promise<{ level: string; category: string }>;
}) {
  const { level: levelParam, category: categorySlug } = await params;
  const levelNumber = Number(levelParam);

  const supabase = await createClient();
  const program = await loadProgram(supabase);

  const level = program.levels.find((l) => l.level_number === levelNumber);
  const category = program.categories.find((c) => c.slug === categorySlug);
  if (!level || !category) notFound();

  const locked = program.statuses.get(level.id)?.status === "locked";
  const drills = (program.drillsByLevel.get(level.id) ?? [])
    .filter((d) => d.category_id === category.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <AppShell active="program">
      <Link
        href={`/program/${level.level_number}`}
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted hover:text-accent"
      >
        <ArrowLeft size={12} />
        Level {level.level_number}
      </Link>

      <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-faint">
        Level {level.level_number} · {level.title}
      </p>
      <h1 className="mt-2 text-[28px] font-medium tracking-tight text-ink">{category.name}</h1>

      <ul className="mt-8 space-y-3">
        {drills.map((drill) => (
          <li key={drill.id}>
            <DrillCard
              drill={drill}
              progress={program.progress.get(drill.id)}
              locked={locked}
            />
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
