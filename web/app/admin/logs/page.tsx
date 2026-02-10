import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getVerificationLogs } from "@/app/actions/admin"

export default async function AdminLogsPage() {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard?error=unauthorized")

    const logs = await getVerificationLogs()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">CertiFoolProof</Link>
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="text-gray-300 hover:text-white transition-colors text-sm">← Admin</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Verification Logs</h1>
                    <p className="text-gray-400">{logs.length} recent verification attempts</p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Certificate ID</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Verified At</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Result</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">IP Address</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">User Agent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No verification logs yet.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link href={`/verify/${log.certificateId}`} className="text-blue-400 hover:text-blue-300 font-mono text-sm">
                                                {log.certificateId}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {new Date(log.verifiedAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 text-sm ${log.success ? "text-green-400" : "text-red-400"}`}>
                                                <span className={`w-2 h-2 rounded-full ${log.success ? "bg-green-400" : "bg-red-400"}`} />
                                                {log.success ? "Valid" : "Failed"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm font-mono">{log.ipAddress || "—"}</td>
                                        <td className="px-6 py-4 text-gray-500 text-xs max-w-[200px] truncate">
                                            {log.userAgent || "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}
