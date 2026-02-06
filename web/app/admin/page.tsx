import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminPage() {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/dashboard?error=unauthorized")
    }

    const user = session.user

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Navigation */}
            <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            CertiFoolProof
                        </Link>

                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm">
                                Dashboard
                            </Link>
                            <Link href="/generate" className="text-gray-300 hover:text-white transition-colors text-sm">
                                Generate
                            </Link>
                            <Link href="/admin" className="text-white font-medium text-sm">
                                Admin
                            </Link>
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
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Admin Panel
                        </h1>
                        <p className="text-gray-400">
                            System management and analytics dashboard.
                        </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                        {user.role}
                    </span>
                </div>

                {/* Admin sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* User Management */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:border-white/20 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-white">User Management</h2>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            Manage users, roles, and permissions for the platform.
                        </p>
                        <p className="text-xs text-gray-500 italic">Coming in Phase 6</p>
                    </div>

                    {/* Certificate Analytics */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:border-white/20 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-white">Analytics</h2>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            View certificate issuance and verification statistics.
                        </p>
                        <p className="text-xs text-gray-500 italic">Coming in Phase 6</p>
                    </div>

                    {/* System Settings */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:border-white/20 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-white">Settings</h2>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            Configure system settings and preferences.
                        </p>
                        <p className="text-xs text-gray-500 italic">Coming in Phase 6</p>
                    </div>
                </div>

                {/* Info banner */}
                <div className="mt-8 backdrop-blur-xl bg-amber-500/10 rounded-xl border border-amber-500/30 p-6">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 className="text-white font-medium mb-1">Admin Panel Preview</h3>
                            <p className="text-amber-200/80 text-sm">
                                This is a skeleton admin page. Full functionality including user management,
                                analytics dashboards, and system settings will be implemented in Phase 6.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
