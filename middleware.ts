import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes that anyone can access without authentication
const publicRoutes = ["/", "/login", "/signup", "/verify", "/generate/bulk"]
const authRoutes = ["/login", "/signup"]

const roleRoutes: Record<string, string[]> = {
    "/admin": ["ADMIN"],
    "/generate": ["ADMIN", "FACULTY", "CLUB"],
}

const VALID_ROLES = ["ADMIN", "FACULTY", "CLUB"]

export default async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // 1. Skip middleware for API routes to prevent recursion
    if (pathname.startsWith("/api")) {
        return NextResponse.next()
    }

    // 2. Define public routes
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
    const isAuthRoute = authRoutes.includes(pathname)

    // 3. Get session - only for non-API routes
    let session = null
    try {
        const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
            headers: {
                cookie: request.headers.get("cookie") || "",
            },
        })
        if (sessionResponse.ok) {
            session = await sessionResponse.json()
        }
    } catch (error) {
        console.error("Middleware session fetch error:", error)
    }

    const isLoggedIn = !!session
    const userRole = session?.user?.role
    const hasValidRole = Boolean(userRole && VALID_ROLES.includes(userRole))

    // 4. Handle Redirections for Auth routes (login/signup)
    if (isAuthRoute && isLoggedIn && hasValidRole) {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl))
    }

    // 5. Allow public routes
    if (isPublicRoute) {
        return NextResponse.next()
    }

    // 6. Require login for protected routes
    if (!isLoggedIn) {
        const loginUrl = new URL("/login", request.nextUrl)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // 7. If logged in but user role is invalid/unauthorized for the platform, redirect to public landing page
    if (!hasValidRole) {
        const homeUrl = new URL("/", request.nextUrl)
        homeUrl.searchParams.set("error", "unauthorized")
        return NextResponse.redirect(homeUrl)
    }

    // 8. Check role-gated routes (/admin, /generate)
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname === route || pathname.startsWith(`${route}/`)) {
            if (!allowedRoles.includes(userRole)) {
                // Avoid self-redirect if already on /dashboard
                if (!pathname.startsWith("/dashboard")) {
                    const dashboardUrl = new URL("/dashboard", request.nextUrl)
                    dashboardUrl.searchParams.set("error", "unauthorized")
                    return NextResponse.redirect(dashboardUrl)
                }
            }
            break
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico|css|js)$).*)",
    ],
}