import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes a signed-out visitor may reach. Everything else requires a session. */
const PUBLIC_ROUTES = ["/", "/login", "/signup"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase, unlike getSession().
  let user = null;
  let unverified = false;

  // A player carrying session cookies whose token cannot be checked is not the
  // same as a signed-out visitor: the auth server was unreachable. Access is
  // still denied either way — only the explanation differs, so the player is
  // not left thinking their password is wrong.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (!user && error && hasSessionCookie) unverified = true;
  } catch {
    unverified = hasSessionCookie;
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    if (unverified) url.searchParams.set("reason", "unreachable");
    return NextResponse.redirect(url);
  }

  // A signed-in player has no reason to sit on the auth screens.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/practice";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /* Everything except static assets and image files. */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
