/**
 * Canvas rendering for the bulk certificate generator.
 * Every text block is its own element with its own position, size and style.
 * Positions are percentages of the canvas and sizes are percentages of its
 * height, so the preview and the full-resolution export render identically.
 */

export type TemplateMode = "builtin" | "upload"
export type PresetId = "classic" | "neo" | "minimal"
export type Align = "left" | "center" | "right"
export type FontWeight = 300 | 400 | 700
export type SignatureMode = "none" | "draw" | "type"

export type TextElementId =
    | "name"
    | "organization"
    | "heading"
    | "subheading"
    | "body"
    | "dateLabel"
    | "date"
    | "signatureLabel"
    | "signatureName"

export type ElementId = TextElementId | "signature"

/** Order used for the element picker. */
export const ELEMENT_IDS: ElementId[] = [
    "name",
    "organization",
    "heading",
    "subheading",
    "body",
    "date",
    "dateLabel",
    "signature",
    "signatureName",
    "signatureLabel",
]

export const TEXT_ELEMENT_IDS: TextElementId[] = ELEMENT_IDS.filter(
    (id): id is TextElementId => id !== "signature"
)

export const ELEMENT_LABELS: Record<ElementId, string> = {
    name: "Participant name",
    organization: "Organization",
    heading: "Heading",
    subheading: "Line above name",
    body: "Body",
    date: "Date",
    dateLabel: "Date label",
    signature: "Signature",
    signatureName: "Signature name",
    signatureLabel: "Signature label",
}

/** Draw order for everything except the participant name and the signature, which sit on top. */
const DRAW_ORDER: TextElementId[] = [
    "organization",
    "heading",
    "subheading",
    "body",
    "dateLabel",
    "date",
    "signatureLabel",
    "signatureName",
]

export interface TextElement {
    text: string
    /** Anchor, as a percentage of the canvas width. */
    x: number
    /** Text baseline, as a percentage of the canvas height. */
    y: number
    /** Font size, as a percentage of the canvas height. */
    size: number
    font: string
    weight: FontWeight
    italic: boolean
    /** null follows the design's accent / text colour. */
    color: string | null
    align: Align
    uppercase: boolean
    underline: boolean
    /** In canvas pixels at the design's base resolution. */
    letterSpacing: number
    /** Distance between wrapped lines, as a multiple of the font size. Only the body wraps. */
    lineHeight: number
    /** Text shrinks (or wraps, for the body) to fit this width. Percentage of canvas width. */
    maxWidth: number
    /** 10 - 100. */
    opacity: number
    /** Shown on the built-in designs. */
    visible: boolean
    /** Shown on top of uploaded artwork, which usually carries its own text. */
    visibleOnUpload: boolean
}

/** A pen drawing, normalised so it can be drawn at any size. */
export interface SignatureDrawing {
    /** Width divided by height of the drawing's bounding box. */
    aspect: number
    /** Points in the 0 - 1 range of the bounding box. */
    strokes: [number, number][][]
}

export interface SignatureElement extends Omit<TextElement, "color"> {
    color: string
    mode: SignatureMode
    strokes: SignatureDrawing | null
}

export interface CertificateDesign {
    mode: TemplateMode
    preset: PresetId
    width: number
    height: number

    background: string
    accent: string
    ink: string

    /**
     * The built-in page size the text layout was built for. The presets place text
     * relative to the page, so the layout is rebuilt when the page size changes.
     */
    layoutSize: { width: number; height: number }

    elements: Record<TextElementId, TextElement>
    signature: SignatureElement
}

/** Any change that can be applied to a text element or the signature. */
export type ElementPatch = Partial<Omit<TextElement, "color">> & { color?: string | null }

/** Changes only a signature has: how it is made and the pen drawing itself. */
export type SignatureChange = Partial<Pick<SignatureElement, "mode" | "strokes">>

export interface ElementBox {
    /** Canvas pixels. */
    x: number
    y: number
    w: number
    h: number
}

export type RenderedLayout = Partial<Record<ElementId, ElementBox>>

export interface SizePreset {
    id: string
    label: string
    width: number
    height: number
}

