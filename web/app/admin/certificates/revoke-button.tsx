"use client"

import { useState } from "react"
import { revokeCertificate } from "@/app/actions/admin"
import { useRouter } from "next/navigation"

export function RevokeCertificateButton({ certificateId }: { certificateId: string }) {
    const router = useRouter()
    const [confirming, setConfirming] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleRevoke = async () => {
        setLoading(true)
        await revokeCertificate(certificateId)
        setLoading(false)
        setConfirming(false)
        router.refresh()
    }

    if (confirming) {
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={handleRevoke}
                    disabled={loading}
                    className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                >
                    {loading ? "..." : "Confirm"}
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                >
                    Cancel
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            className="px-2 py-1 rounded text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors"
        >
            Revoke
        </button>
    )
}
