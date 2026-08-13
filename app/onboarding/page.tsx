import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { createClient } from "@/lib/supabase/server";
import type { Ability } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("selected_ability, onboarded_at")
    .maybeSingle<{ selected_ability: Ability | null; onboarded_at: string | null }>();

  // Already answered — no reason to ask again.
  if (profile?.onboarded_at) redirect("/home");

  return <OnboardingFlow />;
}