/** Common page sizes at roughly 150 DPI. */
export const SIZE_PRESETS: SizePreset[] = [
    { id: "a4-landscape", label: "A4 Landscape", width: 1754, height: 1240 },
    { id: "a4-portrait", label: "A4 Portrait", width: 1240, height: 1754 },
    { id: "letter-landscape", label: "US Letter Landscape", width: 1650, height: 1275 },
    { id: "widescreen", label: "Widescreen 16:9", width: 1920, height: 1080 },
    { id: "square", label: "Square", width: 1400, height: 1400 },
]

/**
 * Script fonts for typed signatures. The first three ship with the app (see
 * app/generate/bulk/fonts.css) so they look the same on every device; the last
 * one relies on a font the device may or may not have.
 */
export const SCRIPT_FONTS: { label: string; value: string }[] = [
    { label: "Dancing Script", value: "'Dancing Script', 'Brush Script MT', cursive" },
    { label: "Great Vibes", value: "'Great Vibes', 'Snell Roundhand', 'Apple Chancery', cursive" },
    { label: "Caveat", value: "'Caveat', 'Segoe Script', 'Lucida Handwriting', cursive" },
    { label: "Brush Script (Cursive)", value: "'Brush Script MT', 'Segoe Script', cursive" },
]

export const FONT_OPTIONS: { label: string; value: string }[] = [
    { label: "Georgia (Serif)", value: "Georgia, 'Times New Roman', serif" },
    { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
    { label: "Helvetica / Arial", value: "Helvetica, Arial, sans-serif" },
    { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
    { label: "Trebuchet", value: "'Trebuchet MS', Tahoma, sans-serif" },
    { label: "Courier (Mono)", value: "'Courier New', Courier, monospace" },
    { label: "Palatino", value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
    ...SCRIPT_FONTS,
]

export const FONT_WEIGHTS: { label: string; value: FontWeight }[] = [
    { label: "Light", value: 300 },
    { label: "Regular", value: 400 },
    { label: "Bold", value: 700 },
]

/** Allowed font size (percentage of height) per element. */
export function sizeLimits(id: ElementId): { min: number; max: number } {
    return id === "signature" ? { min: 2, max: 25 } : { min: 1, max: 20 }
}

export const MIN_MAX_WIDTH = 5

const PRESET_FONTS: Record<PresetId, string> = {
    classic: "Georgia, 'Times New Roman', serif",
    neo: "'Courier New', Courier, monospace",
    minimal: "Helvetica, Arial, sans-serif",
}

export const PRESET_PALETTES: Record<PresetId, { background: string; accent: string; ink: string }> = {
    classic: { background: "#FBF7EF", accent: "#B08A3E", ink: "#1A1A1A" },
    neo: { background: "#EFE6DD", accent: "#F7D65E", ink: "#000000" },
    minimal: { background: "#FFFFFF", accent: "#2563EB", ink: "#111827" },
}

const MAX_BODY_LINES = 6
const DEFAULT_LINE_HEIGHT = 1.55

export function defaultDateText(): string {
    return new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}

export const DEFAULT_TEXT: Record<Exclude<TextElementId, "name" | "date">, string> = {
    organization: "Your Organization",
    heading: "Certificate of Participation",
    subheading: "This is proudly presented to",
    body: "for actively participating in the event and successfully completing all the required sessions.",
    dateLabel: "Date",
    signatureLabel: "Signature",
    signatureName: "Event Coordinator",
}

function textElement(overrides: Partial<TextElement> & { font: string }): TextElement {
    return {
        text: "",
        x: 50,
        y: 50,
        size: 3,
        weight: 400,
        italic: false,
        color: null,
        align: "center",
        uppercase: false,
        underline: false,
        letterSpacing: 0,
        lineHeight: DEFAULT_LINE_HEIGHT,
        maxWidth: 90,
        opacity: 100,
        visible: true,
        visibleOnUpload: false,
        ...overrides,
    }
}

/** The participant name is not tied to a preset, so it is created separately. */
export function createNameElement(): TextElement {
    return textElement({
        font: "Georgia, 'Times New Roman', serif",
        color: "#1A1A1A",
        size: 8,
        x: 50,
        y: 47,
        weight: 700,
        align: "center",
        underline: true,
        maxWidth: 78,
        visible: true,
        visibleOnUpload: true,
    })
}

export function createSignatureElement(width: number, height: number): SignatureElement {
    const u = height / 1000
    return {
        ...textElement({
            font: SCRIPT_FONTS[0].value,
            color: "#1E293B",
            size: 5.5,
            // Centre of the bottom-right column, sitting just above the signature name.
            x: ((width - 300 * u) / width) * 100,
            y: 79.6,
            maxWidth: 30,
            visibleOnUpload: true,
        }),
        color: "#1E293B",
        mode: "none",
        strokes: null,
    }
}

/**
 * Builds the default position, size and style of every element except the
 * participant name for one preset, matching the look of the built-in designs.
 */
export function createPresetElements(
    preset: PresetId,
    width: number,
    height: number
): Record<Exclude<TextElementId, "name">, TextElement> {
    const u = height / 1000
    const font = PRESET_FONTS[preset]
    // Kept exact (not rounded) so the default layout matches the original designs pixel for pixel.
    const xPct = (units: number) => ((units * u) / width) * 100
    const widthPct = (units: number) => Math.min(100, xPct(units))
    const yPct = (units: number) => units / 10
    const sizePct = (units: number) => units / 10

    const footerBaseline = 1000 - 150
    const footerColumn = 300
    const footer = {
        font,
        maxWidth: widthPct(footerColumn),
        y: yPct(footerBaseline - 18),
    }
    const footerLabel = {
        font,
        maxWidth: widthPct(footerColumn),
        y: yPct(footerBaseline + 34),
        size: sizePct(21),
        opacity: 70,
        uppercase: true,
    }
    const leftX = xPct(150)
    const rightX = ((width - 150 * u) / width) * 100

    const footers = {
        date: textElement({ ...footer, x: leftX, size: sizePct(25), weight: 700, align: "left" }),
        dateLabel: textElement({ ...footerLabel, x: leftX, align: "left" }),
        signatureName: textElement({ ...footer, x: rightX, size: sizePct(25), weight: 700, align: "right" }),
        signatureLabel: textElement({ ...footerLabel, x: rightX, align: "right" }),
    }

    let elements: Record<Exclude<TextElementId, "name">, TextElement>

    if (preset === "neo") {
        elements = {
            organization: textElement({
                font,
                x: xPct(108),
                y: yPct(135.36),
                size: sizePct(24),
                weight: 700,
                uppercase: true,
                align: "left",
            }),
            heading: textElement({
                font,
                y: yPct(265),
                size: sizePct(60),
                weight: 700,
                italic: true,
                uppercase: true,
                maxWidth: widthPct(width / u - 200),
            }),
            subheading: textElement({
                font,
                y: yPct(347),
                size: sizePct(26),
                weight: 700,
                uppercase: true,
                maxWidth: widthPct(width / u - 224),
            }),
            body: textElement({
                font,
                y: yPct(625),
                size: sizePct(25),
                weight: 700,
                lineHeight: 40 / 25,
                maxWidth: widthPct(width / u - 320),
            }),
            ...footers,
        }
    } else if (preset === "minimal") {
        elements = {
            organization: textElement({
                font,
                y: yPct(150),
                size: sizePct(24),
                weight: 700,
                uppercase: true,
                color: null,
            }),
            heading: textElement({
                font,
                y: yPct(250),
                size: sizePct(58),
                weight: 300,
                maxWidth: widthPct(width / u - 240),
            }),
            subheading: textElement({ font, y: yPct(335), size: sizePct(28), opacity: 65 }),
            body: textElement({
                font,
                y: yPct(620),
                size: sizePct(26),
                opacity: 80,
                lineHeight: 40 / 26,
                maxWidth: widthPct(width / u - 320),
            }),
            ...footers,
        }
    } else {
        elements = {
            organization: textElement({
                font,
                y: yPct(130),
                size: sizePct(26),
                weight: 700,
                uppercase: true,
            }),
            heading: textElement({
                font,
                y: yPct(230),
                size: sizePct(62),
                weight: 700,
                maxWidth: widthPct(width / u - 220),
            }),
            subheading: textElement({ font, y: yPct(340), size: sizePct(30), italic: true }),
            body: textElement({
                font,
                y: yPct(620),
                size: sizePct(27),
                lineHeight: 42 / 27,
                maxWidth: widthPct(width / u - 300),
            }),
            ...footers,
        }
    }

    return elements
}

/** Which theme colour an element follows while its own colour is unset. */
export function themeColorRole(preset: PresetId, id: ElementId): "accent" | "ink" {
    if (id === "organization" && preset !== "neo") return "accent"
    return "ink"
}

/** The colour an element is actually drawn with. */
export function resolveElementColor(design: CertificateDesign, id: ElementId): string {
    const element = getElement(design, id)
    if (element.color) return element.color
    return themeColorRole(design.preset, id) === "accent" ? design.accent : design.ink
}

export function createDefaultDesign(): CertificateDesign {
    const size = SIZE_PRESETS[0]
    const preset: PresetId = "classic"
    const elements = createPresetElements(preset, size.width, size.height)

    return {
        mode: "builtin",
        preset,
        width: size.width,
        height: size.height,
        ...PRESET_PALETTES[preset],
        layoutSize: { width: size.width, height: size.height },
        elements: {
            name: createNameElement(),
            organization: { ...elements.organization, text: DEFAULT_TEXT.organization },
            heading: { ...elements.heading, text: DEFAULT_TEXT.heading },
            subheading: { ...elements.subheading, text: DEFAULT_TEXT.subheading },
            body: { ...elements.body, text: DEFAULT_TEXT.body },
            dateLabel: { ...elements.dateLabel, text: DEFAULT_TEXT.dateLabel },
            date: { ...elements.date, text: defaultDateText() },
            signatureLabel: { ...elements.signatureLabel, text: DEFAULT_TEXT.signatureLabel },
            signatureName: { ...elements.signatureName, text: DEFAULT_TEXT.signatureName },
        },
        signature: createSignatureElement(size.width, size.height),
    }
}

/**
 * Rebuilds where every text sits for a preset and page size. Wording, visibility and
 * the participant name's settings are kept; so is the signature's content and style.
 */
function relayout(design: CertificateDesign, preset: PresetId, width: number, height: number): CertificateDesign {
    const fresh = createPresetElements(preset, width, height)
    const elements = { ...design.elements }

    for (const id of TEXT_ELEMENT_IDS) {
        if (id === "name") continue
        const current = design.elements[id]
        elements[id] = {
            ...fresh[id],
            text: current.text,
            visible: current.visible,
            visibleOnUpload: current.visibleOnUpload,
        }
    }

    const signature = createSignatureElement(width, height)
    return {
        ...design,
        preset,
        layoutSize: { width, height },
        elements,
        signature: { ...design.signature, x: signature.x, y: signature.y, maxWidth: signature.maxWidth },
    }
}

/** Switches the built-in style: new palette and layout, while keeping every text and the name's settings. */
export function applyPreset(design: CertificateDesign, preset: PresetId): CertificateDesign {
    const palette = PRESET_PALETTES[preset]
    const next = relayout(design, preset, design.width, design.height)
    return {
        ...next,
        ...palette,
        elements: { ...next.elements, name: { ...design.elements.name, color: palette.ink } },
    }
}

/**
 * Sets the page size. The built-in layout is rebuilt for the new size unless it was
 * already built for it, so customised text keeps its place when nothing really changed.
 */
export function applyPageSize(design: CertificateDesign, width: number, height: number): CertificateDesign {
    const resized = { ...design, width, height }
    if (design.layoutSize.width === width && design.layoutSize.height === height) return resized
    return relayout(resized, design.preset, width, height)
}

export function getElement(design: CertificateDesign, id: ElementId): TextElement | SignatureElement {
    return id === "signature" ? design.signature : design.elements[id]
}

export function patchElement(
    design: CertificateDesign,
    id: ElementId,
    patch: ElementPatch
): CertificateDesign {
    if (id === "signature") {
        const { color, ...rest } = patch
        return {
            ...design,
            signature: { ...design.signature, ...rest, ...(color ? { color } : {}) },
        }
    }
    return {
        ...design,
        elements: { ...design.elements, [id]: { ...design.elements[id], ...patch } },
    }
}

/** The participant name is always drawn; every other element follows its visibility flag. */
export function isElementVisible(
    design: CertificateDesign,
    id: ElementId,
    onArtwork: boolean = design.mode === "upload"
): boolean {
    if (id === "name") return true
    const element = getElement(design, id)
    return onArtwork ? element.visibleOnUpload : element.visible
}

/** Turns raw pen strokes (any coordinate space) into a size-independent drawing. */
export function normalizeStrokes(strokes: [number, number][][]): SignatureDrawing | null {
    const usable = strokes.filter((stroke) => stroke.length > 0)
    if (usable.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const stroke of usable) {
        for (const [x, y] of stroke) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
        }
    }

    // A single dot has no extent; give it one so the maths below stays finite.
    const width = Math.max(maxX - minX, 1)
    const height = Math.max(maxY - minY, 1)
    const round = (value: number) => Math.round(value * 10000) / 10000

    return {
        aspect: round(width / height),
        strokes: usable.map((stroke) => {
            const points = stroke.map(
                ([x, y]) => [round((x - minX) / width), round((y - minY) / height)] as [number, number]
            )
            // Keep single taps visible: a zero-length round-capped segment still paints a dot.
            if (points.length === 1) points.push([points[0][0], points[0][1]])
            return points
        }),
    }
}

function fontString(element: TextElement | SignatureElement, size: number): string {
    return `${element.italic ? "italic " : ""}${element.weight} ${Math.max(1, size)}px ${element.font}`
}

/** Shrinks the font until the text fits, so long text never overflows. */
function fitFontSize(
    ctx: CanvasRenderingContext2D,
    element: TextElement | SignatureElement,
    text: string,
    desiredSize: number,
    maxWidth: number
): number {
    let size = desiredSize
    for (let i = 0; i < 6; i++) {
        ctx.font = fontString(element, size)
        const width = ctx.measureText(text).width
        if (width <= maxWidth || width === 0) break
        size = Math.max(desiredSize * 0.25, size * (maxWidth / width) * 0.98)
    }
    ctx.font = fontString(element, size)
    return size
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length === 0) return []
    const lines: string[] = []
    let current = words[0]

    for (let i = 1; i < words.length; i++) {
        const candidate = `${current} ${words[i]}`
        if (ctx.measureText(candidate).width <= maxWidth) {
            current = candidate
        } else {
            lines.push(current)
            current = words[i]
        }
    }
    lines.push(current)
    return lines
}

interface TextGeometry {
    lines: string[]
    /** The size actually drawn, after shrinking to fit. */
    fontPx: number
    /** The size that was asked for. Decorations keep their proportions to this, not to the shrunk size. */
    desiredPx: number
    /** Widest a line may be, in canvas pixels. */
    maxWidthPx: number
    lineHeight: number
    anchorX: number
    baselineY: number
    textWidth: number
    /** Null when there is nothing to draw. */
    box: ElementBox | null
}

/** Measures one element: fits or wraps its text and works out where it lands on the canvas. */
function layoutText(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    element: TextElement | SignatureElement,
    rawText: string,
    wrap: boolean
): TextGeometry {
    const { width: W, height: H } = design
    const text = element.uppercase ? rawText.toUpperCase() : rawText
    const anchorX = (element.x / 100) * W
    const baselineY = (element.y / 100) * H
    const maxWidth = (element.maxWidth / 100) * W
    const desired = Math.max(1, (element.size / 100) * H)

    if (!text.trim()) {
        ctx.font = fontString(element, desired)
        return {
            lines: [],
            fontPx: desired,
            desiredPx: desired,
            maxWidthPx: maxWidth,
            lineHeight: desired * element.lineHeight,
            anchorX,
            baselineY,
            textWidth: 0,
            box: null,
        }
    }

    let lines: string[]
    let fontPx: number
    if (wrap) {
        fontPx = desired
        ctx.font = fontString(element, fontPx)
        lines = wrapLines(ctx, text, maxWidth).slice(0, MAX_BODY_LINES)
    } else {
        fontPx = fitFontSize(ctx, element, text, desired, maxWidth)
        lines = [text]
    }

    const lineHeight = fontPx * element.lineHeight
    const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width))
    // A wrapping block is boxed at its full column so its width can be dragged.
    const boxWidth = wrap ? maxWidth : textWidth
    const left =
        element.align === "left" ? anchorX : element.align === "center" ? anchorX - boxWidth / 2 : anchorX - boxWidth

    return {
        lines,
        fontPx,
        desiredPx: desired,
        maxWidthPx: maxWidth,
        lineHeight,
        anchorX,
        baselineY,
        textWidth,
        box: {
            x: left,
            y: baselineY - fontPx * 0.85,
            w: boxWidth,
            h: fontPx * 0.85 + fontPx * 0.28 + (lines.length - 1) * lineHeight,
        },
    }
}

