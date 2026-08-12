/** Audible end-of-period alerts. Synthesised rather than shipped as an asset —
 *  the design calls for no raster or media assets. */

type AlertKind = "practice-end" | "break-end";

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

/** Two rising notes to end practice, three falling to end the break, so the
 *  player can tell them apart without looking at the screen. */
const PATTERNS: Record<AlertKind, number[]> = {
  "practice-end": [660, 880],
  "break-end": [880, 660, 520],
};

export function playAlertTone(kind: AlertKind) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.(kind === "practice-end" ? [180, 90, 180] : [120, 80, 120, 80, 220]);
  }

  const ctx = getContext();
  if (!ctx) return;

  // Autoplay policy suspends the context until a gesture; Start is that gesture.
  if (ctx.state === "suspended") void ctx.resume();

  const noteLength = 0.18;
  PATTERNS[kind].forEach((frequency, index) => {
    const startAt = ctx.currentTime + index * (noteLength + 0.06);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    // Shaped envelope — a raw gate would click.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + noteLength);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + noteLength + 0.02);
  });
}
