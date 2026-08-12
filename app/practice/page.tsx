import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { DrillCardLink } from "@/components/DrillCardLink";
import { LevelSelector } from "@/components/LevelSelector";
import { SearchBar } from "@/components/SearchBar";
import { createClient } from "@/lib/supabase/server";
import { fetchDrillCards, fetchFavouriteIds, fetchPlayerStats } from "@/lib/drills";
import { LEVEL_LABEL, type DrillCard, type Level } from "@/lib/types";
import shell from "@/components/shell.module.css";
import styles from "@/components/browse.module.css";

export const dynamic = "force-dynamic";

/** Entry points for a player who does not yet know what to search for. Each
 *  one is a filter the library already understands. */
const PROMPTS = [
  { label: "I am completely new", href: "/library?level=beginner" },
  { label: "I struggle with aiming", href: "/library?goal=accuracy" },
  { label: "I miss long shots", href: "/library?shotType=long" },
  { label: "I cannot control the cue ball", href: "/library?skill=cue-ball-control" },
];

const QUICK_FILTERS = [
  { label: "Under 10 minutes", href: "/library?maxDuration=10" },
  { label: "Potting", href: "/library?skill=potting" },
  { label: "Cue ball control", href: "/library?skill=cue-ball-control" },
  { label: "Position", href: "/library?skill=position-play" },
  { label: "Safety", href: "/library?skill=safety" },
  { label: "Saved", href: "/library?saved=1" },
];

export default async function PracticeHomePage() {
  const supabase = await createClient();

  const [{ data: profile }, { data: categories }, allDrills, favouriteIds, stats] =
    await Promise.all([
      supabase.from("profiles").select("level").maybeSingle<{ level: Level }>(),
      supabase.from("categories").select("id, name, slug, position").order("position"),
      fetchDrillCards(supabase),
      fetchFavouriteIds(supabase),
      fetchPlayerStats(supabase),
    ]);

  const level: Level = profile?.level ?? "beginner";

  const { data: assignments } = await supabase
    .from("coach_assignments")
    .select("drill_id");
  const assignedIds = new Set((assignments ?? []).map((row) => row.drill_id as string));

  const byId = new Map(allDrills.map((drill) => [drill.id, drill]));
  const drillCount = new Map<string, number>();
  for (const drill of allDrills) {
    if (!drill.categories) continue;
    drillCount.set(
      drill.categories.slug,
      (drillCount.get(drill.categories.slug) ?? 0) + 1,
    );
  }

  // — the personalized rows, all computed from the player's own records —

  const continueRow = stats.recentDrillIds
    .map((id) => byId.get(id))
    .filter((d): d is DrillCard => Boolean(d))
    .slice(0, 8);

  const recommendedRow = allDrills
    .filter((d) => d.level === level && !stats.practisedIds.has(d.id))
    .sort((a, b) => a.difficulty - b.difficulty)
    .slice(0, 8);

  const weakRow = [...stats.averageByDrill.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => byId.get(id))
    .filter((d): d is DrillCard => Boolean(d))
    .slice(0, 6);

  const assignedRow = allDrills.filter((d) => assignedIds.has(d.id));

  const mostPractisedRow = [...stats.countByDrill.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((d): d is DrillCard => Boolean(d))
    .slice(0, 8);

  const recentlyAddedRow = [...allDrills]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8);

  const savedRow = allDrills.filter((d) => favouriteIds.has(d.id));

  const isNewPlayer = stats.practisedIds.size === 0;

  return (
    <AppShell active="practice">
      <p className={shell.kicker}>Practice</p>
      <h1 className={shell.title}>What are we working on?</h1>

      <SearchBar />

      <div className={styles.levelRow}>
        <span className={styles.levelLabel}>Your level</span>
        <span className={styles.levelNote}>Change it whenever you like</span>
      </div>
      <LevelSelector current={level} />

      <div className={styles.chipRow}>
        {QUICK_FILTERS.map((filter) => (
          <Link key={filter.href} href={filter.href} className={styles.chip}>
            {filter.label}
          </Link>
        ))}
      </div>

      {(isNewPlayer || level === "beginner") && (
        <>
          <div className={styles.sectionHead}>
            <span className={styles.sectionTitle}>Not sure where to start</span>
          </div>
          <div className={styles.sectionRule} aria-hidden="true" />
          <div className={styles.promptList}>
            {PROMPTS.map((prompt) => (
              <Link key={prompt.href} href={prompt.href} className={styles.prompt}>
                {prompt.label}
                <span className={styles.promptArrow} aria-hidden="true">
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <Rail
        title="Continue practising"
        drills={continueRow}
        favouriteIds={favouriteIds}
        stats={stats}
      />

      <Rail
        title={`Recommended for ${LEVEL_LABEL[level].toLowerCase()}`}
        drills={recommendedRow}
        favouriteIds={favouriteIds}
        stats={stats}
        note="Drills at your level you have not recorded yet."
      />

      <Rail
        title="Improve your weak areas"
        drills={weakRow}
        favouriteIds={favouriteIds}
        stats={stats}
        note="Your lowest average results, worst first."
      />

      <Rail
        title="Assigned to you"
        drills={assignedRow}
        favouriteIds={favouriteIds}
        stats={stats}
      />

      <Rail
        title="Your most practised"
        drills={mostPractisedRow}
        favouriteIds={favouriteIds}
        stats={stats}
      />

      <Rail
        title="Saved drills"
        drills={savedRow}
        favouriteIds={favouriteIds}
        stats={stats}
        href="/library?saved=1"
      />

      <Rail
        title="Recently added"
        drills={recentlyAddedRow}
        favouriteIds={favouriteIds}
        stats={stats}
      />

      <div className={styles.sectionHead}>
        <span className={styles.sectionTitle}>Categories</span>
        <Link href="/library" className={styles.sectionLink}>
          Browse all
        </Link>
      </div>
      <div className={styles.sectionRule} aria-hidden="true" />
      <div className={styles.categoryGrid}>
        {(categories ?? []).map((category) => {
          const count = drillCount.get(category.slug) ?? 0;
          return (
            <Link
              key={category.id}
              href={`/practice/${category.slug}`}
              className={styles.categoryCard}
            >
              <span className={styles.categoryName}>{category.name}</span>
              <span className={styles.categoryCount}>
                {count === 0 ? "No drills yet" : count === 1 ? "1 drill" : `${count} drills`}
              </span>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

/** A horizontal row of drills. Renders nothing at all when it has no drills,
 *  so the page never shows an empty shelf. */
function Rail({
  title,
  drills,
  favouriteIds,
  stats,
  note,
  href,
}: {
  title: string;
  drills: DrillCard[];
  favouriteIds: Set<string>;
  stats: { averageByDrill: Map<string, number>; countByDrill: Map<string, number> };
  note?: string;
  href?: string;
}) {
  if (drills.length === 0) return null;

  return (
    <>
      <div className={styles.sectionHead}>
        <span className={styles.sectionTitle}>{title}</span>
        {href && (
          <Link href={href} className={styles.sectionLink}>
            See all
          </Link>
        )}
      </div>
      <div className={styles.sectionRule} aria-hidden="true" />
      {note && <p className={styles.sectionNote}>{note}</p>}
      <div className={styles.rail}>
        {drills.map((drill) => (
          <div key={drill.id} className={styles.railCard}>
            <DrillCardLink
              drill={drill}
              saved={favouriteIds.has(drill.id)}
              averagePercent={stats.averageByDrill.get(drill.id)}
              sessionCount={stats.countByDrill.get(drill.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
