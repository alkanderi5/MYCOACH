"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, ErrorNote } from "./ui";

export function ProfileForm({
  initialName,
  email,
  initialNotifications,
}: {
  initialName: string;
  email: string;
  initialNotifications: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dirty = name.trim() !== initialName || notifications !== initialNotifications;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("Your session expired. Sign in again to save your profile.");
      return;
    }

    const { error: writeError } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() || null,
        notification_preference: notifications,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (writeError) {
      setError(`That did not save: ${writeError.message}`);
      return;
    }

    setMessage("Profile saved.");
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/signin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <div>
        <label
          htmlFor="display-name"
          className="block text-[11px] uppercase tracking-[0.22em] text-muted"
        >
          Display name
        </label>
        <input
          id="display-name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="How you want to be greeted"
          className="mt-2.5 h-11 w-full rounded-none border-0 border-b border-line-strong bg-transparent text-[17px] text-ink outline-none placeholder:text-faint focus:border-accent"
        />
      </div>

      <div className="mt-8">
        <span className="block text-[11px] uppercase tracking-[0.22em] text-muted">Email</span>
        <p className="mt-2.5 border-b border-line pb-2.5 text-[17px] text-muted">{email}</p>
        <p className="mt-2 text-[12px] text-faint">
          Your email is how you sign in, so it cannot be changed here.
        </p>
      </div>

      <div className="mt-8">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
          />
          <span>
            <span className="block text-[14px] text-ink">Timer notifications</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-faint">
              Alerts when practice and break time end. Your browser will ask permission the
              first time you start a timer.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-8">
        <span className="block text-[11px] uppercase tracking-[0.22em] text-muted">Level</span>
        <p className="mt-2.5 text-[13px] leading-relaxed text-faint">
          Your level moves as you pass the required drills. It is not set by hand — that is what
          keeps the progression meaningful.
        </p>
      </div>

      {message && <p className="mt-6 text-[13px] text-muted">{message}</p>}
      {error && (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <Button type="submit" size="lg" disabled={!dirty || saving} className="mt-8 w-full">
        {saving ? "Saving…" : "Save profile"}
      </Button>

      <div className="mt-10 border-t border-line pt-6 text-center">
        <Button type="button" variant="quiet" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </form>
  );
}
