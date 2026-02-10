"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function VerifyPage() {
    const router = useRouter()
    const [certificateId, setCertificateId] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        const id = certificateId.trim().toUpperCase()
        if (!id) {
            setError("Please enter a certificate ID")
            return
        }

        const pattern = /^CFP-\d{4}-[A-Z0-9]{5}$/
        if (!pattern.test(id)) {
            setError("Invalid format. Expected: CFP-YYYY-XXXXX")
            return
        }

        router.push(`/verify/${id}`)
    }

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

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Verify Certificate</h1>
                    <p className="text-gray-400">Enter a certificate ID to verify its authenticity.</p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-8">
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Certificate ID
                            </label>
                            <input
                                type="text"
                                value={certificateId}
                                onChange={(e) => setCertificateId(e.target.value.toUpperCase())}
                                placeholder="CFP-2026-XXXXX"
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-center text-lg tracking-wider"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
                        >
                            Verify Certificate
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <p className="text-center text-gray-400 text-sm mb-4">
                            Or scan a certificate QR code
                        </p>
                        <div className="aspect-video max-w-xs mx-auto rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                            <div className="text-center p-4">
                                <svg className="w-12 h-12 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-gray-500 text-xs">Camera scanner coming soon</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 backdrop-blur-xl bg-blue-500/10 rounded-xl border border-blue-500/30 p-6">
                    <h3 className="text-white font-medium mb-2">How it works</h3>
                    <ul className="text-blue-200/80 text-sm space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400">1.</span>
                            Enter the certificate ID or scan the QR code
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400">2.</span>
                            We verify the cryptographic hash matches
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400">3.</span>
                            View certificate details and status instantly
                        </li>
                    </ul>
                </div>
            </main>
        </div>
    )
}
