"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signupUser } from "@/app/actions/auth-actions"
import { UserRole } from "@/lib/enums"

function SignupForm() {
    const router = useRouter()

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState<UserRole>(UserRole.FACULTY)
    const [rolePassword, setRolePassword] = useState("")
    const [phone, setPhone] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")
        setSuccess(false)

        const result = await signupUser({ name, email, password, role, rolePassword, phone })


        if (!result.success) {
            setError(result.error || "Signup failed")
            setIsLoading(false)
            return
        }

        setSuccess(true)
        setIsLoading(false)
        setTimeout(() => router.push("/login"), 1500)
    }

    const roleOptions = [
        { value: UserRole.ADMIN, label: "Admin", color: "text-red-400" },
        { value: UserRole.FACULTY, label: "Faculty", color: "text-blue-400" },
        { value: UserRole.CLUB, label: "Club", color: "text-green-400" },
    ]

    return (
        <div className="backdrop-blur-xl bg-white/10 rounded-xl sm:rounded-2xl shadow-2xl border border-white/20 p-5 sm:p-8">
            <div className="text-center mb-5 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Create Account
                </h1>
                <p className="mt-1.5 sm:mt-2 text-gray-300 text-xs sm:text-sm">
                    Register for CertiFoolProof
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 sm:p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-xs sm:text-sm text-center">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 sm:p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-xs sm:text-sm text-center">
                    Account created! Redirecting to login...
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                {/* Full Name */}
                <div>
                    <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5">
                        Full Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none"
                        placeholder="John Doe"
                    />
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none"
                        placeholder="you@example.com"
                    />
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none"
                        placeholder="••••••••"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5">
                        Phone Number
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none"
                        placeholder="+91 9876543210"
                    />
                </div>

                {/* Role Selector */}

                <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5">
                        Role
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {roleOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setRole(opt.value)}
                                className={`px-2 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border ${role === opt.value
                                    ? "bg-white/15 border-purple-500/60 text-white ring-1 ring-purple-500/40"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Role Secret Key */}
                <div>
                    <label htmlFor="rolePassword" className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5">
                        Role Secret Key
                    </label>
                    <input
                        id="rolePassword"
                        type="password"
                        value={rolePassword}
                        onChange={(e) => setRolePassword(e.target.value)}
                        required
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none"
                        placeholder="Enter the secret key for your role"
                    />
                    <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
                        Contact your administrator if you don&apos;t have a secret key.
                    </p>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading || success}
                    className="w-full py-2.5 sm:py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm sm:text-base font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Creating account...
                        </span>
                    ) : success ? (
                        " Account Created!"
                    ) : (
                        "Sign Up"
                    )}
                </button>
            </form>

            {/* Login link */}
            <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
                    Sign In
                </Link>
            </p>
        </div>
    )
}

export default function SignupPage() {
    return (
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden px-4 py-6 sm:py-0">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-48 h-48 sm:w-80 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-48 h-48 sm:w-80 sm:h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-500"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                <Suspense fallback={
                    <div className="backdrop-blur-xl bg-white/10 rounded-xl sm:rounded-2xl shadow-2xl border border-white/20 p-8 flex items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                    </div>
                }>
                    <SignupForm />
                </Suspense>

                <p className="mt-4 sm:mt-6 text-center pb-[env(safe-area-inset-bottom)]">
                    <Link href="/" className="text-xs sm:text-sm text-gray-400 hover:text-white active:text-purple-300 transition-colors">
                        ← Back to Home
                    </Link>
                </p>
            </div>
        </div>
    )
}
