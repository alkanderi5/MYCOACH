import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { AiProgramBuilder } from "@/components/AiProgramBuilder";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Ability } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AiProgramPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("selected_ability")
    .maybeSingle<{ selected_ability: Ability | null }>();

  const configured = Boolean(process.env.OPENROUTER_API_KEY);

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
        Create with AI
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Three short questions, then a program built from your own drill library. Every
        pick is explained, and you review the whole thing before it is saved.
      </p>

      {!configured && (
        <Card className="mt-6 border-dashed">
          <p className="text-[13px] font-medium text-ink">Demo mode</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            No model is connected yet, so the program below is put together by a simple
            rule: drills at your ability, favouring the skills you pick. It is a real
            program from your real library and works exactly like any other — only the
            choosing is not yet done by AI.
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            Add <code className="text-accent-ink">OPENROUTER_API_KEY</code> to{" "}
            <code className="text-accent-ink">.env.local</code> and restart to switch it on.
          </p>
        </Card>
      )}

      <div className="mt-8">
        <AiProgramBuilder defaultAbility={profile?.selected_ability ?? "beginner"} />
      </div>
    </AppShell>
  );
}
