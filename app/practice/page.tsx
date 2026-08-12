import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/shell.module.css";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, position")
    .order("position");

  // One count query for the whole catalogue beats one per category.
  const { data: drills } = await supabase.from("drills").select("id, category_id");

  const drillCounts = new Map<string, number>();
  for (const drill of drills ?? []) {
    drillCounts.set(drill.category_id, (drillCounts.get(drill.category_id) ?? 0) + 1);
  }

  return (
    <AppShell active="practice">
      <p className={styles.kicker}>Practice</p>
      <h1 className={styles.title}>Categories</h1>
      <p className={styles.lede}>Pick a category, then choose the drill you want to work on.</p>

      <nav className={styles.list}>
        {(categories ?? []).map((category, index) => {
          const count = drillCounts.get(category.id) ?? 0;
          return (
            <Link key={category.id} href={`/practice/${category.slug}`} className={styles.row}>
              <span className={styles.rowIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.rowBody}>
                <span className={styles.rowName}>{category.name}</span>
                <span className={styles.rowMeta}>
                  {count === 0 ? "No drills yet" : count === 1 ? "1 drill" : `${count} drills`}
                </span>
              </span>
              <span className={styles.rowArrow} aria-hidden="true">
                <ArrowRight size={17} />
              </span>
            </Link>
          );
        })}
      </nav>
    </AppShell>
  );
}
