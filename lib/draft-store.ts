import type { RawResult } from "@/lib/types";

export type Draft = { raw: RawResult; note: string; savedAt: number };

const KEY = (drillId: string) => `mycoach:draft:${drillId}`;

/**
 * A completed result held on the device until the server confirms it.
 *
 * A player who has just finished twenty shots must not lose them to a dropped
 * connection or a reload. The draft survives both, and is only cleared once the
 * attempt is definitely stored.
 *
 * This is a tiny external store rather than component state so the banner can
 * be read during render with `useSyncExternalStore` — reading localStorage in
 * an effect and setting state would flash the wrong UI on first paint.
 */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToDrafts(listener: () => void) {
  listeners.add(listener);
  // Another tab saving the same drill should update this one too.
  if (typeof window !== "undefined") window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", listener);
  };
}

export function readDraft(drillId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY(drillId));
  } catch {
    // Private mode or storage disabled: the in-memory retry still works.
    return null;
  }
}

export function parseDraft(serialised: string | null): Draft | null {
  if (!serialised) return null;
  try {
    const parsed = JSON.parse(serialised) as Draft;
    return parsed && typeof parsed === "object" && "raw" in parsed ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDraft(drillId: string, draft: Omit<Draft, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY(drillId),
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    // Nothing to surface: the save itself is still in flight.
  }
  emit();
}

export function clearDraft(drillId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY(drillId));
  } catch {
    // Already gone, or storage unavailable.
  }
  emit();
}
