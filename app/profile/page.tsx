import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { Card, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { groupNameFor, loadProgram } from "@/lib/program";
import { currentLevel } from "@/lib/progression/level";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const program = await loadProgram(supabase);
  const profile = program.profile;

  if (!profile) {
    return (
      <AppShell active="profile">
        <h1 className="text-[30px] font-medium tracking-tight text-ink">Profile</h1>
        <div className="mt-8">
          <EmptyState title="Profile unavailable">
            We could not load your profile. Sign out and back in, and if it keeps happening the
            account may not have finished setting up.
          </EmptyState>
        </div>
      </AppShell>
    );
  }

  const level = currentLevel(program.levels, program.statuses);
  const name = profile.display_name?.trim() || profile.email.split("@")[0];

  return (
    <AppShell active="profile">
      <h1 className="text-[30px] font-medium tracking-tight text-ink">Profile</h1>

      <Card className="mt-6 flex items-center gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-accent bg-accent/12 text-[17px] font-medium text-accent-ink"
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[19px] font-medium text-ink">{name}</p>
          <p className="mt-0.5 text-[12px] text-faint">
            {level
              ? `Level ${level.level_number} · ${groupNameFor(level, program.groups)}`
              : "Not started"}{" "}
            · Joined {joined(profile.created_at)}
          </p>
        </div>
      </Card>

      <ProfileForm
        initialName={profile.display_name ?? ""}
        email={profile.email}
        initialNotifications={profile.notification_preference}
      />
    </AppShell>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function joined(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
