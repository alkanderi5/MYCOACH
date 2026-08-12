"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

/** Hold the splash at least this long so it never flashes. */
const MIN_DISPLAY_MS = 800;
/** Past this, the kicker swaps copy rather than growing an indicator. */
const SLOW_CHECK_MS = 2000;
const FADE_MS = 240;

export default function SplashScreen() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [slow, setSlow] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlow(true), SLOW_CHECK_MS);

    const resolve = async () => {
      const supabase = createClient();
      const started = Date.now();

      let destination = "/login";
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) destination = "/practice";
      } catch {
        // Session could not be resolved — treat the player as signed out.
        destination = "/login";
      }

      const elapsed = Date.now() - started;
      const hold = Math.max(0, MIN_DISPLAY_MS - elapsed);

      setTimeout(() => {
        if (navigated.current) return;
        navigated.current = true;
        setLeaving(true);
        setTimeout(() => router.replace(destination), FADE_MS);
      }, hold);
    };

    void resolve();
    return () => clearTimeout(slowTimer);
  }, [router]);

  return (
    <main className={`${styles.screen} ${leaving ? styles.leaving : ""}`}>
      <h1 className={styles.wordmark}>Mycoach</h1>
      <div className={styles.rule} aria-hidden="true" />
      <p className={styles.kicker}>{slow ? "Loading…" : "Billiard practice"}</p>
    </main>
  );
}
