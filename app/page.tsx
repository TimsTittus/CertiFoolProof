import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-x-hidden">

      {/* Navbar */}
      <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CertiFoolProof
            </span>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/verify" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">
                Verify
              </Link>
              <Link
                href="/login"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs sm:text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 lg:pt-32 pb-16 sm:pb-24">
        {/* Glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/20 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-purple-600/15 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-gray-300 mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400 animate-pulse" />
            Secure · Verified · Tamper-Proof
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CertiFoolProof
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
            A digital certificate verification platform with SHA-256 hashing and QR code authentication.
            Issue, manage, and verify certificates with confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all text-sm sm:text-base text-center shadow-lg shadow-blue-600/25"
            >
              Get Started →
            </Link>
            <Link
              href="/verify"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 transition-all text-sm sm:text-base text-center"
            >
              Verify a Certificate
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">How It Works</h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
              Three simple steps to verify the authenticity of any certificate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

            <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-5 sm:p-6 hover:border-blue-500/30 transition-all group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Issue</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Faculty and clubs create certificates with unique IDs and cryptographic hashes for tamper-proof integrity.
              </p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-5 sm:p-6 hover:border-purple-500/30 transition-all group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Scan</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Each certificate gets a QR code linking to its verification page. Scan to verify instantly.
              </p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-5 sm:p-6 hover:border-green-500/30 transition-all sm:col-span-2 lg:col-span-1 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Verify</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                SHA-256 hash validation ensures the certificate is authentic, unmodified, and currently valid.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 sm:p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">SHA-256</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Hashing</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">QR</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Code Verification</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">RBAC</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Access Control</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Audit</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Verification Logs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Built for Everyone</h2>
            <p className="text-gray-400 text-sm sm:text-base">Role-based access for administrators, faculty, and clubs.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="rounded-xl bg-gradient-to-b from-red-500/10 to-transparent border border-red-500/20 p-5 sm:p-6 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">Admin</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Full system control, analytics, and user management</p>
            </div>
            <div className="rounded-xl bg-gradient-to-b from-blue-500/10 to-transparent border border-blue-500/20 p-5 sm:p-6 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">Faculty</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Issue academic certificates and track verifications</p>
            </div>
            <div className="rounded-xl bg-gradient-to-b from-green-500/10 to-transparent border border-green-500/20 p-5 sm:p-6 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">Club</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Issue event and participation certificates</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">Ready to get started?</h2>
          <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
            Sign in to issue your first tamper-proof certificate.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-6 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all text-sm sm:text-base shadow-lg shadow-blue-600/25"
            >
              Sign In
            </Link>
            <Link
              href="/verify"
              className="px-6 sm:px-8 py-3 rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 transition-all text-sm sm:text-base"
            >
              Verify a Certificate
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-gray-500 text-xs sm:text-sm">
            © 2026 CertiFoolProof. All rights reserved.
          </span>
          <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
            <Link href="/verify" className="hover:text-white transition-colors">Verify</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}