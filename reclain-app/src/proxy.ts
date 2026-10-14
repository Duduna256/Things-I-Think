import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isDemo } from "./lib/env";
import { PATH_HEADER } from "./lib/request-path";

// Runs before every page. It keeps the Supabase login fresh (refreshing an expiring token and
// passing the new cookies on) and tells the page which address was asked for, so a log-in
// redirect can come back to it. Pages decide for themselves who may see them.
export async function proxy(request: NextRequest) {
  // Always overwritten here, so a visitor can't send their own.
  const url = request.nextUrl.clone();
  url.searchParams.delete("_rsc");
  request.headers.set(PATH_HEADER, url.pathname + url.search);
  if (isDemo) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Don't run code between createServerClient and getClaims: it can log people out at random.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Skip static files, images and the payment webhook (which has no login).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
