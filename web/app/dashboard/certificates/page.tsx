import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getMyIssuedCertificates } from "@/app/actions/certificate"

export default async function MyCertificatesPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    const certificates = await getMyIssuedCertificates()

    const statusColors: Record<string, string> = {
        ACTIVE: "bg-green-500/20 text-green-300 border-green-500/30",
        REVOKED: "bg-red-500/20 text-red-300 border-red-500/30",
        EXPIRED: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    }

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
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">My Issued Certificates</h1>
                        <p className="text-gray-400">Certificates you have issued as {session.user.role.toLowerCase()}.</p>
                    </div>
                    <Link
                        href="/generate"
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                    >
                        Issue New
                    </Link>
                </div>

                {certificates.length === 0 ? (
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-12 text-center">
                        <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-xl text-white mb-2">No certificates yet</h3>
                        <p className="text-gray-400 mb-4">You haven&apos;t issued any certificates yet.</p>
                        <Link
                            href="/generate"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            Issue your first certificate
                        </Link>
                    </div>
                ) : (
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Certificate ID</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Recipient</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Title</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Issued</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Verifications</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certificates.map((cert) => (
                                    <tr key={cert.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link href={`/verify/${cert.certificateId}`} className="text-blue-400 hover:text-blue-300 font-mono text-sm">
                                                {cert.certificateId}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-white text-sm">{cert.recipientName}</p>
                                                <p className="text-gray-500 text-xs">{cert.recipientEmail}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-white text-sm">{cert.title}</td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {new Date(cert.issuedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${statusColors[cert.status]}`}>
                                                {cert.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {cert.verificationCount}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    )
}