/** Left edge of a run of `width` pixels anchored at `anchorX`. */
function alignedLeft(anchorX: number, width: number, align: Align): number {
    if (align === "center") return anchorX - width / 2
    if (align === "right") return anchorX - width
    return anchorX
}

/** Preset furniture that belongs to a particular element and moves with it. */
function drawDecoration(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    id: TextElementId,
    element: TextElement,
    geometry: TextGeometry
) {
    const u = design.height / 1000
    const { preset, accent, ink } = design
    const hasText = geometry.box !== null

    // Signature lines under the date and the signature name.
    if (id === "date" || id === "signatureName") {
        const lineWidth = (element.maxWidth / 100) * design.width
        const left = alignedLeft(geometry.anchorX, lineWidth, element.align)
        const y = geometry.baselineY + geometry.desiredPx * (18 / 25)
        ctx.strokeStyle = preset === "neo" ? ink : accent
        ctx.lineWidth = 3 * u
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(left + lineWidth, y)
        ctx.stroke()
        return
    }

    if (!hasText || !geometry.box) return
    const box = geometry.box

    if (preset === "classic" && id === "heading") {
        const ruleWidth = Math.min(geometry.textWidth, (element.maxWidth / 100) * design.width) * 0.45
        const centre = box.x + box.w / 2
        const y = geometry.baselineY + geometry.desiredPx * (30 / 62)
        ctx.strokeStyle = accent
        ctx.lineWidth = 3 * u
        ctx.beginPath()
        ctx.moveTo(centre - ruleWidth, y)
        ctx.lineTo(centre + ruleWidth, y)
        ctx.stroke()
    }

    if (preset === "neo" && id === "organization") {
        // Proportions of the original 24px-per-1000 tag: 18px padding, 52px tall.
        const padding = geometry.desiredPx * (18 / 24)
        const tagH = geometry.desiredPx * (52 / 24)
        const tagX = box.x - padding
        const tagY = geometry.baselineY - geometry.desiredPx * (35.36 / 24)
        ctx.fillStyle = accent
        ctx.fillRect(tagX, tagY, geometry.textWidth + padding * 2, tagH)
        ctx.strokeStyle = ink
        ctx.lineWidth = 4 * u
        ctx.strokeRect(tagX, tagY, geometry.textWidth + padding * 2, tagH)
    }

    if (preset === "neo" && id === "subheading") {
        // Proportions of the original 26px-per-1000 strip: 44px wider than the text, 46px tall.
        const stripW = Math.min(geometry.textWidth + geometry.desiredPx * (44 / 26), design.width - 180 * u)
        const stripH = geometry.desiredPx * (46 / 26)
        const stripX = box.x + box.w / 2 - stripW / 2
        const stripY = geometry.baselineY - geometry.desiredPx * (32 / 26)
        ctx.fillStyle = accent
        ctx.fillRect(stripX, stripY, stripW, stripH)
        ctx.strokeStyle = ink
        ctx.lineWidth = 4 * u
        ctx.strokeRect(stripX, stripY, stripW, stripH)
    }
}

