import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { getMyIssuedCertificates } from "@/app/actions/certificate"
import { logout } from "@/app/actions/auth-actions"
import { MobileNav } from "../mobile-nav"

export default async function MyCertificatesPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session?.user) {
        redirect("/login")
    }

    const user = session.user
    const certificates = await getMyIssuedCertificates()

    const navLinks = [
        { href: "/dashboard", label: "Dashboard", show: true },
        {
            href: "/generate",
            label: "Generate",
            show: user.role === "ADMIN" || user.role === "FACULTY" || user.role === "CLUB",
        },
        { href: "/admin", label: "Admin", show: user.role === "ADMIN" },
    ].filter((link) => link.show)

    const statusColors: Record<string, string> = {
        ACTIVE: "bg-white text-black",
        REVOKED: "bg-red-500 text-white",
        EXPIRED: "bg-gray-400 text-black",
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

                        {/* Desktop Nav Links */}
                        <div className="hidden sm:flex items-center gap-4 md:gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-black font-bold hover:underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <form action={logout}>
                                <button
                                    type="submit"
                                    className="px-4 py-2 border-3 border-black bg-neo-yellow hover:bg-black hover:text-white font-bold text-sm transition-all shadow-neo hover:shadow-none translate-x-0 translate-y-0 active:translate-x-[2px] active:translate-y-[2px]"
                                >
                                    Log Out
                                </button>
                            </form>
                        </div>

                        {/* Mobile Hamburger */}
                        <MobileNav
                            links={navLinks}
                            signOutAction={logout}
                        />
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-3 border-black bg-neo-cream p-6 shadow-neo">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-black mb-2 uppercase italic">My Issued Certificates</h1>
                        <p className="text-black font-bold text-sm sm:text-base border-t-3 border-black pt-2">
                            Certificates you have issued as {session.user.role.toLowerCase()}.
                        </p>
                    </div>
                    <Link
                        href="/generate"
                        prefetch={true}
                        className="inline-flex items-center justify-center px-6 py-3 border-3 border-black bg-neo-yellow shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 font-black uppercase text-sm"
                    >
                        Issue New
                    </Link>
                </div>

                {certificates.length === 0 ? (
                    <div className="bg-white border-3 border-black p-12 text-center shadow-neo">
                        <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-black mb-2 uppercase italic">No certificates yet</h3>
                        <p className="text-black font-bold mb-8">You haven&apos;t issued any certificates yet.</p>
                        <Link
                            href="/generate"
                            prefetch={true}
                            className="inline-flex items-center gap-2 px-6 py-3 border-3 border-black bg-neo-pink shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 font-black uppercase text-sm"
                        >
                            Issue your first certificate
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white border-3 border-black shadow-neo overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-3 border-black bg-black text-white">
                                    <th className="px-6 py-4 text-sm font-black uppercase tracking-tighter">Certificate ID</th>
                                    <th className="px-6 py-4 text-sm font-black uppercase tracking-tighter">Recipient</th>
                                    <th className="px-6 py-4 text-sm font-black uppercase tracking-tighter">Title</th>
                                    <th className="px-6 py-4 text-sm font-black uppercase tracking-tighter">Issued</th>
                                    <th className="px-6 py-4 text-sm font-black uppercase tracking-tighter">Status</th>
                                    <th className="px-6 py-4 text-sm font-black uppercase tracking-tighter text-center">Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-3 divide-black">
                                {certificates.map((cert) => (
                                    <tr key={cert.id} className="hover:bg-neo-mint/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/verify/${cert.certificateId}`}
                                                prefetch={true}
                                                className="text-black font-black hover:underline decoration-2 underline-offset-2 break-all"
                                            >
                                                {cert.certificateId}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-black font-black text-sm">{cert.recipientName}</p>
                                                <p className="text-black font-bold text-xs opacity-70">{cert.recipientEmail}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-black font-bold text-sm">{cert.title}</td>
                                        <td className="px-6 py-4 text-black font-bold text-sm">
                                            {new Date(cert.issuedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${statusColors[cert.status]}`}>
                                                {cert.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-black font-black text-sm text-center">
                                            {cert.verificationCount}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    )
}
