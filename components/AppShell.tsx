import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import styles from "./shell.module.css";

export function AppShell({
  active,
  children,
}: {
  active: "practice" | "progress";
  children: React.ReactNode;
}) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link href="/practice" className={styles.brand}>
          Mycoach
        </Link>
        <Link
          href="/practice"
          className={`${styles.navLink} ${active === "practice" ? styles.navLinkActive : ""}`}
          aria-current={active === "practice" ? "page" : undefined}
        >
          Practice
        </Link>
        <Link
          href="/progress"
          className={`${styles.navLink} ${active === "progress" ? styles.navLinkActive : ""}`}
          aria-current={active === "progress" ? "page" : undefined}
        >
          Progress
        </Link>
        <SignOutButton />
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
