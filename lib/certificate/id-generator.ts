import { randomBytes } from "crypto"

export function generateCertificateId(): string {
    const year = new Date().getFullYear()
    const uniquePart = generateAlphanumericId(5)
    return `CFP-${year}-${uniquePart}`
}

function generateAlphanumericId(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const bytes = randomBytes(length)
    let result = ""

    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length]
    }

    return result
}

export function isValidCertificateId(id: string): boolean {
    const pattern = /^CFP-\d{4}-[A-Z0-9]{5}$/
    return pattern.test(id)
}

export function extractYearFromId(id: string): number | null {
    if (!isValidCertificateId(id)) return null
    const match = id.match(/^CFP-(\d{4})-/)
    return match ? parseInt(match[1], 10) : null
}
