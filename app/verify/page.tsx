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
        <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono">
            {/* Navigation */}
            <nav className="border-b-3 border-black bg-white sticky top-0 z-50 shadow-neo">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* Logo */}
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
            </nav>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
                <div className="text-center mb-10 border-3 border-black bg-neo-cream p-8 shadow-neo">
                    <div className="w-16 h-16 mx-auto mb-6 bg-black flex items-center justify-center border-2 border-black">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-black mb-2 uppercase italic underline decoration-3 underline-offset-4">Verify Certificate</h1>
                    <p className="text-black font-bold pt-2">Enter a certificate ID to verify its authenticity.</p>
                </div>

                <div className="bg-white border-3 border-black p-8 shadow-neo">
                    {error && (
                        <div className="mb-6 p-4 border-3 border-black bg-red-500 text-white font-black text-sm text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase italic">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="block text-sm font-black text-black mb-3 uppercase tracking-wider italic">
                                Certificate ID
                            </label>
                            <input
                                type="text"
                                value={certificateId}
                                onChange={(e) => setCertificateId(e.target.value.toUpperCase())}
                                placeholder="CFP-2026-XXXXX"
                                className="w-full px-4 py-4 border-3 border-black bg-neo-mint/10 text-black placeholder-black/30 focus:outline-none focus:bg-white focus:shadow-neo transition-all font-black text-center text-xl sm:text-2xl tracking-widest uppercase"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 px-6 border-3 border-black bg-neo-yellow shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 font-black uppercase text-lg sm:text-xl italic"
                        >
                            Verify Certificate
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t-3 border-black">
                        <p className="text-center text-black font-black uppercase italic text-sm mb-6">
                            Or scan a certificate QR code
                        </p>
                        <div className="aspect-video max-w-xs mx-auto border-3 border-dashed border-black bg-neo-yellow/20 flex flex-col items-center justify-center gap-4">
                            <div className="p-4 bg-black border-2 border-black shadow-neo">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="border-3 border-black bg-white px-3 py-1 text-black font-black uppercase italic text-xs shadow-neo">
                                Camera scanner coming soon
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-3 border-black bg-neo-pink p-8 shadow-neo">
                    <h3 className="text-black font-black text-xl mb-4 italic uppercase underline decoration-2 underline-offset-4">How it works</h3>
                    <ul className="text-black font-bold text-sm space-y-3">
                        <li className="flex items-start gap-4">
                            <span className="flex-shrink-0 w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-black">1</span>
                            Enter the certificate ID or scan the QR code
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="flex-shrink-0 w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-black">2</span>
                            We verify the cryptographic hash matches the blockchain record
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="flex-shrink-0 w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-black">3</span>
                            View certificate details and status instantly
                        </li>
                    </ul>
                </div>
            </main>
        </div>
    )
}
