/**
 * The verification block that goes on an issued certificate: the QR code that
 * leads to the verification page, with the certificate's own ID under it.
 *
 * It is drawn in the browser into a single picture and then placed on the design
 * as a logo, so it can be moved, resized and turned off with the same handles as
 * everything else - and so the designer needs to know nothing about certificates.
 * While a certificate is only being designed the block carries a sample ID; the
 * real one replaces it the moment the certificate is issued.
 */

/** The id of the logo that holds the block, so it can be found and replaced on the design. */
export const VERIFICATION_LOGO_ID = "verification"

/** Stands in for a real certificate ID until one has been issued. */
export const SAMPLE_CERTIFICATE_ID = "CFP-0000-SAMPL"

const WIDTH = 620
const PADDING = 28
const QR_SIZE = WIDTH - PADDING * 2
const CAPTION_SIZE = 30
const ID_SIZE = 38
const GAP = 16

export interface VerificationBlockInput {
    /** The QR code as a PNG data URL. An empty string leaves a labelled placeholder in its place. */
    qrDataUrl: string
    certificateId: string
    /** Small line under the QR code, e.g. "Scan to verify". Empty leaves it out. */
    caption?: string
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const image = new window.Image()
        image.onload = () => resolve(image)
        image.onerror = () => resolve(null)
        image.src = src
    })
}

/**
 * Draws the block and returns it as a PNG data URL, ready to be used as a logo.
 * The card behind it is white, so the QR code stays readable on any artwork.
 */
export async function renderVerificationBlock({
    qrDataUrl,
    certificateId,
    caption = "Scan to verify",
}: VerificationBlockInput): Promise<string> {
    const textHeight =
        (caption.trim() ? CAPTION_SIZE + GAP : 0) + (certificateId.trim() ? ID_SIZE + GAP : 0)
    const height = PADDING * 2 + QR_SIZE + textHeight

    const canvas = document.createElement("canvas")
    canvas.width = WIDTH
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas is not available in this browser.")

    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, WIDTH, height)

    const qr = qrDataUrl ? await loadImage(qrDataUrl) : null
    if (qr) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(qr, PADDING, PADDING, QR_SIZE, QR_SIZE)
        ctx.imageSmoothingEnabled = true
    } else {
        // Nothing to scan yet: a plain box keeps the block the right size and shape.
        ctx.strokeStyle = "#111111"
        ctx.lineWidth = 4
        ctx.strokeRect(PADDING + 2, PADDING + 2, QR_SIZE - 4, QR_SIZE - 4)
        ctx.fillStyle = "#111111"
        ctx.font = "700 34px Helvetica, Arial, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("QR CODE", WIDTH / 2, PADDING + QR_SIZE / 2)
    }

    ctx.fillStyle = "#111111"
    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"

    let baseline = PADDING + QR_SIZE + GAP
    if (caption.trim()) {
        baseline += CAPTION_SIZE * 0.8
        ctx.font = `700 ${CAPTION_SIZE}px Helvetica, Arial, sans-serif`
        ctx.fillText(caption.trim().toUpperCase(), WIDTH / 2, baseline)
        baseline += CAPTION_SIZE * 0.2 + GAP
    }
    if (certificateId.trim()) {
        baseline += ID_SIZE * 0.8
        ctx.font = `700 ${ID_SIZE}px 'Courier New', Courier, monospace`
        // A long ID is squeezed rather than spilling over the edge of the card.
        ctx.fillText(certificateId.trim(), WIDTH / 2, baseline, WIDTH - PADDING * 2)
    }

    return canvas.toDataURL("image/png")
}
