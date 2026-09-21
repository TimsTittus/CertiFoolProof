/**
 * Saving and loading certificate templates.
 * A template is the whole design as JSON, optionally with the uploaded artwork
 * embedded as a data URL so it travels with the file (signature pictures and logos
 * are always part of the design itself). Everything read back is validated and
 * clamped, so a hand-edited or corrupt file can never crash the page.
 *
 * Version 1 templates had a single signature block; they are converted into one
 * signatory when they are opened.
 */

import {
    COLUMN_WIDTH_LIMITS,
    FONT_OPTIONS,
    LINE_THICKNESS_LIMITS,
    LOGO_RADIUS_MAX,
    LOGO_WIDTH_LIMITS,
    MAX_COLUMNS,
    MIN_MAX_WIDTH,
    PRESET_PALETTES,
    SIGNATURE_SIZE_LIMITS,
    SIZE_PRESETS,
    TEXT_ELEMENT_IDS,
    createNameElement,
    createPresetElements,
    createSignatoryLayout,
    createSignatory,
    createSignatureArt,
    createSignatoryLine,
    DEFAULT_TEXT,
    defaultDateText,
    newId,
    sizeLimits,
    type Align,
    type CertificateDesign,
    type ElementId,
    type FontWeight,
    type LineStyle,
    type Logo,
    type PresetId,
    type Signatory,
    type SignatoryArrange,
    type SignatoryLayout,
    type SignatoryLine,
    type SignatureArt,
    type SignatureDrawing,
    type SignatureImage,
    type SignatureMode,
    type TemplateMode,
    type TextElement,
    type TextElementId,
} from "./renderer"

export const TEMPLATE_APP = "certifoolproof-certificate-template"
export const TEMPLATE_VERSION = 2

const AUTOSAVE_KEY = "certifoolproof.bulk.template.v1"
const MAX_AUTOSAVE_ARTWORK_CHARS = 2_500_000
const MAX_TEMPLATE_CHARS = 40_000_000

const MAX_TEXT_LENGTH = 2000
const MAX_SIGNATORIES = 500
const MAX_LOGOS = 100
const MAX_IMAGE_CHARS = 12_000_000
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
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
    const limits = sizeLimits()

    // Only elements that follow the theme may store "no colour"; the name always has its own.
    let color: string | null
    if (raw.color === undefined) color = base.color
    else if (raw.color === null) color = id === "name" ? base.color : null
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

function readImageSource(value: unknown): string | null {
    return typeof value === "string" && value.length <= MAX_IMAGE_CHARS && IMAGE_DATA_URL.test(value) ? value : null
}

function sanitizeSignatureImage(raw: unknown): SignatureImage | null {
    if (!isRecord(raw)) return null
    const src = readImageSource(raw.src)
    if (!src) return null
    return {
        src,
        removeBackground: readBoolean(raw.removeBackground, false),
        threshold: readNumber(raw.threshold, 0, 100, 35),
    }
}

/** `legacyOffset` replaces the stored offset when the signature comes from a version 1 template. */
function sanitizeArt(raw: unknown, base: SignatureArt, legacyOffset?: { dx: number; dy: number }): SignatureArt {
    if (!isRecord(raw)) return legacyOffset ? { ...base, ...legacyOffset } : base

    const strokes = sanitizeDrawing(raw.strokes)
    const image = sanitizeSignatureImage(raw.image)
    let mode = readOneOf<SignatureMode>(raw.mode, ["none", "draw", "type", "image"], "none")
    if (mode === "draw" && !strokes) mode = "none"
    if (mode === "image" && !image) mode = "none"

    return {
        mode,
        image,
        strokes,
        text: readString(raw.text, base.text),
        font: readFont(raw.font, base.font),
        color: readColor(raw.color, base.color),
        size: readNumber(raw.size, SIGNATURE_SIZE_LIMITS.min, SIGNATURE_SIZE_LIMITS.max, base.size),
        maxWidth: readNumber(raw.maxWidth, MIN_MAX_WIDTH, 100, base.maxWidth),
        opacity: readNumber(raw.opacity, 10, 100, base.opacity),
        dx: legacyOffset ? legacyOffset.dx : readNumber(raw.dx, -100, 100, base.dx),
        dy: legacyOffset ? legacyOffset.dy : readNumber(raw.dy, -100, 100, base.dy),
        visible: readBoolean(raw.visible, base.visible),
        visibleOnUpload: readBoolean(raw.visibleOnUpload, base.visibleOnUpload),
    }
}