/** Draws text (fitted or wrapped) and any preset decoration. Returns the area it covers. */
function drawTextElement(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    id: TextElementId | "signature",
    element: TextElement | SignatureElement,
    rawText: string,
    decorate: boolean
): ElementBox | null {
    ctx.save()
    // letterSpacing is not implemented by every browser; harmless where missing.
    const spacingCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
    spacingCtx.letterSpacing = `${element.letterSpacing}px`

    const geometry = layoutText(ctx, design, element, rawText, id === "body")

    if (decorate && id !== "signature") drawDecoration(ctx, design, id, element, geometry)

    if (geometry.lines.length > 0) {
        const color = resolveElementColor(design, id)
        ctx.fillStyle = color
        ctx.strokeStyle = color
        ctx.textAlign = element.align
        ctx.textBaseline = "alphabetic"
        ctx.globalAlpha = element.opacity / 100

        geometry.lines.forEach((line, index) => {
            ctx.fillText(line, geometry.anchorX, geometry.baselineY + index * geometry.lineHeight)
        })

        if (element.underline) {
            ctx.lineWidth = Math.max(1, geometry.fontPx * 0.035)
            const padding = geometry.fontPx * 0.25
            geometry.lines.forEach((line, index) => {
                // Text that cannot shrink any further is underlined only up to the width limit.
                const lineWidth = Math.min(ctx.measureText(line).width, geometry.maxWidthPx)
                const startX = alignedLeft(geometry.anchorX, lineWidth, element.align)
                const lineY = geometry.baselineY + index * geometry.lineHeight + geometry.fontPx * 0.3
                ctx.beginPath()
                ctx.moveTo(startX - padding, lineY)
                ctx.lineTo(startX + lineWidth + padding, lineY)
                ctx.stroke()
            })
        }
    }

    ctx.restore()
    return geometry.box
}

