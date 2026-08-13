export type TimerPhase = "idle" | "practice" | "break" | "practice_done" | "break_done";

export type TimerSnapshot = {
  phase: TimerPhase;
  /** Seconds left in the current phase. */
  remaining: number;
  /** Seconds actually spent practising so far. */
  practised: number;
};

export type TimerState = {
  startedAt: number;
  practiceSeconds: number;
  breakSeconds: number;
  /** Set when paused; time spent paused is excluded from the countdown. */
  pausedAt?: number | null;
  pausedTotal?: number;
};

/**
 * Where the timer is, computed from stored timestamps rather than counted by
 * an interval.
 *
 * A phone locks the screen and a background tab is throttled, so a tick-based
 * timer drifts or stops. Deriving from the start time means the clock is right
 * however long the app was away, and a session can be restored after a reload.
 */
export function timerSnapshot(state: TimerState, now: number): TimerSnapshot {
  const paused = state.pausedTotal ?? 0;
  const frozen = state.pausedAt ? now - state.pausedAt : 0;
  const elapsed = Math.max(0, Math.floor((now - state.startedAt - paused - frozen) / 1000));

  const { practiceSeconds, breakSeconds } = state;

  if (elapsed < practiceSeconds) {
    return {
      phase: "practice",
      remaining: practiceSeconds - elapsed,
      practised: elapsed,
    };
  }

  // Practice is done. With no break configured it simply waits.
  if (breakSeconds <= 0) {
    return { phase: "practice_done", remaining: 0, practised: practiceSeconds };
  }

  const intoBreak = elapsed - practiceSeconds;
  if (intoBreak < breakSeconds) {
    return {
      phase: "break",
      remaining: breakSeconds - intoBreak,
      practised: practiceSeconds,
    };
  }

  return { phase: "break_done", remaining: 0, practised: practiceSeconds };
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}
