"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createCertificate, CreateCertificateResult } from "@/app/actions/certificate"

type FormState = "form" | "loading" | "success"

export default function GeneratePage() {
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
        <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono">
            {/* Navigation */}
            <nav className="border-b-3 border-black bg-white sticky top-0 z-50 shadow-neo">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        <Link
                            href="/"
                            className="text-xl sm:text-2xl font-black bg-black text-white px-3 py-1 border-3 border-black shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100"
                        >
                            CertiFoolProof
                        </Link>
                        <div className="flex items-center gap-6">
                            <Link href="/dashboard" className="text-black font-bold hover:underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider">
                                Dashboard
                            </Link>
                            <Link href="/generate" className="text-black font-bold underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider">
                                Generate
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {formState === "success" && result ? (
                    // Success View
                    <div className="bg-neo-pink border-3 border-black p-8 shadow-neo">
                        <div className="mb-6 border-b-3 border-black pb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-black flex items-center justify-center border-3 border-black shadow-neo">
                                <svg className="w-10 h-10 text-neo-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-black text-black mb-2 uppercase italic">Certificate Created!</h1>
                            <p className="text-black font-bold">The certificate has been issued successfully.</p>
                        </div>

                        {/* Certificate Details */}
                        <div className="bg-white border-3 border-black p-6 mb-8 shadow-neo">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter text-black/60">Certificate ID</p>
                                    <p className="text-black font-black text-lg break-all">{result.certificateId}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter text-black/60">Recipient</p>
                                    <p className="text-black font-black text-lg">{result.recipientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter text-black/60">Title</p>
                                    <p className="text-black font-black text-lg">{result.title}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter text-black/60">Issued On</p>
                                    <p className="text-black font-black text-lg">{new Date(result.issuedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="mb-8 flex flex-col items-center">
                            <p className="text-black font-black uppercase italic mb-4 underline decoration-3 underline-offset-4">Scan to verify</p>
                            <div className="p-4 bg-white border-3 border-black shadow-neo">
                                <Image src={result.qrCodeDataUrl} alt="Certificate QR Code" width={192} height={192} />
                            </div>
                            <p className="text-black font-bold text-xs mt-4 truncate w-full max-w-md bg-white border-2 border-black p-2">{result.verificationUrl}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleReset}
                                className="px-8 py-3 border-3 border-black bg-neo-yellow shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-[2px] active:translate-y-[2px] transition-all font-black uppercase italic"
                            >
                                Issue Another
                            </button>
                            <Link
                                href="/dashboard"
                                className="px-8 py-3 border-3 border-black bg-white shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-[2px] active:translate-y-[2px] transition-all font-black uppercase italic text-center"
                            >
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                ) : (
                    // Form View
                    <>
                        <div className="mb-8 border-3 border-black bg-neo-cream p-6 shadow-neo">
                            <h1 className="text-3xl sm:text-4xl font-black text-black mb-2 uppercase italic">
                                Issue Certificate
                            </h1>
                            <p className="text-black font-bold text-sm sm:text-base border-t-3 border-black pt-2">
                                Create and issue a new verified certificate.
                            </p>
                        </div>

                        <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-neo">
                            {error && (
                                <div className="mb-6 p-4 border-3 border-black bg-red-500 text-white font-black uppercase text-sm shadow-neo">
                                    Error: {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Recipient Information */}
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black text-black uppercase italic underline decoration-4 underline-offset-4">
                                        Recipient Details
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={recipientName}
                                                onChange={(e) => setRecipientName(e.target.value)}
                                                placeholder="John Doe"
                                                required
                                                disabled={formState === "loading"}
                                                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2">
                                                Email Address *
                                            </label>
                                            <input
                                                type="email"
                                                value={recipientEmail}
                                                onChange={(e) => setRecipientEmail(e.target.value)}
                                                placeholder="john@example.com"
                                                required
                                                disabled={formState === "loading"}
                                                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Certificate Details */}
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black text-black uppercase italic underline decoration-4 underline-offset-4">
                                        Certificate Info
                                    </h2>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2">
                                            Certificate Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Workshop Completion Certificate"
                                            required
                                            disabled={formState === "loading"}
                                            className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                            placeholder="Awarded for successful completion of..."
                                            disabled={formState === "loading"}
                                            className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all resize-none disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2">
                                            Expiry Date (Optional)
                                        </label>
                                        <input
                                            type="date"
                                            value={expiresAt}
                                            onChange={(e) => setExpiresAt(e.target.value)}
                                            disabled={formState === "loading"}
                                            className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={formState === "loading"}
                                        className="w-full py-4 px-6 border-3 border-black bg-neo-yellow shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-[2px] active:translate-y-[2px] transition-all font-black uppercase italic disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {formState === "loading" ? (
                                            <span className="flex items-center justify-center gap-3">
                                                <svg className="animate-spin h-6 w-6 text-black" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                GENERATING...
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