function drawSignature(ctx: CanvasRenderingContext2D, design: CertificateDesign): ElementBox | null {
    const signature = design.signature
    const { width: W, height: H } = design

    if (signature.mode === "type") {
        return drawTextElement(ctx, design, "signature", signature, signature.text, false)
    }
    if (signature.mode !== "draw" || !signature.strokes || signature.strokes.strokes.length === 0) {
        return null
    }

    const drawing = signature.strokes
    let height = (signature.size / 100) * H
    let width = height * drawing.aspect
    const maxWidth = (signature.maxWidth / 100) * W
    if (width > maxWidth) {
        const factor = maxWidth / width
        width *= factor
        height *= factor
    }

    const left = alignedLeft((signature.x / 100) * W, width, signature.align)
    const top = (signature.y / 100) * H - height

    ctx.save()
    ctx.strokeStyle = signature.color
    ctx.lineWidth = Math.max((2 * H) / 1000, height * 0.035)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.globalAlpha = signature.opacity / 100

    for (const stroke of drawing.strokes) {
        const points = stroke.map(([x, y]) => [left + x * width, top + y * height])
        ctx.beginPath()
        ctx.moveTo(points[0][0], points[0][1])
        for (let i = 1; i < points.length - 1; i++) {
            const midX = (points[i][0] + points[i + 1][0]) / 2
            const midY = (points[i][1] + points[i + 1][1]) / 2
            ctx.quadraticCurveTo(points[i][0], points[i][1], midX, midY)
        }
        const last = points[points.length - 1]
        ctx.lineTo(last[0], last[1])
        ctx.stroke()
    }
    ctx.restore()

    return { x: left, y: top, w: width, h: height }
}

