import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/", "/login", "/verify"]
const authRoutes = ["/login"]

// Role-based route protection
const roleRoutes: Record<string, string[]> = {
    "/admin": ["ADMIN"],
    "/generate": ["ADMIN", "FACULTY", "CLUB"],
    "/dashboard": ["ADMIN", "FACULTY", "CLUB"],
}

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const userRole = req.auth?.user?.role

    const pathname = nextUrl.pathname

    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith("/verify/")
    )

    const isAuthRoute = authRoutes.includes(pathname)

    const isApiRoute = pathname.startsWith("/api")

    if (isApiRoute) {
        return NextResponse.next()
    }

    if (isAuthRoute && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }

    if (isPublicRoute) {
        return NextResponse.next()
    }

    if (!isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route)) {
            if (!userRole || !allowedRoles.includes(userRole)) {

                const dashboardUrl = new URL("/dashboard", nextUrl)
                dashboardUrl.searchParams.set("error", "unauthorized")
                return NextResponse.redirect(dashboardUrl)
            }
            break
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
