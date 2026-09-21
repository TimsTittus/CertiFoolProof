import { auth } from "@/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getAdminDashboardStats } from "@/app/actions/admin"
import Nav from "@/components/Nav/Nav"

export default async function AdminPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/dashboard?error=unauthorized")
    }

    const stats = await getAdminDashboardStats()

    const navLinks = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/generate", label: "Generate" },
        { href: "/admin", label: "Admin", active: true },
    ]

    return (
        <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono">
            <Nav links={navLinks} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
                <div className="mb-8 border-3 border-black bg-neo-cream p-6 shadow-neo flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-black uppercase italic mb-1">Admin Panel</h1>
                        <p className="text-black font-bold text-sm sm:text-base border-t-3 border-black pt-2">System overview and management.</p>
                    </div>
                    <span className="px-4 py-1.5 font-black text-xs sm:text-sm bg-red-500 text-white border-3 border-black shadow-neo uppercase">
                        {session.user.role}
                    </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-neo-yellow border-3 border-black p-6 shadow-neo">
                        <p className="text-black font-black text-xs uppercase tracking-wider mb-1">Total Users</p>
                        <p className="text-3xl font-black text-black">{stats.totalUsers}</p>
                        <div className="mt-2 flex gap-2 flex-wrap border-t-2 border-black pt-2">
                            {stats.usersByRole.map((r) => (
                                <span key={r.role} className="text-xs font-bold text-black">{r.role}: {r.count}</span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-neo-pink border-3 border-black p-6 shadow-neo">
                        <p className="text-black font-black text-xs uppercase tracking-wider mb-1">Certificates</p>
                        <p className="text-3xl font-black text-black">{stats.totalCertificates}</p>
                        <p className="text-xs font-bold text-black mt-2 border-t-2 border-black pt-2">{stats.activeCertificates} active</p>
                    </div>
                    <div className="bg-white border-3 border-black p-6 shadow-neo">
                        <p className="text-black font-black text-xs uppercase tracking-wider mb-1">Total Verifications</p>
                        <p className="text-3xl font-black text-black">{stats.totalVerifications}</p>
                        <p className="text-xs font-bold text-black mt-2 border-t-2 border-black pt-2">{stats.recentVerifications} this week</p>
                    </div>
                    <div className="bg-red-500 border-3 border-black p-6 shadow-neo text-white">
                        <p className="font-black text-xs uppercase tracking-wider mb-1">Revoked</p>
                        <p className="text-3xl font-black">{stats.revokedCertificates}</p>
                        <p className="text-xs font-bold mt-2 border-t-2 border-black pt-2">certificates revoked</p>
                    </div>
                </div>

                {/* Issuance Chart */}
                <div className="bg-white border-3 border-black p-6 mb-8 shadow-neo">
                    <h2 className="text-xl font-black text-black uppercase italic underline decoration-3 underline-offset-4 mb-6">Certificates Issued (Last 6 Months)</h2>
                    <div className="flex items-end gap-3 h-40">
                        {stats.certificatesByMonth.map((m) => {
                            const maxCount = Math.max(...stats.certificatesByMonth.map((x) => x.count), 1)
                            const heightPercent = (m.count / maxCount) * 100
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-xs font-black text-black">{m.count}</span>
                                    <div
                                        className="w-full bg-neo-yellow border-2 border-black transition-all shadow-neo"
                                        style={{ height: `${Math.max(heightPercent, 8)}%` }}
                                    />
                                    <span className="text-xs font-black text-black uppercase">{m.month.slice(5)}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Link href="/admin/users" className="bg-neo-yellow border-3 border-black p-6 shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 group">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-black border-2 border-black">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-black font-black uppercase text-lg group-hover:underline">Manage Users</h3>
                                <p className="text-black font-bold text-xs">{stats.totalUsers} users registered</p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/admin/certificates" className="bg-neo-pink border-3 border-black p-6 shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 group">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-black border-2 border-black">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-black font-black uppercase text-lg group-hover:underline">All Certificates</h3>
                                <p className="text-black font-bold text-xs">{stats.totalCertificates} certificates</p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/admin/logs" className="bg-white border-3 border-black p-6 shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 group">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-black border-2 border-black">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-black font-black uppercase text-lg group-hover:underline">Verification Logs</h3>
                                <p className="text-black font-bold text-xs">{stats.totalVerifications} verifications</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Certificates */}
                    <div className="bg-white border-3 border-black p-6 shadow-neo">
                        <div className="flex items-center justify-between mb-4 border-b-3 border-black pb-3">
                            <h2 className="text-lg font-black text-black uppercase italic">Recent Certificates</h2>
                            <Link href="/admin/certificates" className="text-black font-black text-xs uppercase hover:underline decoration-2">View all →</Link>
                        </div>
                        {stats.recentCertificates.length === 0 ? (
                            <p className="text-black font-bold text-sm text-center py-8">No certificates issued yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentCertificates.slice(0, 5).map((c) => (
                                    <div key={c.id} className="flex items-center justify-between py-2 border-b-2 border-black/10 last:border-0">
                                        <div>
                                            <p className="text-black font-black text-sm">{c.recipientName}</p>
                                            <p className="text-black font-bold text-xs opacity-70">{c.title} · by {c.issuerName}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-black border-2 border-black shadow-sm uppercase ${c.status === "ACTIVE" ? "bg-neo-mint" :
                                            c.status === "REVOKED" ? "bg-red-500 text-white" :
                                                "bg-neo-yellow"
                                            }`}>{c.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Verifications */}
                    <div className="bg-white border-3 border-black p-6 shadow-neo">
                        <div className="flex items-center justify-between mb-4 border-b-3 border-black pb-3">
                            <h2 className="text-lg font-black text-black uppercase italic">Recent Verifications</h2>
                            <Link href="/admin/logs" className="text-black font-black text-xs uppercase hover:underline decoration-2">View all →</Link>
                        </div>
                        {stats.recentLogs.length === 0 ? (
                            <p className="text-black font-bold text-sm text-center py-8">No verifications yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentLogs.slice(0, 5).map((l) => (
                                    <div key={l.id} className="flex items-center justify-between py-2 border-b-2 border-black/10 last:border-0">
                                        <div>
                                            <p className="text-black font-black text-sm font-mono">{l.certificateId}</p>
                                            <p className="text-black font-bold text-xs opacity-70">{new Date(l.verifiedAt).toLocaleString()}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-black border-2 border-black shadow-sm uppercase ${l.success ? "bg-neo-mint" : "bg-red-500 text-white"}`}>
                                            {l.success ? "VALID" : "INVALID"}
                                        </span>
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
