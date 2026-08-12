import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { DrillPractice } from "@/components/DrillPractice";
import { FavouriteButton } from "@/components/FavouriteButton";
import { TableDiagram } from "@/components/TableDiagram";
import { createClient } from "@/lib/supabase/server";
import {
  describePerformance,
  LEVEL_LABEL,
  tagsOf,
  type DrillCard,
  type PracticeSession,
} from "@/lib/types";
import shell from "@/components/shell.module.css";
import styles from "@/components/drill.module.css";
import browse from "@/components/browse.module.css";

export const dynamic = "force-dynamic";

export default async function DrillPage({
  params,
}: {
  params: Promise<{ category: string; drill: string }>;
}) {
  const { category: categorySlug, drill: drillSlug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) notFound();

  const { data: drill } = await supabase
    .from("drills")
    .select("*, categories(name, slug), drill_tags(tags(id, kind, name, slug, position))")
    .eq("category_id", category.id)
    .eq("slug", drillSlug)
    .maybeSingle<DrillCard>();

  if (!drill) notFound();

  // RLS keeps both of these to the signed-in player's own rows.
  const [{ data: sessions }, { data: favourite }] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("*")
      .eq("drill_id", drill.id)
      .order("performed_at", { ascending: false })
      .limit(10)
      .returns<PracticeSession[]>(),
    supabase
      .from("drill_favourites")
      .select("drill_id")
      .eq("drill_id", drill.id)
      .maybeSingle(),
  ]);

  const tags = tagsOf(drill);

  return (
    <AppShell active="practice">
      <Link href={`/practice/${category.slug}`} className={shell.backLink}>
        <ArrowLeft size={12} />
        {category.name}
      </Link>

      <p className={shell.kicker}>{category.name}</p>
      <h1 className={shell.title}>{drill.name}</h1>

      <p className={styles.attributes}>
        {LEVEL_LABEL[drill.level]} · Difficulty {drill.difficulty}/5 ·{" "}
        {drill.duration_minutes} min
      </p>

      <div className={browse.chipRow}>
        <FavouriteButton drillId={drill.id} initiallySaved={Boolean(favourite)} />
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/library?${tagParam(tag.kind)}=${tag.slug}`}
            className={browse.chip}
          >
            {tag.name}
          </Link>
        ))}
      </div>

      {drill.content_status === "draft" && (
        <p className={styles.draftNotice}>
          This drill&apos;s wording is a draft written to get the library moving. Replace or
          approve it before it goes to players.
        </p>
      )}

      {/* — setup — */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Table setup</p>
        <div className={styles.rule} aria-hidden="true" />
        {/* An owner-supplied image always wins; otherwise the diagram is drawn
            from the drill's stored ball positions. */}
        {drill.setup_image_url ? (
          <figure className={styles.setupFigure}>
            {/* Owner-supplied artwork of arbitrary dimensions — plain img keeps
                it unprocessed and avoids configuring remote image domains. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.setupImage}
              src={drill.setup_image_url}
              alt={`Starting ball positions for ${drill.name}`}
            />
          </figure>
        ) : drill.setup?.balls?.length ? (
          <TableDiagram setup={drill.setup} title={drill.name} />
        ) : (
          <p className={styles.setupPlaceholder}>
            The table setup image for this drill has not been supplied yet.
          </p>
        )}
      </section>

      <DrillProse label="About this drill" value={drill.explanation} />
      <DrillProse label="What you'll learn" value={drill.skill_learned} />
      <DrillProse label="What it improves" value={drill.improvement_target} />
      <DrillProse label="Instructions" value={drill.instructions} />

      {drill.video_url && (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Instructional video</p>
          <div className={styles.rule} aria-hidden="true" />
          <iframe
            className={styles.video}
            src={drill.video_url}
            title={`Instructional video for ${drill.name}`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </section>
      )}

      <DrillPractice drill={drill} />

      {/* — this drill's recorded history — */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Your results for this drill</p>
        <div className={styles.rule} aria-hidden="true" />
        {sessions && sessions.length > 0 ? (
          <div className={styles.historyList}>
            {sessions.map((session) => (
              <div key={session.id} className={styles.historyRow}>
                <span className={styles.historyDate}>
                  {formatDateTime(session.performed_at)}
                </span>
                <span className={styles.historyDetail}>
                  {describePerformance(session)} ·{" "}
                  {formatDuration(session.practice_duration_seconds)}
                </span>
                <span className={styles.historyResult}>
                  {session.result_percentage === null
                    ? "—"
                    : `${formatPercent(Number(session.result_percentage))}%`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.awaiting}>
            You haven&apos;t recorded a session for this drill yet.
          </p>
        )}
      </section>
    </AppShell>
  );
}

function DrillProse({ label, value }: { label: string; value: string | null }) {
  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>{label}</p>
      <div className={styles.rule} aria-hidden="true" />
      {value ? (
        <p className={styles.prose}>{value}</p>
      ) : (
        <p className={styles.awaiting}>Awaiting content from the project owner.</p>
      )}
    </section>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Tag kinds map to the library's query parameter names. */
function tagParam(kind: string) {
  if (kind === "shot_type") return "shotType";
  return kind;
}
