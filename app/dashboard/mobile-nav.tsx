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
                className="sm:hidden p-2 border-3 border-black bg-white shadow-neo active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                aria-label="Toggle navigation menu"
                aria-expanded={open}
            >
                {open ? (
                    /* X icon */
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    /* Hamburger icon */
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                )}
            </button>

            {/* Mobile dropdown */}
            {open && (
                <div className="sm:hidden absolute top-full left-0 right-0 border-3 border-black bg-white shadow-neo-lg z-50 mt-2 mx-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 space-y-2">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="block px-4 py-3 border-3 border-black bg-neo-yellow text-black font-black uppercase text-sm shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <form action={signOutAction}>
                            <button
                                type="submit"
                                className="w-full text-left px-4 py-3 border-3 border-black bg-neo-pink text-black font-black uppercase text-sm shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                            >
                                Log Out
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
