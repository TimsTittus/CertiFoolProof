"use server"

import { db } from "@/db"
import { certificate as certificateTable, verificationLog as verificationLogTable } from "@/db/schema"
import { verifyCertificateHash, isValidCertificateId } from "@/lib/certificate"
import { headers } from "next/headers"
import { eq, sql } from "drizzle-orm"

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

        const certificate = await db.query.certificate.findFirst({
            where: eq(certificateTable.certificateId, certificateId),
            with: {
                issuer: {
                    columns: {
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

        const isExpired = Boolean(certificate.expiresAt && new Date() > certificate.expiresAt)
        const isRevoked = certificate.status === "REVOKED"
        const isActive = certificate.status === "ACTIVE" && !isExpired

        const finalStatus = isRevoked ? "REVOKED" : (isExpired ? "EXPIRED" : certificate.status)

        let errorMessage: string | undefined = undefined
        if (!isHashValid) {
            errorMessage = "Certificate integrity check failed (potential tampering detected)"
        } else if (isRevoked) {
            errorMessage = "This certificate has been revoked by the issuing authority"
        } else if (isExpired) {
            errorMessage = "This certificate has expired"
        }

        const headersList = await headers()
        const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null
        const userAgent = headersList.get("user-agent") || null

        await db.transaction(async (tx) => {
            await tx
                .update(certificateTable)
                .set({
                    verificationCount: sql`${certificateTable.verificationCount} + 1`,
                    lastVerifiedAt: new Date(),
                })
                .where(eq(certificateTable.id, certificate.id))

            await tx.insert(verificationLogTable).values({
                id: crypto.randomUUID(),
                certificateId: certificate.certificateId,
                ipAddress,
                userAgent,
                success: isHashValid && isActive,
            })
        })

        return {
            success: true,
            valid: isHashValid && isActive,
            error: isHashValid && isActive ? undefined : errorMessage,
            certificate: {
                certificateId: certificate.certificateId,
                recipientName: certificate.recipientName,
                recipientEmail: certificate.recipientEmail,
                title: certificate.title,
                description: certificate.description,
                issuedAt: certificate.issuedAt,
                expiresAt: certificate.expiresAt,
                status: finalStatus,
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