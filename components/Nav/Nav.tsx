"use client"

import Link from "next/link"
import { logout } from "@/app/actions/auth-actions"

interface NavLink {
    href: string
    label: string
    active?: boolean
}

interface NavProps {
    links?: NavLink[]
}

export function Nav({ links = [] }: NavProps) {
    return (
        <nav className="border-b-3 border-black bg-white sticky top-0 z-50 shadow-neo">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 sm:h-16">
                    <Link
                        href="/"
                        className="text-xl sm:text-2xl font-black bg-black text-white px-3 py-1 border-3 border-black shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 uppercase tracking-tight"
                    >
                        CertiFoolProof
                    </Link>
                    <div className="flex items-center gap-4 sm:gap-6">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-black font-bold hover:underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider ${link.active ? "underline" : ""}`}
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
                </div>
            </div>
        </nav>
    )
}

export default Nav
