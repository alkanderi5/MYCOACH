"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Path, Robot, Sliders } from "@phosphor-icons/react";
import { Button, Card, ErrorNote, cx } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { ABILITIES, type Ability } from "@/lib/types";

const ABILITY_COPY: Record<Ability, { title: string; body: string }> = {
  beginner: {
    title: "Beginner",
    body: "New to the table, or still working on a repeatable stroke.",
  },
  intermediate: {
    title: "Intermediate",
    body: "You pot reliably and want position, safety and consistency.",
  },
  advanced: {
    title: "Advanced",
    body: "You want precision, harder situations and match sharpness.",
  },
};

const ROUTES = [
  {
    href: "/programs?tab=mycoach",
    Icon: Path,
    title: "A MYCOACH program",
    body: "A ready-made path put together for your level. The simplest way to start.",
  },
  {
    href: "/programs/ai",
    Icon: Robot,
    title: "Build one with AI",
    body: "Answer three short questions and get a program chosen from the drill library.",
  },
  {
    href: "/programs/custom",
    Icon: Sliders,
    title: "Build my own",
    body: "Pick drills from the whole library and put them in the order you want.",
  },
];

/**
 * Two short steps: what standard are you at, and how do you want to start.
 *
 * The ability is a starting point for recommendations, not a restriction —
 * every level and drill stays browsable whatever is chosen here.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const [ability, setAbility] = useState<Ability | null>(null);
  const [step, setStep] = useState<"ability" | "route">("ability");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveAbility(next: Ability) {
    setAbility(next);
    setSaving(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("Your session expired. Sign in again.");
      return;
    }

    const { error: writeError } = await supabase
      .from("profiles")
      .update({ selected_ability: next, onboarded_at: new Date().toISOString() })
      .eq("id", user.id);

    setSaving(false);

    if (writeError) {
      setError(`That did not save: ${writeError.message}`);
      return;
    }

    setStep("route");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-ink">
        MYCOACH
      </span>

      {step === "ability" ? (
        <>
          <h1 className="mt-8 text-[30px] font-medium leading-tight tracking-tight text-ink">
            Where are you now?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            This sets where your program starts. You can change it later, and nothing is
            hidden from you either way.
          </p>

          <div className="mt-8 space-y-3">
            {ABILITIES.map((option) => (
              <button
                key={option}
                type="button"
                disabled={saving}
                onClick={() => saveAbility(option)}
                aria-pressed={ability === option}
                className={cx(
                  "block w-full rounded-[14px] border p-5 text-left transition-colors",
                  ability === option
                    ? "border-accent bg-accent/10"
                    : "border-line bg-surface hover:border-accent",
                )}
              >
                <span className="block text-[17px] font-medium text-ink">
                  {ABILITY_COPY[option].title}
                </span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-muted">
                  {ABILITY_COPY[option].body}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-6">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
        </>
      ) : (
        <>
          <h1 className="mt-8 text-[30px] font-medium leading-tight tracking-tight text-ink">
            How do you want to start?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Three ways in. You can switch or save more programs at any time.
          </p>

          <div className="mt-8 space-y-3">
            {ROUTES.map(({ href, Icon, title, body }) => (
              <Card
                key={href}
                className="cursor-pointer transition-colors hover:border-accent"
                onClick={() => router.push(href)}
              >
                <div className="flex items-start gap-4">
                  <Icon size={22} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <p className="text-[16px] font-medium text-ink">{title}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto mt-1 shrink-0 text-faint" />
                </div>
              </Card>
            ))}
          </div>

          <Button
            variant="quiet"
            className="mt-8 w-full"
            onClick={() => router.push("/home")}
          >
            Decide later
          </Button>
        </>
      )}
    </main>
  );
}
