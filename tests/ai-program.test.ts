import { describe, expect, it } from "vitest";
import { extractJson, validateAiProgram } from "@/lib/ai-program";

const REAL = new Set(["drill-a", "drill-b", "drill-c", "drill-d"]);

const proposal = (drills: unknown) => ({
  name: "Focus on potting",
  objective: "Tighten up the long game",
  drills,
});

describe("AI response validation", () => {
  it("accepts a response built entirely from real drills", () => {
    const result = validateAiProgram(
      proposal([
        { drill_id: "drill-a", reason: "Straight potting first" },
        { drill_id: "drill-b", reason: "Then at range" },
        { drill_id: "drill-c", reason: "Finish under pressure" },
      ]),
      REAL,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.program.selections.map((s) => s.drill_id)).toEqual([
        "drill-a",
        "drill-b",
        "drill-c",
      ]);
      expect(result.program.name).toBe("Focus on potting");
    }
  });

  it("drops invented drill ids rather than storing them", () => {
    const result = validateAiProgram(
      proposal([
        { drill_id: "drill-a", reason: "real" },
        { drill_id: "totally-made-up", reason: "hallucinated" },
        { drill_id: "drill-b", reason: "real" },
        { drill_id: "drill-c", reason: "real" },
      ]),
      REAL,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = result.program.selections.map((s) => s.drill_id);
      expect(ids).not.toContain("totally-made-up");
      expect(ids).toHaveLength(3);
    }
  });

  it("rejects a response when too few real drills survive", () => {
    const result = validateAiProgram(
      proposal([
        { drill_id: "nope-1", reason: "" },
        { drill_id: "nope-2", reason: "" },
        { drill_id: "drill-a", reason: "" },
      ]),
      REAL,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/exist in the library/i);
  });

  it("ignores duplicates so a drill cannot be listed twice", () => {
    const result = validateAiProgram(
      proposal([
        { drill_id: "drill-a", reason: "" },
        { drill_id: "drill-a", reason: "" },
        { drill_id: "drill-b", reason: "" },
        { drill_id: "drill-c", reason: "" },
      ]),
      REAL,
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.program.selections).toHaveLength(3);
  });

  it("rejects a response that is not a program at all", () => {
    expect(validateAiProgram(null, REAL).ok).toBe(false);
    expect(validateAiProgram("a program, honest", REAL).ok).toBe(false);
    expect(validateAiProgram({ name: "x" }, REAL).ok).toBe(false);
  });

  it("supplies a reason when the model omits one", () => {
    const result = validateAiProgram(
      proposal([
        { drill_id: "drill-a" },
        { drill_id: "drill-b" },
        { drill_id: "drill-c" },
      ]),
      REAL,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.program.selections[0].reason).toBeTruthy();
  });
});

describe("reading the model's reply", () => {
  it("reads plain JSON", () => {
    expect(extractJson('{"name":"x","drills":[]}')).toEqual({ name: "x", drills: [] });
  });

  it("reads JSON inside a fenced block", () => {
    const reply = 'Here you go:\n```json\n{"name":"x","drills":[]}\n```\nHope that helps.';
    expect(extractJson(reply)).toEqual({ name: "x", drills: [] });
  });

  it("returns null for a reply with no JSON in it", () => {
    expect(extractJson("I cannot help with that.")).toBeNull();
  });
});

describe("demo selection", () => {
  const options = [
    { id: "b1", name: "Short pots", category: "Single Shots", level: 1, duration_minutes: 10, short_objective: null },
    { id: "b2", name: "Lag", category: "Speed", level: 1, duration_minutes: 10, short_objective: null },
    { id: "b3", name: "Parking", category: "Position", level: 2, duration_minutes: 10, short_objective: null },
    { id: "b4", name: "Stop shot", category: "Tip Position", level: 2, duration_minutes: 10, short_objective: null },
    { id: "b5", name: "Baulk safety", category: "Safety Shots", level: 3, duration_minutes: 10, short_objective: null },
    { id: "a1", name: "Thin cut", category: "Single Shots", level: 9, duration_minutes: 20, short_objective: null },
    { id: "a2", name: "Diagonal", category: "Long Shots", level: 9, duration_minutes: 20, short_objective: null },
  ];

  it("only ever picks drills that exist", async () => {
    const { buildDemoSelection } = await import("@/lib/ai-program");
    const result = buildDemoSelection(
      { ability: "beginner", focusSkills: ["Potting"], daysPerWeek: 3, sessionMinutes: 30 },
      options,
    );
    const ids = new Set(options.map((o) => o.id));
    for (const pick of result.drills) expect(ids.has(pick.drill_id)).toBe(true);
  });

  it("stays inside the chosen ability's levels", async () => {
    const { buildDemoSelection } = await import("@/lib/ai-program");
    const result = buildDemoSelection(
      { ability: "beginner", focusSkills: [], daysPerWeek: 3, sessionMinutes: 30 },
      options,
    );
    const byId = new Map(options.map((o) => [o.id, o]));
    for (const pick of result.drills) {
      expect(byId.get(pick.drill_id)!.level).toBeLessThanOrEqual(3);
    }
  });

  it("puts the requested skill first", async () => {
    const { buildDemoSelection } = await import("@/lib/ai-program");
    const result = buildDemoSelection(
      { ability: "beginner", focusSkills: ["Safety"], daysPerWeek: 3, sessionMinutes: 20 },
      options,
    );
    expect(result.drills[0].drill_id).toBe("b5");
    expect(result.drills[0].reason).toMatch(/safety/i);
  });

  it("produces something the validator accepts", async () => {
    const { buildDemoSelection, validateAiProgram } = await import("@/lib/ai-program");
    const proposal = buildDemoSelection(
      { ability: "beginner", focusSkills: ["Potting"], daysPerWeek: 3, sessionMinutes: 40 },
      options,
    );
    const checked = validateAiProgram(proposal, new Set(options.map((o) => o.id)));
    expect(checked.ok).toBe(true);
  });
});
