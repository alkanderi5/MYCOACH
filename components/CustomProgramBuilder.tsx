"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, X } from "@phosphor-icons/react";
import { Button, Card, ErrorNote, SectionTitle, cx } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { activateProgram } from "@/lib/programs";
import { ABILITIES, type Ability, type Drill } from "@/lib/types";

type Step = "choose" | "order" | "name";

type LibraryDrill = Drill & { categoryName: string; levelNumber: number };

/**
 * Three steps: pick drills, put them in order, name it.
 *
 * The selection is held above the filters, so changing the filter or looking at
 * a different level never loses what has already been chosen — losing a
 * half-built program to a filter change would be infuriating.
 */
export function CustomProgramBuilder({
  drills,
  categories,
  defaultAbility,
}: {
  drills: LibraryDrill[];
  categories: { id: string; name: string }[];
  defaultAbility: Ability;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<string[]>([]);
  const [ability, setAbility] = useState<Ability>(defaultAbility);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const byId = useMemo(() => new Map(drills.map((d) => [d.id, d])), [drills]);

  const visible = useMemo(() => {
    const range: Record<Ability, [number, number]> = {
      beginner: [1, 3],
      intermediate: [4, 7],
      advanced: [8, 10],
    };
    const [min, max] = range[ability];
    return drills.filter((d) => {
      if (levelFilter !== null) return d.levelNumber === levelFilter;
      if (categoryFilter && d.category_id !== categoryFilter) return false;
      return d.levelNumber >= min && d.levelNumber <= max;
    });
  }, [drills, ability, levelFilter, categoryFilter]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const move = (index: number, delta: number) =>
    setSelected((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  async function save() {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("Your session expired. Sign in again — your selection is still here.");
      return;
    }

    const { data: program, error: programError } = await supabase
      .from("training_programs")
      .insert({
        owner_player_id: user.id,
        name: name.trim() || "My program",
        program_type: "custom",
        ability,
        objective: null,
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
      selected.map((drillId, index) => ({
        training_program_id: program.id,
        drill_id: drillId,
        sort_order: index,
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

  return (
    <div className="space-y-6">
      <Steps step={step} count={selected.length} />

      {step === "choose" && (
        <>
          <Card>
            <SectionTitle>Ability</SectionTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              {ABILITIES.map((option) => (
                <Chip
                  key={option}
                  active={ability === option && levelFilter === null}
                  onClick={() => {
                    setAbility(option);
                    setLevelFilter(null);
                  }}
                >
                  {option}
                </Chip>
              ))}
            </div>

            <div className="mt-5">
              <SectionTitle>Level</SectionTitle>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                  <Chip
                    key={level}
                    active={levelFilter === level}
                    onClick={() => setLevelFilter(levelFilter === level ? null : level)}
                  >
                    {level}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <SectionTitle>Category</SectionTitle>
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    active={categoryFilter === category.id}
                    onClick={() =>
                      setCategoryFilter(categoryFilter === category.id ? null : category.id)
                    }
                  >
                    {category.name}
                  </Chip>
                ))}
              </div>
            </div>
          </Card>

          <p className="text-[12px] text-faint">
            {visible.length} drill{visible.length === 1 ? "" : "s"} shown · {selected.length}{" "}
            selected
          </p>

          <ul className="space-y-2">
            {visible.map((drill) => {
              const chosen = selected.includes(drill.id);
              return (
                <li key={drill.id}>
                  <button
                    type="button"
                    onClick={() => toggle(drill.id)}
                    aria-pressed={chosen}
                    className={cx(
                      "flex w-full items-start gap-3 rounded-[12px] border p-4 text-left transition-colors",
                      chosen
                        ? "border-accent bg-accent/10"
                        : "border-line bg-surface hover:border-accent",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cx(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                        chosen ? "border-accent bg-accent text-canvas" : "border-line-strong",
                      )}
                    >
                      {chosen && <Check size={12} weight="bold" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] text-ink">{drill.name}</span>
                      <span className="mt-1 block text-[12px] text-faint">
                        Level {drill.levelNumber} · {drill.categoryName} ·{" "}
                        {drill.duration_minutes} min
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <Button
            size="lg"
            className="w-full"
            disabled={selected.length === 0}
            onClick={() => setStep("order")}
          >
            Review {selected.length} drill{selected.length === 1 ? "" : "s"}
          </Button>
        </>
      )}

      {step === "order" && (
        <>
          <ul className="space-y-2">
            {selected.map((id, index) => {
              const drill = byId.get(id);
              if (!drill) return null;
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-[12px] border border-line bg-surface p-4"
                >
                  <span className="w-6 shrink-0 text-[12px] tabular-nums text-faint">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{drill.name}</span>
                    <span className="text-[12px] text-faint">
                      Level {drill.levelNumber} · {drill.duration_minutes} min
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <IconButton label="Move up" onClick={() => move(index, -1)}>
                      <ArrowUp size={15} />
                    </IconButton>
                    <IconButton label="Move down" onClick={() => move(index, 1)}>
                      <ArrowDown size={15} />
                    </IconButton>
                    <IconButton label="Remove" onClick={() => toggle(id)}>
                      <X size={15} />
                    </IconButton>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep("choose")}>
              Back
            </Button>
            <Button onClick={() => setStep("name")}>Name it</Button>
          </div>
        </>
      )}

      {step === "name" && (
        <Card>
          <label
            htmlFor="program-name"
            className="block text-[11px] uppercase tracking-[0.22em] text-muted"
          >
            Program name
          </label>
          <input
            id="program-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tuesday practice"
            className="mt-2.5 h-11 w-full rounded-none border-0 border-b border-line-strong bg-transparent text-[17px] text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          <p className="mt-3 text-[12px] text-faint">
            {selected.length} drills. You can repeat this every practice day, and edit it later
            without losing any results.
          </p>

          {error && (
            <div className="mt-5">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep("order")}>
              Back
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save and use it"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Steps({ step, count }: { step: Step; count: number }) {
  const steps: [Step, string][] = [
    ["choose", "Choose drills"],
    ["order", "Order them"],
    ["name", "Name it"],
  ];
  return (
    <ol className="flex gap-2 text-[11px] uppercase tracking-[0.14em]">
      {steps.map(([key, label], index) => (
        <li
          key={key}
          className={cx(
            "flex-1 border-t-2 pt-2",
            step === key ? "border-accent text-accent" : "border-line text-faint",
          )}
        >
          {index + 1}. {label}
          {key === "choose" && count > 0 && step !== "choose" && ` (${count})`}
        </li>
      ))}
    </ol>
  );
}

function Chip({
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
        "h-8 rounded-full border px-3 text-[12px] capitalize transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-line-strong text-muted hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted transition-colors hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  );
}
