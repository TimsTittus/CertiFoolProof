import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MobileNav } from "./mobile-nav"

export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    const user = session.user
    const roleColors: Record<string, string> = {
        ADMIN: "bg-red-500/20 text-red-300 border-red-500/30",
        FACULTY: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        CLUB: "bg-green-500/20 text-green-300 border-green-500/30",
    }

    const navLinks = [
        { href: "/dashboard", label: "Dashboard", show: true },
        {
            href: "/generate",
            label: "Generate",
            show: user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB",
        },
        { href: "/admin", label: "Admin", show: user.role === "ADMIN" },
    ].filter((link) => link.show)

    return (
        <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

            <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent shrink-0"
                        >
                            CertiFoolProof
                        </Link>

                        {/* Desktop Nav Links */}
                        <div className="hidden sm:flex items-center gap-3 md:gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-gray-300 hover:text-white transition-colors text-sm"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <form
                                action={async () => {
                                    "use server"
                                    await signOut({ redirectTo: "/" })
                                }}
                            >
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-sm transition-colors"
                                >
                                    Sign Out
                                </button>
                            </form>
                        </div>

                        {/* Mobile Hamburger */}
                        <MobileNav
                            links={navLinks}
                            signOutAction={async () => {
                                "use server"
                                await signOut({ redirectTo: "/" })
                            }}
                        />
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">

                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 break-words">
                        Welcome back, {user.name}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">
                        Here&apos;s an overview of your certificate management activities.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                    {/* Role Card */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4 sm:p-6 flex items-center gap-4 sm:block">
                        <div className="p-2.5 rounded-lg bg-white/5 sm:hidden shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Your Role</h3>
                            <span className={`inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium border ${roleColors[user.role]}`}>
                                {user.role}
                            </span>
                        </div>
                    </div>

                    {/* Email Card */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4 sm:p-6 flex items-center gap-4 sm:block">
                        <div className="p-2.5 rounded-lg bg-white/5 sm:hidden shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Email</h3>
                            <p className="text-white text-sm sm:text-base truncate">{user.email}</p>
                        </div>
                    </div>

                    {/* Department Card */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4 sm:p-6 flex items-center gap-4 sm:block sm:col-span-2 md:col-span-1">
                        <div className="p-2.5 rounded-lg bg-white/5 sm:hidden shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Department</h3>
                            <p className="text-white text-sm sm:text-base">{user.department || "N/A"}</p>
                        </div>
                    </div>
                </div>

                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

                        {/* Issue Certificate */}
                        {(user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB") && (
                            <Link
                                href="/generate"
                                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 active:scale-[0.98] transition-all group"
                            >
                                <div className="p-2 rounded-lg bg-blue-500/20 shrink-0">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white text-sm sm:text-base font-medium group-hover:text-blue-300 transition-colors">Issue Certificate</h3>
                                    <p className="text-gray-400 text-xs sm:text-sm truncate">Create a new certificate</p>
                                </div>
                                <svg className="w-4 h-4 text-gray-500 ml-auto shrink-0 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        )}

                        {/* My Certificates */}
                        {(user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB") && (
                            <Link
                                href="/dashboard/certificates"
                                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 active:scale-[0.98] transition-all group"
                            >
                                <div className="p-2 rounded-lg bg-purple-500/20 shrink-0">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white text-sm sm:text-base font-medium group-hover:text-purple-300 transition-colors">My Certificates</h3>
                                    <p className="text-gray-400 text-xs sm:text-sm truncate">View issued certificates</p>
                                </div>
                                <svg className="w-4 h-4 text-gray-500 ml-auto shrink-0 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        )}

                        {/* Verify Certificate */}
                        <Link
                            href="/verify"
                            className="flex items-center gap-3 p-3.5 sm:p-4 rounded-lg bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 hover:border-green-400/50 active:scale-[0.98] transition-all group"
                        >
                            <div className="p-2 rounded-lg bg-green-500/20 shrink-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-white text-sm sm:text-base font-medium group-hover:text-green-300 transition-colors">Verify Certificate</h3>
                                <p className="text-gray-400 text-xs sm:text-sm truncate">Scan and validate</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-500 ml-auto shrink-0 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>

                        {/* Admin Panel */}
                        {user.role === "ADMIN" && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-lg bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 hover:border-red-400/50 active:scale-[0.98] transition-all group"
                            >
                                <div className="p-2 rounded-lg bg-red-500/20 shrink-0">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white text-sm sm:text-base font-medium group-hover:text-red-300 transition-colors">Admin Panel</h3>
                                    <p className="text-gray-400 text-xs sm:text-sm truncate">Manage system</p>
                                </div>
                                <svg className="w-4 h-4 text-gray-500 ml-auto shrink-0 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
