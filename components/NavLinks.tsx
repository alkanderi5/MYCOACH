import Link from "next/link";
import { House, Path, ChartLine, User } from "@phosphor-icons/react/dist/ssr";
import { cx } from "./ui";
import type { Section } from "./AppShell";

const ITEMS: { href: string; label: string; section: Section; Icon: typeof House }[] = [
  { href: "/home", label: "Home", section: "home", Icon: House },
  { href: "/programs", label: "Programs", section: "program", Icon: Path },
  { href: "/progress", label: "Progress", section: "progress", Icon: ChartLine },
  { href: "/profile", label: "Profile", section: "profile", Icon: User },
];

export function NavLinks({
  active,
  layout,
}: {
  active: Section;
  layout: "bar" | "rail";
}) {
  const isBar = layout === "bar";

  return (
    <ul className={cx(isBar ? "flex" : "flex flex-col gap-1")}>
      {ITEMS.map(({ href, label, section, Icon }) => {
        const current = active === section;
        return (
          <li key={section} className={cx(isBar && "flex-1")}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={cx(
                "flex items-center transition-colors",
                isBar
                  ? "flex-col gap-1 py-2.5 text-[11px]"
                  : "gap-3 rounded-[10px] px-3 py-2.5 text-sm",
                current ? "text-accent" : "text-muted hover:text-ink",
                !isBar && current && "bg-elevated",
              )}
            >
              <Icon size={isBar ? 21 : 18} weight={current ? "fill" : "regular"} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
