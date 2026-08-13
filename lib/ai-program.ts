import type { Ability } from "@/lib/types";

/** What the model is allowed to know about a drill when choosing. */
export type DrillOption = {
  id: string;
  name: string;
  category: string;
  level: number;
  duration_minutes: number;
  short_objective: string | null;
};

export type AiRequest = {
  ability: Ability;
  focusSkills: string[];
  daysPerWeek: number;
  sessionMinutes: number;
};

export type AiSelection = { drill_id: string; reason: string };

export type ValidatedProgram = {
  name: string;
  objective: string;
  selections: AiSelection[];
};

export type ValidationFailure = { ok: false; reason: string };
export type ValidationSuccess = { ok: true; program: ValidatedProgram };

const MAX_DRILLS = 12;
const MIN_DRILLS = 3;

/**
 * Check a model response before any of it is saved.
 *
 * The model is a suggestion engine over a fixed catalogue, never a source of
 * content. Anything it returns that is not an existing drill id is dropped, and
 * a response that cannot supply enough real drills is rejected outright rather
 * than saved half-valid. This is the only thing standing between a hallucinated
 * id and a player's training program.
 */
export function validateAiProgram(
  raw: unknown,
  allowedDrillIds: Set<string>,
): ValidationSuccess | ValidationFailure {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "The model did not return a program." };
  }

  const candidate = raw as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const objective =
    typeof candidate.objective === "string" ? candidate.objective.trim() : "";

  if (!Array.isArray(candidate.drills)) {
    return { ok: false, reason: "The model did not return a list of drills." };
  }

  const seen = new Set<string>();
  const selections: AiSelection[] = [];

  for (const entry of candidate.drills) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    const drillId = typeof row.drill_id === "string" ? row.drill_id : null;

    // Unknown or invented ids are dropped, never stored.
    if (!drillId || !allowedDrillIds.has(drillId) || seen.has(drillId)) continue;

    seen.add(drillId);
    selections.push({
      drill_id: drillId,
      reason:
        typeof row.reason === "string" && row.reason.trim()
          ? row.reason.trim().slice(0, 200)
          : "Selected for your focus areas",
    });

    if (selections.length >= MAX_DRILLS) break;
  }

  if (selections.length < MIN_DRILLS) {
    return {
      ok: false,
      reason: `Only ${selections.length} of the suggested drills exist in the library. Try again.`,
    };
  }

  return {
    ok: true,
    program: {
      name: name.slice(0, 60) || "My AI program",
      objective: objective.slice(0, 240) || "A program built around your focus areas.",
      selections,
    },
  };
}

/** The instruction sent to the model. Deliberately narrow: choose from this
 *  list, return these fields, invent nothing. */
export function buildPrompt(request: AiRequest, options: DrillOption[]): string {
  const catalogue = options
    .map(
      (d) =>
        `${d.id} | ${d.name} | ${d.category} | level ${d.level} | ${d.duration_minutes} min | ${d.short_objective ?? ""}`,
    )
    .join("\n");

  return [
    "You are selecting billiards practice drills for one player.",
    "",
    `Ability: ${request.ability}`,
    `Wants to improve: ${request.focusSkills.join(", ") || "general play"}`,
    `Practice days per week: ${request.daysPerWeek}`,
    `Session length: about ${request.sessionMinutes} minutes`,
    "",
    "Choose only from these drills. Each line is: id | name | category | level | duration | objective",
    catalogue,
    "",
    "Rules:",
    "- Use only drill ids from the list above. Do not invent drills or ids.",
    "- Choose between 4 and 10 drills that fit the session length and focus.",
    "- Order them so a session builds sensibly.",
    "- Give each a short reason, one sentence, in plain language.",
    "",
    "Respond with JSON only, in this exact shape:",
    '{"name":"...","objective":"...","drills":[{"drill_id":"...","reason":"..."}]}',
  ].join("\n");
}

export const OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Pull the JSON object out of a reply that may be wrapped in prose or fences. */
export function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : content).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
