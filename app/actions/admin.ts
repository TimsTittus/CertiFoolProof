"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

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
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }
    return session.user
}

export async function getAdminDashboardStats(): Promise<DashboardStats> {
    await requireAdmin()

    const [
        totalUsers,
        totalCertificates,
        activeCertificates,
        revokedCertificates,
        totalVerifications,
        recentVerifications,
        usersByRole,
        recentCertificates,
        recentLogs,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.certificate.count(),
        prisma.certificate.count({ where: { status: "ACTIVE" } }),
        prisma.certificate.count({ where: { status: "REVOKED" } }),
        prisma.verificationLog.count(),
        prisma.verificationLog.count({
            where: {
                verifiedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
        }),
        prisma.user.groupBy({
            by: ["role"],
            _count: { role: true },
        }),
        prisma.certificate.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: { issuer: { select: { name: true } } },
        }),
        prisma.verificationLog.findMany({
            take: 15,
            orderBy: { verifiedAt: "desc" },
        }),
    ])

    // Certificates by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const certsByMonth = await prisma.certificate.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
    })

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
        totalUsers,
        totalCertificates,
        activeCertificates,
        revokedCertificates,
        totalVerifications,
        recentVerifications,
        usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count.role })),
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
}

export async function getAllUsers() {
    await requireAdmin()
    return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            department: true,
            createdAt: true,
            _count: { select: { certificates: true } },
        },
    })
}

export async function getAllCertificates() {
    await requireAdmin()
    return prisma.certificate.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { issuer: { select: { name: true, email: true } } },
    })
}

export async function getVerificationLogs() {
    await requireAdmin()
    return prisma.verificationLog.findMany({
        orderBy: { verifiedAt: "desc" },
        take: 100,
    })
}

export async function revokeCertificate(certificateId: string) {
    await requireAdmin()
    return prisma.certificate.update({
        where: { id: certificateId },
        data: { status: "REVOKED" },
    })
}
