"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createCertificate, CreateCertificateResult } from "@/app/actions/certificate"

type FormState = "form" | "loading" | "success"

export default function GeneratePage() {
    const router = useRouter()
    const [formState, setFormState] = useState<FormState>("form")
    const [error, setError] = useState("")
    const [result, setResult] = useState<CreateCertificateResult["certificate"] | null>(null)

    // Form fields
    const [recipientName, setRecipientName] = useState("")
    const [recipientEmail, setRecipientEmail] = useState("")
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [expiresAt, setExpiresAt] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setFormState("loading")

        const response = await createCertificate({
            recipientName,
            recipientEmail,
            title,
            description: description || undefined,
            expiresAt: expiresAt || undefined,
        })

        if (!response.success) {
            setError(response.error || "Failed to create certificate")
            setFormState("form")
            return
        }

        setResult(response.certificate || null)
        setFormState("success")
    }

    const handleReset = () => {
        setFormState("form")
        setResult(null)
        setRecipientName("")
        setRecipientEmail("")
        setTitle("")
        setDescription("")
        setExpiresAt("")
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
                            <Link href="/generate" className="text-white font-medium text-sm">
                                Generate
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {formState === "success" && result ? (
                    // Success View
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-8 text-center">
                        <div className="mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Certificate Created!</h1>
                            <p className="text-gray-400">The certificate has been issued successfully.</p>
                        </div>

                        {/* Certificate Details */}
                        <div className="bg-white/5 rounded-lg p-6 mb-6 text-left">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-400">Certificate ID</p>
                                    <p className="text-white font-mono">{result.certificateId}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Recipient</p>
                                    <p className="text-white">{result.recipientName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Title</p>
                                    <p className="text-white">{result.title}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Issued</p>
                                    <p className="text-white">{new Date(result.issuedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="mb-6">
                            <p className="text-gray-400 text-sm mb-3">Scan to verify</p>
                            <div className="inline-block p-4 bg-white rounded-lg">
                                <img src={result.qrCodeDataUrl} alt="Certificate QR Code" className="w-48 h-48" />
                            </div>
                            <p className="text-gray-500 text-xs mt-2 font-mono">{result.verificationUrl}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={handleReset}
                                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                            >
                                Issue Another
                            </button>
                            <Link
                                href="/dashboard"
                                className="px-6 py-2 rounded-lg border border-white/20 text-gray-300 hover:bg-white/5 transition-all"
                            >
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                ) : (
                    // Form View
                    <>
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2">Issue Certificate</h1>
                            <p className="text-gray-400">Create and issue a new verified certificate.</p>
                        </div>

                        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-8">
                            {error && (
                                <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Recipient Information */}
                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                                        Recipient Information
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Recipient Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={recipientName}
                                                onChange={(e) => setRecipientName(e.target.value)}
                                                placeholder="John Doe"
                                                required
                                                disabled={formState === "loading"}
                                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Recipient Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={recipientEmail}
                                                onChange={(e) => setRecipientEmail(e.target.value)}
                                                placeholder="john@example.com"
                                                required
                                                disabled={formState === "loading"}
                                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Certificate Details */}
                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                                        Certificate Details
                                    </h2>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Certificate Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Workshop Completion Certificate"
                                            required
                                            disabled={formState === "loading"}
                                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                            placeholder="Awarded for successful completion of..."
                                            disabled={formState === "loading"}
                                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Expiry Date (Optional)
                                        </label>
                                        <input
                                            type="date"
                                            value={expiresAt}
                                            onChange={(e) => setExpiresAt(e.target.value)}
                                            disabled={formState === "loading"}
                                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={formState === "loading"}
                                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {formState === "loading" ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Generating Certificate...
                                            </span>
                                        ) : (
                                            "Generate Certificate"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}
