"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Stop } from "@phosphor-icons/react";
import { Button, Card, ErrorNote, SectionTitle } from "./ui";
import { PerformanceSheet } from "./sheets";
import { createClient } from "@/lib/supabase/client";
import { playAlertTone } from "@/lib/alert-tone";
import {
  clearDraft,
  parseDraft,
  readDraft,
  subscribeToDrafts,
  writeDraft,
} from "@/lib/draft-store";
import { formatClock, formatDuration, timerSnapshot, type TimerState } from "@/lib/progression/timer";
import type { Drill, DrillAttempt, RawResult } from "@/lib/types";

/**
 * The sheet is never hidden behind the timer.
 *
 * Plenty of practice is untimed, and a player standing at the table wants the
 * scoring buttons in front of them the moment the drill opens — not after a
 * mode switch. The timer sits above it as something you may or may not use.
 */
type Stage = "idle" | "running" | "summary";

const PRACTICE_PRESETS = [10, 20, 30];
const BREAK_PRESETS = [0, 3, 5];

export function DrillExperience({
  drill,
  previousBest,
  lastScore,
}: {
  drill: Drill;
  previousBest: number | null;
  lastScore: number | null;
}) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("idle");
  const sheetRef = useRef<HTMLDivElement>(null);

  // A result left unsaved by a previous visit. Read from the store during
  // render, so the banner is right on first paint.
  const pendingDraft = parseDraft(
    useSyncExternalStore(
      subscribeToDrafts,
      () => readDraft(drill.id),
      () => null,
    ),
  );
  const [practiceMinutes, setPracticeMinutes] = useState(
    Math.max(5, drill.duration_minutes || 20),
  );
  const [breakMinutes, setBreakMinutes] = useState(5);

  const [timer, setTimer] = useState<TimerState | null>(null);
  const [snapshot, setSnapshot] = useState({ phase: "idle", remaining: 0, practised: 0 } as ReturnType<
    typeof timerSnapshot
  >);
  const [alert, setAlert] = useState("");
  const announced = useRef<Set<string>>(new Set());

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [practisedSeconds, setPractisedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [result, setResult] = useState<DrillAttempt | null>(null);

  /* ── the clock: derived from timestamps, never counted by the interval ── */
  useEffect(() => {
    if (!timer || stage !== "running") return;

    const tick = () => {
      const next = timerSnapshot(timer, Date.now());
      setSnapshot(next);

      if (next.phase === "practice_done" && !announced.current.has("practice")) {
        announced.current.add("practice");
        playAlertTone("practice-end");
        notify("Practice time is over", "Take your break.");
        setAlert("Practice time is over — take your break.");
      }
      if (next.phase === "break" && !announced.current.has("practice")) {
        announced.current.add("practice");
        playAlertTone("practice-end");
        notify("Practice time is over", "Your break has started.");
        setAlert("Practice time is over — your break has started.");
      }
      if (next.phase === "break_done" && !announced.current.has("break")) {
        announced.current.add("break");
        playAlertTone("break-end");
        notify("Break is over", "Back to practice.");
        setAlert("Break is over — back to practice.");
      }
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [timer, stage]);

  async function startPractice() {
    // Ask for notifications here, where the reason is obvious, not on load.
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Denied or unsupported: the in-page alert and sound still fire.
      }
    }

    const state: TimerState = {
      startedAt: Date.now(),
      practiceSeconds: practiceMinutes * 60,
      breakSeconds: breakMinutes * 60,
    };
    announced.current = new Set();
    setAlert("");
    setTimer(state);
    setStage("running");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("practice_sessions")
      .insert({
        player_id: user.id,
        drill_id: drill.id,
        category_id: drill.category_id,
        sheet_type: drill.sheet_template_type,
        started_at: new Date(state.startedAt).toISOString(),
        intended_practice_seconds: state.practiceSeconds,
        intended_break_seconds: state.breakSeconds,
        status: "active",
      })
      .select("id")
      .maybeSingle();

    if (data?.id) setSessionId(data.id);
  }

  function finish() {
    const practised = snapshot.practised || 0;
    if (
      snapshot.phase === "practice" &&
      practised < (timer?.practiceSeconds ?? 0) &&
      !window.confirm("Finish early? Your actual practice time will be saved.")
    ) {
      return;
    }
    setPractisedSeconds(practised);
    setStage("idle");
    // The sheet is already on the page; bring it into view rather than
    // swapping the screen out from under the player.
    sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveResult(raw: RawResult, note: string) {
    setSaving(true);
    setSaveError("");

    // Written before the request so a dropped connection, a closed tab or a
    // reload cannot lose a result the player has already earned.
    writeDraft(drill.id, { raw, note });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setSaveError("Your session expired. Sign in again — your result is kept here.");
      return;
    }

    if (sessionId) {
      await supabase
        .from("practice_sessions")
        .update({
          status: "finished",
          actual_practice_seconds: practisedSeconds,
          practice_duration_seconds: practisedSeconds,
        })
        .eq("id", sessionId);
    }

    const { data, error } = await supabase
      .from("drill_attempts")
      .insert({
        player_id: user.id,
        drill_id: drill.id,
        practice_session_id: sessionId,
        template_type: drill.sheet_template_type,
        raw_result: raw,
        player_note: note.trim() || null,
      })
      .select("*")
      .maybeSingle<DrillAttempt>();

    setSaving(false);

    if (error) {
      // A duplicate key means the first save actually landed and this is a
      // retry of a request that succeeded. Treat it as success rather than
      // asking the player to try again forever.
      if (error.code === "23505") {
        clearDraft(drill.id);
        setStage("summary");
        return;
      }
      setSaveError(
        `That did not save: ${error.message}. Your result is safe on this device — try again.`,
      );
      return;
    }

    clearDraft(drill.id);
    setResult(data ?? null);
    setStage("summary");
    router.refresh();
  }

  /* ── timer above, sheet always below ── */
  if (stage !== "summary") {
    const onBreak = snapshot.phase === "break";

    return (
      <div className="space-y-6">
        <Card>
          <SectionTitle>Practice timer</SectionTitle>

          {stage === "running" ? (
            <>
              <p className="mt-5 text-center text-[11px] uppercase tracking-[0.22em] text-accent-ink">
                {onBreak ? "Break" : snapshot.phase === "practice" ? "Practice" : "Ready"}
              </p>
              <p
                role="timer"
                className="mt-3 text-center text-[68px] font-light leading-none tabular-nums tracking-tight text-ink"
              >
                {formatClock(snapshot.remaining)}
              </p>
              <p className="mt-3 text-center text-[12px] text-faint">
                {formatDuration(snapshot.practised)} practised
              </p>

              {alert && (
                <p className="mt-5 flex items-start gap-3 text-[13px] text-ink" role="status">
                  <span aria-hidden className="mt-0.5 w-px self-stretch bg-accent" />
                  {alert}
                </p>
              )}

              <div className="mt-7 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    setTimer((t) =>
                      t
                        ? t.pausedAt
                          ? {
                              ...t,
                              pausedAt: null,
                              pausedTotal: (t.pausedTotal ?? 0) + (Date.now() - t.pausedAt),
                            }
                          : { ...t, pausedAt: Date.now() }
                        : t,
                    )
                  }
                >
                  {timer?.pausedAt ? <Play size={15} weight="fill" /> : <Pause size={15} weight="fill" />}
                  {timer?.pausedAt ? "Resume" : "Pause"}
                </Button>
                <Button onClick={finish}>
                  <Stop size={15} weight="fill" />
                  Finish
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Optional. You can record a result without ever starting it.
              </p>

              <div className="mt-5 space-y-5">
                <PresetRow
                  label="Practice"
                  value={practiceMinutes}
                  presets={PRACTICE_PRESETS}
                  onChange={setPracticeMinutes}
                />
                <PresetRow
                  label="Break"
                  value={breakMinutes}
                  presets={BREAK_PRESETS}
                  onChange={setBreakMinutes}
                  allowNone
                />
              </div>

              <Button variant="outline" size="lg" className="mt-7 w-full" onClick={startPractice}>
                <Play size={17} weight="fill" />
                Start Practice
              </Button>
            </>
          )}
        </Card>

        {/* Offered before the sheet, so a player does not enter the same
            result twice without realising the first one is still waiting. */}
        {pendingDraft && !saving && (
          <Card>
            <SectionTitle>Unsaved result</SectionTitle>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              A result from {relativeTime(pendingDraft.savedAt)} never reached the server.
              It is still here.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button onClick={() => saveResult(pendingDraft.raw, pendingDraft.note)}>
                Save it now
              </Button>
              <Button variant="outline" onClick={() => clearDraft(drill.id)}>
                Discard
              </Button>
            </div>
          </Card>
        )}

        <div ref={sheetRef} className="scroll-mt-6">
          <Card>
            <SectionTitle>Record your result</SectionTitle>
            {drill.success_condition_text && (
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                {drill.success_condition_text}
              </p>
            )}

            {saveError && (
              <div className="mt-5">
                <ErrorNote>{saveError}</ErrorNote>
              </div>
            )}

            <div className="mt-6">
              <PerformanceSheet drill={drill} onSubmit={saveResult} saving={saving} />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  /* ── summary ── */
  const score = result?.normalized_score ?? null;
  const change = score !== null && lastScore !== null ? score - lastScore : null;

  return (
    <Card>
      <SectionTitle>Session saved</SectionTitle>

      <p className="mt-5 text-[52px] font-medium leading-none tabular-nums text-accent-ink">
        {score === null ? "—" : `${Math.round(score)}%`}
      </p>
      <p className="mt-3 text-[13px] text-muted">
        {result?.passed ? "You met the target for this drill." : "Below the target this time."}
      </p>

      <dl className="mt-6 space-y-2 text-[13px]">
        {lastScore !== null && (
          <div className="flex justify-between">
            <dt className="text-muted">Previous</dt>
            <dd className="tabular-nums text-ink">{Math.round(lastScore)}%</dd>
          </div>
        )}
        {change !== null && (
          <div className="flex justify-between">
            <dt className="text-muted">Change</dt>
            <dd className="tabular-nums text-ink">
              {change > 0 ? "+" : change < 0 ? "−" : "±"}
              {Math.abs(Math.round(change))}
            </dd>
          </div>
        )}
        {previousBest !== null && (
          <div className="flex justify-between">
            <dt className="text-muted">Best</dt>
            <dd className="tabular-nums text-ink">
              {Math.round(Math.max(previousBest, score ?? 0))}%
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-7 grid gap-3">
        <Button
          onClick={() => {
            setResult(null);
            setSessionId(null);
            setStage("idle");
          }}
        >
          Repeat this drill
        </Button>
        <Button variant="outline" onClick={() => router.push("/home")}>
          Continue
        </Button>
        <Button variant="quiet" onClick={() => router.push("/progress")}>
          Finish for today
        </Button>
      </div>
    </Card>
  );
}

function PresetRow({
  label,
  value,
  presets,
  onChange,
  allowNone,
}: {
  label: string;
  value: number;
  presets: number[];
  onChange: (value: number) => void;
  allowNone?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</span>
        <span className="text-[12px] text-faint">
          {value === 0 ? "None" : `${value} min`}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            aria-pressed={value === preset}
            className={`h-9 rounded-full border px-4 text-[13px] transition-colors ${
              value === preset
                ? "border-accent bg-accent/15 text-accent"
                : "border-line-strong text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {preset === 0 && allowNone ? "None" : `${preset} min`}
          </button>
        ))}
        <label className="inline-flex items-center gap-2 text-[12px] text-faint">
          <span className="sr-only">{label} minutes</span>
          <input
            type="number"
            min={allowNone ? 0 : 1}
            max={180}
            value={value}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
            className="h-9 w-16 rounded-md border border-line-strong bg-transparent px-2 text-center text-[13px] tabular-nums text-ink outline-none focus:border-accent"
          />
          min
        </label>
      </div>
    </div>
  );
}

/** "just now" beats a raw timestamp for something that just failed to save. */
function relativeTime(timestamp: number) {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "a moment ago";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "an earlier session";
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    // Notifications are a courtesy; the on-screen message is the real signal.
  }
}