function sanitizeLine(raw: unknown, base: SignatoryLine): SignatoryLine {
    if (!isRecord(raw)) return base
    return {
        visible: readBoolean(raw.visible, base.visible),
        visibleOnUpload: readBoolean(raw.visibleOnUpload, base.visibleOnUpload),
        style: readOneOf<LineStyle>(raw.style, ["solid", "dashed", "dotted"], base.style),
        color: typeof raw.color === "string" && HEX_COLOR.test(raw.color) ? raw.color : raw.color === null ? null : base.color,
        thickness: readNumber(raw.thickness, LINE_THICKNESS_LIMITS.min, LINE_THICKNESS_LIMITS.max, base.thickness),
    }
}

function readId(value: unknown, taken: Set<string>): string {
    const id = typeof value === "string" && ID_PATTERN.test(value) && !taken.has(value) ? value : newId(taken)
    taken.add(id)
    return id
}

function sanitizeSignatory(raw: unknown, taken: Set<string>): Signatory | null {
    if (!isRecord(raw)) return null
    const base = createSignatory(readId(raw.id, taken))
    return {
        id: base.id,
        name: readString(raw.name, base.name),
        title: readString(raw.title, base.title),
        line: sanitizeLine(raw.line, base.line),
        signature: sanitizeArt(raw.signature, base.signature),
        x: readNumber(raw.x, 0, 100, base.x),
        y: readNumber(raw.y, 0, 100, base.y),
    }
}

function sanitizeSignatoryLayout(raw: unknown, fallback: SignatoryLayout): SignatoryLayout {
    if (!isRecord(raw)) return fallback
    return {
        arrange: readOneOf<SignatoryArrange>(raw.arrange, ["auto", "free"], fallback.arrange),
        columns: Math.round(readNumber(raw.columns, 0, MAX_COLUMNS, fallback.columns)),
        columnWidth: readNumber(raw.columnWidth, COLUMN_WIDTH_LIMITS.min, COLUMN_WIDTH_LIMITS.max, fallback.columnWidth),
    }
}

function sanitizeLogos(raw: unknown, taken: Set<string>): Logo[] {
    if (!Array.isArray(raw)) return []
    const logos: Logo[] = []
    for (const item of raw.slice(0, MAX_LOGOS)) {
        if (!isRecord(item)) continue
        const src = readImageSource(item.src)
        if (!src) continue
        logos.push({
            id: readId(item.id, taken),
            src,
            x: readNumber(item.x, 0, 100, 14),
            y: readNumber(item.y, 0, 100, 14),
            width: readNumber(item.width, LOGO_WIDTH_LIMITS.min, LOGO_WIDTH_LIMITS.max, 12),
            opacity: readNumber(item.opacity, 10, 100, 100),
            radius: readNumber(item.radius, 0, LOGO_RADIUS_MAX, 0),
            visible: readBoolean(item.visible, true),
        })
    }
    return logos
}

