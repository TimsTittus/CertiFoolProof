import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getAllUsers } from "@/app/actions/admin"

export default async function AdminUsersPage() {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard?error=unauthorized")

    const users = await getAllUsers()

    const roleColors: Record<string, string> = {
        ADMIN: "bg-red-500/20 text-red-300 border-red-500/30",
        FACULTY: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        CLUB: "bg-green-500/20 text-green-300 border-green-500/30",
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">CertiFoolProof</Link>
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="text-gray-300 hover:text-white transition-colors text-sm">← Admin</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                    <p className="text-gray-400">{users.length} registered users</p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Name</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Email</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Role</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Department</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Certificates</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-white text-sm">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">{user.department || "—"}</td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">{user._count.certificates}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}
