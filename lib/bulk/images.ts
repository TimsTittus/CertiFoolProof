/**
 * Image handling for signatures and logos: reading an uploaded file down to a
 * sensible size, keeping decoded images around so the renderer can draw them
 * synchronously, and removing a white background from a signature. Everything
 * runs in the browser; nothing is uploaded anywhere.
 */

export const IMAGE_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"]
export const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024

/** Longest side, in pixels, that an uploaded signature or logo is kept at. */
export const SIGNATURE_IMAGE_SIDE = 1000
export const LOGO_IMAGE_SIDE = 1200

const MAX_PROCESS_SIDE = 1600
const FEATHER = 30
const MIN_ASPECT = 0.02
const MAX_ASPECT = 50

const loaded = new Map<string, HTMLImageElement>()
const loading = new Map<string, Promise<HTMLImageElement | null>>()
const failed = new Set<string>()
const whiteRemoved = new Map<string, { threshold: number; canvas: HTMLCanvasElement }>()

/** The decoded image for a data URL, or null while it is still loading (or could not be loaded). */
export function getLoadedImage(src: string): HTMLImageElement | null {
    return loaded.get(src) ?? null
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
    const inflight = loading.get(src)
    if (inflight) return inflight

    const promise = new Promise<HTMLImageElement | null>((resolve) => {
        const image = new window.Image()
        image.onload = () => {
            loaded.set(src, image)
            loading.delete(src)
            resolve(image)
        }
        image.onerror = () => {
            failed.add(src)
            loading.delete(src)
            resolve(null)
        }
        image.src = src
    })
    loading.set(src, promise)
    return promise
}

export async function ensureImages(sources: string[]): Promise<boolean> {
    if (typeof window === "undefined") return false

    const wanted = new Set(sources)
    for (const key of [...loaded.keys()]) if (!wanted.has(key)) loaded.delete(key)
    for (const key of [...failed]) if (!wanted.has(key)) failed.delete(key)
    for (const key of [...whiteRemoved.keys()]) if (!wanted.has(key)) whiteRemoved.delete(key)

    const fresh = [...wanted].filter((src) => !loaded.has(src) && !failed.has(src))
    if (fresh.length === 0) return false
    const results = await Promise.all(fresh.map(loadImage))
    return results.some((image) => image !== null)
}

export function removeWhiteBackground(pixels: Uint8ClampedArray, threshold: number) {
    const cutoff = 255 - Math.min(100, Math.max(0, threshold)) * 1.6

    for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3]
        if (alpha === 0) continue
        const lightness = Math.min(pixels[i], pixels[i + 1], pixels[i + 2])
        if (lightness >= cutoff) {
            pixels[i + 3] = 0
        } else if (lightness > cutoff - FEATHER) {
            pixels[i + 3] = Math.round((alpha * (cutoff - lightness)) / FEATHER)
        }
    }
}

export function getWhiteRemoved(src: string, image: HTMLImageElement, threshold: number): CanvasImageSource {
    const cached = whiteRemoved.get(src)
    if (cached && cached.threshold === threshold) return cached.canvas

    const scale = Math.min(1, MAX_PROCESS_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return image

    try {
        ctx.drawImage(image, 0, 0, width, height)
        const data = ctx.getImageData(0, 0, width, height)
        removeWhiteBackground(data.data, threshold)
        ctx.putImageData(data, 0, 0)
    } catch {
        return image
    }

    whiteRemoved.set(src, { threshold, canvas })
    return canvas
}

function decodeFile(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error("That image could not be read. Try a PNG or JPG file."))
        image.src = url
    })
}

export async function prepareImageFile(file: File, maxSide: number): Promise<string> {
    if (!IMAGE_FILE_TYPES.includes(file.type)) throw new Error("Please choose a PNG, JPG or WebP image.")
    if (file.size > MAX_IMAGE_FILE_BYTES) throw new Error("That image is larger than 10 MB. Please choose a smaller one.")

    const url = URL.createObjectURL(file)
    try {
        const image = await decodeFile(url)
        const naturalWidth = image.naturalWidth
        const naturalHeight = image.naturalHeight
        if (!naturalWidth || !naturalHeight) throw new Error("That image has no size, so it cannot be used.")

        const aspect = naturalWidth / naturalHeight
        if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
            throw new Error("That image is too narrow or too flat to use.")
        }

        const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight))
        const width = Math.max(1, Math.round(naturalWidth * scale))
        const height = Math.max(1, Math.round(naturalHeight * scale))

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas is not available in this browser.")
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(image, 0, 0, width, height)

        const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png"
        return canvas.toDataURL(type, 0.92)
    } finally {
        URL.revokeObjectURL(url)
    }
}