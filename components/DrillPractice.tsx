"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowCounterClockwise,
  Check,
  Coffee,
  Pause,
  Play,
  Stop,
  Trophy,
  X,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { Drill } from "@/lib/types";
import { playAlertTone } from "@/lib/alert-tone";
import styles from "./drill.module.css";

/** The clock never moves the player on by itself. When a period runs out it
 *  stops and waits on a decision — 'practiceEnded' offers the break, and
 *  'breakEnded' offers the next practice period. */
type Phase =
  | "idle"
  | "practice"
  | "break"
  | "paused"
  | "practiceEnded"
  | "breakEnded";

const DEFAULT_PRACTICE_MINUTES = 20;
const DEFAULT_BREAK_MINUTES = 5;

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Ready",
  practice: "Practice",
  break: "Break",
  paused: "Paused",
  practiceEnded: "Time for a break",
  breakEnded: "Break over",
};

export function DrillPractice({ drill }: { drill: Drill }) {
  const router = useRouter();

  // — timer state —
  const [practiceMinutes, setPracticeMinutes] = useState(String(DEFAULT_PRACTICE_MINUTES));
  const [breakMinutes, setBreakMinutes] = useState(String(DEFAULT_BREAK_MINUTES));
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(0);
  const [alert, setAlert] = useState("");

  /** Seconds actually spent practising — what gets saved as the duration. */
  const practiceElapsed = useRef(0);
  const breakElapsed = useRef(0);
  const phaseEndsAt = useRef<number | null>(null);
  const phaseStartedAt = useRef<number | null>(null);
  const pausedPhase = useRef<Exclude<Phase, "idle" | "paused">>("practice");

  // Mirrored into state at the end of a session: the refs above are updated
  // outside render, so reading them during render would go stale.
  const [savedPracticeSeconds, setSavedPracticeSeconds] = useState(0);
  const [savedBreakSeconds, setSavedBreakSeconds] = useState(0);

  const settleTotals = useCallback(() => {
    setSavedPracticeSeconds(practiceElapsed.current);
    setSavedBreakSeconds(breakElapsed.current);
  }, []);

  const parsedPractice = Math.max(1, Math.min(180, Number(practiceMinutes) || 0));
  const parsedBreak = Math.max(0, Math.min(60, Number(breakMinutes) || 0));

  /** Fold the time spent in the phase we're leaving into the running totals. */
  const settleElapsed = useCallback((from: Phase) => {
    if (phaseStartedAt.current === null) return;
    const spent = Math.max(0, Math.round((Date.now() - phaseStartedAt.current) / 1000));
    if (from === "practice") practiceElapsed.current += spent;
    if (from === "break") breakElapsed.current += spent;
    phaseStartedAt.current = null;
  }, []);

  const beginPhase = useCallback((next: "practice" | "break", minutes: number) => {
    const seconds = Math.round(minutes * 60);
    phaseStartedAt.current = Date.now();
    phaseEndsAt.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setPhase(next);
  }, []);

  // Timestamp-driven so a backgrounded tab doesn't drift.
  useEffect(() => {
    if (phase !== "practice" && phase !== "break") return;

    const tick = () => {
      if (phaseEndsAt.current === null) return;
      const left = Math.max(0, Math.ceil((phaseEndsAt.current - Date.now()) / 1000));
      setRemaining(left);

      if (left > 0) return;

      phaseEndsAt.current = null;

      if (phase === "practice") {
        settleElapsed("practice");
        playAlertTone("practice-end");
        setAlert("Practice time is over — take a break.");
        setPhase("practiceEnded");
      } else {
        settleElapsed("break");
        playAlertTone("break-end");
        setAlert("Break is over — return to training.");
        setPhase("breakEnded");
      }
      settleTotals();
    };

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, settleElapsed, settleTotals]);

  function handleStart() {
    setAlert("");
    practiceElapsed.current = 0;
    breakElapsed.current = 0;
    settleTotals();
    beginPhase("practice", parsedPractice);
  }

  /** Take the offered break. */
  function handleTakeBreak() {
    setAlert("");
    beginPhase("break", parsedBreak);
  }

  /** Decline the break and run another period of the same practice length.
   *  The time already practised keeps accumulating into the session. */
  function handleKeepPractising() {
    setAlert("");
    beginPhase("practice", parsedPractice);
  }

  function handlePause() {
    if (phase !== "practice" && phase !== "break") return;
    pausedPhase.current = phase;
    settleElapsed(phase);
    // Remember what was left so resuming picks up where it stopped.
    phaseEndsAt.current = null;
    setPhase("paused");
  }

  function handleResume() {
    phaseStartedAt.current = Date.now();
    phaseEndsAt.current = Date.now() + remaining * 1000;
    setPhase(pausedPhase.current);
  }

  /** End the session. Nothing reaches history until the sheet is saved, so
   *  this points the player at the sheet rather than saving a blank result. */
  function handleStop() {
    if (phase === "practice" || phase === "break") settleElapsed(phase);
    phaseEndsAt.current = null;
    phaseStartedAt.current = null;
    setPhase("idle");
    setRemaining(0);
    settleTotals();
    setAlert(
      practiceElapsed.current > 0
        ? "Session stopped. Record your result below and save it to your history."
        : "",
    );
  }

  const running = phase === "practice" || phase === "break";
  const awaitingChoice = phase === "practiceEnded" || phase === "breakEnded";

  return (
    <>
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Timer</p>
        <div className={styles.rule} aria-hidden="true" />

        <div className={styles.timer}>
          <div className={styles.durationRow}>
            <label className={styles.duration}>
              <span className={styles.durationLabel}>Practice</span>
              <input
                className={styles.durationInput}
                type="number"
                min={1}
                max={180}
                inputMode="numeric"
                value={practiceMinutes}
                onChange={(e) => setPracticeMinutes(e.target.value)}
                disabled={phase !== "idle"}
              />
              <span className={styles.durationUnit}>minutes</span>
            </label>

            <label className={styles.duration}>
              <span className={styles.durationLabel}>Break</span>
              <input
                className={styles.durationInput}
                type="number"
                min={0}
                max={60}
                inputMode="numeric"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                disabled={phase !== "idle"}
              />
              <span className={styles.durationUnit}>minutes</span>
            </label>
          </div>

          <p className={styles.phaseLabel}>{PHASE_LABEL[phase]}</p>
          <p
            className={`${styles.countdown} ${!running ? styles.countdownIdle : ""}`}
            role="timer"
            aria-live="off"
          >
            {formatClock(
              running || phase === "paused"
                ? remaining
                : awaitingChoice
                  ? 0
                  : parsedPractice * 60,
            )}
          </p>

          {savedPracticeSeconds > 0 && !running && (
            <p className={styles.elapsedNote}>
              Practised {formatDuration(savedPracticeSeconds)} this session
            </p>
          )}

          {/* The prompt sits above the choices it belongs to. */}
          {alert && (
            <p className={styles.alert} role="status">
              <span className={styles.alertRule} aria-hidden="true" />
              {alert}
            </p>
          )}

          {awaitingChoice ? (
            <div className={styles.timerChoices}>
              {phase === "practiceEnded" && parsedBreak > 0 && (
                <button type="button" className={styles.buttonPrimary} onClick={handleTakeBreak}>
                  <Coffee size={15} weight="fill" />
                  Take a {parsedBreak}-minute break
                </button>
              )}
              {phase === "breakEnded" && (
                <button
                  type="button"
                  className={styles.buttonPrimary}
                  onClick={handleKeepPractising}
                >
                  <Play size={15} weight="fill" />
                  Back to practice
                </button>
              )}

              <div className={styles.timerControls}>
                {phase === "practiceEnded" && (
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={handleKeepPractising}
                  >
                    <Play size={15} weight="fill" />
                    Continue
                  </button>
                )}
                <button type="button" className={styles.buttonSecondary} onClick={handleStop}>
                  <Stop size={15} weight="fill" />
                  Finish
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.timerControls}>
              {phase === "idle" && (
                <button type="button" className={styles.buttonPrimary} onClick={handleStart}>
                  <Play size={15} weight="fill" />
                  Start
                </button>
              )}
              {running && (
                <>
                  <button type="button" className={styles.buttonSecondary} onClick={handlePause}>
                    <Pause size={15} weight="fill" />
                    Pause
                  </button>
                  <button type="button" className={styles.buttonPrimary} onClick={handleStop}>
                    <Stop size={15} weight="fill" />
                    Stop
                  </button>
                </>
              )}
              {phase === "paused" && (
                <>
                  <button type="button" className={styles.buttonPrimary} onClick={handleResume}>
                    <Play size={15} weight="fill" />
                    Resume
                  </button>
                  <button type="button" className={styles.buttonSecondary} onClick={handleStop}>
                    <Stop size={15} weight="fill" />
                    Stop
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <PerformanceSheet
        drill={drill}
        practiceSeconds={savedPracticeSeconds}
        breakSeconds={savedBreakSeconds}
        onSaved={() => {
          practiceElapsed.current = 0;
          breakElapsed.current = 0;
          settleTotals();
          setAlert("");
          router.refresh();
        }}
      />
    </>
  );
}

/* ── Performance sheet ──────────────────────────────────────────────────── */

/** One recorded shot on the shot-attempt sheet. */
type Shot = "made" | "miss";

/** One finished attempt on the progressive sheet. */
type Run = { balls: number; cleared: boolean };

function PerformanceSheet({
  drill,
  practiceSeconds,
  breakSeconds,
  onSaved,
}: {
  drill: Drill;
  practiceSeconds: number;
  breakSeconds: number;
  onSaved: () => void;
}) {
  if (drill.sheet_type === "progressive") {
    return (
      <ProgressiveSheet
        drill={drill}
        practiceSeconds={practiceSeconds}
        breakSeconds={breakSeconds}
        onSaved={onSaved}
      />
    );
  }

  if (drill.sheet_type === "shot_attempt") {
    return (
      <ShotAttemptSheet
        drill={drill}
        practiceSeconds={practiceSeconds}
        breakSeconds={breakSeconds}
        onSaved={onSaved}
      />
    );
  }

  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>Performance</p>
      <div className={styles.rule} aria-hidden="true" />
      <p className={styles.unsupported}>
        This drill uses a performance sheet the project owner has not supplied yet.
      </p>
    </section>
  );
}

/* — shot attempt: a fixed number of single shots — */

function ShotAttemptSheet({
  drill,
  practiceSeconds,
  breakSeconds,
  onSaved,
}: {
  drill: Drill;
  practiceSeconds: number;
  breakSeconds: number;
  onSaved: () => void;
}) {
  const total = Math.max(1, drill.sheet_config?.total_shots ?? 20);
  const [shots, setShots] = useState<Shot[]>([]);
  const { saving, message, save } = useSaveSession();

  const made = shots.filter((s) => s === "made").length;
  const missed = shots.length - made;
  const remaining = Math.max(0, total - shots.length);
  const percentage = shots.length > 0 ? (made / shots.length) * 100 : null;
  const complete = shots.length >= total;

  function record(shot: Shot) {
    // Functional update: taps come fast at the table and React batches them,
    // so the limit has to be checked against the queued value, not a closure.
    setShots((current) => (current.length >= total ? current : [...current, shot]));
  }

  async function handleSave() {
    if (shots.length === 0) return;
    await save({
      drill,
      practiceSeconds,
      breakSeconds,
      performance: {
        total_shots: shots.length,
        successful_shots: made,
        failed_shots: missed,
      },
      percentage: (made / shots.length) * 100,
      onSaved: () => {
        setShots([]);
        onSaved();
      },
    });
  }

  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>Performance sheet</p>
      <div className={styles.rule} aria-hidden="true" />

      <div className={styles.sheet}>
        <div className={styles.tallyStatus}>
          <span className={styles.tallyProgress}>
            {complete
              ? `All ${total} shots recorded`
              : `Shot ${shots.length + 1} of ${total}`}
          </span>
          <button
            type="button"
            className={styles.tallyUndo}
            onClick={() => setShots((current) => current.slice(0, -1))}
            disabled={shots.length === 0}
          >
            <ArrowCounterClockwise size={13} />
            Undo
          </button>
        </div>

        <div className={styles.tallyRow}>
          <button
            type="button"
            className={`${styles.tally} ${styles.tallyMade}`}
            onClick={() => record("made")}
            disabled={complete}
          >
            <Check size={26} weight="bold" />
            <span className={styles.tallyCount}>{made}</span>
            Made
          </button>
          <button
            type="button"
            className={`${styles.tally} ${styles.tallyMiss}`}
            onClick={() => record("miss")}
            disabled={complete}
          >
            <X size={26} weight="bold" />
            <span className={styles.tallyCount}>{missed}</span>
            Missed
          </button>
        </div>

        {shots.length > 0 && (
          <div className={styles.shotStrip} aria-hidden="true">
            {shots.map((shot, index) => (
              <span
                key={index}
                className={`${styles.shotPip} ${
                  shot === "made" ? styles.shotPipMade : styles.shotPipMiss
                }`}
              />
            ))}
            {Array.from({ length: remaining }, (_, index) => (
              <span key={`rest-${index}`} className={styles.shotPip} />
            ))}
          </div>
        )}

        <div className={styles.result}>
          <span className={styles.resultLabel}>Success</span>
          <span
            className={`${styles.resultValue} ${
              percentage === null ? styles.resultValueEmpty : ""
            }`}
          >
            {percentage === null ? "Not started" : `${formatPercent(percentage)}%`}
          </span>
        </div>

        {message && (
          <p className={styles.sheetMessage} role="status">
            {message}
          </p>
        )}

        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={shots.length === 0 || saving}
        >
          {saving ? "Saving…" : `Save ${shots.length} shot${shots.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </section>
  );
}

/* — progressive: many balls, and the attempt only counts when the table is
     cleared without a miss — */

function ProgressiveSheet({
  drill,
  practiceSeconds,
  breakSeconds,
  onSaved,
}: {
  drill: Drill;
  practiceSeconds: number;
  breakSeconds: number;
  onSaved: () => void;
}) {
  const perRack = drill.sheet_config?.balls_per_rack;
  // Runs and the open run live in one piece of state so every tap can be a
  // pure functional update. Tapping quickly through a run would otherwise
  // batch several taps against the same stale value and lose all but one.
  const [tally, setTally] = useState<{ runs: Run[]; current: number }>({
    runs: [],
    current: 0,
  });
  const { runs, current } = tally;
  const { saving, message, save } = useSaveSession();

  const attempts = runs.length;
  const clearances = runs.filter((run) => run.cleared).length;
  const bestRun = runs.reduce((best, run) => Math.max(best, run.balls), current);
  const totalBalls = runs.reduce((sum, run) => sum + run.balls, 0) + current;
  const percentage = attempts > 0 ? (clearances / attempts) * 100 : null;

  /** A pot. When the rack size is known, clearing it closes the attempt. */
  function pot() {
    setTally((state) => {
      const next = state.current + 1;
      if (perRack && next >= perRack) {
        return {
          runs: [...state.runs, { balls: next, cleared: true }],
          current: 0,
        };
      }
      return { ...state, current: next };
    });
  }

  function miss() {
    setTally((state) => ({
      runs: [...state.runs, { balls: state.current, cleared: false }],
      current: 0,
    }));
  }

  function clearTable() {
    setTally((state) =>
      state.current === 0
        ? state
        : { runs: [...state.runs, { balls: state.current, cleared: true }], current: 0 },
    );
  }

  /** Undo steps back through the open run first, then reopens the last
   *  finished attempt. */
  function undo() {
    setTally((state) => {
      if (state.current > 0) return { ...state, current: state.current - 1 };
      const last = state.runs.at(-1);
      if (!last) return state;
      return { runs: state.runs.slice(0, -1), current: last.balls };
    });
  }

  async function handleSave() {
    if (attempts === 0) return;
    await save({
      drill,
      practiceSeconds,
      breakSeconds,
      performance: {
        attempts,
        clearances,
        best_run: runs.reduce((best, run) => Math.max(best, run.balls), 0),
        total_balls: runs.reduce((sum, run) => sum + run.balls, 0),
        runs: runs.map((run) => run.balls),
      },
      percentage: (clearances / attempts) * 100,
      onSaved: () => {
        setTally({ runs: [], current: 0 });
        onSaved();
      },
    });
  }

  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>Performance sheet</p>
      <div className={styles.rule} aria-hidden="true" />

      <div className={styles.sheet}>
        <div className={styles.tallyStatus}>
          <span className={styles.tallyProgress}>
            {perRack
              ? `Attempt ${attempts + 1} · ${current} of ${perRack} potted`
              : `Attempt ${attempts + 1} · ${current} potted`}
          </span>
          <button
            type="button"
            className={styles.tallyUndo}
            onClick={undo}
            disabled={current === 0 && runs.length === 0}
          >
            <ArrowCounterClockwise size={13} />
            Undo
          </button>
        </div>

        <div className={styles.tallyRow}>
          <button
            type="button"
            className={`${styles.tally} ${styles.tallyMade}`}
            onClick={pot}
          >
            <Check size={26} weight="bold" />
            <span className={styles.tallyCount}>{current}</span>
            Potted
          </button>
          <button
            type="button"
            className={`${styles.tally} ${styles.tallyMiss}`}
            onClick={miss}
          >
            <X size={26} weight="bold" />
            <span className={styles.tallyCount}>{attempts - clearances}</span>
            Missed
          </button>
        </div>

        {/* With no fixed rack size the player says when the table is clear. */}
        {!perRack && (
          <button
            type="button"
            className={styles.tallyWide}
            onClick={clearTable}
            disabled={current === 0}
          >
            <Trophy size={16} weight="fill" />
            Table cleared
          </button>
        )}

        {(runs.length > 0 || current > 0) && (
          <div className={styles.runStrip}>
            {runs.map((run, index) => (
              <span
                key={index}
                className={`${styles.runPip} ${run.cleared ? styles.runPipCleared : ""}`}
                title={run.cleared ? "Cleared" : "Missed"}
              >
                {run.balls}
              </span>
            ))}
            {current > 0 && (
              <span className={`${styles.runPip} ${styles.runPipCurrent}`}>{current}</span>
            )}
          </div>
        )}

        <div className={styles.sheetRow}>
          <span className={styles.sheetLabel}>Tables cleared</span>
          <span className={styles.sheetValue}>
            {clearances} of {attempts}
          </span>
        </div>
        <div className={styles.sheetRow}>
          <span className={styles.sheetLabel}>Best run</span>
          <span className={styles.sheetValue}>{bestRun}</span>
        </div>
        <div className={styles.sheetRow}>
          <span className={styles.sheetLabel}>Balls potted</span>
          <span className={styles.sheetValue}>{totalBalls}</span>
        </div>

        <div className={styles.result}>
          <span className={styles.resultLabel}>Cleared</span>
          <span
            className={`${styles.resultValue} ${
              percentage === null ? styles.resultValueEmpty : ""
            }`}
          >
            {percentage === null ? "Not started" : `${formatPercent(percentage)}%`}
          </span>
        </div>

        {message && (
          <p className={styles.sheetMessage} role="status">
            {message}
          </p>
        )}

        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={attempts === 0 || saving}
        >
          {saving
            ? "Saving…"
            : `Save ${attempts} attempt${attempts === 1 ? "" : "s"}`}
        </button>
      </div>
    </section>
  );
}

/* — shared save path — */

function useSaveSession() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save({
    drill,
    practiceSeconds,
    breakSeconds,
    performance,
    percentage,
    onSaved,
  }: {
    drill: Drill;
    practiceSeconds: number;
    breakSeconds: number;
    performance: Record<string, unknown>;
    percentage: number;
    onSaved: () => void;
  }) {
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Your session expired. Sign in again to save this result.");
      return;
    }

    const { error } = await supabase.from("practice_sessions").insert({
      player_id: user.id,
      category_id: drill.category_id,
      drill_id: drill.id,
      practice_duration_seconds: practiceSeconds,
      break_duration_seconds: breakSeconds,
      sheet_type: drill.sheet_type,
      performance,
      result_percentage: Number(percentage.toFixed(2)),
    });

    setSaving(false);

    if (error) {
      setMessage(`That didn't save: ${error.message}`);
      return;
    }

    setMessage("Session saved.");
    onSaved();
  }

  return { saving, message, save };
}

/* ── helpers ────────────────────────────────────────────────────────────── */

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
