"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import styles from "./browse.module.css";

export function EnrollButton({
  programId,
  initiallyEnrolled,
}: {
  programId: string;
  initiallyEnrolled: boolean;
}) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(initiallyEnrolled);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !enrolled;
    setEnrolled(next);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEnrolled(!next);
      setBusy(false);
      return;
    }

    const { error } = next
      ? await supabase
          .from("program_enrollments")
          .insert({ player_id: user.id, program_id: programId })
      : await supabase
          .from("program_enrollments")
          .delete()
          .eq("player_id", user.id)
          .eq("program_id", programId);

    if (error) setEnrolled(!next);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      className={`${styles.chip} ${enrolled ? styles.chipActive : ""}`}
      onClick={toggle}
      aria-pressed={enrolled}
    >
      {enrolled ? <Check size={13} /> : <Plus size={13} />}
      {enrolled ? "Following this program" : "Follow this program"}
    </button>
  );
}
