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
        <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-neo-lg">
            <div className="text-center mb-5 sm:mb-6 border-b-3 border-black pb-5">
                <h1 className="text-3xl sm:text-4xl font-black text-black uppercase italic mb-1">
                    Create Account
                </h1>
                <p className="mt-1 text-black font-bold text-xs sm:text-sm uppercase tracking-wider">
                    Register for CertiFoolProof
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 border-3 border-black bg-red-500 text-white font-black text-xs sm:text-sm text-center uppercase italic shadow-neo">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 border-3 border-black bg-neo-yellow text-black font-black text-xs sm:text-sm text-center uppercase italic shadow-neo">
                    Account created! Redirecting to login...
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                    <label htmlFor="name" className="block text-xs font-black text-black mb-1 uppercase tracking-wider">
                        Full Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        className="w-full px-3.5 py-2.5 border-3 border-black bg-white text-black font-bold text-sm placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all appearance-none"
                        placeholder="John Doe"
                    />
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-xs font-black text-black mb-1 uppercase tracking-wider">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full px-3.5 py-2.5 border-3 border-black bg-white text-black font-bold text-sm placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all appearance-none"
                        placeholder="you@example.com"
                    />
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="block text-xs font-black text-black mb-1 uppercase tracking-wider">
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
                        className="w-full px-3.5 py-2.5 border-3 border-black bg-white text-black font-bold text-sm placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all appearance-none"
                        placeholder="••••••••"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label htmlFor="phone" className="block text-xs font-black text-black mb-1 uppercase tracking-wider">
                        Phone Number
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 border-3 border-black bg-white text-black font-bold text-sm placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all appearance-none"
                        placeholder="+91 9876543210"
                    />
                </div>

                {/* Role Selector */}
                <div>
                    <label className="block text-xs font-black text-black mb-1 uppercase tracking-wider">
                        Role
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {roleOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setRole(opt.value)}
                                className={`px-2 py-2 border-3 border-black text-xs font-black uppercase transition-all shadow-neo ${role === opt.value
                                    ? "bg-black text-white"
                                    : "bg-white text-black hover:bg-neo-yellow"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Role Secret Key */}
                <div>
                    <label htmlFor="rolePassword" className="block text-xs font-black text-black mb-1 uppercase tracking-wider">
                        Role Secret Key
                    </label>
                    <input
                        id="rolePassword"
                        type="password"
                        value={rolePassword}
                        onChange={(e) => setRolePassword(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 border-3 border-black bg-white text-black font-bold text-sm placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all appearance-none"
                        placeholder="Enter the secret key for your role"
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading || success}
                    className="w-full py-3.5 px-6 border-3 border-black bg-neo-yellow shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 font-black uppercase text-sm sm:text-base italic disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            CREATING ACCOUNT...
                        </span>
                    ) : success ? (
                        "ACCOUNT CREATED!"
                    ) : (
                        "Sign Up"
                    )}
                </button>
            </form>

            {/* Login link */}
            <p className="mt-6 pt-4 border-t-3 border-black text-center text-xs font-bold text-black uppercase">
                Already have an account?{" "}
                <Link href="/login" className="text-black font-black underline decoration-3 underline-offset-4 hover:bg-neo-yellow px-1">
                    Sign In
                </Link>
            </p>
        </div>
    )
}

export default function SignupPage() {
    return (
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-neo-mint text-black font-mono px-4 py-8">
            <div className="relative z-10 w-full max-w-md">
                <Suspense fallback={
                    <div className="bg-white border-3 border-black p-8 shadow-neo-lg flex items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div>
                    </div>
                }>
                    <SignupForm />
                </Suspense>

                <p className="mt-6 text-center">
                    <Link href="/" className="text-xs sm:text-sm font-black text-black hover:underline decoration-3 underline-offset-4 uppercase tracking-wider bg-white border-2 border-black px-3 py-1 shadow-neo inline-block">
                        ← Back to Home
                    </Link>
                </p>
            </div>
        </div>
    )
}
