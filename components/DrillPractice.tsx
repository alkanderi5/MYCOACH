"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Pause, Play, Stop } from "@phosphor-icons/react";
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
  const configuredTotal = drill.sheet_config?.total_shots ?? 20;

  const [totalShots, setTotalShots] = useState(String(configuredTotal));
  const [successful, setSuccessful] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (drill.sheet_type !== "shot_attempt") {
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

  const total = Number(totalShots);
  const made = Number(successful);
  const totalValid = Number.isInteger(total) && total > 0;
  const madeEntered = successful.trim() !== "";
  const madeValid =
    madeEntered && Number.isInteger(made) && made >= 0 && (!totalValid || made <= total);

  const failed = totalValid && madeValid ? total - made : null;
  const percentage = totalValid && madeValid ? (made / total) * 100 : null;

  const canSave = totalValid && madeValid && !saving;

  async function handleSave() {
    if (!canSave || percentage === null || failed === null) return;

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
      sheet_type: "shot_attempt",
      performance: {
        total_shots: total,
        successful_shots: made,
        failed_shots: failed,
      },
      result_percentage: Number(percentage.toFixed(2)),
    });

    setSaving(false);

    if (error) {
      setMessage(`That didn't save: ${error.message}`);
      return;
    }

    setSuccessful("");
    setTotalShots(String(configuredTotal));
    setMessage("Session saved.");
    onSaved();
  }

  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>Performance sheet</p>
      <div className={styles.rule} aria-hidden="true" />

      <div className={styles.sheet}>
        <div className={styles.sheetRow}>
          <label className={styles.sheetLabel} htmlFor="total-shots">
            Total shots attempted
          </label>
          <input
            id="total-shots"
            className={`${styles.sheetInput} ${!totalValid ? styles.sheetInputInvalid : ""}`}
            type="number"
            min={1}
            inputMode="numeric"
            value={totalShots}
            onChange={(e) => setTotalShots(e.target.value)}
          />
        </div>

        <div className={styles.sheetRow}>
          <label className={styles.sheetLabel} htmlFor="successful-shots">
            Successful shots
          </label>
          <input
            id="successful-shots"
            className={`${styles.sheetInput} ${
              madeEntered && !madeValid ? styles.sheetInputInvalid : ""
            }`}
            type="number"
            min={0}
            max={totalValid ? total : undefined}
            inputMode="numeric"
            value={successful}
            onChange={(e) => setSuccessful(e.target.value)}
            aria-describedby="sheet-message"
          />
        </div>

        <div className={styles.sheetRow}>
          <span className={styles.sheetLabel}>Failed shots</span>
          <span className={styles.sheetValue}>{failed ?? "—"}</span>
        </div>

        <div className={styles.result}>
          <span className={styles.resultLabel}>Success</span>
          <span
            className={`${styles.resultValue} ${
              percentage === null ? styles.resultValueEmpty : ""
            }`}
          >
            {percentage === null ? "Not entered" : `${formatPercent(percentage)}%`}
          </span>
        </div>

        {(madeEntered && !madeValid) || !totalValid ? (
          <p className={styles.sheetMessage} id="sheet-message">
            {!totalValid
              ? "Total shots must be a whole number above zero."
              : made > total
                ? "Successful shots can't be more than the total attempted."
                : "Successful shots must be a whole number of zero or more."}
          </p>
        ) : (
          message && (
            <p className={styles.sheetMessage} id="sheet-message" role="status">
              {message}
            </p>
          )
        )}

        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? "Saving…" : "Save session"}
        </button>
      </div>
    </section>
  );
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
