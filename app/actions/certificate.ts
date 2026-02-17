"use server"

import { auth } from "@/auth"
import { headers } from "next/headers"
import { db } from "@/db"
import { certificate as certificateTable } from "@/db/schema"
import {
    generateCertificateId,
    hashCertificateData,
    generateCertificateQRCode,
    buildVerificationUrl,
} from "@/lib/certificate"
import { revalidatePath } from "next/cache"
import { desc, eq } from "drizzle-orm"

export interface CreateCertificateInput {
    recipientName: string
    recipientEmail: string
    title: string
    description?: string
    expiresAt?: string // ISO date string
}

export interface CreateCertificateResult {
    success: boolean
    error?: string
    certificate?: {
        id: string
        certificateId: string
        recipientName: string
        recipientEmail: string
        title: string
        description: string | null
        issuedAt: Date
        expiresAt: Date | null
        qrCodeDataUrl: string
        verificationUrl: string
    }
}

export async function createCertificate(
    input: CreateCertificateInput
): Promise<CreateCertificateResult> {
    try {
        // Verify authentication
        const session = await auth.api.getSession({
            headers: await headers()
        })
        if (!session?.user) {
            return { success: false, error: "Not authenticated" }
        }

        // Verify role permission
        const allowedRoles = ["ADMIN", "FACULTY", "CLUB"]
        if (!allowedRoles.includes(session.user.role)) {
            return { success: false, error: "Not authorized to issue certificates" }
        }

        // Validate input
        if (!input.recipientName?.trim()) {
            return { success: false, error: "Recipient name is required" }
        }
        if (!input.recipientEmail?.trim()) {
            return { success: false, error: "Recipient email is required" }
        }
        if (!input.title?.trim()) {
            return { success: false, error: "Certificate title is required" }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(input.recipientEmail)) {
            return { success: false, error: "Invalid email format" }
        }

        // Generate unique certificate ID
        const certificateId = generateCertificateId()
        const issuedAt = new Date()
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null

        // Generate hash for integrity verification
        const dataHash = hashCertificateData({
            certificateId,
            recipientName: input.recipientName,
            recipientEmail: input.recipientEmail,
            title: input.title,
            issuerId: session.user.id,
            issuedAt,
            expiresAt,
            description: input.description || null,
        })

        // Generate QR code
        const qrCodeDataUrl = await generateCertificateQRCode(certificateId)
        const verificationUrl = buildVerificationUrl(certificateId)

        // Store in database
        const [certificate] = await db.insert(certificateTable).values({
            id: crypto.randomUUID(),
            certificateId,
            recipientName: input.recipientName.trim(),
            recipientEmail: input.recipientEmail.trim().toLowerCase(),
            title: input.title.trim(),
            description: input.description?.trim() || null,
            issuedAt,
            expiresAt,
            dataHash,
            qrCodeData: verificationUrl,
            status: "ACTIVE",
            issuerId: session.user.id,
        }).returning()

        // Revalidate the dashboard
        revalidatePath("/dashboard")
        revalidatePath("/generate")

        return {
            success: true,
            certificate: {
                id: certificate.id,
                certificateId: certificate.certificateId,
                recipientName: certificate.recipientName,
                recipientEmail: certificate.recipientEmail,
                title: certificate.title,
                description: certificate.description,
                issuedAt: certificate.issuedAt,
                expiresAt: certificate.expiresAt,
                qrCodeDataUrl,
                verificationUrl,
            },
        }
    } catch (error) {
        console.error("Certificate creation error:", error)
        return { success: false, error: "Failed to create certificate" }
    }
}

export async function getMyIssuedCertificates() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })
        if (!session?.user) {
            return []
        }

        const certificates = await db.query.certificate.findMany({
            where: eq(certificateTable.issuerId, session.user.id),
            orderBy: [desc(certificateTable.createdAt)],
            limit: 50,
        })

        return certificates
    } catch (error) {
        console.error("Failed to fetch issued certificates:", error)
        return []
    }
}
