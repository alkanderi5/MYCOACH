import Link from "next/link";
import { Star } from "@phosphor-icons/react/dist/ssr";
import { LEVEL_LABEL, type DrillCard } from "@/lib/types";
import styles from "./browse.module.css";

/** One drill, rendered the same way everywhere it appears. The drill is a
 *  single row in the database no matter how many lists surface it. */
export function DrillCardLink({
  drill,
  saved = false,
  averagePercent,
  sessionCount,
}: {
  drill: DrillCard;
  saved?: boolean;
  averagePercent?: number;
  sessionCount?: number;
}) {
  return (
    <Link
      href={`/practice/${drill.categories?.slug}/${drill.slug}`}
      className={styles.drillCard}
    >
      <span className={styles.drillMetaTop}>
        <span className={styles.drillLevel}>{LEVEL_LABEL[drill.level]}</span>
        <span>·</span>
        <span>{drill.categories?.name}</span>
        {saved && (
          <Star size={11} weight="fill" aria-label="Saved" />
        )}
      </span>

      <span className={styles.drillName}>{drill.name}</span>

      {drill.explanation && (
        <span className={styles.drillSummary}>{drill.explanation}</span>
      )}

      <span className={styles.drillMetaBottom}>
        <span>{drill.duration_minutes} min</span>
        <span>·</span>
        <span>Difficulty {drill.difficulty}/5</span>
        {averagePercent !== undefined && (
          <span className={styles.drillScore}>
            {formatPercent(averagePercent)}%
            {sessionCount ? ` · ${sessionCount}` : ""}
          </span>
        )}
      </span>
    </Link>
  );
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
