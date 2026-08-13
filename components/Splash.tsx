"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "./Wordmark";

/** Long enough that the screen never flashes past. */
const MIN_DISPLAY_MS = 800;
const FADE_MS = 240;

/**
 * The one screen that inverts: full-bleed crimson, the wordmark centred, and
 * deliberately no spinner or progress bar. It holds still while the session
 * resolves and then gets out of the way.
 */
export function Splash() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    const run = async () => {
      const startedAt = Date.now();
      let destination = "/login";

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) destination = "/home";
      } catch {
        // Auth server unreachable — login explains it rather than looping.
        destination = "/login";
      }

      const hold = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt));
      setTimeout(() => {
        if (navigated.current) return;
        navigated.current = true;
        setLeaving(true);
        setTimeout(() => router.replace(destination), FADE_MS);
      }, hold);
    };

    void run();
  }, [router]);

  return (
    <main
      className={`relative grid min-h-dvh place-items-center overflow-hidden transition-opacity duration-[240ms] ease-out ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "var(--color-accent)" }}
    >
      {/* A soft light pool, top-centre. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 55% at 50% 42%, rgba(255,255,255,.14), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        <h1>
          <Wordmark size="lg" />
        </h1>
        <p
          className="mt-[26px] text-[11px] font-medium uppercase"
          style={{ letterSpacing: "0.30em", color: "rgba(255,255,255,.7)" }}
        >
          Billiard practice
        </p>
      </div>
    </main>
  );
}
