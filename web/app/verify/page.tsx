import Link from "next/link"

export default function VerifyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

            <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            CertiFoolProof
                        </Link>

                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-gray-300 hover:text-white transition-colors text-sm">
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Verify Certificate
                    </h1>
                    <p className="text-gray-400">
                        Scan a QR code or enter a certificate ID to verify authenticity.
                    </p>
                </div>

                {/* Verification card */}
                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-8">
                    <div className="mb-8">
                        <div className="aspect-square max-w-xs mx-auto rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                            <div className="text-center p-6">
                                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2m0-4v4m0-11v3M4.93 4.93l.707.707M2 12h1m17 0h1m-1.07 7.07l-.707-.707M12 21v-1" />
                                    <rect x="5" y="5" width="6" height="6" rx="1" strokeWidth={1.5} />
                                    <rect x="13" y="5" width="6" height="6" rx="1" strokeWidth={1.5} />
                                    <rect x="5" y="13" width="6" height="6" rx="1" strokeWidth={1.5} />
                                    <rect x="13" y="13" width="6" height="6" rx="1" strokeWidth={1.5} />
                                </svg>
                                <p className="text-gray-400 text-sm">
                                    QR Scanner coming in Phase 5
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-slate-900 text-gray-400">or enter certificate ID</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Certificate ID
                            </label>
                            <input
                                type="text"
                                placeholder="CFP-2026-XXXXX"
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                disabled
                            />
                        </div>

                        <button
                            type="button"
                            disabled
                            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium opacity-50 cursor-not-allowed"
                        >
                            Verify Certificate (Coming in Phase 5)
                        </button>
                    </div>

                    <div className="mt-6 backdrop-blur-xl bg-blue-500/10 rounded-lg border border-blue-500/30 p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="text-white font-medium text-sm mb-1">Verification Preview</h3>
                                <p className="text-blue-200/80 text-xs">
                                    This is a preview of the verification interface. Full QR scanning and
                                    hash validation will be implemented in Phase 5.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
