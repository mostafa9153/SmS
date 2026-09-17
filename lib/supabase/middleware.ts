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
  const isTeacherLogin = pathname.startsWith("/teacher/login");
  const isLoginPage = pathname.startsWith("/login") || isTeacherLogin;
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

  // Helper to get cached user role
  async function resolveUserRole(uid: string): Promise<string | null> {
    const cached = middlewareRoleCache.get(uid);
    if (cached && Date.now() - cached.cachedAt < ROLE_CACHE_TTL) {
      return cached.role;
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();

    const role = roleData?.role || null;
    if (role) {
      middlewareRoleCache.set(uid, { role, cachedAt: Date.now() });
    }
    return role;
  }

  // 1. If not logged in & trying to access protected UI routes
  if (!user && !isLoginPage && !isAuthCallback) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/teacher")) {
      url.pathname = "/teacher/login";
    } else {
      url.pathname = "/login";
    }
    return NextResponse.redirect(url);
  }

  // 2. If logged in & trying to access /login or /teacher/login
  if (user && isLoginPage) {
    const userRole = await resolveUserRole(user.id);
    const url = request.nextUrl.clone();
    if (userRole === "Teacher") {
      url.pathname = "/teacher";
    } else {
      url.pathname = "/";
    }
    return NextResponse.redirect(url);
  }

  // 3. Admin-only route protection for /settings
  if (user && request.nextUrl.pathname.startsWith("/settings")) {
    const userRole = await resolveUserRole(user.id);
    if (userRole !== "Admin") {
      // Redirect staff/teachers to appropriate dashboard
      const url = request.nextUrl.clone();
      url.pathname = userRole === "Teacher" ? "/teacher" : "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
