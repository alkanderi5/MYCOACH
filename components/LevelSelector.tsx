"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEVELS, LEVEL_LABEL, type Level } from "@/lib/types";
import styles from "./browse.module.css";

/** The player's level comes from their profile and is preselected, but they
 *  can change it at any time — a level is a starting point, not a verdict. */
export function LevelSelector({ current }: { current: Level }) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>(current);
  const [, startTransition] = useTransition();

  async function choose(next: Level) {
    if (next === level) return;
    setLevel(next);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ level: next }).eq("id", user.id);
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className={styles.segmented} role="group" aria-label="Your level">
      {LEVELS.map((option) => (
        <button
          key={option}
          type="button"
          className={`${styles.segment} ${level === option ? styles.segmentActive : ""}`}
          aria-pressed={level === option}
          onClick={() => choose(option)}
        >
          {LEVEL_LABEL[option]}
        </button>
      ))}
    </div>
  );
}
