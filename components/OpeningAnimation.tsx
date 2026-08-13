"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_DISPLAY_MS = 2200;
const FADE_MS = 500;

/**
 * Opening animation.
 *
 * White liquid blobs drift and merge, then resolve into MYCOACH. The merging
 * is a gooey filter: heavy blur followed by a steep contrast curve, so shapes
 * that overlap fuse into one body rather than sliding across each other.
 *
 * Timing is driven by CSS animations rather than React state, so the global
 * reduced-motion rule turns the whole thing into a plain wordmark without this
 * component needing to know.
 */
export function OpeningAnimation() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    const run = async () => {
      const startedAt = Date.now();
      let destination = "/signin";

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) destination = "/home";
      } catch {
        // Auth server unreachable — sign-in explains it rather than looping.
        destination = "/signin";
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
      className={`grid min-h-dvh place-items-center overflow-hidden bg-canvas transition-opacity duration-500 ease-out ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex h-56 w-full max-w-md items-center justify-center">
        <svg aria-hidden className="absolute h-0 w-0">
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"
              />
            </filter>
          </defs>
        </svg>

        <div aria-hidden className="blobs absolute inset-0" style={{ filter: "url(#goo)" }}>
          {BLOBS.map((blob, index) => (
            <span
              key={index}
              className="absolute rounded-full bg-ink"
              style={{
                width: blob.size,
                height: blob.size,
                left: blob.left,
                top: blob.top,
                animation: `drift-${index % 3} ${blob.duration}ms ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        <h1
          className="wordmark relative text-[34px] font-medium uppercase tracking-[0.16em] text-ink sm:text-[42px]"
          style={{ paddingLeft: "0.16em" }}
        >
          MYCOACH
        </h1>
      </div>

      <style>{`
        @keyframes drift-0 { from { transform: translate(-18px, 10px) scale(1); }
                             to   { transform: translate(22px, -14px) scale(1.15); } }
        @keyframes drift-1 { from { transform: translate(16px, -12px) scale(1.1); }
                             to   { transform: translate(-20px, 16px) scale(0.95); } }
        @keyframes drift-2 { from { transform: translate(-10px, -16px) scale(0.95); }
                             to   { transform: translate(14px, 18px) scale(1.2); } }

        /* The liquid dissolves as the word takes its place. */
        @keyframes blobs-out { to { opacity: 0; } }
        @keyframes word-in   { from { opacity: 0; filter: blur(14px); }
                               to   { opacity: 1; filter: blur(0); } }

        .blobs    { animation: blobs-out 900ms ease-out 1400ms both; }
        .wordmark { animation: word-in 900ms ease-out 1200ms both; }
      `}</style>
    </main>
  );
}

const BLOBS = [
  { size: 96, left: "18%", top: "26%", duration: 2600 },
  { size: 74, left: "38%", top: "44%", duration: 3100 },
  { size: 110, left: "52%", top: "22%", duration: 2800 },
  { size: 68, left: "68%", top: "48%", duration: 3400 },
  { size: 86, left: "30%", top: "18%", duration: 2400 },
];
