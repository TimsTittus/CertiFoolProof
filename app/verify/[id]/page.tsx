import Link from "next/link"
import { verifyCertificate } from "@/app/actions/verify"
import { isValidCertificateId } from "@/lib/certificate"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function VerifyResultPage({ params }: PageProps) {
    const { id } = await params

    if (!isValidCertificateId(id)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="backdrop-blur-xl bg-red-500/10 rounded-xl border border-red-500/30 p-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-white mb-2">Invalid Certificate ID</h1>
                        <p className="text-gray-400 mb-4">The certificate ID format is invalid.</p>
                        <p className="text-gray-500 text-sm font-mono mb-6">{id}</p>
                        <Link href="/verify" className="text-blue-400 hover:text-blue-300 text-sm">
                            ← Try another certificate
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const result = await verifyCertificate(id)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            CertiFoolProof
                        </Link>
                        <Link href="/login" className="text-gray-300 hover:text-white transition-colors text-sm">
                            Sign In
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-2xl mx-auto px-4 py-12">
                {result.valid && result.certificate ? (
                    <div className="backdrop-blur-xl bg-green-500/10 rounded-xl border border-green-500/30 p-8">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-green-300 mb-1">Certificate Verified</h1>
                            <p className="text-green-200/80 text-sm">This certificate is authentic and valid.</p>
                        </div>

                        <div className="bg-white/5 rounded-lg p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-xs">Certificate ID</p>
                                    <p className="text-white font-mono">{result.certificate.certificateId}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Status</p>
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                        {result.certificate.status}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <p className="text-gray-400 text-xs mb-1">Awarded To</p>
                                <p className="text-white text-lg font-medium">{result.certificate.recipientName}</p>
                                <p className="text-gray-500 text-sm">{result.certificate.recipientEmail}</p>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <p className="text-gray-400 text-xs mb-1">Certificate Title</p>
                                <p className="text-white">{result.certificate.title}</p>
                                {result.certificate.description && (
                                    <p className="text-gray-400 text-sm mt-1">{result.certificate.description}</p>
                                )}
                            </div>

                            <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-xs">Issued By</p>
                                    <p className="text-white">{result.certificate.issuerName}</p>
                                    {result.certificate.issuerDepartment && (
                                        <p className="text-gray-500 text-xs">{result.certificate.issuerDepartment}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Issue Date</p>
                                    <p className="text-white">{new Date(result.certificate.issuedAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {result.certificate.expiresAt && (
                                <div className="border-t border-white/10 pt-4">
                                    <p className="text-gray-400 text-xs">Expires</p>
                                    <p className="text-white">{new Date(result.certificate.expiresAt).toLocaleDateString()}</p>
                                </div>
                            )}

                            <div className="border-t border-white/10 pt-4 text-center">
                                <p className="text-gray-500 text-xs">
                                    Verified {result.certificate.verificationCount} time{result.certificate.verificationCount !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="backdrop-blur-xl bg-red-500/10 rounded-xl border border-red-500/30 p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-red-300 mb-2">
                            {result.certificate ? "Certificate Invalid" : "Certificate Not Found"}
                        </h1>
                        <p className="text-red-200/80 mb-4">
                            {result.error || "This certificate could not be verified."}
                        </p>
                        {result.certificate && (
                            <div className="bg-white/5 rounded-lg p-4 text-left mb-4">
                                <p className="text-gray-400 text-xs mb-1">Status</p>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${result.certificate.status === "REVOKED"
                                        ? "bg-red-500/20 text-red-300 border-red-500/30"
                                        : result.certificate.status === "EXPIRED"
                                            ? "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                            : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                    }`}>
                                    {result.certificate.status}
                                </span>
                            </div>
                        )}
                        <p className="text-gray-500 text-sm font-mono">{id}</p>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link href="/verify" className="text-blue-400 hover:text-blue-300 text-sm">
                        ← Verify another certificate
                    </Link>
                </div>
            </main>
        </div>
    )
}
