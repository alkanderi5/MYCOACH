import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DrillCardLink } from "@/components/DrillCardLink";
import { SearchBar } from "@/components/SearchBar";
import { createClient } from "@/lib/supabase/server";
import {
  fetchDrillCards,
  fetchFavouriteIds,
  fetchPlayerStats,
  matchesTag,
  type DrillFilters,
} from "@/lib/drills";
import {
  LEVELS,
  LEVEL_LABEL,
  type Category,
  type DrillCard,
  type Level,
  type Tag,
} from "@/lib/types";
import shell from "@/components/shell.module.css";
import styles from "@/components/browse.module.css";

export const dynamic = "force-dynamic";

type Params = Record<string, string | undefined>;

const DURATIONS = [
  { label: "5 min", value: "5" },
  { label: "10 min", value: "10" },
  { label: "20 min", value: "20" },
  { label: "30+ min", value: "180" },
];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const filters: DrillFilters = {
    q: params.q,
    level: asLevel(params.level),
    category: params.category,
    skill: params.skill,
    shotType: params.shotType,
    goal: params.goal,
    game: params.game,
    equipment: params.equipment,
    maxDuration: params.maxDuration ? Number(params.maxDuration) : undefined,
    difficulty: params.difficulty ? Number(params.difficulty) : undefined,
    savedOnly: params.saved === "1",
    completed: params.completed === "yes" || params.completed === "no" ? params.completed : undefined,
  };

  const [{ data: tagRows }, { data: categoryRows }, favouriteIds, stats] =
    await Promise.all([
      supabase.from("tags").select("*").order("kind").order("position").returns<Tag[]>(),
      supabase
        .from("categories")
        .select("id, name, slug, position")
        .order("position")
        .returns<Category[]>(),
      fetchFavouriteIds(supabase),
      fetchPlayerStats(supabase),
    ]);

  let drills = await fetchDrillCards(supabase, filters, favouriteIds, stats.practisedIds);

  // A text search should also find a drill by its tags, which the SQL `or`
  // cannot reach. Run the same filters again without the text term, then keep
  // whatever matched a tag.
  if (filters.q?.trim()) {
    const withoutText = await fetchDrillCards(
      supabase,
      { ...filters, q: undefined },
      favouriteIds,
      stats.practisedIds,
    );
    const seen = new Set(drills.map((d) => d.id));
    for (const drill of withoutText) {
      if (!seen.has(drill.id) && matchesTag(drill, filters.q)) {
        drills.push(drill);
        seen.add(drill.id);
      }
    }
    drills = drills.sort((a, b) => a.name.localeCompare(b.name));
  }

  const tags = tagRows ?? [];
  const categories = categoryRows ?? [];
  const tagsOfKind = (kind: Tag["kind"]) => tags.filter((t) => t.kind === kind);

  const activeCount = countActive(params);

  // Results group by category, which every drill belongs to exactly once, so
  // nothing appears twice in a single result set.
  const groups = categories
    .map((category) => ({
      category,
      drills: drills.filter((d) => d.categories?.slug === category.slug),
    }))
    .filter((group) => group.drills.length > 0);

  return (
    <AppShell active="library">
      <p className={shell.kicker}>Drill library</p>
      <h1 className={shell.title}>
        {filters.q ? `“${filters.q}”` : "Every drill"}
      </h1>

      <SearchBar initial={params.q ?? ""} />

      {/* Collapsed while browsing so results are not pushed off-screen, and
          opened automatically when the player arrived with filters applied. */}
      <details className={styles.filterBar} open={activeCount > 0}>
        <summary className={styles.filterSummary}>
          <span>Filters</span>
          <span className={styles.filterSummaryCount}>
            {activeCount === 0 ? "None applied" : `${activeCount} applied`}
          </span>
        </summary>

        <FilterGroup label="Level">
          {LEVELS.map((level) => (
            <FilterChip
              key={level}
              label={LEVEL_LABEL[level]}
              params={params}
              name="level"
              value={level}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Category">
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              label={category.name}
              params={params}
              name="category"
              value={category.slug}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Skill">
          {tagsOfKind("skill").map((tag) => (
            <FilterChip
              key={tag.id}
              label={tag.name}
              params={params}
              name="skill"
              value={tag.slug}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Shot type">
          {tagsOfKind("shot_type").map((tag) => (
            <FilterChip
              key={tag.id}
              label={tag.name}
              params={params}
              name="shotType"
              value={tag.slug}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Goal">
          {tagsOfKind("goal").map((tag) => (
            <FilterChip
              key={tag.id}
              label={tag.name}
              params={params}
              name="goal"
              value={tag.slug}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Duration">
          {DURATIONS.map((duration) => (
            <FilterChip
              key={duration.value}
              label={duration.label}
              params={params}
              name="maxDuration"
              value={duration.value}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Difficulty">
          {[1, 2, 3, 4, 5].map((level) => (
            <FilterChip
              key={level}
              label={`${level}/5`}
              params={params}
              name="difficulty"
              value={String(level)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Game">
          {tagsOfKind("game").map((tag) => (
            <FilterChip
              key={tag.id}
              label={tag.name}
              params={params}
              name="game"
              value={tag.slug}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Equipment">
          {tagsOfKind("equipment").map((tag) => (
            <FilterChip
              key={tag.id}
              label={tag.name}
              params={params}
              name="equipment"
              value={tag.slug}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Yours">
          <FilterChip label="Saved" params={params} name="saved" value="1" />
          <FilterChip label="Practised" params={params} name="completed" value="yes" />
          <FilterChip label="Not practised" params={params} name="completed" value="no" />
        </FilterGroup>

        {activeCount > 0 && (
          <div className={styles.filterActions}>
            <Link href="/library" className={styles.clearLink}>
              Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
            </Link>
          </div>
        )}
      </details>

      <p className={styles.resultCount}>
        {drills.length === 0
          ? "No drills match"
          : `${drills.length} drill${drills.length === 1 ? "" : "s"}`}
      </p>

      {groups.length === 0 ? (
        <p className={styles.empty}>
          Nothing matches this combination. Clear a filter or two and try again.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.category.id} className={styles.group}>
            <div className={styles.groupHead}>
              <h2 className={styles.groupName}>{group.category.name}</h2>
              <span className={styles.groupCount}>
                {group.drills.length} drill{group.drills.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className={styles.groupLevels}>{levelBreakdown(group.drills)}</p>

            <div className={styles.drillList}>
              {group.drills.map((drill) => (
                <DrillCardLink
                  key={drill.id}
                  drill={drill}
                  saved={favouriteIds.has(drill.id)}
                  averagePercent={stats.averageByDrill.get(drill.id)}
                  sessionCount={stats.countByDrill.get(drill.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </AppShell>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.filterGroup}>
      <p className={styles.filterGroupLabel}>{label}</p>
      <div className={styles.chipRow}>{children}</div>
    </div>
  );
}

/** Each chip is a link that toggles its own parameter and leaves the rest of
 *  the query alone, so filters combine and the URL stays shareable. */
function FilterChip({
  label,
  params,
  name,
  value,
}: {
  label: string;
  params: Params;
  name: string;
  value: string;
}) {
  const active = params[name] === value;
  const next = new URLSearchParams();

  for (const [key, existing] of Object.entries(params)) {
    if (existing && key !== name) next.set(key, existing);
  }
  if (!active) next.set(name, value);

  const query = next.toString();
  return (
    <Link
      href={query ? `/library?${query}` : "/library"}
      className={`${styles.chip} ${active ? styles.chipActive : ""}`}
      aria-pressed={active}
    >
      {label}
    </Link>
  );
}

function levelBreakdown(drills: DrillCard[]) {
  return LEVELS.map((level) => {
    const count = drills.filter((d) => d.level === level).length;
    return count > 0 ? `${LEVEL_LABEL[level]} — ${count}` : null;
  })
    .filter(Boolean)
    .join(" · ");
}

function countActive(params: Params) {
  return Object.entries(params).filter(([key, value]) => key !== "q" && value).length;
}

function asLevel(value: string | undefined): Level | undefined {
  return value === "beginner" || value === "intermediate" || value === "advanced"
    ? value
    : undefined;
}
