import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/", "/login", "/signup", "/verify"]
const authRoutes = ["/login", "/signup"]

const roleRoutes: Record<string, string[]> = {
    "/admin": ["ADMIN"],
    "/generate": ["ADMIN", "FACULTY", "CLUB"],
    "/dashboard": ["ADMIN", "FACULTY", "CLUB"],
}

export default async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // 1. Skip middleware for API routes to prevent recursion
    if (pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    // 2. Define routes
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith("/verify/")
    );
    const isAuthRoute = authRoutes.includes(pathname);

    // 3. Get session - only for non-API routes
    let session = null;
    try {
        const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
            headers: {
                cookie: request.headers.get("cookie") || "",
            },
        });
        if (sessionResponse.ok) {
            session = await sessionResponse.json();
        }
    } catch (error) {
        console.error("Middleware session fetch error:", error);
    }

    const isLoggedIn = !!session;
    const userRole = session?.user?.role;

    // 4. Handle Redirections
    if (isAuthRoute && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }

    if (isPublicRoute) {
        return NextResponse.next();
    }

    if (!isLoggedIn) {
        const loginUrl = new URL("/login", request.nextUrl);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route)) {
            if (!userRole || !allowedRoles.includes(userRole)) {
                const dashboardUrl = new URL("/dashboard", request.nextUrl);
                dashboardUrl.searchParams.set("error", "unauthorized");
                return NextResponse.redirect(dashboardUrl);
            }
            break;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
