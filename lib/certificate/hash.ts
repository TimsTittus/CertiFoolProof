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

function toIsoString(date: Date | string | null | undefined): string {
    if (!date) return ""
    const d = date instanceof Date ? date : new Date(date)
    return isNaN(d.getTime()) ? "" : d.toISOString()
}

export function hashCertificateData(data: CertificateHashData): string {
    const canonicalData = [
        data.certificateId,
        data.recipientName.trim().toLowerCase(),
        data.recipientEmail.trim().toLowerCase(),
        data.title.trim(),
        data.issuerId,
        toIsoString(data.issuedAt),
        toIsoString(data.expiresAt),
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
    if (computedHash === expectedHash) return true

    // Check with millisecond-truncated timestamps in case DB adapter stripped sub-seconds
    const issuedZero = new Date(data.issuedAt)
    issuedZero.setMilliseconds(0)
    const expiresZero = data.expiresAt ? new Date(data.expiresAt) : null
    if (expiresZero) expiresZero.setMilliseconds(0)

    const fallbackHash = hashCertificateData({
        ...data,
        issuedAt: issuedZero,
        expiresAt: expiresZero,
    })
    return fallbackHash === expectedHash
}

export function generateSecureRandom(length: number = 32): string {
    return randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .slice(0, length)
}