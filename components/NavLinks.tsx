import Link from "next/link";
import { House, Path, ChartLine, User, Plus } from "@phosphor-icons/react/dist/ssr";
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

  // On the bar the practice action sits in the middle, within thumb reach and
  // impossible to miss; the rail keeps it as a normal first item.
  const items = ITEMS.map((item) => (
    <li key={item.section} className={cx(isBar && "flex-1")}>
      <Link
        href={item.href}
        aria-current={active === item.section ? "page" : undefined}
        className={cx(
          "flex items-center transition-colors",
          isBar
            ? "flex-col gap-1 py-2.5 text-[10px]"
            : "gap-3 rounded-[10px] px-3 py-2.5 text-sm",
          active === item.section ? "text-accent" : "text-muted hover:text-ink",
          !isBar && active === item.section && "bg-elevated",
        )}
      >
        <item.Icon size={isBar ? 21 : 18} weight={active === item.section ? "fill" : "regular"} />
        {item.label}
      </Link>
    </li>
  ));

  if (!isBar) {
    return (
      <ul className="flex flex-col gap-1">
        <li className="mb-4">
          <PracticeAction layout="rail" />
        </li>
        {items}
      </ul>
    );
  }

  return (
    <ul className="flex items-center">
      {items.slice(0, 2)}
      <li className="relative -mt-6 flex-none px-2">
        <PracticeAction layout="bar" />
      </li>
      {items.slice(2)}
    </ul>
  );
}

function PracticeAction({ layout }: { layout: "bar" | "rail" }) {
  if (layout === "rail") {
    return (
      <Link
        href="/practice/next"
        className="shadow-crimson flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-accent text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        <Plus size={16} weight="bold" />
        Practise
      </Link>
    );
  }

  return (
    <Link
      href="/practice/next"
      aria-label="Start practising"
      className="shadow-crimson grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover"
    >
      <Plus size={24} weight="bold" />
    </Link>
  );
}