/** The single signature block of a version 1 template, turned into one signatory that looks the same. */
function migrateLegacySignature(
    raw: Record<string, unknown>,
    elements: Record<TextElementId, TextElement>,
    defaults: Record<Exclude<TextElementId, "name">, TextElement>,
    width: number,
    height: number
): { signatories: Signatory[]; layout: SignatoryLayout } {
    const nameStyle = elements.signatureName
    const titleStyle = elements.signatureLabel
    const round2 = (value: number) => Math.round(value * 100) / 100

    const columnPx = (nameStyle.maxWidth / 100) * width
    const anchorPx = (nameStyle.x / 100) * width
    const centrePx =
        nameStyle.align === "left" ? anchorPx + columnPx / 2 : nameStyle.align === "right" ? anchorPx - columnPx / 2 : anchorPx
    const centre = (centrePx / width) * 100

    const oldSignature = isRecord(raw.signature) ? raw.signature : {}
    const unit = height / 1000
    const oldX = readNumber(oldSignature.x, 0, 100, ((width - 300 * unit) / width) * 100)
    const oldY = readNumber(oldSignature.y, 0, 100, 79.6)
    const offset = { dx: round2(oldX - centre), dy: round2(oldY - nameStyle.y) }

    const untouched =
        Math.abs(nameStyle.x - defaults.signatureName.x) < 0.05 &&
        Math.abs(nameStyle.y - defaults.signatureName.y) < 0.05 &&
        Math.abs(nameStyle.maxWidth - defaults.signatureName.maxWidth) < 0.05 &&
        nameStyle.align === defaults.signatureName.align

    const base = createSignatory("s1")
    const signatory: Signatory = {
        ...base,
        name: nameStyle.text,
        title: titleStyle.text,
        line: { ...createSignatoryLine(), visible: nameStyle.visible, visibleOnUpload: false },
        signature: sanitizeArt(oldSignature, createSignatureArt(), offset),
        x: round2(centre),
        y: round2(nameStyle.y),
    }

    return {
        signatories: [signatory],
        layout: {
            ...createSignatoryLayout(width, height),
            arrange: untouched ? "auto" : "free",
            columnWidth: readNumber(nameStyle.maxWidth, COLUMN_WIDTH_LIMITS.min, COLUMN_WIDTH_LIMITS.max, 20),
        },
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

    let signatories: Signatory[]
    let signatoryLayout: SignatoryLayout
    const takenIds = new Set<string>()

    if (Array.isArray(raw.signatories)) {
        signatories = raw.signatories
            .slice(0, MAX_SIGNATORIES)
            .map((item) => sanitizeSignatory(item, takenIds))
            .filter((item): item is Signatory => item !== null)
        signatoryLayout = sanitizeSignatoryLayout(raw.signatoryLayout, createSignatoryLayout(width, height))
    } else {
        const migrated = migrateLegacySignature(raw, elements, defaults, width, height)
        signatories = migrated.signatories
        signatoryLayout = migrated.layout
        takenIds.add(signatories[0].id)
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
        signatories,
        signatoryLayout,
        logos: sanitizeLogos(raw.logos, takenIds),
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

function hasImages(design: CertificateDesign): boolean {
    return design.logos.length > 0 || design.signatories.some((signatory) => signatory.signature.image !== null)
}

function withoutImages(design: CertificateDesign): CertificateDesign {
    return {
        ...design,
        logos: [],
        signatories: design.signatories.map((signatory) =>
            signatory.signature.image
                ? {
                    ...signatory,
                    signature: {
                        ...signatory.signature,
                        image: null,
                        mode: signatory.signature.mode === "image" ? "none" : signatory.signature.mode,
                    },
                }
                : signatory
        ),
    }
}

/**
 * Keeps the design in the browser. If the browser runs out of room it drops the heaviest
 * parts first (the artwork, then signature pictures and logos) and says so, so the person
 * knows to save the template file instead.
 */
export function saveAutosave(
    design: CertificateDesign,
    background: TemplateBackground | null
): AutosaveOutcome {
    const needsArtwork = design.mode === "upload"
    const embed = background && background.dataUrl.length <= MAX_AUTOSAVE_ARTWORK_CHARS ? background : null

    const attempts: { design: CertificateDesign; background: TemplateBackground | null; complete: boolean }[] = [
        { design, background: embed, complete: !needsArtwork || embed !== null },
    ]
    if (embed) attempts.push({ design, background: null, complete: !needsArtwork })
    if (hasImages(design)) attempts.push({ design: withoutImages(design), background: null, complete: false })

    for (const attempt of attempts) {
        try {
            window.localStorage.setItem(AUTOSAVE_KEY, serializeTemplate(attempt.design, attempt.background))
            return attempt.complete ? "saved" : "saved-without-artwork"
        } catch {
        }
    }
    return "failed"
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