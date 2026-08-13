"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Robot } from "@phosphor-icons/react";
import { Button, Card, ErrorNote, SectionTitle, cx } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { activateProgram } from "@/lib/programs";
import { ABILITIES, type Ability } from "@/lib/types";

const FOCUS_OPTIONS = [
  "Potting",
  "Cue-ball control",
  "Position",
  "Safety",
  "Long shots",
  "Consistency under pressure",
];

const DAYS = [2, 3, 4, 5];
const MINUTES = [15, 30, 45, 60];

type Proposal = {
  source?: "ai" | "demo";
  name: string;
  objective: string;
  ability: Ability;
  drills: {
    drill_id: string;
    reason: string;
    drill?: { name: string; category: string; level: number; duration_minutes: number };
  }[];
};

/**
 * The AI picks from the real library and nothing else.
 *
 * The proposal is shown for review before anything is saved, and the server
 * has already discarded any drill id that does not exist — the model suggests,
 * it does not author.
 */
export function AiProgramBuilder({ defaultAbility }: { defaultAbility: Ability }) {
  const router = useRouter();

  const [ability, setAbility] = useState<Ability>(defaultAbility);
  const [focus, setFocus] = useState<string[]>([]);
  const [days, setDays] = useState(3);
  const [minutes, setMinutes] = useState(30);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [saving, setSaving] = useState(false);

  async function generate() {
    setBusy(true);
    setError("");
    setProposal(null);

    try {
      const response = await fetch("/api/ai-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ability,
          focusSkills: focus,
          daysPerWeek: days,
          sessionMinutes: minutes,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "That did not work. Try again.");
        return;
      }
      setProposal(payload as Proposal);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!proposal || saving) return;
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

    const { data: program, error: programError } = await supabase
      .from("training_programs")
      .insert({
        owner_player_id: user.id,
        name: proposal.name,
        objective: proposal.objective,
        program_type: "ai",
        ability: proposal.ability,
        is_published: false,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (programError || !program) {
      setSaving(false);
      setError(`That did not save: ${programError?.message ?? "unknown error"}`);
      return;
    }

    const { error: drillsError } = await supabase.from("training_program_drills").insert(
      proposal.drills.map((d, index) => ({
        training_program_id: program.id,
        drill_id: d.drill_id,
        sort_order: index,
        selection_reason: d.reason,
      })),
    );

    if (drillsError) {
      setSaving(false);
      setError(`The drills did not save: ${drillsError.message}`);
      return;
    }

    await activateProgram(supabase, user.id, program.id);
    setSaving(false);
    router.refresh();
    router.push("/home");
  }

  if (proposal) {
    return (
      <div className="space-y-6">
        <Card>
          <SectionTitle>
            {proposal.source === "demo" ? "Proposed program · demo" : "Proposed program"}
          </SectionTitle>
          <h2 className="mt-3 text-[21px] font-medium text-ink">{proposal.name}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{proposal.objective}</p>
          <p className="mt-4 text-[12px] text-faint">
            {proposal.drills.length} drills, all from your library
            {proposal.source === "demo" && " · chosen by rule, not by a model"}
          </p>
        </Card>

        <ul className="space-y-2">
          {proposal.drills.map((entry, index) => (
            <li
              key={entry.drill_id}
              className="rounded-[12px] border border-line bg-surface p-4"
            >
              <div className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 text-[12px] tabular-nums text-faint">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] text-ink">{entry.drill?.name ?? "Drill"}</p>
                  <p className="mt-1 text-[12px] text-faint">
                    {entry.drill
                      ? `Level ${entry.drill.level} · ${entry.drill.category} · ${entry.drill.duration_minutes} min`
                      : ""}
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-accent-ink">
                    {entry.reason}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={generate} disabled={busy || saving}>
            {busy ? "Thinking…" : "Try another"}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Use this program"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Your ability</SectionTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {ABILITIES.map((option) => (
            <Choice
              key={option}
              active={ability === option}
              onClick={() => setAbility(option)}
            >
              {option}
            </Choice>
          ))}
        </div>

        <div className="mt-6">
          <SectionTitle>What do you want to improve?</SectionTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((option) => (
              <Choice
                key={option}
                active={focus.includes(option)}
                onClick={() =>
                  setFocus((current) =>
                    current.includes(option)
                      ? current.filter((x) => x !== option)
                      : [...current, option],
                  )
                }
              >
                {option}
              </Choice>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <SectionTitle>Days a week</SectionTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAYS.map((option) => (
                <Choice key={option} active={days === option} onClick={() => setDays(option)}>
                  {option}
                </Choice>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle>Session length</SectionTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              {MINUTES.map((option) => (
                <Choice
                  key={option}
                  active={minutes === option}
                  onClick={() => setMinutes(option)}
                >
                  {option}m
                </Choice>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button size="lg" className="w-full" onClick={generate} disabled={busy}>
        <Robot size={17} />
        {busy ? "Choosing drills…" : "Create my program"}
      </Button>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "h-9 rounded-full border px-3.5 text-[13px] capitalize transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-line-strong text-muted hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}
