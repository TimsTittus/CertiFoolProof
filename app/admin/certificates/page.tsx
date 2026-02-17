import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { getAllCertificates } from "@/app/actions/admin"
import { RevokeCertificateButton } from "./revoke-button"

export default async function AdminCertificatesPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard?error=unauthorized")

    const certificates = await getAllCertificates()

    const statusColors: Record<string, string> = {
        ACTIVE: "bg-green-500/20 text-green-300 border-green-500/30",
        REVOKED: "bg-red-500/20 text-red-300 border-red-500/30",
        EXPIRED: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    }

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
                    <h1 className="text-3xl font-bold text-white mb-2">All Certificates</h1>
                    <p className="text-gray-400">{certificates.length} certificates issued</p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">ID</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Recipient</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Title</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Issued By</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Date</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
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
                                        <p className="text-white text-sm">{cert.recipientName}</p>
                                        <p className="text-gray-500 text-xs">{cert.recipientEmail}</p>
                                    </td>
                                    <td className="px-6 py-4 text-white text-sm">{cert.title}</td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">{cert.issuer.name}</td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">{new Date(cert.issuedAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[cert.status]}`}>
                                            {cert.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {cert.status === "ACTIVE" && (
                                            <RevokeCertificateButton certificateId={cert.id} />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}