function drawClassicFrame(ctx: CanvasRenderingContext2D, design: CertificateDesign) {
    const { width: W, height: H, accent } = design
    const u = H / 1000

    ctx.strokeStyle = accent
    ctx.lineWidth = 6 * u
    ctx.strokeRect(30 * u, 30 * u, W - 60 * u, H - 60 * u)
    ctx.lineWidth = 2 * u
    ctx.strokeRect(48 * u, 48 * u, W - 96 * u, H - 96 * u)

    ctx.fillStyle = accent
    const c = 26 * u
    for (const [cx, cy] of [
        [30 * u, 30 * u],
        [W - 30 * u - c, 30 * u],
        [30 * u, H - 30 * u - c],
        [W - 30 * u - c, H - 30 * u - c],
    ]) {
        ctx.fillRect(cx, cy, c, c)
    }
}

function drawNeoFrame(ctx: CanvasRenderingContext2D, design: CertificateDesign) {
    const { width: W, height: H, ink } = design
    const u = H / 1000

    // Offset shadow block plus hard border
    ctx.fillStyle = ink
    ctx.fillRect(56 * u, 56 * u, W - 82 * u, H - 82 * u)
    ctx.fillStyle = design.background
    ctx.fillRect(40 * u, 40 * u, W - 82 * u, H - 82 * u)
    ctx.strokeStyle = ink
    ctx.lineWidth = 8 * u
    ctx.strokeRect(40 * u, 40 * u, W - 82 * u, H - 82 * u)
}

