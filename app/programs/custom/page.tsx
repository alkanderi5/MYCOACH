import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { CustomProgramBuilder } from "@/components/CustomProgramBuilder";
import { createClient } from "@/lib/supabase/server";
import { loadProgram } from "@/lib/program";
import type { Ability } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CustomProgramPage() {
  const supabase = await createClient();
  const program = await loadProgram(supabase);

  const levelById = new Map(program.levels.map((l) => [l.id, l.level_number]));
  const categoryById = new Map(program.categories.map((c) => [c.id, c.name]));

  // The whole published library, whatever the player's ability: the onboarding
  // answer sets the default filter, it does not fence anything off.
  const library = program.drills.map((drill) => ({
    ...drill,
    categoryName: categoryById.get(drill.category_id) ?? "",
    levelNumber: levelById.get(drill.level_id) ?? 0,
  }));

  const defaultAbility: Ability = program.profile?.selected_ability ?? "beginner";

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
        Build your own
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Pick drills from the whole library, put them in the order you want, and save it.
        Repeat it as often as you like — every run records its own results.
      </p>

      <div className="mt-8">
        <CustomProgramBuilder
          drills={library}
          categories={program.categories}
          defaultAbility={defaultAbility}
        />
      </div>
    </AppShell>
  );
}
