import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Short-lived in-memory cache for user role checks in middleware (60s TTL)
interface MiddlewareRoleCache {
  role: string;
  cachedAt: number;
}
const middlewareRoleCache = new Map<string, MiddlewareRoleCache>();
const ROLE_CACHE_TTL = 60 * 1000;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith("/login");
  const isApiRoute = pathname.startsWith("/api");
  const isAuthCallback = pathname.startsWith("/auth");
  const isStaticAsset =
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.endsWith(".webmanifest") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".woff");

  // For API routes and static assets, bypass authentication redirects
  if (isApiRoute || isStaticAsset) {
    return supabaseResponse;
  }

  // Refresh user token - essential for UI page auth checks and redirects
  const { data: { user } } = await supabase.auth.getUser();

  // 1. If not logged in & trying to access protected UI routes, redirect to /login
  if (!user && !isLoginPage && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. If logged in & trying to access /login, redirect to dashboard /
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 3. Admin-only route protection for /settings
  if (user && request.nextUrl.pathname.startsWith("/settings")) {
    let userRole: string | null = null;
    const cached = middlewareRoleCache.get(user.id);
    if (cached && Date.now() - cached.cachedAt < ROLE_CACHE_TTL) {
      userRole = cached.role;
    } else {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      userRole = roleData?.role || null;
      if (userRole) {
        middlewareRoleCache.set(user.id, { role: userRole, cachedAt: Date.now() });
      }
    }

    if (userRole !== "Admin") {
      // Redirect staff to dashboard if they try to access settings
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
