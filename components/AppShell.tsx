import Link from "next/link";
import { Wordmark } from "./Wordmark";
import type { ReactNode } from "react";
import { NavLinks } from "./NavLinks";

export type Section = "home" | "program" | "progress" | "profile";

/**
 * Four destinations, no more. History lives inside Progress rather than taking
 * a slot of its own.
 *
 * Mobile puts navigation at the bottom, within thumb reach, because the player
 * is holding the phone one-handed beside the table.
 */
export function AppShell({
  active,
  children,
}: {
  active: Section;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas md:flex">
      {/* desktop rail */}
      <aside className="hidden w-56 shrink-0 border-r border-line px-5 py-8 md:block">
        <Link href="/home" aria-label="Cuemaster home">
          <Wordmark />
        </Link>
        <nav className="mt-10">
          <NavLinks active={active} layout="rail" />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile header */}
        <header className="pt-safe px-5 pt-6 md:hidden">
          <Link href="/home" aria-label="Cuemaster home">
            <Wordmark />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-28 pt-6 md:px-8 md:pb-16 md:pt-10">
          {children}
        </main>

        {/* mobile bottom navigation */}
        <nav
          aria-label="Main"
          className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 backdrop-blur md:hidden"
        >
          <NavLinks active={active} layout="bar" />
        </nav>
      </div>
    </div>
  );
}
