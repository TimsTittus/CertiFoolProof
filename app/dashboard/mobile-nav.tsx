"use client"

import { useState } from "react"
import Link from "next/link"

interface MobileNavProps {
    links: { href: string; label: string }[]
    signOutAction: () => Promise<void>
}

export function MobileNav({ links, signOutAction }: MobileNavProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            {/* Hamburger Button */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="sm:hidden p-2 -mr-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                aria-label="Toggle navigation menu"
                aria-expanded={open}
            >
                {open ? (
                    /* X icon */
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    /* Hamburger icon */
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                )}
            </button>

            {/* Mobile dropdown */}
            {open && (
                <div className="sm:hidden absolute top-full left-0 right-0 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200 z-50">
                    <div className="px-4 py-3 space-y-1">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="block px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors text-sm font-medium"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <form action={signOutAction}>
                            <button
                                type="submit"
                                className="w-full text-left px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors text-sm font-medium"
                            >
                                Sign Out
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
