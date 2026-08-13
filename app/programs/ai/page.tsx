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
        Three short questions. The drills come from your library — the AI chooses among
        them and explains each pick, and you review the result before it is saved.
      </p>

      <div className="mt-8">
        {configured ? (
          <AiProgramBuilder defaultAbility={profile?.selected_ability ?? "beginner"} />
        ) : (
          <Card>
            <p className="text-[15px] text-ink">The AI builder is not configured yet</p>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Add an <code className="text-accent-ink">OPENROUTER_API_KEY</code> to{" "}
              <code className="text-accent-ink">.env.local</code> and restart the server.
              Until then, the MYCOACH programs and the custom builder both work normally.
            </p>
            <Link
              href="/programs/custom"
              className="mt-5 inline-block text-[13px] text-accent-ink hover:text-accent"
            >
              Build one yourself instead
            </Link>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
