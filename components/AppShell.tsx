import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import styles from "./shell.module.css";

type Section = "practice" | "library" | "programs" | "progress";

const NAV: { href: string; label: string; section: Section }[] = [
  { href: "/practice", label: "Practice", section: "practice" },
  { href: "/library", label: "Library", section: "library" },
  { href: "/programs", label: "Programs", section: "programs" },
  { href: "/progress", label: "Progress", section: "progress" },
];

export function AppShell({
  active,
  children,
}: {
  active: Section;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link href="/practice" className={styles.brand}>
          Mycoach
        </Link>
        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link
              key={item.section}
              href={item.href}
              className={`${styles.navLink} ${
                active === item.section ? styles.navLinkActive : ""
              }`}
              aria-current={active === item.section ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
