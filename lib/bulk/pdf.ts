/**
 * A very small PDF writer for exported certificates.
 *
 * A certificate is one full-bleed picture, so a page only needs a page object, a
 * content stream and an image. Pictures go in either as JPEG - PDF's DCTDecode
 * takes the bytes the browser already encoded, untouched - or, for a lossless
 * page, as deflate-compressed RGB samples (FlateDecode).
 *
 * Page boxes are real print sizes: a design drawn at one of the built-in page
 * sizes comes out as exactly that piece of paper, whatever resolution it was
 * rasterised at. Everything runs in the browser; nothing is uploaded anywhere.
 */

/** Pixels per inch the built-in page sizes are drawn at. */
export const PDF_RASTER_DPI = 150

/** A4 and US Letter in PostScript points (1/72 inch). */
const A4_LONG = 841.89
const A4_SHORT = 595.28
const LETTER_LONG = 792
const LETTER_SHORT = 612

export interface PdfPageSize {
    /** Points (1/72 inch). */
    width: number
    height: number
    /** What to call the size on screen, e.g. "A4 landscape" or "297 × 210 mm". */
    label: string
}

/** The built-in page sizes that are a real sheet of paper, and which sheet that is. */
const PAPER_SIZES: { width: number; height: number; size: PdfPageSize }[] = [
    { width: 1754, height: 1240, size: { width: A4_LONG, height: A4_SHORT, label: "A4 landscape" } },
    { width: 1240, height: 1754, size: { width: A4_SHORT, height: A4_LONG, label: "A4 portrait" } },
    { width: 1650, height: 1275, size: { width: LETTER_LONG, height: LETTER_SHORT, label: "US Letter landscape" } },
    { width: 1275, height: 1650, size: { width: LETTER_SHORT, height: LETTER_LONG, label: "US Letter portrait" } },
]

const millimetres = (points: number) => Math.round((points / 72) * 25.4)

/**
 * The page a design of this pixel size prints on. The built-in A4 and Letter
 * sizes give exactly those sheets; anything else keeps its own shape at
 * {@link PDF_RASTER_DPI}, shrunk to fit on A4 when it would be larger.
 *
 * Pass the design's own size, not the size it is exported at: a higher export
 * resolution puts more pixels on the same sheet of paper.
 */
export function pdfPageSize(pixelWidth: number, pixelHeight: number): PdfPageSize {
    const width = Math.max(1, Math.round(pixelWidth))
    const height = Math.max(1, Math.round(pixelHeight))

    const paper = PAPER_SIZES.find((item) => item.width === width && item.height === height)
    if (paper) return paper.size

    const naturalWidth = (width / PDF_RASTER_DPI) * 72
    const naturalHeight = (height / PDF_RASTER_DPI) * 72
    const longest = Math.max(naturalWidth, naturalHeight)
    const shortest = Math.min(naturalWidth, naturalHeight)
    const factor = Math.min(1, A4_LONG / longest, A4_SHORT / shortest)

    const pageWidth = naturalWidth * factor
    const pageHeight = naturalHeight * factor
    return {
        width: pageWidth,
        height: pageHeight,
        label: `${millimetres(pageWidth)} × ${millimetres(pageHeight)} mm`,
    }
}

export type PdfImageKind = "jpeg" | "rgb"

/** One page's picture, already encoded the way the PDF will carry it. */
export interface PdfImage {
    kind: PdfImageKind
    /** JPEG file bytes, or zlib-compressed 8-bit RGB samples. */
    data: Uint8Array
    width: number
    height: number
    /** Colour components per pixel: 1 grey, 3 RGB, 4 CMYK. */
    components: number
}

export interface PdfPage {
    image: PdfImage
    /** Page box in points. */
    width: number
    height: number
}

function adler32(bytes: Uint8Array): number {
    let a = 1
    let b = 0
    for (let i = 0; i < bytes.length; i++) {
        a += bytes[i]
        b += a
        // Keep both sums well inside what a double holds exactly.
        if ((i & 0x1fff) === 0x1fff) {
            a %= 65521
            b %= 65521
        }
    }
    return (((b % 65521) << 16) | (a % 65521)) >>> 0
}

