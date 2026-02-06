import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function GeneratePage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    const user = session.user

    // Only allow Faculty, Club, and Admin to access
    if (!["ADMIN", "FACULTY", "CLUB"].includes(user.role)) {
        redirect("/dashboard?error=unauthorized")
    }

    const roleColors: Record<string, string> = {
        ADMIN: "bg-red-500/20 text-red-300 border-red-500/30",
        FACULTY: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        CLUB: "bg-green-500/20 text-green-300 border-green-500/30",
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
                            {user.role === "ADMIN" && (
                                <Link href="/admin" className="text-gray-300 hover:text-white transition-colors text-sm">
                                    Admin
                                </Link>
                            )}
                            <form
                                action={async () => {
                                    "use server"
                                    await signOut({ redirectTo: "/" })
                                }}
                            >
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-sm transition-colors"
                                >
                                    Sign Out
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Issue Certificate
                        </h1>
                        <p className="text-gray-400">
                            Create and issue a new verified certificate.
                        </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${roleColors[user.role]}`}>
                        {user.role}
                    </span>
                </div>

                {/* Certificate form skeleton */}
                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-8">
                    <form className="space-y-6">
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
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Recipient Email *
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="john@example.com"
                                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        disabled
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
                                    placeholder="Workshop Completion Certificate"
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    disabled
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Awarded for successful completion of..."
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                                    disabled
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Issue Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Expiry Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit button */}
                        <div className="pt-4">
                            <button
                                type="button"
                                disabled
                                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium opacity-50 cursor-not-allowed"
                            >
                                Generate Certificate (Coming in Phase 4)
                            </button>
                        </div>
                    </form>

                    {/* Info banner */}
                    <div className="mt-6 backdrop-blur-xl bg-amber-500/10 rounded-lg border border-amber-500/30 p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="text-white font-medium text-sm mb-1">Form Preview</h3>
                                <p className="text-amber-200/80 text-xs">
                                    This form is a preview. Full certificate generation with SHA-256 hashing
                                    and QR code generation will be implemented in Phase 3 and 4.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
