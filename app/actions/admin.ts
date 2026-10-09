"use server"

import { auth } from "@/auth"
import { headers } from "next/headers"
import { db } from "@/db"
import { user as userTable, certificate as certificateTable, verificationLog as verificationLogTable } from "@/db/schema"
import { count, eq, gte, desc, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export interface DashboardStats {
    totalUsers: number
    totalCertificates: number
    activeCertificates: number
    revokedCertificates: number
    totalVerifications: number
    recentVerifications: number
    usersByRole: { role: string; count: number }[]
    certificatesByMonth: { month: string; count: number }[]
    recentCertificates: {
        id: string
        certificateId: string
        recipientName: string
        title: string
        status: string
        issuedAt: Date
        issuerName: string
    }[]
    recentLogs: {
        id: string
        certificateId: string
        verifiedAt: Date
        success: boolean
        ipAddress: string | null
    }[]
}

async function requireAdmin() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }
    return session.user
}

export async function getAdminDashboardStats(): Promise<DashboardStats> {
    try {
        await requireAdmin()

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const [
            totalUsersRes,
            totalCertificatesRes,
            activeCertificatesRes,
            revokedCertificatesRes,
            totalVerificationsRes,
            recentVerificationsRes,
            usersByRoleRes,
            recentCertificates,
            recentLogs,
        ] = await Promise.all([
            db.select({ count: count() }).from(userTable),
            db.select({ count: count() }).from(certificateTable),
            db.select({ count: count() }).from(certificateTable).where(eq(certificateTable.status, "ACTIVE")),
            db.select({ count: count() }).from(certificateTable).where(eq(certificateTable.status, "REVOKED")),
            db.select({ count: count() }).from(verificationLogTable),
            db.select({ count: count() }).from(verificationLogTable).where(gte(verificationLogTable.verifiedAt, sevenDaysAgo)),
            db.select({ role: userTable.role, count: count() }).from(userTable).groupBy(userTable.role),
            db.query.certificate.findMany({
                limit: 10,
                orderBy: [desc(certificateTable.createdAt)],
                with: { issuer: { columns: { name: true } } },
            }),
            db.query.verificationLog.findMany({
                limit: 15,
                orderBy: [desc(verificationLogTable.verifiedAt)],
            }),
        ])

        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const certsByMonth = await db.select({ createdAt: certificateTable.createdAt })
            .from(certificateTable)
            .where(gte(certificateTable.createdAt, sixMonthsAgo))

        const monthCounts: Record<string, number> = {}
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
            monthCounts[key] = 0
        }
        certsByMonth.forEach((c) => {
            const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`
            if (key in monthCounts) monthCounts[key]++
        })

        return {
            totalUsers: totalUsersRes[0].count,
            totalCertificates: totalCertificatesRes[0].count,
            activeCertificates: activeCertificatesRes[0].count,
            revokedCertificates: revokedCertificatesRes[0].count,
            totalVerifications: totalVerificationsRes[0].count,
            recentVerifications: recentVerificationsRes[0].count,
            usersByRole: usersByRoleRes.map((r) => ({ role: r.role, count: r.count })),
            certificatesByMonth: Object.entries(monthCounts).map(([month, count]) => ({ month, count })),
            recentCertificates: recentCertificates.map((c) => ({
                id: c.id,
                certificateId: c.certificateId,
                recipientName: c.recipientName,
                title: c.title,
                status: c.status,
                issuedAt: c.issuedAt,
                issuerName: c.issuer.name,
            })),
            recentLogs: recentLogs.map((l) => ({
                id: l.id,
                certificateId: l.certificateId,
                verifiedAt: l.verifiedAt,
                success: l.success,
                ipAddress: l.ipAddress,
            })),
        }
    } catch (error) {
        console.error("[ADMIN] Failed to fetch dashboard stats:", error)
        return {
            totalUsers: 0,
            totalCertificates: 0,
            activeCertificates: 0,
            revokedCertificates: 0,
            totalVerifications: 0,
            recentVerifications: 0,
            usersByRole: [],
            certificatesByMonth: [],
            recentCertificates: [],
            recentLogs: [],
        }
    }
}

export async function getAllUsers() {
    try {
        await requireAdmin()

        const users = await db.query.user.findMany({
            orderBy: [desc(userTable.createdAt)],
            columns: {
                id: true,
                email: true,
                name: true,
                role: true,
                department: true,
                createdAt: true,
            },
            with: {
                certificates: {
                    columns: {
                        id: true
                    }
                }
            }
        })

        return users.map(u => ({
            ...u,
            _count: { certificates: u.certificates.length }
        }))
    } catch (error) {
        console.error("[ADMIN] Failed to fetch all users:", error)
        return []
    }
}

export async function getAllCertificates() {
    try {
        await requireAdmin()
        return await db.query.certificate.findMany({
            orderBy: [desc(certificateTable.createdAt)],
            limit: 100,
            with: { issuer: { columns: { name: true, email: true } } },
        })
    } catch (error) {
        console.error("[ADMIN] Failed to fetch all certificates:", error)
        return []
    }
}

export async function getVerificationLogs() {
    try {
        await requireAdmin()
        return await db.query.verificationLog.findMany({
            orderBy: [desc(verificationLogTable.verifiedAt)],
            limit: 100,
        })
    } catch (error) {
        console.error("[ADMIN] Failed to fetch verification logs:", error)
        return []
    }
}

export async function revokeCertificate(certificateId: string) {
    try {
        await requireAdmin()
        const [revoked] = await db.update(certificateTable)
            .set({ status: "REVOKED" })
            .where(or(eq(certificateTable.id, certificateId), eq(certificateTable.certificateId, certificateId)))
            .returning()

        revalidatePath("/admin")
        revalidatePath("/admin/certificates")
        revalidatePath("/dashboard")
        revalidatePath("/dashboard/certificates")
        if (revoked?.certificateId) {
            revalidatePath(`/verify/${revoked.certificateId}`)
        }

        return revoked ? [revoked] : []
    } catch (error) {
        console.error("[ADMIN] Failed to revoke certificate:", error)
        throw new Error("Failed to revoke certificate. Database may be unreachable.")
    }
}