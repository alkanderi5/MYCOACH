import Link from "next/link";
import styles from "./shell.module.css";

type Section = "practice" | "library" | "programs" | "progress" | "profile";

/** Sign-out lives on the profile screen, not in the header — it is a rare,
 *  irreversible-feeling action and does not belong beside navigation. */
const NAV: { href: string; label: string; section: Section }[] = [
  { href: "/practice", label: "Practice", section: "practice" },
  { href: "/library", label: "Library", section: "library" },
  { href: "/programs", label: "Programs", section: "programs" },
  { href: "/progress", label: "Progress", section: "progress" },
  { href: "/profile", label: "Profile", section: "profile" },
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
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
