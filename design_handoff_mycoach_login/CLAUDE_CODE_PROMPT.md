# Paste this to Claude Code as the first message

I'm building **Mycoach**, a billiards coaching app, in **Next.js (App Router, TypeScript)**.

Attached is a design handoff folder. Read `README.md` first — it is the source of truth for the two screens (splash and login, direction 2B). `reference/Mycoach Login.dc.html` is a design prototype for value-checking only; it is not code to copy, and it will not render standalone.

Please:
1. Scaffold a Next.js App Router project with TypeScript.
2. Lift the `:root` token block from `reference/nocturne.css` into `app/globals.css` and build everything from those variables — no hard-coded colors.
3. Load Inter via `next/font/google` (300/400/500) and install `@phosphor-icons/react`.
4. Build `/` (splash) and `/login` exactly to the README's specs, including the focus-visible ring, the custom checkbox, and the outlined primary button (never solid at rest).
5. Wire the login form with client-side state and validation as described; stub the auth call behind a single `signIn()` function I can swap for Auth.js later.

Ask me before adding any color, font weight above 500, or UI element not in the README — the design system is deliberately strict.
