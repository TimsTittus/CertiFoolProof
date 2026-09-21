import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono overflow-x-hidden">

      {/* Navigation */}
      <nav className="border-b-3 border-black bg-white sticky top-0 z-50 shadow-neo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link
              href="/"
              className="text-xl sm:text-2xl font-black bg-black text-white px-3 py-1 border-3 border-black shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 uppercase tracking-tight"
            >
              CertiFoolProof
            </Link>
            <div className="flex items-center gap-3 sm:gap-6">
              <Link
                href="/generate/bulk"
                className="hidden sm:inline text-black font-black hover:underline decoration-3 underline-offset-4 text-xs sm:text-sm uppercase tracking-wider"
              >
                Bulk Generate
              </Link>
              <Link
                href="/verify"
                className="text-black font-black hover:underline decoration-3 underline-offset-4 text-xs sm:text-sm uppercase tracking-wider"
              >
                Verify
              </Link>
              <Link
                href="/login"
                className="px-3 py-1.5 sm:px-4 sm:py-2 border-3 border-black bg-neo-yellow text-black font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-all shadow-neo hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-8 sm:pb-12">
        <div className="border-3 border-black bg-neo-cream p-6 sm:p-12 shadow-neo relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 border-3 border-black bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-neo mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-black animate-pulse" />
            Secure · Verified · Tamper-Proof
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black uppercase italic leading-tight mb-6">
            Certi<span className="bg-neo-yellow px-3 py-1 border-3 border-black shadow-neo not-italic inline-block my-1">Fool</span>Proof
          </h1>

          <p className="text-black font-bold text-base sm:text-xl leading-relaxed max-w-3xl mb-8 border-t-3 border-black pt-6">
            A digital certificate verification platform powered by SHA-256 cryptographic hashing and QR code authentication. Issue, manage, and verify certificates with 100% confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <Link
              href="/signup"
              className="px-8 py-4 border-3 border-black bg-neo-yellow text-black font-black text-base sm:text-lg uppercase italic shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 text-center"
            >
              Get Started →
            </Link>
            <Link
              href="/generate/bulk"
              className="px-8 py-4 border-3 border-black bg-neo-pink text-black font-black text-base sm:text-lg uppercase italic shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 text-center"
            >
              Bulk Generate — Free
            </Link>
            <Link
              href="/verify"
              className="px-8 py-4 border-3 border-black bg-white text-black font-black text-base sm:text-lg uppercase italic shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 text-center"
            >
              Verify a Certificate
            </Link>
          </div>
        </div>
      </section>

      {/* Bulk Generator - free, no sign-up */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="border-3 border-black bg-neo-pink p-6 sm:p-10 shadow-neo">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border-3 border-black bg-white text-black font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-neo mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-black animate-pulse" />
                No sign-up needed
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-black uppercase italic leading-tight mb-5">
                500 certificates.
                <br />
                One{" "}
                <span className="bg-neo-yellow px-2 border-3 border-black shadow-neo not-italic inline-block my-1">
                  CSV
                </span>{" "}
                file.
              </h2>

              <p className="text-black font-bold text-sm sm:text-lg leading-relaxed border-t-3 border-black pt-5 mb-6">
                Running an event, workshop or hackathon? Design your certificate, upload a CSV of
                participant names, and download a ZIP with a personalised certificate for every single
                person. Free for everyone, and it all runs inside your browser — your participant list
                never leaves your device.
              </p>

              <Link
                href="/generate/bulk"
                className="inline-block px-8 py-4 border-3 border-black bg-neo-yellow text-black font-black text-base sm:text-lg uppercase italic shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100"
              >
                Generate in Bulk →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border-3 border-black p-5 shadow-neo">
                <p className="text-3xl font-black text-black uppercase italic mb-1">CSV</p>
                <p className="text-black font-bold text-xs sm:text-sm">
                  Upload any participant list — the name column is detected for you.
                </p>
              </div>
              <div className="bg-neo-cream border-3 border-black p-5 shadow-neo">
                <p className="text-3xl font-black text-black uppercase italic mb-1">Custom</p>
                <p className="text-black font-bold text-xs sm:text-sm">
                  Pick a template or upload your own artwork, then drag the name into place.
                </p>
              </div>
              <div className="bg-neo-mint border-3 border-black p-5 shadow-neo">
                <p className="text-3xl font-black text-black uppercase italic mb-1">ZIP</p>
                <p className="text-black font-bold text-xs sm:text-sm">
                  Every certificate saved under its participant&apos;s own name.
                </p>
              </div>
              <div className="bg-white border-3 border-black p-5 shadow-neo">
                <p className="text-3xl font-black text-black uppercase italic mb-1">Free</p>
                <p className="text-black font-bold text-xs sm:text-sm">
                  No account, no upload, no limits per event. Sign in only for verifiable IDs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works / Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="border-3 border-black bg-white p-6 sm:p-8 shadow-neo mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-4xl font-black text-black uppercase italic underline decoration-4 underline-offset-4 mb-2">
            How It Works
          </h2>
          <p className="text-black font-bold text-sm sm:text-base">
            Three simple steps to verify the authenticity of any certificate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-neo-yellow border-3 border-black p-6 sm:p-8 shadow-neo flex flex-col justify-between hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 transition-all duration-100">
            <div>
              <div className="w-12 h-12 bg-black border-2 border-black flex items-center justify-center mb-6 shadow-neo">
                <svg className="w-6 h-6 text-neo-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-black uppercase italic mb-3">1. Issue</h3>
              <p className="text-black font-bold text-sm sm:text-base leading-relaxed">
                Faculty and clubs create certificates with unique IDs and cryptographic hashes for tamper-proof integrity.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-neo-pink border-3 border-black p-6 sm:p-8 shadow-neo flex flex-col justify-between hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 transition-all duration-100">
            <div>
              <div className="w-12 h-12 bg-black border-2 border-black flex items-center justify-center mb-6 shadow-neo">
                <svg className="w-6 h-6 text-neo-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-black uppercase italic mb-3">2. Scan</h3>
              <p className="text-black font-bold text-sm sm:text-base leading-relaxed">
                Each certificate gets a QR code linking directly to its verification page. Scan to verify instantly on any device.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-neo flex flex-col justify-between hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 transition-all duration-100">
            <div>
              <div className="w-12 h-12 bg-black border-2 border-black flex items-center justify-center mb-6 shadow-neo">
                <svg className="w-6 h-6 text-neo-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-black uppercase italic mb-3">3. Verify</h3>
              <p className="text-black font-bold text-sm sm:text-base leading-relaxed">
                SHA-256 hash validation guarantees that the certificate is genuine, unmodified, and currently active.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights / Stats Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-neo">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-neo-yellow border-3 border-black p-4 sm:p-6 text-center shadow-neo">
              <p className="text-2xl sm:text-3xl font-black text-black uppercase">SHA-256</p>
              <p className="text-black font-bold text-xs sm:text-sm mt-1 uppercase tracking-wider">Hashing</p>
            </div>
            <div className="bg-neo-pink border-3 border-black p-4 sm:p-6 text-center shadow-neo">
              <p className="text-2xl sm:text-3xl font-black text-black uppercase">QR CODE</p>
              <p className="text-black font-bold text-xs sm:text-sm mt-1 uppercase tracking-wider">Verification</p>
            </div>
            <div className="bg-neo-cream border-3 border-black p-4 sm:p-6 text-center shadow-neo">
              <p className="text-2xl sm:text-3xl font-black text-black uppercase">RBAC</p>
              <p className="text-black font-bold text-xs sm:text-sm mt-1 uppercase tracking-wider">Access Control</p>
            </div>
            <div className="bg-neo-mint border-3 border-black p-4 sm:p-6 text-center shadow-neo">
              <p className="text-2xl sm:text-3xl font-black text-black uppercase">AUDIT</p>
              <p className="text-black font-bold text-xs sm:text-sm mt-1 uppercase tracking-wider">Verification Logs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="border-3 border-black bg-neo-cream p-6 sm:p-8 shadow-neo mb-6 sm:mb-8 text-center sm:text-left">
          <h2 className="text-2xl sm:text-4xl font-black text-black uppercase italic underline decoration-4 underline-offset-4 mb-2">
            Built for Everyone
          </h2>
          <p className="text-black font-bold text-sm sm:text-base">
            Role-based access management tailored for administrators, faculty, and student clubs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-500 border-3 border-black p-6 sm:p-8 text-center shadow-neo">
            <div className="w-12 h-12 mx-auto mb-4 bg-black border-2 border-black flex items-center justify-center shadow-neo">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-2">Admin</h3>
            <p className="text-white font-bold text-sm">Full system control, real-time analytics, user roles, and revocation management.</p>
          </div>

          <div className="bg-neo-yellow border-3 border-black p-6 sm:p-8 text-center shadow-neo">
            <div className="w-12 h-12 mx-auto mb-4 bg-black border-2 border-black flex items-center justify-center shadow-neo">
              <svg className="w-6 h-6 text-neo-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-black uppercase italic mb-2">Faculty</h3>
            <p className="text-black font-bold text-sm">Issue academic certificates, manage course credentials, and track verifications.</p>
          </div>

          <div className="bg-neo-pink border-3 border-black p-6 sm:p-8 text-center shadow-neo">
            <div className="w-12 h-12 mx-auto mb-4 bg-black border-2 border-black flex items-center justify-center shadow-neo">
              <svg className="w-6 h-6 text-neo-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-black uppercase italic mb-2">Club</h3>
            <p className="text-black font-bold text-sm">Issue event certificates, workshop badges, and student achievement awards.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="border-3 border-black bg-neo-cream p-8 sm:p-12 text-center shadow-neo">
          <h2 className="text-3xl sm:text-5xl font-black text-black uppercase italic mb-4">
            Ready to get started?
          </h2>
          <p className="text-black font-bold text-base sm:text-xl mb-8 max-w-2xl mx-auto">
            Create an account to issue your first tamper-proof certificate in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 border-3 border-black bg-neo-yellow text-black font-black text-base sm:text-lg uppercase italic shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100"
            >
              Create Account
            </Link>
            <Link
              href="/verify"
              className="px-8 py-4 border-3 border-black bg-white text-black font-black text-base sm:text-lg uppercase italic shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100"
            >
              Verify a Certificate
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-black bg-white px-4 sm:px-6 lg:px-8 py-6 sm:py-8 shadow-neo mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-black font-black text-xs sm:text-sm uppercase">
            © 2026 CertiFoolProof. All rights reserved.
          </span>
          <div className="flex gap-6 text-xs sm:text-sm text-black font-black uppercase">
            <Link href="/generate/bulk" className="hover:underline decoration-3 underline-offset-4 transition-colors">
              Bulk Generate
            </Link>
            <Link href="/verify" className="hover:underline decoration-3 underline-offset-4 transition-colors">
              Verify
            </Link>
            <Link href="/login" className="hover:underline decoration-3 underline-offset-4 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}