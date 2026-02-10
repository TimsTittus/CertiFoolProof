import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

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
                            {(user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB") && (
                                <Link href="/generate" className="text-gray-300 hover:text-white transition-colors text-sm">
                                    Generate
                                </Link>
                            )}
                            {user.role === "ADMIN" && (
                                <Link href="/admin" className="text-gray-300 hover:text-white transition-colors text-sm">
                                    Admin
                                </Link>
                            )}
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome back, {user.name}
                    </h1>
                    <p className="text-gray-400">
                        Here&apos;s an overview of your certificate management activities.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-1">Your Role</h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${roleColors[user.role]}`}>
                            {user.role}
                        </span>
                    </div>

                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-1">Email</h3>
                        <p className="text-white">{user.email}</p>
                    </div>

                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-1">Department</h3>
                        <p className="text-white">{user.department || "N/A"}</p>
                    </div>
                </div>

                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB") && (
                            <Link
                                href="/generate"
                                className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 transition-all group"
                            >
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium group-hover:text-blue-300 transition-colors">Issue Certificate</h3>
                                    <p className="text-gray-400 text-sm">Create a new certificate</p>
                                </div>
                            </Link>
                        )}

                        {(user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB") && (
                            <Link
                                href="/dashboard/certificates"
                                className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 transition-all group"
                            >
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium group-hover:text-purple-300 transition-colors">My Certificates</h3>
                                    <p className="text-gray-400 text-sm">View issued certificates</p>
                                </div>
                            </Link>
                        )}

                        <Link
                            href="/verify"
                            className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 hover:border-green-400/50 transition-all group"
                        >
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium group-hover:text-green-300 transition-colors">Verify Certificate</h3>
                                <p className="text-gray-400 text-sm">Scan and validate</p>
                            </div>
                        </Link>

                        {user.role === "ADMIN" && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 hover:border-red-400/50 transition-all group"
                            >
                                <div className="p-2 rounded-lg bg-red-500/20">
                                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium group-hover:text-red-300 transition-colors">Admin Panel</h3>
                                    <p className="text-gray-400 text-sm">Manage system</p>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
