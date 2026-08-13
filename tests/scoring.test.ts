import { describe, expect, it } from "vitest";
import {
  attemptPasses,
  drillIsPassed,
  normalizeScore,
  validateAttempts,
} from "@/lib/progression/scoring";
import type { PassingRule } from "@/lib/types";

const MIN_70: PassingRule = {
  type: "min_percentage",
  value: 70,
  of_recent: 3,
  required_passes: 2,
};

describe("percentage calculations", () => {
  it("scores an attempts sheet", () => {
    expect(normalizeScore("attempts", { total_attempts: 20, successful_attempts: 13 })).toBe(65);
  });

  it("returns null rather than dividing by zero", () => {
    expect(normalizeScore("attempts", { total_attempts: 0, successful_attempts: 0 })).toBeNull();
  });

  it("maps completion onto the same 0-100 scale", () => {
    expect(normalizeScore("completion", { completed: true, attempts: 2 })).toBe(100);
    expect(normalizeScore("completion", { completed: false, attempts: 2 })).toBe(0);
  });

  it("caps a best run at the target rather than exceeding 100", () => {
    expect(
      normalizeScore("best_run", { runs_attempted: 3, best_run: 9 }, { target_run: 6 }),
    ).toBe(100);
    expect(
      normalizeScore("best_run", { runs_attempted: 3, best_run: 3 }, { target_run: 6 }),
    ).toBe(50);
  });
});

describe("sets aggregation", () => {
  it("aggregates from every attempt, not by averaging percentages", () => {
    // Averaging the two set percentages would give 75; weighting by attempts
    // gives 60, which is the honest figure.
    const raw = {
      sets: [
        { total: 2, successful: 2 }, // 100%
        { total: 8, successful: 4 }, //  50%
      ],
    };
    expect(normalizeScore("sets", raw)).toBe(60);
  });

  it("ignores an empty set list", () => {
    expect(normalizeScore("sets", { sets: [] })).toBeNull();
  });
});

describe("passing rules", () => {
  it("passes an attempt that meets the percentage", () => {
    expect(attemptPasses(MIN_70, { total_attempts: 10, successful_attempts: 7 }, 70)).toBe(true);
    expect(attemptPasses(MIN_70, { total_attempts: 10, successful_attempts: 6 }, 60)).toBe(false);
  });

  it("passes a run that reaches the target", () => {
    const rule: PassingRule = { type: "target_run", value: 5, of_recent: 3, required_passes: 2 };
    expect(attemptPasses(rule, { runs_attempted: 4, best_run: 5 }, 100)).toBe(true);
    expect(attemptPasses(rule, { runs_attempted: 4, best_run: 4 }, 80)).toBe(false);
  });
});

describe("two-of-three rule", () => {
  it("does not pass a drill on one lucky result", () => {
    const attempts = [{ passed: true }, { passed: false }, { passed: false }];
    expect(drillIsPassed(MIN_70, attempts)).toBe(false);
  });

  it("passes when the target is met twice in the last three", () => {
    const attempts = [{ passed: true }, { passed: false }, { passed: true }];
    expect(drillIsPassed(MIN_70, attempts)).toBe(true);
  });

  it("only looks at the most recent attempts", () => {
    // Two passes, but they are older than the window.
    const attempts = [
      { passed: false },
      { passed: false },
      { passed: false },
      { passed: true },
      { passed: true },
    ];
    expect(drillIsPassed(MIN_70, attempts)).toBe(false);
  });
});

describe("validation", () => {
  it("rejects impossible results", () => {
    expect(validateAttempts(10, 11)).toMatch(/cannot exceed/i);
    expect(validateAttempts(0, 0)).toMatch(/above zero/i);
    expect(validateAttempts(10, -1)).toMatch(/negative/i);
  });

  it("accepts a valid result", () => {
    expect(validateAttempts(10, 7)).toBeNull();
  });
});
