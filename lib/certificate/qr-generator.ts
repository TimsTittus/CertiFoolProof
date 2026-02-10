import QRCode from "qrcode"

export interface QRCodeOptions {
    /** Width/height of the QR code in pixels (default: 256) */
    size?: number
    /** Error correction level: L, M, Q, H (default: M) */
    errorCorrectionLevel?: "L" | "M" | "Q" | "H"
    /** Margin around the QR code (default: 2) */
    margin?: number
    /** Dark color (default: #000000) */
    darkColor?: string
    /** Light color (default: #ffffff) */
    lightColor?: string
}

/**
 * Default base URL for verification
 */
const DEFAULT_BASE_URL = process.env.AUTH_URL || "http://localhost:3000"

/**
 * Generates a verification URL for a certificate.
 * 
 * @param certificateId - The certificate ID to embed in the URL
 * @param baseUrl - Optional base URL (defaults to AUTH_URL env var)
 * @returns Full verification URL
 */
export function buildVerificationUrl(
    certificateId: string,
    baseUrl: string = DEFAULT_BASE_URL
): string {
    return `${baseUrl}/verify/${certificateId}`
}

/**
 * Generates a QR code as a Data URL (base64 encoded PNG).
 * 
 * @param content 
 * @param options 
 * @returns
 */
export async function generateQRCodeDataUrl(
    content: string,
    options: QRCodeOptions = {}
): Promise<string> {
    const {
        size = 256,
        errorCorrectionLevel = "M",
        margin = 2,
        darkColor = "#000000",
        lightColor = "#ffffff",
    } = options

    const dataUrl = await QRCode.toDataURL(content, {
        width: size,
        errorCorrectionLevel,
        margin,
        color: {
            dark: darkColor,
            light: lightColor,
        },
    })

    return dataUrl
}

/**
 * Generates a QR code for certificate verification.
 * 
 * @param certificateId - Certificate ID to encode
 * @param options - QR code generation options
 * @returns Promise resolving to base64 data URL
 */
export async function generateCertificateQRCode(
    certificateId: string,
    options: QRCodeOptions = {}
): Promise<string> {
    const verificationUrl = buildVerificationUrl(certificateId)
    return generateQRCodeDataUrl(verificationUrl, options)
}

/**
 * Generates a QR code as a Buffer (for server-side file operations).
 * 
 * @param content - Content to encode
 * @param options - QR code generation options
 * @returns Promise resolving to Buffer
 */
export async function generateQRCodeBuffer(
    content: string,
    options: QRCodeOptions = {}
): Promise<Buffer> {
    const {
        size = 256,
        errorCorrectionLevel = "M",
        margin = 2,
        darkColor = "#000000",
        lightColor = "#ffffff",
    } = options

    const buffer = await QRCode.toBuffer(content, {
        width: size,
        errorCorrectionLevel,
        margin,
        color: {
            dark: darkColor,
            light: lightColor,
        },
    })

    return buffer
}

/**
 * Generates QR code as SVG string.
 * 
 * @param content - Content to encode
 * @param options - QR code generation options
 * @returns Promise resolving to SVG string
 */
export async function generateQRCodeSVG(
    content: string,
    options: QRCodeOptions = {}
): Promise<string> {
    const {
        size = 256,
        errorCorrectionLevel = "M",
        margin = 2,
        darkColor = "#000000",
        lightColor = "#ffffff",
    } = options

    const svg = await QRCode.toString(content, {
        type: "svg",
        width: size,
        errorCorrectionLevel,
        margin,
        color: {
            dark: darkColor,
            light: lightColor,
        },
    })

    return svg
}