function drawMinimalFrame(ctx: CanvasRenderingContext2D, design: CertificateDesign) {
    const { height: H, accent } = design
    const u = H / 1000

    ctx.fillStyle = accent
    ctx.fillRect(0, 0, 22 * u, H)
}

/**
 * Draws one certificate for `name` into `ctx` and returns the area each element covers.
 * The context is expected to already be sized to `design.width/height`.
 */
export function renderCertificate(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    name: string,
    background?: CanvasImageSource | null
): RenderedLayout {
    const { width, height } = design
    const onArtwork = design.mode === "upload" && !!background
    const layout: RenderedLayout = {}

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)

    if (onArtwork && background) {
        // The canvas matches the artwork's aspect ratio, so this never distorts.
        ctx.drawImage(background, 0, 0, width, height)
    } else {
        ctx.fillStyle = design.background
        ctx.fillRect(0, 0, width, height)

        if (design.preset === "neo") drawNeoFrame(ctx, design)
        else if (design.preset === "minimal") drawMinimalFrame(ctx, design)
        else drawClassicFrame(ctx, design)
    }

    for (const id of DRAW_ORDER) {
        if (!isElementVisible(design, id, onArtwork)) continue
        const element = design.elements[id]
        const box = drawTextElement(ctx, design, id, element, element.text, !onArtwork)
        if (box) layout[id] = box
    }

    if (isElementVisible(design, "signature", onArtwork)) {
        const box = drawSignature(ctx, design)
        if (box) layout.signature = box
    }

    const nameBox = drawTextElement(ctx, design, "name", design.elements.name, name, false)
    if (nameBox) layout.name = nameBox

    ctx.restore()
    return layout
}