/** A valid zlib stream that stores the bytes as they are. Used where the browser cannot deflate. */
function zlibStored(bytes: Uint8Array): Uint8Array {
    const BLOCK = 65535
    const blocks = Math.max(1, Math.ceil(bytes.length / BLOCK))
    const out = new Uint8Array(2 + blocks * 5 + bytes.length + 4)

    let at = 0
    out[at++] = 0x78 // zlib: deflate, 32K window
    out[at++] = 0x01 // no preset dictionary, fastest compression

    for (let i = 0; i < blocks; i++) {
        const start = i * BLOCK
        const length = Math.min(BLOCK, bytes.length - start)
        out[at++] = i === blocks - 1 ? 1 : 0 // final block flag, stored type
        out[at++] = length & 0xff
        out[at++] = (length >>> 8) & 0xff
        out[at++] = ~length & 0xff
        out[at++] = (~length >>> 8) & 0xff
        out.set(bytes.subarray(start, start + length), at)
        at += length
    }

    const checksum = adler32(bytes)
    out[at++] = (checksum >>> 24) & 0xff
    out[at++] = (checksum >>> 16) & 0xff
    out[at++] = (checksum >>> 8) & 0xff
    out[at] = checksum & 0xff
    return out
}

type CompressionStreamCtor = new (format: string) => {
    readable: ReadableStream<Uint8Array>
    writable: WritableStream<Uint8Array>
}

/** zlib-compresses the bytes, falling back to an uncompressed zlib stream where that is not available. */
async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
    const Compression = (globalThis as unknown as { CompressionStream?: CompressionStreamCtor }).CompressionStream
    if (!Compression || typeof Response === "undefined") return zlibStored(bytes)

    try {
        const stream = new Compression("deflate")
        const writing = (async () => {
            const writer = stream.writable.getWriter()
            await writer.write(bytes)
            await writer.close()
        })()
        const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer())
        await writing
        return compressed
    } catch {
        return zlibStored(bytes)
    }
}

/**
 * How many colour components a JPEG carries, read from its start-of-frame.
 * Canvas always writes three, but a file that says otherwise must not be
 * labelled RGB or it would come out with the colours swapped.
 */
function jpegComponents(data: Uint8Array): number {
    let at = 2
    while (at + 9 < data.length) {
        if (data[at] !== 0xff) {
            at++
            continue
        }
        const marker = data[at + 1]
        // Padding and the markers that carry no segment of their own.
        if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
            at += 2
            continue
        }
        // Start of frame: everything from C0 to CF except the tables and the reserved ones.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            return data[at + 9] || 3
        }
        // Past the start of scan there is only entropy-coded data.
        if (marker === 0xda) break
        at += 2 + ((data[at + 2] << 8) | data[at + 3])
    }
    return 3
}

/**
 * Encodes what has been drawn on a canvas for one PDF page. A quality of 100
 * keeps every pixel exactly (a larger file); anything lower encodes a JPEG.
 * Whatever is transparent on the canvas is carried over as black, so paint the
 * page's own background in before calling this.
 */
export async function encodeCanvasForPdf(canvas: HTMLCanvasElement, quality: number): Promise<PdfImage> {
    const width = canvas.width
    const height = canvas.height

    if (quality >= 100) {
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas is not available in this browser.")
        const pixels = ctx.getImageData(0, 0, width, height).data
        const rgb = new Uint8Array(width * height * 3)
        for (let i = 0, out = 0; i < pixels.length; i += 4) {
            rgb[out++] = pixels[i]
            rgb[out++] = pixels[i + 1]
            rgb[out++] = pixels[i + 2]
        }
        return { kind: "rgb", data: await deflate(rgb), width, height, components: 3 }
    }

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", Math.min(100, Math.max(1, quality)) / 100)
    )
    if (!blob) throw new Error("The browser could not encode the certificate image.")
    const data = new Uint8Array(await blob.arrayBuffer())
    return { kind: "jpeg", data, width, height, components: jpegComponents(data) }
}

const COLOR_SPACES: Record<number, string> = { 1: "/DeviceGray", 3: "/DeviceRGB", 4: "/DeviceCMYK" }

/** Numbers in a PDF may not be written in exponent notation. */
const num = (value: number) => (Math.round(value * 100) / 100).toString()

