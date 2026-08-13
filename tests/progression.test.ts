import { describe, expect, it } from "vitest";
import { computeLevelStatuses, levelProgressPercentage } from "@/lib/progression/level";
import { recommendNext } from "@/lib/progression/recommendation";
import { trendFor } from "@/lib/progression/trend";
import { timerSnapshot } from "@/lib/progression/timer";
import type { Drill, DrillAttempt, DrillProgress } from "@/lib/types";

const drill = (id: string, required = true): Drill =>
  ({
    id,
    level_id: "L1",
    category_id: "C1",
    name: id,
    slug: id,
    short_objective: null,
    learning_outcome: null,
    setup_instructions: null,
    execution_instructions: null,
    success_condition_text: null,
    image_url: null,
    optional_video_url: null,
    sheet_template_type: "attempts",
    sheet_configuration: { total_attempts: 10 },
    passing_rule: { type: "min_percentage", value: 70, of_recent: 3, required_passes: 2 },
    is_required: required,
    sort_order: 0,
    duration_minutes: 10,
    setup: null,
  }) as Drill;

const progressOf = (entries: Partial<DrillProgress>[]): Map<string, DrillProgress> =>
  new Map(
    entries.map((e) => [
      e.drill_id!,
      {
        drill_id: e.drill_id!,
        status: e.status ?? "not_started",
        best_normalized_score: e.best_normalized_score ?? null,
        attempt_count: e.attempt_count ?? 0,
        passed_at: null,
      },
    ]),
  );

describe("level progress", () => {
  it("counts required drills only, so optional work never blocks a level", () => {
    const drills = [drill("a"), drill("b"), drill("c", false)];
    const progress = progressOf([{ drill_id: "a", status: "passed" }]);
    expect(levelProgressPercentage(drills, progress)).toBe(50);
  });

  it("is zero when a level has no required drills", () => {
    expect(levelProgressPercentage([drill("a", false)], new Map())).toBe(0);
  });
});

describe("unlocking", () => {
  const levels = [
    { id: "L1", level_number: 1 },
    { id: "L2", level_number: 2 },
    { id: "L3", level_number: 3 },
  ];
  const byLevel = new Map([
    ["L1", [drill("a")]],
    ["L2", [drill("b")]],
    ["L3", [drill("c")]],
  ]);

  it("opens level 1 and locks the rest for a new player", () => {
    const statuses = computeLevelStatuses(levels, byLevel, new Map());
    expect(statuses.get("L1")?.status).toBe("current");
    expect(statuses.get("L2")?.status).toBe("locked");
    expect(statuses.get("L3")?.status).toBe("locked");
  });

  it("unlocks the next level only when the one before is complete", () => {
    const statuses = computeLevelStatuses(
      levels,
      byLevel,
      progressOf([{ drill_id: "a", status: "passed" }]),
    );
    expect(statuses.get("L1")?.status).toBe("completed");
    expect(statuses.get("L2")?.status).toBe("current");
    expect(statuses.get("L3")?.status).toBe("locked");
  });
});

describe("next-drill recommendation priority", () => {
  const drills = [drill("a"), drill("b")];

  it("resumes an unfinished session before anything else", () => {
    const result = recommendNext({
      drills,
      progress: new Map(),
      attemptsByDrill: new Map(),
      activeSession: { id: "S1", drill_id: "b" },
    });
    expect(result.kind).toBe("resume");
    expect(result.drill?.id).toBe("b");
    expect(result.sessionId).toBe("S1");
  });

  it("prefers a drill close to passing over an untouched one", () => {
    const result = recommendNext({
      drills,
      progress: progressOf([
        { drill_id: "a", status: "in_progress", best_normalized_score: 65, attempt_count: 2 },
      ]),
      attemptsByDrill: new Map(),
      activeSession: null,
    });
    expect(result.kind).toBe("close_to_passing");
    expect(result.drill?.id).toBe("a");
  });

  it("falls back to the next drill never attempted", () => {
    const result = recommendNext({
      drills,
      progress: progressOf([{ drill_id: "a", status: "passed" }]),
      attemptsByDrill: new Map(),
      activeSession: null,
    });
    expect(result.kind).toBe("next_unattempted");
    expect(result.drill?.id).toBe("b");
  });

  it("reports the level complete when every required drill is passed", () => {
    const result = recommendNext({
      drills,
      progress: progressOf([
        { drill_id: "a", status: "passed" },
        { drill_id: "b", status: "passed" },
      ]),
      attemptsByDrill: new Map(),
      activeSession: null,
    });
    expect(result.kind).toBe("level_complete");
    expect(result.drill).toBeNull();
  });
});

describe("trend", () => {
  const attempt = (score: number, template = "attempts") =>
    ({ normalized_score: score, template_type: template }) as DrillAttempt;

  it("says nothing until there is enough to compare", () => {
    expect(trendFor([attempt(50), attempt(60)]).direction).toBe("unknown");
  });

  it("detects improvement beyond the threshold", () => {
    const attempts = [
      attempt(80), attempt(78), attempt(82),
      attempt(60), attempt(58), attempt(62),
    ];
    expect(trendFor(attempts).direction).toBe("improving");
  });

  it("treats small movement as stable", () => {
    const attempts = [
      attempt(61), attempt(60), attempt(62),
      attempt(60), attempt(59), attempt(61),
    ];
    expect(trendFor(attempts).direction).toBe("stable");
  });

  it("never compares incompatible templates", () => {
    // The recent three are a different sheet from the older ones, so there is
    // nothing comparable behind them.
    const attempts = [
      attempt(90, "best_run"), attempt(88, "best_run"), attempt(92, "best_run"),
      attempt(40), attempt(42), attempt(38),
    ];
    expect(trendFor(attempts).direction).toBe("unknown");
  });
});

describe("timer restoration from timestamps", () => {
  const base = { startedAt: 0, practiceSeconds: 600, breakSeconds: 300 };

  it("computes the phase from elapsed time, not from ticks", () => {
    expect(timerSnapshot(base, 60_000).remaining).toBe(540);
    expect(timerSnapshot(base, 60_000).phase).toBe("practice");
  });

  it("is correct after the tab was asleep across a phase change", () => {
    const snapshot = timerSnapshot(base, 700_000);
    expect(snapshot.phase).toBe("break");
    expect(snapshot.remaining).toBe(200);
    expect(snapshot.practised).toBe(600);
  });

  it("ends after practice when no break was chosen", () => {
    const snapshot = timerSnapshot({ ...base, breakSeconds: 0 }, 700_000);
    expect(snapshot.phase).toBe("practice_done");
  });

  it("excludes paused time from the countdown", () => {
    const paused = { ...base, pausedTotal: 120_000 };
    expect(timerSnapshot(paused, 300_000).remaining).toBe(420);
  });
});
