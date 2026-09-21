/**
 * Saving and loading certificate templates.
 * A template is the whole design as JSON, optionally with the uploaded artwork
 * embedded as a data URL so it travels with the file. Everything read back is
 * validated and clamped, so a hand-edited or corrupt file can never crash the page.
 */

import {
    FONT_OPTIONS,
    MIN_MAX_WIDTH,
    PRESET_PALETTES,
    SIZE_PRESETS,
    TEXT_ELEMENT_IDS,
    createNameElement,
    createPresetElements,
    createSignatureElement,
    DEFAULT_TEXT,
    defaultDateText,
    sizeLimits,
    type Align,
    type CertificateDesign,
    type ElementId,
    type FontWeight,
    type PresetId,
    type SignatureDrawing,
    type SignatureElement,
    type SignatureMode,
    type TemplateMode,
    type TextElement,
    type TextElementId,
} from "./renderer"

export const TEMPLATE_APP = "certifoolproof-certificate-template"
export const TEMPLATE_VERSION = 1

const AUTOSAVE_KEY = "certifoolproof.bulk.template.v1"
/** Larger artwork is left out of the autosave so it cannot exhaust the browser's storage quota. */
const MAX_AUTOSAVE_ARTWORK_CHARS = 2_500_000
const MAX_TEMPLATE_CHARS = 40_000_000

const MAX_TEXT_LENGTH = 2000
const MAX_STROKES = 200
const MAX_POINTS_PER_STROKE = 3000
const MAX_TOTAL_POINTS = 12000

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|webp);base64,/i

export interface TemplateBackground {
    name: string
    dataUrl: string
}

export interface LoadedTemplate {
    design: CertificateDesign
    background: TemplateBackground | null
}

export type AutosaveOutcome = "saved" | "saved-without-artwork" | "failed"

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readNumber(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback
    return Math.min(max, Math.max(min, value))
}

function readString(value: unknown, fallback: string): string {
    return typeof value === "string" ? value.slice(0, MAX_TEXT_LENGTH) : fallback
}

function readBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback
}

function readOneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
    return options.includes(value as T) ? (value as T) : fallback
}

function readColor(value: unknown, fallback: string): string {
    return typeof value === "string" && HEX_COLOR.test(value) ? value : fallback
}

function readFont(value: unknown, fallback: string): string {
    return typeof value === "string" && FONT_OPTIONS.some((font) => font.value === value) ? value : fallback
}

function sanitizeElement(raw: unknown, base: TextElement, id: ElementId): TextElement {
    if (!isRecord(raw)) return base
    const limits = sizeLimits(id)

    // Only elements that follow the theme may store "no colour"; the name and signature always have their own.
    let color: string | null
    if (raw.color === undefined) color = base.color
    else if (raw.color === null) color = id === "name" || id === "signature" ? base.color : null
    else color = readColor(raw.color, base.color ?? "#000000")

    return {
        text: readString(raw.text, base.text),
        x: readNumber(raw.x, 0, 100, base.x),
        y: readNumber(raw.y, 0, 100, base.y),
        size: readNumber(raw.size, limits.min, limits.max, base.size),
        font: readFont(raw.font, base.font),
        weight: readOneOf<FontWeight>(raw.weight, [300, 400, 700], base.weight),
        italic: readBoolean(raw.italic, base.italic),
        color,
        align: readOneOf<Align>(raw.align, ["left", "center", "right"], base.align),
        uppercase: readBoolean(raw.uppercase, base.uppercase),
        underline: readBoolean(raw.underline, base.underline),
        letterSpacing: readNumber(raw.letterSpacing, 0, 50, base.letterSpacing),
        lineHeight: readNumber(raw.lineHeight, 0.8, 3, base.lineHeight),
        maxWidth: readNumber(raw.maxWidth, MIN_MAX_WIDTH, 100, base.maxWidth),
        opacity: readNumber(raw.opacity, 10, 100, base.opacity),
        visible: readBoolean(raw.visible, base.visible),
        visibleOnUpload: readBoolean(raw.visibleOnUpload, base.visibleOnUpload),
    }
}

function sanitizeDrawing(raw: unknown): SignatureDrawing | null {
    if (!isRecord(raw) || !Array.isArray(raw.strokes)) return null

    const strokes: [number, number][][] = []
    let total = 0

    for (const rawStroke of raw.strokes.slice(0, MAX_STROKES)) {
        if (!Array.isArray(rawStroke)) continue
        const points: [number, number][] = []
        for (const rawPoint of rawStroke.slice(0, MAX_POINTS_PER_STROKE)) {
            if (total >= MAX_TOTAL_POINTS) break
            if (
                !Array.isArray(rawPoint) ||
                typeof rawPoint[0] !== "number" ||
                typeof rawPoint[1] !== "number" ||
                !Number.isFinite(rawPoint[0]) ||
                !Number.isFinite(rawPoint[1])
            ) {
                continue
            }
            points.push([readNumber(rawPoint[0], 0, 1, 0), readNumber(rawPoint[1], 0, 1, 0)])
            total++
        }
        if (points.length > 0) strokes.push(points)
    }

    if (strokes.length === 0) return null
    return { aspect: readNumber(raw.aspect, 0.05, 50, 3), strokes }
}

