import { auth } from "@/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getAllUsers } from "@/app/actions/admin"
import { AddUserForm } from "./add-user-form"
import { UserActions } from "./user-actions"

export default async function AdminUsersPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard?error=unauthorized")

    const users = await getAllUsers()

    const roleColors: Record<string, string> = {
        ADMIN: "bg-red-500/20 text-red-300 border-red-500/30",
        FACULTY: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        CLUB: "bg-green-500/20 text-green-300 border-green-500/30",
    }

    const roleIcons: Record<string, string> = {
        ADMIN: "⚙️",
        FACULTY: "🎓",
        CLUB: "👥",
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        <Link href="/" className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">CertiFoolProof</Link>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <Link href="/admin" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">← Admin</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">User Management</h1>
                        <p className="text-gray-400 text-sm">{users.length} registered users</p>
                    </div>
                    <AddUserForm />
                </div>

                {/* Role Stats */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                    {Object.entries(roleColors).map(([role, colors]) => {
                        const count = users.filter((u) => u.role === role).length
                        return (
                            <div key={role} className={`rounded-xl border p-3 sm:p-4 ${colors.replace("text-", "border-").split(" ").pop()} bg-white/5`}>
                                <p className="text-lg sm:text-2xl font-bold text-white">{count}</p>
                                <p className="text-xs sm:text-sm text-gray-400">{roleIcons[role]} {role}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Users Table (Desktop) */}
                <div className="hidden md:block backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Name</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Email</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Role</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Department</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Certs</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Joined</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-white text-sm">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                                            {roleIcons[user.role]} {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">{user.department || "—"}</td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">{user._count.certificates}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <UserActions
                                            userId={user.id}
                                            userRole={user.role}
                                            certificateCount={user._count.certificates}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Users Cards (Mobile) */}
                <div className="md:hidden space-y-3">
                    {users.map((user) => (
                        <div key={user.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-white font-medium text-sm">{user.name}</p>
                                    <p className="text-gray-500 text-xs">{user.email}</p>
                                </div>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                                    {roleIcons[user.role]} {user.role}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                                <div>
                                    <p className="text-gray-500">Dept</p>
                                    <p className="text-gray-300">{user.department || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Certs</p>
                                    <p className="text-gray-300">{user._count.certificates}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Joined</p>
                                    <p className="text-gray-300">{new Date(user.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="border-t border-white/5 pt-3">
                                <UserActions
                                    userId={user.id}
                                    userRole={user.role}
                                    certificateCount={user._count.certificates}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
