"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEVELS, LEVEL_LABEL, type Level } from "@/lib/types";
import { SignOutButton } from "./SignOutButton";
import styles from "./profile.module.css";
import browse from "./browse.module.css";

const MAX_NAME_LENGTH = 40;

export function ProfileForm({
  initialName,
  initialLevel,
  email,
}: {
  initialName: string;
  initialLevel: Level;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [level, setLevel] = useState<Level>(initialLevel);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const dirty = name.trim() !== initialName || level !== initialLevel;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || saving) return;

    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Your session expired. Sign in again to save your profile.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() === "" ? null : name.trim(),
        level,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      setMessage(`That didn't save: ${error.message}`);
      return;
    }

    setMessage("Profile saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="display-name">
          Display name
        </label>
        <input
          id="display-name"
          className={styles.input}
          type="text"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          placeholder="How you want to be greeted"
          autoComplete="nickname"
        />
        <p className={styles.hint}>Only you can see this. Leave it empty to go by your email.</p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Email</span>
        <p className={styles.readOnly}>{email}</p>
        <p className={styles.hint}>
          Your email is how you sign in, so it cannot be changed here.
        </p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Level</span>
        <div className={browse.segmented} role="group" aria-label="Your level">
          {LEVELS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${browse.segment} ${
                level === option ? browse.segmentActive : ""
              }`}
              aria-pressed={level === option}
              onClick={() => setLevel(option)}
            >
              {LEVEL_LABEL[option]}
            </button>
          ))}
        </div>
        <p className={styles.hint}>
          Sets what Practice recommends first. Change it whenever you like — nothing is
          hidden from you either way.
        </p>
      </div>

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      <button type="submit" className={styles.saveButton} disabled={!dirty || saving}>
        {saving ? "Saving…" : "Save profile"}
      </button>

      <div className={styles.signOutRow}>
        <SignOutButton />
      </div>
    </form>
  );
}
