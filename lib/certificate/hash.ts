import { createHash, randomBytes } from "crypto"

export interface CertificateHashData {
    certificateId: string
    recipientName: string
    recipientEmail: string
    title: string
    issuerId: string
    issuedAt: Date
    expiresAt?: Date | null
    description?: string | null
}

export function hashCertificateData(data: CertificateHashData): string {
    const canonicalData = [
        data.certificateId,
        data.recipientName.trim().toLowerCase(),
        data.recipientEmail.trim().toLowerCase(),
        data.title.trim(),
        data.issuerId,
        data.issuedAt.toISOString(),
        data.expiresAt?.toISOString() ?? "",
        data.description?.trim() ?? "",
    ].join("|")

    const hash = createHash("sha256")
    hash.update(canonicalData)
    return hash.digest("hex")
}

export function verifyCertificateHash(
    data: CertificateHashData,
    expectedHash: string
): boolean {
    const computedHash = hashCertificateData(data)
    return computedHash === expectedHash
}

export function generateSecureRandom(length: number = 32): string {
    return randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .slice(0, length)
}