/** Sizes the canvas and renders a single certificate into it. */
export function renderToCanvas(
    canvas: HTMLCanvasElement,
    design: CertificateDesign,
    name: string,
    background?: CanvasImageSource | null
): RenderedLayout | null {
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    if (canvas.width !== design.width) canvas.width = design.width
    if (canvas.height !== design.height) canvas.height = design.height
    return renderCertificate(ctx, design, name, background)
}

/** The distinct CSS font specs a design draws with, e.g. "italic 700 32px Georgia, serif". */
export function designFontSpecs(design: CertificateDesign): string[] {
    const specs = new Set<string>()
    for (const id of ELEMENT_IDS) {
        const element = getElement(design, id)
        specs.add(`${element.italic ? "italic " : ""}${element.weight} 32px ${element.font}`)
    }
    return [...specs].sort()
}

/**
 * Makes sure every font a design uses is ready before it is drawn to a canvas.
 * Canvas text never triggers a font download by itself, so bundled fonts would
 * otherwise be missing the first time they are used. Resolves true if any web
 * font was involved, meaning a redraw is worthwhile once it has loaded.
 */
export async function loadDesignFonts(design: CertificateDesign): Promise<boolean> {
    if (typeof document === "undefined" || !document.fonts) return false

    try {
        const loaded = await Promise.all(
            designFontSpecs(design).map((spec) => document.fonts.load(spec, "Aa"))
        )
        return loaded.some((faces) => faces.length > 0)
    } catch {
        // A font that fails to load simply falls back to the next one in its stack.
        return false
    }
}