/** Text inside a PDF string, with the three characters that would end it escaped. */
function pdfString(value: string): string {
    return value.replace(/[^\x20-\x7e]/g, " ").replace(/([\\()])/g, "\\$1").slice(0, 200)
}

function pdfDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0")
    return (
        `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
        `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
    )
}

export interface PdfOptions {
    title?: string
    createdAt?: Date
}

/** The whole file, in the order its pieces are written. */
function buildPdf(pages: PdfPage[], options: PdfOptions): Uint8Array[] {
    if (pages.length === 0) throw new Error("A PDF needs at least one page.")

    const encoder = new TextEncoder()
    const chunks: Uint8Array[] = []
    let offset = 0

    const push = (chunk: Uint8Array) => {
        chunks.push(chunk)
        offset += chunk.length
    }
    const write = (text: string) => push(encoder.encode(text))

    /** Byte offset of every object, by object number. Object 0 is always the free head of the list. */
    const offsets = new Map<number, number>()
    const openObject = (id: number, body: string) => {
        offsets.set(id, offset)
        write(`${id} 0 obj\n${body}\n`)
    }
    const object = (id: number, body: string) => {
        openObject(id, body)
        write("endobj\n")
    }

    const pageId = (index: number) => 3 + index * 3
    const contentId = (index: number) => 4 + index * 3
    const imageId = (index: number) => 5 + index * 3
    const infoId = 3 + pages.length * 3
    const lastId = infoId

    write("%PDF-1.4\n")
    // A comment of high bytes, so anything moving the file treats it as binary.
    push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))

    object(1, "<< /Type /Catalog /Pages 2 0 R >>")
    object(
        2,
        `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${pageId(index)} 0 R`).join(" ")}] >>`
    )

    pages.forEach((page, index) => {
        object(
            pageId(index),
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}]` +
            ` /Resources << /XObject << /Im0 ${imageId(index)} 0 R >> /ProcSet [/PDF /ImageC /ImageB] >>` +
            ` /Contents ${contentId(index)} 0 R >>`
        )

        // Draw the picture over the whole page: scale it up from the unit square at the origin.
        const content = `q\n${num(page.width)} 0 0 ${num(page.height)} 0 0 cm\n/Im0 Do\nQ\n`
        const contentBytes = encoder.encode(content)
        openObject(contentId(index), `<< /Length ${contentBytes.length} >>\nstream`)
        push(contentBytes)
        write("endstream\nendobj\n")

        const { image } = page
        const filter = image.kind === "jpeg" ? "/DCTDecode" : "/FlateDecode"
        const colorSpace = COLOR_SPACES[image.components] ?? "/DeviceRGB"
        openObject(
            imageId(index),
            `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height}` +
            ` /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter ${filter} /Length ${image.data.length} >>\nstream`
        )
        push(image.data)
        write("\nendstream\nendobj\n")
    })

    object(
        infoId,
        `<< /Producer (CertiFoolProof) /Creator (CertiFoolProof)` +
        `${options.title ? ` /Title (${pdfString(options.title)})` : ""}` +
        ` /CreationDate (${pdfDate(options.createdAt ?? new Date())}) >>`
    )

    const xrefOffset = offset
    write(`xref\n0 ${lastId + 1}\n0000000000 65535 f\r\n`)
    for (let id = 1; id <= lastId; id++) {
        write(`${String(offsets.get(id) ?? 0).padStart(10, "0")} 00000 n\r\n`)
    }
    write(
        `trailer\n<< /Size ${lastId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    )

    return chunks
}

/**
 * Builds the PDF as a Blob. Every page carries one picture, stretched over the
 * whole page box, so a page is exactly the certificate and nothing else.
 */
export function createPdf(pages: PdfPage[], options: PdfOptions = {}): Blob {
    return new Blob(buildPdf(pages, options), { type: "application/pdf" })
}

/** The same file as raw bytes, for a PDF that goes into a ZIP rather than straight to the browser. */
export function createPdfBytes(pages: PdfPage[], options: PdfOptions = {}): Uint8Array {
    const chunks = buildPdf(pages, options)
    let total = 0
    for (const chunk of chunks) total += chunk.length

    const bytes = new Uint8Array(total)
    let at = 0
    for (const chunk of chunks) {
        bytes.set(chunk, at)
        at += chunk.length
    }
    return bytes
}
