import { auth } from "@/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getAdminDashboardStats } from "@/app/actions/admin"
import { logout } from "@/app/actions/auth-actions"

export default async function AdminPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/dashboard?error=unauthorized")
    }

    const stats = await getAdminDashboardStats()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            CertiFoolProof
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm">Dashboard</Link>
                            <Link href="/generate" className="text-gray-300 hover:text-white transition-colors text-sm">Generate</Link>
                            <Link href="/admin" className="text-white font-medium text-sm">Admin</Link>
                            <form action={logout}>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-sm transition-colors">Sign Out</button>
                            </form>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
                        <p className="text-gray-400">System overview and management.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                        {session.user.role}
                    </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Users</p>
                        <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                            {stats.usersByRole.map((r) => (
                                <span key={r.role} className="text-xs text-gray-500">{r.role}: {r.count}</span>
                            ))}
                        </div>
                    </div>
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Certificates</p>
                        <p className="text-3xl font-bold text-white">{stats.totalCertificates}</p>
                        <p className="text-xs text-green-400 mt-2">{stats.activeCertificates} active</p>
                    </div>
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Verifications</p>
                        <p className="text-3xl font-bold text-white">{stats.totalVerifications}</p>
                        <p className="text-xs text-blue-400 mt-2">{stats.recentVerifications} this week</p>
                    </div>
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Revoked</p>
                        <p className="text-3xl font-bold text-white">{stats.revokedCertificates}</p>
                        <p className="text-xs text-red-400 mt-2">certificates revoked</p>
                    </div>
                </div>

                {/* Issuance Chart (simple bar chart) */}
                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Certificates Issued (Last 6 Months)</h2>
                    <div className="flex items-end gap-3 h-40">
                        {stats.certificatesByMonth.map((m) => {
                            const maxCount = Math.max(...stats.certificatesByMonth.map((x) => x.count), 1)
                            const heightPercent = (m.count / maxCount) * 100
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-xs text-gray-400">{m.count}</span>
                                    <div
                                        className="w-full bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-md transition-all"
                                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                                    />
                                    <span className="text-xs text-gray-500">{m.month.slice(5)}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Link href="/admin/users" className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium group-hover:text-blue-300 transition-colors">Manage Users</h3>
                                <p className="text-gray-500 text-sm">{stats.totalUsers} users</p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/admin/certificates" className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:border-green-500/30 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium group-hover:text-green-300 transition-colors">All Certificates</h3>
                                <p className="text-gray-500 text-sm">{stats.totalCertificates} total</p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/admin/logs" className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:border-purple-500/30 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium group-hover:text-purple-300 transition-colors">Verification Logs</h3>
                                <p className="text-gray-500 text-sm">{stats.totalVerifications} verifications</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Certificates */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Recent Certificates</h2>
                            <Link href="/admin/certificates" className="text-blue-400 hover:text-blue-300 text-xs">View all →</Link>
                        </div>
                        {stats.recentCertificates.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">No certificates issued yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentCertificates.slice(0, 5).map((c) => (
                                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <div>
                                            <p className="text-white text-sm">{c.recipientName}</p>
                                            <p className="text-gray-500 text-xs">{c.title} · by {c.issuerName}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs border ${c.status === "ACTIVE" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                                            c.status === "REVOKED" ? "bg-red-500/20 text-red-300 border-red-500/30" :
                                                "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                            }`}>{c.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Verifications */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Recent Verifications</h2>
                            <Link href="/admin/logs" className="text-blue-400 hover:text-blue-300 text-xs">View all →</Link>
                        </div>
                        {stats.recentLogs.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">No verifications yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentLogs.slice(0, 5).map((l) => (
                                    <div key={l.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <div>
                                            <p className="text-white text-sm font-mono">{l.certificateId}</p>
                                            <p className="text-gray-500 text-xs">{new Date(l.verifiedAt).toLocaleString()}</p>
                                        </div>
                                        <span className={`w-2 h-2 rounded-full ${l.success ? "bg-green-400" : "bg-red-400"}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
