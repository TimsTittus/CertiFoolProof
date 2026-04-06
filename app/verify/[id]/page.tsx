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
            <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-red-500 border-3 border-black p-8 shadow-neo text-center">
                        <div className="w-16 h-16 mx-auto mb-6 bg-black flex items-center justify-center border-2 border-black">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black text-white mb-2 uppercase italic">Invalid ID</h1>
                        <p className="text-white font-bold mb-6">The certificate ID format is invalid.</p>
                        <p className="bg-white border-2 border-black p-2 text-black font-black mb-8 break-all">{id}</p>
                        <Link
                            href="/verify"
                            className="inline-block bg-white border-3 border-black px-6 py-2 shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-black uppercase text-sm italic"
                        >
                            ← Try Another
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const result = await verifyCertificate(id)

    return (
        <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono">
            <nav className="border-b-3 border-black bg-white sticky top-0 z-50 shadow-neo">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        <Link
                            href="/"
                            className="text-xl sm:text-2xl font-black bg-black text-white px-3 py-1 border-3 border-black shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100"
                        >
                            CertiFoolProof
                        </Link>
                        <Link
                            href="/login"
                            className="text-black font-black hover:underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </nav>            <main className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
                {result.valid && result.certificate ? (
                    <div className="bg-white border-3 border-black shadow-neo overflow-hidden">
                        <div className="bg-neo-yellow border-b-3 border-black p-8 text-center relative overflow-hidden">
                            <div className="w-20 h-20 mx-auto mb-4 bg-black flex items-center justify-center border-2 border-black shadow-neo">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-black mb-1 uppercase italic underline decoration-3 underline-offset-4">Verified!</h1>
                            <p className="text-black font-bold">This certificate is authentic.</p>
                        </div>

                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="border-3 border-black bg-neo-cream/20 p-4">
                                    <p className="text-xs font-black uppercase italic text-black/60 mb-1">Certificate ID</p>
                                    <p className="text-black font-black break-all">{result.certificate.certificateId}</p>
                                </div>
                                <div className="border-3 border-black bg-neo-cream/20 p-4">
                                    <p className="text-xs font-black uppercase italic text-black/60 mb-1">Status</p>
                                    <span className="inline-flex px-3 py-1 bg-black text-white text-xs font-black uppercase italic">
                                        {result.certificate.status}
                                    </span>
                                </div>
                            </div>

                            <div className="border-3 border-black p-6 bg-neo-pink/10">
                                <p className="text-xs font-black uppercase italic text-black/60 mb-2 underline decoration-2 underline-offset-2">Awarded To</p>
                                <p className="text-black text-xl sm:text-2xl font-black">{result.certificate.recipientName}</p>
                                <p className="text-black/60 font-bold text-sm tracking-tight">{result.certificate.recipientEmail}</p>
                            </div>

                            <div className="border-3 border-black p-6 bg-neo-mint/10">
                                <p className="text-xs font-black uppercase italic text-black/60 mb-2 underline decoration-2 underline-offset-2">Certificate Title</p>
                                <p className="text-black font-black text-lg">{result.certificate.title}</p>
                                {result.certificate.description && (
                                    <p className="text-black/70 font-bold text-sm mt-2 pt-2 border-t-2 border-black/10 italic">
                                        &quot;{result.certificate.description}&quot;
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="border-3 border-black p-4 bg-white shadow-neo">
                                    <p className="text-xs font-black uppercase italic text-black/60 mb-2">Issued By</p>
                                    <p className="text-black font-black">{result.certificate.issuerName}</p>
                                    {result.certificate.issuerDepartment && (
                                        <p className="text-black/60 font-bold text-xs uppercase">{result.certificate.issuerDepartment}</p>
                                    )}
                                </div>
                                <div className="border-3 border-black p-4 bg-white shadow-neo">
                                    <p className="text-xs font-black uppercase italic text-black/60 mb-2">Issue Date</p>
                                    <p className="text-black font-black">{new Date(result.certificate.issuedAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {result.certificate.expiresAt && (
                                <div className="border-3 border-black p-4 bg-neo-yellow/10">
                                    <p className="text-xs font-black uppercase italic text-black/60 mb-1">Expires On</p>
                                    <p className="text-black font-black">{new Date(result.certificate.expiresAt).toLocaleDateString()}</p>
                                </div>
                            )}

                            <div className="pt-6 border-t-3 border-black text-center">
                                <p className="text-black/60 font-black uppercase italic text-xs">
                                    Verified {result.certificate.verificationCount} time{result.certificate.verificationCount !== 1 ? "s" : ""} securely
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-500 border-3 border-black p-8 shadow-neo text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-black flex items-center justify-center border-2 border-black">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 uppercase italic">
                            {result.certificate ? "Invalid!" : "Not Found!"}
                        </h1>
                        <p className="text-white font-bold mb-6">
                            {result.error || "This certificate could not be verified."}
                        </p>
                        {result.certificate && (
                            <div className="bg-white border-3 border-black p-4 text-left mb-6 shadow-neo">
                                <p className="text-black/60 font-black uppercase text-xs mb-1">Reason</p>
                                <span className={`inline-flex px-3 py-1 bg-black text-white text-xs font-black uppercase italic`}>
                                    {result.certificate.status}
                                </span>
                            </div>
                        )}
                        <p className="bg-black/20 text-white font-black p-2 text-sm break-all">{id}</p>
                    </div>
                )}

                <div className="mt-12 text-center">
                    <Link
                        href="/verify"
                        className="inline-block bg-neo-pink border-3 border-black px-8 py-3 shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-black uppercase italic"
                    >
                        ← Verify Another
                    </Link>
                </div>
            </main>
        </div>
    )
}