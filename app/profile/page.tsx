import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABEL, type Level, type PracticeSession } from "@/lib/types";
import shell from "@/components/shell.module.css";
import styles from "@/components/profile.module.css";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  level: Level;
  created_at: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();

  // RLS returns only the signed-in player's own row.
  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, display_name, level, created_at")
      .maybeSingle<Profile>(),
    supabase
      .from("practice_sessions")
      .select("drill_id, practice_duration_seconds, result_percentage")
      .returns<
        Pick<
          PracticeSession,
          "drill_id" | "practice_duration_seconds" | "result_percentage"
        >[]
      >(),
  ]);

  if (!profile) {
    return (
      <AppShell active="profile">
        <p className={shell.kicker}>Profile</p>
        <h1 className={shell.title}>Profile unavailable</h1>
        <p className={shell.lede}>
          We could not load your profile. Sign out and back in, and if it keeps happening
          the account may not have finished setting up.
        </p>
      </AppShell>
    );
  }

  const rows = sessions ?? [];
  const totalSeconds = rows.reduce((sum, s) => sum + s.practice_duration_seconds, 0);
  const scored = rows.filter((s) => s.result_percentage !== null);
  const average =
    scored.length > 0
      ? scored.reduce((sum, s) => sum + Number(s.result_percentage), 0) / scored.length
      : null;
  const drillsPractised = new Set(rows.map((s) => s.drill_id)).size;

  const name = profile.display_name?.trim() || profile.email.split("@")[0];

  return (
    <AppShell active="profile">
      <p className={shell.kicker}>Profile</p>
      <h1 className={shell.title}>You</h1>

      <div className={styles.identity}>
        <span className={styles.monogram} aria-hidden="true">
          {initialsOf(name)}
        </span>
        <div>
          <p className={styles.identityName}>{name}</p>
          <p className={styles.identityMeta}>
            {LEVEL_LABEL[profile.level]} · Practising since {formatJoined(profile.created_at)}
          </p>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Sessions</p>
          <p className={styles.statValue}>{rows.length}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Practice time</p>
          <p className={styles.statValue}>{formatDuration(totalSeconds)}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Drills</p>
          <p className={styles.statValue}>{drillsPractised}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Average</p>
          <p className={styles.statValue}>
            {average === null ? "—" : `${formatPercent(average)}%`}
          </p>
        </div>
      </div>

      <p className={styles.sectionLabel}>Your details</p>
      <div className={styles.rule} aria-hidden="true" />

      <ProfileForm
        initialName={profile.display_name ?? ""}
        initialLevel={profile.level}
        email={profile.email}
      />
    </AppShell>
  );
}

/** Up to two initials from the display name, for the monogram. */
function initialsOf(name: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return letters.join("").toUpperCase();
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
