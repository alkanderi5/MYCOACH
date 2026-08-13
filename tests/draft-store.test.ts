import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDraft,
  parseDraft,
  readDraft,
  subscribeToDrafts,
  writeDraft,
} from "@/lib/draft-store";

/** A minimal localStorage so the store can be exercised without a browser. */
function installStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  vi.stubGlobal("window", {
    localStorage: storage,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  return map;
}

describe("unsaved results", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installStorage();
  });

  it("keeps a result so a failed save cannot lose it", () => {
    writeDraft("drill-1", {
      raw: { total_attempts: 10, successful_attempts: 7 },
      note: "felt good",
    });

    const draft = parseDraft(readDraft("drill-1"));
    expect(draft?.raw).toEqual({ total_attempts: 10, successful_attempts: 7 });
    expect(draft?.note).toBe("felt good");
    expect(typeof draft?.savedAt).toBe("number");
  });

  it("keeps drafts separate per drill", () => {
    writeDraft("drill-1", { raw: { total_attempts: 10, successful_attempts: 7 }, note: "" });
    expect(readDraft("drill-2")).toBeNull();
  });

  it("clears only once the attempt is stored", () => {
    writeDraft("drill-1", { raw: { total_attempts: 5, successful_attempts: 5 }, note: "" });
    clearDraft("drill-1");
    expect(readDraft("drill-1")).toBeNull();
  });

  it("notifies subscribers so the banner updates without a reload", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToDrafts(listener);

    writeDraft("drill-1", { raw: { total_attempts: 3, successful_attempts: 1 }, note: "" });
    expect(listener).toHaveBeenCalledTimes(1);

    clearDraft("drill-1");
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    writeDraft("drill-1", { raw: { total_attempts: 3, successful_attempts: 2 }, note: "" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ignores corrupted storage rather than throwing", () => {
    installStorage().set("mycoach:draft:drill-1", "{not json");
    expect(parseDraft(readDraft("drill-1"))).toBeNull();
  });

  it("is inert on the server, where there is no storage", () => {
    vi.unstubAllGlobals();
    expect(readDraft("drill-1")).toBeNull();
    expect(() => writeDraft("drill-1", { raw: { completed: true, attempts: 1 }, note: "" })).not.toThrow();
  });
});
