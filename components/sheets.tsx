"use client";

import { useState } from "react";
import { Check, Trophy, X } from "@phosphor-icons/react";
import { Button, cx } from "./ui";
import { normalizeScore, validateAttempts } from "@/lib/progression/scoring";
import type { Drill, RawResult, TemplateType } from "@/lib/types";

/**
 * Performance sheets.
 *
 * One reusable template per scoring shape rather than a form per drill, so a
 * new drill only has to name the template it uses. Each reports a `RawResult`
 * upward; the score is recomputed in the database, never trusted from here.
 */

export type SheetProps = {
  drill: Drill;
  onSubmit: (raw: RawResult, note: string) => void;
  saving: boolean;
};

export function PerformanceSheet(props: SheetProps) {
  const Template = TEMPLATES[props.drill.sheet_template_type];
  if (!Template) {
    return (
      <p className="text-[13px] leading-relaxed text-muted">
        This drill uses a scoring method that has not been built yet.
      </p>
    );
  }
  return <Template {...props} />;
}

const TEMPLATES: Record<TemplateType, (props: SheetProps) => React.ReactElement> = {
  attempts: AttemptsSheet,
  sets: SetsSheet,
  best_run: BestRunSheet,
  completion: CompletionSheet,
};

/* ── attempts: tap made or missed per shot ────────────────────────────── */

