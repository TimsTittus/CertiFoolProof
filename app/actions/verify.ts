"use server"

import { prisma } from "@/lib/prisma"
import { verifyCertificateHash, isValidCertificateId } from "@/lib/certificate"
import { headers } from "next/headers"

export interface VerificationResult {
    success: boolean
    valid: boolean
    error?: string
    certificate?: {
        certificateId: string
        recipientName: string
        recipientEmail: string
        title: string
        description: string | null
        issuedAt: Date
        expiresAt: Date | null
        status: string
        issuerName: string
        issuerDepartment: string | null
        verificationCount: number
    }
}

export async function verifyCertificate(
    certificateId: string
): Promise<VerificationResult> {
    try {
        if (!certificateId?.trim()) {
            return { success: false, valid: false, error: "Certificate ID is required" }
        }

        if (!isValidCertificateId(certificateId)) {
            return { success: false, valid: false, error: "Invalid certificate ID format" }
        }

        const certificate = await prisma.certificate.findUnique({
            where: { certificateId },
            include: {
                issuer: {
                    select: {
                        name: true,
                        department: true,
                    },
                },
            },
        })

        if (!certificate) {
            return { success: true, valid: false, error: "Certificate not found" }
        }

        const isHashValid = verifyCertificateHash(
            {
                certificateId: certificate.certificateId,
                recipientName: certificate.recipientName,
                recipientEmail: certificate.recipientEmail,
                title: certificate.title,
                issuerId: certificate.issuerId,
                issuedAt: certificate.issuedAt,
                expiresAt: certificate.expiresAt,
                description: certificate.description,
            },
            certificate.dataHash
        )

        const isExpired = certificate.expiresAt && new Date() > certificate.expiresAt
        const isActive = certificate.status === "ACTIVE" && !isExpired

        const headersList = await headers()
        const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null
        const userAgent = headersList.get("user-agent") || null

        await prisma.$transaction([
            prisma.certificate.update({
                where: { id: certificate.id },
                data: {
                    verificationCount: { increment: 1 },
                    lastVerifiedAt: new Date(),
                },
            }),
            prisma.verificationLog.create({
                data: {
                    certificateId: certificate.certificateId,
                    ipAddress,
                    userAgent,
                    success: isHashValid && isActive,
                },
            }),
        ])

        return {
            success: true,
            valid: isHashValid && isActive,
            certificate: {
                certificateId: certificate.certificateId,
                recipientName: certificate.recipientName,
                recipientEmail: certificate.recipientEmail,
                title: certificate.title,
                description: certificate.description,
                issuedAt: certificate.issuedAt,
                expiresAt: certificate.expiresAt,
                status: isExpired ? "EXPIRED" : certificate.status,
                issuerName: certificate.issuer.name,
                issuerDepartment: certificate.issuer.department,
                verificationCount: certificate.verificationCount + 1,
            },
        }
    } catch (error) {
        console.error("Verification error:", error)
        return { success: false, valid: false, error: "Verification failed" }
    }
}
