import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { MobileNav } from "./mobile-nav"
import { logout } from "@/app/actions/auth-actions"

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session?.user) {
        redirect("/login")
    }

    const user = session.user
    const roleColors: Record<string, string> = {
        ADMIN: "bg-red-500 text-white border-3 border-black",
        FACULTY: "bg-neo-yellow text-black border-3 border-black",
        CLUB: "bg-neo-pink text-black border-3 border-black",
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
        <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono">

            <nav className="border-b-3 border-black bg-white sticky top-0 z-50 shadow-neo">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="text-xl sm:text-2xl font-black bg-black text-white px-3 py-1 border-3 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            CertiFoolProof
                        </Link>

                        {/* Desktop Nav Links */}
                        <div className="hidden sm:flex items-center gap-4 md:gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-black font-bold hover:underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <form action={logout}>
                                <button
                                    type="submit"
                                    className="px-4 py-2 border-3 border-black bg-neo-yellow hover:bg-black hover:text-white font-bold text-sm transition-all shadow-neo hover:shadow-none translate-x-0 translate-y-0 active:translate-x-[2px] active:translate-y-[2px]"
                                >
                                    Log Out
                                </button>
                            </form>
                        </div>

                        {/* Mobile Hamburger */}
                        <MobileNav
                            links={navLinks}
                            signOutAction={logout}
                        />
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">

                {/* Header */}
                <div className="mb-8 border-3 border-black bg-neo-cream p-6 shadow-neo">
                    <h1 className="text-3xl sm:text-4xl font-black text-black mb-2 uppercase italic">
                        Trainer info: {user.name}
                    </h1>
                    <p className="text-black font-bold text-sm sm:text-base border-t-3 border-black pt-2">
                        Manage your certificates and verification status.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                    {/* Role Card */}
                    <div className="bg-neo-yellow border-3 border-black p-4 sm:p-6 shadow-neo flex items-center gap-4 sm:block">
                        <div className="p-2.5 bg-black sm:hidden shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-black text-black mb-1 uppercase tracking-tighter">Your Role</h3>
                            <span className={`inline-flex items-center px-3 py-1 text-xs sm:text-sm font-black border-3 border-black shadow-neo bg-white`}>
                                {user.role}
                            </span>
                        </div>
                    </div>

                    {/* Email Card */}
                    <div className="bg-neo-pink border-3 border-black p-4 sm:p-6 shadow-neo flex items-center gap-4 sm:block">
                        <div className="p-2.5 bg-black sm:hidden shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-black text-black mb-1 uppercase tracking-tighter">Email</h3>
                            <p className="text-black font-bold text-sm sm:text-base truncate">{user.email}</p>
                        </div>
                    </div>

                    {/* Department Card */}
                    <div className="bg-neo-cream border-3 border-black p-4 sm:p-6 shadow-neo flex items-center gap-4 sm:block sm:col-span-2 md:col-span-1">
                        <div className="p-2.5 bg-black sm:hidden shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-black text-black mb-1 uppercase tracking-tighter">Department</h3>
                            <p className="text-black font-bold text-sm sm:text-base">{user.department || "N/A"}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-3 border-black p-4 sm:p-6 shadow-neo">
                    <h2 className="text-xl sm:text-2xl font-black text-black mb-4 uppercase italic underline decoration-3 underline-offset-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

                        {/* Issue Certificate */}
                        {(user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB") && (
                            <Link
                                href="/generate"
                                className="flex items-center gap-3 p-4 border-3 border-black bg-neo-yellow shadow-neo hover:shadow-none translate-x-0 translate-y-0 active:translate-x-[2px] active:translate-y-[2px] transition-all group"
                            >
                                <div className="p-2 bg-black shrink-0">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-black text-sm sm:text-base font-black uppercase group-hover:underline transition-all">Issue Certificate</h3>
                                    <p className="text-black font-bold text-xs sm:text-sm truncate opacity-70">Create a new certificate</p>
                                </div>
                            </Link>
                        )}

                        {/* My Certificates */}
                        {(user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB") && (
                            <Link
                                href="/dashboard/certificates"
                                className="flex items-center gap-3 p-4 border-3 border-black bg-neo-pink shadow-neo hover:shadow-none translate-x-0 translate-y-0 active:translate-x-[2px] active:translate-y-[2px] transition-all group"
                            >
                                <div className="p-2 bg-black shrink-0">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-black text-sm sm:text-base font-black uppercase group-hover:underline transition-all">My Certificates</h3>
                                    <p className="text-black font-bold text-xs sm:text-sm truncate opacity-70">View issued certificates</p>
                                </div>
                            </Link>
                        )}

                        {/* Verify Certificate */}
                        <Link
                            href="/verify"
                            className="flex items-center gap-3 p-4 border-3 border-black bg-white shadow-neo hover:shadow-none translate-x-0 translate-y-0 active:translate-x-[2px] active:translate-y-[2px] transition-all group"
                        >
                            <div className="p-2 bg-black shrink-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-black text-sm sm:text-base font-black uppercase group-hover:underline transition-all">Verify Certificate</h3>
                                <p className="text-black font-bold text-xs sm:text-sm truncate opacity-70">Scan and validate</p>
                            </div>
                        </Link>

                        {/* Admin Panel */}
                        {user.role === "ADMIN" && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-3 p-4 border-3 border-black bg-red-500 shadow-neo hover:shadow-none translate-x-0 translate-y-0 active:translate-x-[2px] active:translate-y-[2px] transition-all group"
                            >
                                <div className="p-2 bg-black shrink-0">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white text-sm sm:text-base font-black uppercase group-hover:underline transition-all">Admin Panel</h3>
                                    <p className="text-white font-bold text-xs sm:text-sm truncate opacity-70">Manage system</p>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
