"use client"

import { useState } from "react"
import { deleteUser, updateUserRole } from "@/app/actions/users"
import { useRouter } from "next/navigation"

interface UserActionsProps {
    userId: string
    userRole: string
    certificateCount: number
}

export function UserActions({ userId, userRole, certificateCount }: UserActionsProps) {
    const router = useRouter()
    const [showDelete, setShowDelete] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    if (userRole === "ADMIN") {
        return <span className="text-gray-600 text-xs italic">Protected</span>
    }

    const handleRoleChange = async (newRole: "FACULTY" | "CLUB") => {
        setLoading(true)
        setError("")
        const result = await updateUserRole(userId, newRole)
        setLoading(false)
        if (!result.success) {
            setError(result.error || "Failed")
        } else {
            router.refresh()
        }
    }

    const handleDelete = async () => {
        setLoading(true)
        setError("")
        const result = await deleteUser(userId)
        setLoading(false)
        if (!result.success) {
            setError(result.error || "Failed")
            setShowDelete(false)
        } else {
            router.refresh()
        }
    }

    return (
        <div className="flex items-center gap-2">
            {error && (
                <span className="text-red-400 text-xs max-w-[150px] truncate" title={error}>
                    {error}
                </span>
            )}

            {/* Role Switcher */}
            <select
                value={userRole}
                onChange={(e) => handleRoleChange(e.target.value as "FACULTY" | "CLUB")}
                disabled={loading}
                className="px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 [&>option]:bg-slate-800"
            >
                <option value="FACULTY">Faculty</option>
                <option value="CLUB">Club</option>
            </select>

            {/* Delete */}
            {showDelete ? (
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                    >
                        {loading ? "..." : "Confirm"}
                    </button>
                    <button
                        onClick={() => setShowDelete(false)}
                        className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowDelete(true)}
                    disabled={loading}
                    title={certificateCount > 0 ? `Has ${certificateCount} cert(s)` : "Delete user"}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
    )
}
