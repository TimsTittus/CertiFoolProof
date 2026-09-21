"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"


function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const { error: signInError } = await authClient.signIn.email({
                email: email.trim().toLowerCase(),
                password,
                callbackURL: callbackUrl,
            })

            if (signInError) {
                setError(signInError.message || "Invalid email or password")
                setIsLoading(false)
                return
            }

            // Redirect is handled by callbackURL usually, but let's be sure
            router.push(callbackUrl)
            router.refresh()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred"
            setError(message)
            setIsLoading(false)
        }
    }


    return (
        <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-neo-lg">
            <div className="text-center mb-6 sm:mb-8 border-b-3 border-black pb-6">
                <h1 className="text-3xl sm:text-4xl font-black text-black uppercase italic mb-1">
                    Certi<span className="bg-neo-yellow px-2 border-2 border-black shadow-neo not-italic">Fool</span>Proof
                </h1>
                <p className="mt-2 text-black font-bold text-xs sm:text-sm uppercase tracking-wider">
                    Secure Certificate Verification Platform
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 border-3 border-black bg-red-500 text-white font-black text-xs sm:text-sm text-center uppercase italic shadow-neo">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-xs sm:text-sm font-black text-black mb-2 uppercase tracking-wider">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold text-sm sm:text-base placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all appearance-none"
                        placeholder="you@example.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-xs sm:text-sm font-black text-black mb-2 uppercase tracking-wider">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold text-sm sm:text-base placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all appearance-none"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 px-6 border-3 border-black bg-neo-yellow shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 font-black uppercase text-base sm:text-lg italic disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            SIGNING IN...
                        </span>
                    ) : (
                        "Sign In"
                    )}
                </button>
            </form>

            {/* Signup link */}
            <p className="mt-8 pt-6 border-t-3 border-black text-center text-xs sm:text-sm font-bold text-black uppercase">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-black font-black underline decoration-3 underline-offset-4 hover:bg-neo-yellow px-1">
                    Sign Up
                </Link>
            </p>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-neo-mint text-black font-mono px-4 py-8">
            <div className="relative z-10 w-full max-w-md">
                <Suspense fallback={
                    <div className="bg-white border-3 border-black p-8 shadow-neo-lg flex items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div>
                    </div>
                }>
                    <LoginForm />
                </Suspense>

                {/* Back to home link */}
                <p className="mt-6 text-center">
                    <Link href="/" className="text-xs sm:text-sm font-black text-black hover:underline decoration-3 underline-offset-4 uppercase tracking-wider bg-white border-2 border-black px-3 py-1 shadow-neo inline-block">
                        ← Back to Home
                    </Link>
                </p>
            </div>
        </div>
    )
}