function sanitizeSignature(raw: unknown, base: SignatureElement): SignatureElement {
    if (!isRecord(raw)) return base

    const element = sanitizeElement(raw, base, "signature")
    const strokes = sanitizeDrawing(raw.strokes)
    let mode = readOneOf<SignatureMode>(raw.mode, ["none", "draw", "type"], "none")
    if (mode === "draw" && !strokes) mode = "none"

    return {
        ...element,
        // The signature always has a colour of its own.
        color: readColor(raw.color, base.color),
        mode,
        strokes,
    }
}

function sanitizeLayoutSize(
    raw: unknown,
    fallback: { width: number; height: number }
): { width: number; height: number } {
    if (!isRecord(raw)) return { width: fallback.width, height: fallback.height }
    return {
        width: Math.round(readNumber(raw.width, 200, 6000, fallback.width)),
        height: Math.round(readNumber(raw.height, 200, 6000, fallback.height)),
    }
}

/** Builds a valid design from untrusted data. Anything missing or out of range falls back to a default. */
export function sanitizeDesign(raw: unknown): CertificateDesign {
    if (!isRecord(raw)) throw new Error("The template has no design in it.")

    const preset = readOneOf<PresetId>(raw.preset, ["classic", "neo", "minimal"], "classic")
    const mode = readOneOf<TemplateMode>(raw.mode, ["builtin", "upload"], "builtin")

    let width = Math.round(readNumber(raw.width, 200, 6000, SIZE_PRESETS[0].width))
    let height = Math.round(readNumber(raw.height, 200, 6000, SIZE_PRESETS[0].height))
    // Built-in designs only come in the offered page sizes.
    if (mode === "builtin" && !SIZE_PRESETS.some((size) => size.width === width && size.height === height)) {
        width = SIZE_PRESETS[0].width
        height = SIZE_PRESETS[0].height
    }

    const palette = PRESET_PALETTES[preset]
    const defaults = createPresetElements(preset, width, height)
    const rawElements = isRecord(raw.elements) ? raw.elements : {}

    const elements = {} as Record<TextElementId, TextElement>
    for (const id of TEXT_ELEMENT_IDS) {
        const base: TextElement =
            id === "name"
                ? createNameElement()
                : {
                    ...defaults[id],
                    text: id === "date" ? defaultDateText() : DEFAULT_TEXT[id],
                }
        elements[id] = sanitizeElement(rawElements[id], base, id)
    }

    return {
        mode,
        preset,
        width,
        height,
        background: readColor(raw.background, palette.background),
        accent: readColor(raw.accent, palette.accent),
        ink: readColor(raw.ink, palette.ink),
        layoutSize: sanitizeLayoutSize(raw.layoutSize, mode === "builtin" ? { width, height } : SIZE_PRESETS[0]),
        elements,
        signature: sanitizeSignature(raw.signature, createSignatureElement(width, height)),
    }
}

function readBackground(raw: unknown): TemplateBackground | null {
    if (!isRecord(raw) || typeof raw.dataUrl !== "string" || !IMAGE_DATA_URL.test(raw.dataUrl)) return null
    return { name: readString(raw.name, "artwork").slice(0, 200), dataUrl: raw.dataUrl }
}

export function serializeTemplate(design: CertificateDesign, background: TemplateBackground | null): string {
    return JSON.stringify(
        {
            app: TEMPLATE_APP,
            version: TEMPLATE_VERSION,
            savedAt: new Date().toISOString(),
            design,
            background,
        },
        null,
        2
    )
}

/** Reads a template file. Throws an Error with a message that is safe to show to the user. */
export function parseTemplate(text: string): LoadedTemplate {
    if (text.length > MAX_TEMPLATE_CHARS) throw new Error("That file is too large to be a certificate template.")

    let raw: unknown
    try {
        raw = JSON.parse(text)
    } catch {
        throw new Error("That file is not valid JSON, so it cannot be a certificate template.")
    }

    if (!isRecord(raw) || raw.app !== TEMPLATE_APP) {
        throw new Error("That file is not a CertiFoolProof certificate template.")
    }
    if (typeof raw.version !== "number" || raw.version > TEMPLATE_VERSION) {
        throw new Error("That template was saved by a newer version of this tool and cannot be opened here.")
    }

    return { design: sanitizeDesign(raw.design), background: readBackground(raw.background) }
}

export function saveAutosave(
    design: CertificateDesign,
    background: TemplateBackground | null
): AutosaveOutcome {
    const needsArtwork = design.mode === "upload"
    const embed = background && background.dataUrl.length <= MAX_AUTOSAVE_ARTWORK_CHARS ? background : null

    try {
        window.localStorage.setItem(AUTOSAVE_KEY, serializeTemplate(design, embed))
        return needsArtwork && !embed ? "saved-without-artwork" : "saved"
    } catch {
        // Quota exceeded or storage blocked. Try once more without the heavy part.
    }

    try {
        window.localStorage.setItem(AUTOSAVE_KEY, serializeTemplate(design, null))
        return needsArtwork ? "saved-without-artwork" : "saved"
    } catch {
        return "failed"
    }
}

export function loadAutosave(): LoadedTemplate | null {
    try {
        const stored = window.localStorage.getItem(AUTOSAVE_KEY)
        return stored ? parseTemplate(stored) : null
    } catch {
        return null
    }
}

export function clearAutosave() {
    try {
        window.localStorage.removeItem(AUTOSAVE_KEY)
    } catch {
        // Nothing to clear if storage is unavailable.
    }
}