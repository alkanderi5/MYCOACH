import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/shell.module.css";

export const dynamic = "force-dynamic";

export default async function CategoryDrillsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) notFound();

  const { data: drills } = await supabase
    .from("drills")
    .select("id, name, slug, position, is_placeholder")
    .eq("category_id", category.id)
    .order("position");

  return (
    <AppShell active="practice">
      <Link href="/practice" className={styles.backLink}>
        <ArrowLeft size={12} />
        Categories
      </Link>

      <p className={styles.kicker}>Category</p>
      <h1 className={styles.title}>{category.name}</h1>

      {drills && drills.length > 0 ? (
        <nav className={styles.list}>
          {drills.map((drill, index) => (
            <Link
              key={drill.id}
              href={`/practice/${category.slug}/${drill.slug}`}
              className={styles.row}
            >
              <span className={styles.rowIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.rowBody}>
                <span className={styles.rowName}>{drill.name}</span>
                {drill.is_placeholder && (
                  <span className={styles.rowMeta}>Awaiting drill content</span>
                )}
              </span>
              <span className={styles.rowArrow} aria-hidden="true">
                <ArrowRight size={17} />
              </span>
            </Link>
          ))}
        </nav>
      ) : (
        <p className={styles.empty}>
          No drills have been added to this category yet. Drill names and content are supplied by
          the project owner.
        </p>
      )}
    </AppShell>
  );
}
