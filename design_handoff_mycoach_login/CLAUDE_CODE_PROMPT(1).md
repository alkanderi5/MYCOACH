# Paste this to Claude Code as your first message

I'm adding auth screens to **Cuemaster**, a billiards coaching app, in **Next.js (App Router, TypeScript)**.

Attached is a design handoff folder. Read `README.md` first — it is the source of truth. Build direction **3A** only (crimson on near-black): splash, login, sign-up. `reference/Cuemaster Login.dc.html` is a design prototype for checking exact values; it is not code to copy and will not render standalone. Ignore directions 2A and 2B inside it.

Please:
1. Add `/` (splash), `/login` and `/signup` routes, matching the README's specs element by element.
2. Define the color tokens from the README as CSS variables (or Tailwind theme values) and build everything from those — no hard-coded hexes in components.
3. Load Inter via `next/font/google` (400/500/600) and install `@phosphor-icons/react`.
4. Implement the custom checkbox, the password eye toggle, the crimson bloom, and the focus-visible ring exactly as described.
5. Wire form state and validation client-side; stub the network behind a single `signIn()` / `signUp()` I can swap for Auth.js.

Match my existing project conventions (folder structure, styling approach, lint rules) where they conflict with my suggestions above — tell me what you changed and why. Ask before introducing any color or UI element not in the README.