function AttemptsSheet({ drill, onSubmit, saving }: SheetProps) {
  const total = Math.max(1, drill.sheet_configuration.total_attempts ?? 20);
  const [shots, setShots] = useState<boolean[]>([]);
  const [note, setNote] = useState("");

  const made = shots.filter(Boolean).length;
  const missed = shots.length - made;
  const complete = shots.length >= total;
  const score = normalizeScore(
    "attempts",
    { total_attempts: shots.length, successful_attempts: made },
    drill.sheet_configuration,
  );

  // Functional update: taps arrive faster than React re-renders, and reading a
  // captured value here would drop all but one tap of a quick run.
  const record = (madeIt: boolean) =>
    setShots((current) => (current.length >= total ? current : [...current, madeIt]));

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-ink">
          {complete ? `All ${total} attempts recorded` : `Attempt ${shots.length + 1} of ${total}`}
        </p>
        <Button
          variant="quiet"
          size="sm"
          onClick={() => setShots((c) => c.slice(0, -1))}
          disabled={shots.length === 0}
        >
          Undo
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TallyButton kind="made" count={made} disabled={complete} onClick={() => record(true)} />
        <TallyButton kind="miss" count={missed} disabled={complete} onClick={() => record(false)} />
      </div>

      {shots.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-hidden>
          {shots.map((madeIt, index) => (
            <span
              key={index}
              className="h-3 w-3 rounded-full border"
              style={{
                background: madeIt ? "var(--color-made)" : "var(--color-miss)",
                borderColor: madeIt ? "var(--color-made)" : "var(--color-miss)",
              }}
            />
          ))}
          {Array.from({ length: total - shots.length }, (_, i) => (
            <span key={`rest-${i}`} className="h-3 w-3 rounded-full border border-line-strong" />
          ))}
        </div>
      )}

      <ScoreLine score={score} />
      <NoteField value={note} onChange={setNote} />

      <Button
        size="lg"
        className="w-full"
        disabled={shots.length === 0 || saving}
        onClick={() =>
          onSubmit(
            { total_attempts: shots.length, successful_attempts: made },
            note,
          )
        }
      >
        {saving ? "Saving…" : `Save ${shots.length} attempt${shots.length === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}

/* ── sets: several rounds ─────────────────────────────────────────────── */

function SetsSheet({ drill, onSubmit, saving }: SheetProps) {
  const setCount = Math.max(1, drill.sheet_configuration.set_count ?? 3);
  const perSet = Math.max(1, drill.sheet_configuration.attempts_per_set ?? 10);

  const [sets, setSets] = useState(() =>
    Array.from({ length: setCount }, () => ({ total: perSet, successful: 0 })),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const score = normalizeScore("sets", { sets }, drill.sheet_configuration);

  function update(index: number, key: "total" | "successful", value: number) {
    setSets((current) =>
      current.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    );
    setError("");
  }

  function submit() {
    for (const [index, set] of sets.entries()) {
      const problem = validateAttempts(set.total, set.successful);
      if (problem) {
        setError(`Set ${index + 1}: ${problem}`);
        return;
      }
    }
    onSubmit({ sets }, note);
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {sets.map((set, index) => {
          const setScore = set.total > 0 ? (set.successful / set.total) * 100 : null;
          return (
            <li key={index} className="rounded-[10px] border border-line p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] text-muted">Set {index + 1}</p>
                <p className="text-[13px] text-accent-ink">
                  {setScore === null ? "—" : `${Math.round(setScore)}%`}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberField
                  id={`set-${index}-successful`}
                  label="Successful"
                  value={set.successful}
                  min={0}
                  max={set.total}
                  onChange={(v) => update(index, "successful", v)}
                />
                <NumberField
                  id={`set-${index}-total`}
                  label="Attempts"
                  value={set.total}
                  min={1}
                  onChange={(v) => update(index, "total", v)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="text-[12px] text-miss">
          {error}
        </p>
      )}

      <ScoreLine score={score} caption="Overall, from every attempt" />
      <NoteField value={note} onChange={setNote} />

      <Button size="lg" className="w-full" disabled={saving} onClick={submit}>
        {saving ? "Saving…" : "Save result"}
      </Button>
    </div>
  );
}

/* ── best run: longest unbroken streak ────────────────────────────────── */

function BestRunSheet({ drill, onSubmit, saving }: SheetProps) {
  const target = drill.sheet_configuration.target_run ?? 5;

  // Runs and the open run live in one piece of state so every tap can be a
  // pure functional update. Tapping quickly through a run would otherwise
  // batch several taps against the same stale value and lose all but one.
  const [tally, setTally] = useState<{ runs: number[]; current: number }>({
    runs: [],
    current: 0,
  });
  const { runs, current } = tally;
  const [note, setNote] = useState("");

  const best = Math.max(0, ...runs, current);
  const cleared = runs.filter((r) => r >= target).length;
  const score = normalizeScore(
    "best_run",
    { runs_attempted: runs.length, best_run: best },
    drill.sheet_configuration,
  );

  /** A pot. When the drill states how many balls clear the table, reaching
   *  that number closes the run on its own. */
  const pot = () =>
    setTally((state) => {
      const next = state.current + 1;
      if (target && next >= target) {
        return { runs: [...state.runs, next], current: 0 };
      }
      return { ...state, current: next };
    });

  const closeRun = () =>
    setTally((state) => ({ runs: [...state.runs, state.current], current: 0 }));

  const undo = () =>
    setTally((state) => {
      if (state.current > 0) return { ...state, current: state.current - 1 };
      const last = state.runs.at(-1);
      if (last === undefined) return state;
      return { runs: state.runs.slice(0, -1), current: last };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-ink">
          Run {runs.length + 1} · {current} of {target} potted
        </p>
        <Button
          variant="quiet"
          size="sm"
          disabled={current === 0 && runs.length === 0}
          onClick={undo}
        >
          Undo
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TallyButton kind="made" count={current} label="Potted" onClick={pot} />
        <TallyButton
          kind="miss"
          count={runs.length - cleared}
          label="Missed"
          onClick={closeRun}
        />
      </div>

      {/* Finishing a run without a miss is a different outcome from ending one
          because you missed, so it gets its own control rather than sharing
          the miss button. */}
      <button
        type="button"
        disabled={current === 0}
        onClick={closeRun}
        className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-medium uppercase tracking-[0.1em] transition-colors disabled:opacity-45"
        style={{
          borderColor: "var(--color-made)",
          color: "var(--color-made)",
          background: "color-mix(in srgb, var(--color-made) 10%, transparent)",
        }}
      >
        <Trophy size={16} weight="fill" />
        Run complete
      </button>

      {runs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {runs.map((run, index) => (
            <span
              key={index}
              className={cx(
                "inline-flex h-7 min-w-8 items-center justify-center rounded-md border px-2 text-[12px]",
                run >= target ? "border-made text-made" : "border-line-strong text-muted",
              )}
            >
              {run}
            </span>
          ))}
        </div>
      )}

      <dl className="space-y-2 text-[13px]">
        <Row label="Runs cleared">
          {cleared} of {runs.length}
        </Row>
        <Row label="Best run">{best}</Row>
      </dl>

      <ScoreLine score={score} caption="Progress towards the target run" />
      <NoteField value={note} onChange={setNote} />

      <Button
        size="lg"
        className="w-full"
        disabled={(runs.length === 0 && current === 0) || saving}
        onClick={() => {
          const allRuns = current > 0 ? [...runs, current] : runs;
          onSubmit(
            { runs_attempted: allRuns.length, best_run: Math.max(0, ...allRuns) },
            note,
          );
        }}
      >
        {saving ? "Saving…" : "Save result"}
      </Button>
    </div>
  );
}

/* ── completion: did you finish it ────────────────────────────────────── */

function CompletionSheet({ onSubmit, saving }: SheetProps) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [note, setNote] = useState("");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <TallyButton
          kind="made"
          label="Completed"
          pressed={completed === true}
          onClick={() => setCompleted(true)}
        />
        <TallyButton
          kind="miss"
          label="Not completed"
          pressed={completed === false}
          onClick={() => setCompleted(false)}
        />
      </div>

      <NumberField
        id="completion-attempts"
        label="Attempts taken"
        value={attempts}
        min={1}
        onChange={setAttempts}
      />

      <NoteField value={note} onChange={setNote} />

      <Button
        size="lg"
        className="w-full"
        disabled={completed === null || saving}
        onClick={() => onSubmit({ completed: completed!, attempts }, note)}
      >
        {saving ? "Saving…" : "Save result"}
      </Button>
    </div>
  );
}

/* ── shared pieces ────────────────────────────────────────────────────── */

/** Colour is never the only signal: each carries an icon and a word. */
function TallyButton({
  kind,
  count,
  label,
  onClick,
  disabled,
  pressed,
}: {
  kind: "made" | "miss";
  count?: number;
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  const made = kind === "made";
  const colour = made ? "var(--color-made)" : "var(--color-miss)";
  const word = label ?? (made ? "Made" : "Missed");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className="flex min-h-[104px] touch-manipulation select-none flex-col items-center justify-center gap-1.5 rounded-[14px] border text-[14px] font-medium uppercase tracking-[0.08em] transition-colors disabled:opacity-45"
      style={{
        borderColor: colour,
        color: pressed ? "var(--color-canvas)" : colour,
        background: pressed
          ? colour
          : `color-mix(in srgb, ${colour} 14%, transparent)`,
      }}
    >
      {made ? <Check size={24} weight="bold" /> : <X size={24} weight="bold" />}
      {count !== undefined && <span className="text-[28px] leading-none">{count}</span>}
      {word}
    </button>
  );
}

function ScoreLine({ score, caption }: { score: number | null; caption?: string }) {
  return (
    <div className="flex items-baseline justify-between border-t border-line pt-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Score</p>
        {caption && <p className="mt-1 text-[11px] text-faint">{caption}</p>}
      </div>
      <p
        className={cx(
          "font-medium tabular-nums text-accent-ink",
          score === null ? "text-[16px] text-faint" : "text-[34px]",
        )}
      >
        {score === null ? "Not started" : `${Math.round(score)}%`}
      </p>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] uppercase tracking-[0.18em] text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-10 w-full rounded-none border-0 border-b border-line-strong bg-transparent text-[17px] tabular-nums text-ink outline-none focus:border-accent"
      />
    </div>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="player-note" className="block text-[11px] uppercase tracking-[0.18em] text-muted">
        Note (optional)
      </label>
      <input
        id="player-note"
        value={value}
        maxLength={140}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Anything worth remembering"
        className="mt-2 h-10 w-full rounded-none border-0 border-b border-line-strong bg-transparent text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums text-ink">{children}</dd>
    </div>
  );
}
