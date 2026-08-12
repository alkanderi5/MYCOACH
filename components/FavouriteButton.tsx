"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import styles from "./browse.module.css";

export function FavouriteButton({
  drillId,
  initiallySaved,
}: {
  drillId: string;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaved(!next);
      setBusy(false);
      return;
    }

    const { error } = next
      ? await supabase
          .from("drill_favourites")
          .insert({ player_id: user.id, drill_id: drillId })
      : await supabase
          .from("drill_favourites")
          .delete()
          .eq("player_id", user.id)
          .eq("drill_id", drillId);

    // Put the button back if the write failed, rather than showing a lie.
    if (error) setSaved(!next);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      className={`${styles.chip} ${saved ? styles.chipActive : ""}`}
      onClick={toggle}
      aria-pressed={saved}
    >
      <Star size={13} weight={saved ? "fill" : "regular"} />
      {saved ? "Saved" : "Save drill"}
    </button>
  );
}
