import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildDemoSelection,
  buildPrompt,
  extractJson,
  OPENROUTER_MODEL,
  OPENROUTER_URL,
  validateAiProgram,
  type AiRequest,
  type DrillOption,
} from "@/lib/ai-program";
import type { Ability } from "@/lib/types";

/**
 * Generate a program proposal.
 *
 * Everything that matters happens on the server: the catalogue is read here,
 * the model only ever sees drills that exist, and its answer is validated
 * against those ids before anything is returned. Nothing is saved by this
 * route — the player reviews the proposal first.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  let body: {
    ability?: Ability;
    focusSkills?: string[];
    daysPerWeek?: number;
    sessionMinutes?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const ability: Ability =
    body.ability === "intermediate" || body.ability === "advanced"
      ? body.ability
      : "beginner";

  // The catalogue the model may choose from, read server-side so the client
  // cannot widen it.
  const { data: drills } = await supabase
    .from("drills")
    .select("id, name, duration_minutes, short_objective, categories(name), levels(level_number)")
    .eq("is_published", true)
    .not("level_id", "is", null);

  const options: DrillOption[] = (drills ?? []).map((d) => {
    const row = d as unknown as {
      id: string;
      name: string;
      duration_minutes: number;
      short_objective: string | null;
      categories: { name: string } | null;
      levels: { level_number: number } | null;
    };
    return {
      id: row.id,
      name: row.name,
      category: row.categories?.name ?? "",
      level: row.levels?.level_number ?? 0,
      duration_minutes: row.duration_minutes,
      short_objective: row.short_objective,
    };
  });

  if (options.length === 0) {
    return NextResponse.json({ error: "The drill library is empty." }, { status: 409 });
  }

  const aiRequest: AiRequest = {
    ability,
    focusSkills: Array.isArray(body.focusSkills) ? body.focusSkills.slice(0, 6) : [],
    daysPerWeek: clamp(body.daysPerWeek ?? 3, 1, 7),
    sessionMinutes: clamp(body.sessionMinutes ?? 30, 10, 180),
  };

  const allowed = new Set(options.map((o) => o.id));
  const byId = new Map(options.map((o) => [o.id, o]));

  // Without a key the selection is made here instead. It goes through exactly
  // the same validation, so wiring up the model later changes nothing else.
  if (!apiKey) {
    const demo = validateAiProgram(buildDemoSelection(aiRequest, options), allowed);
    if (!demo.ok) {
      return NextResponse.json({ error: demo.reason }, { status: 422 });
    }
    return NextResponse.json({
      source: "demo",
      name: demo.program.name,
      // The note travels with the saved program, so a rule-made selection is
      // never mistaken later for something a model chose.
      objective: `${demo.program.objective} Built in demo mode: drills chosen by rule, not by a model.`,
      ability,
      drills: demo.program.selections.map((s) => ({ ...s, drill: byId.get(s.drill_id) })),
    });
  }

  const prompt = buildPrompt(aiRequest, options);

  let content = "";
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `The model service returned ${response.status}. Try again.` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    content = payload.choices?.[0]?.message?.content ?? "";
  } catch {
    return NextResponse.json(
      { error: "Could not reach the model service. Check your connection and try again." },
      { status: 504 },
    );
  }

  const result = validateAiProgram(extractJson(content), allowed);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  // Return the proposal with drill detail attached, for review before saving.
  return NextResponse.json({
    source: "ai",
    name: result.program.name,
    objective: result.program.objective,
    ability,
    drills: result.program.selections.map((s) => ({
      ...s,
      drill: byId.get(s.drill_id),
    })),
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value) || min, min), max);
}
