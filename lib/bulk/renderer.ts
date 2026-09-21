/**
 * Canvas rendering for the bulk certificate generator.
 * Every text block is its own element with its own position, size and style.
 * Positions are percentages of the canvas and sizes are percentages of its
 * height, so the preview and the full-resolution export render identically.
 * Signatories (name, title, line and signature) and logos are lists of their own.
 */

import { ensureImages, getLoadedImage, getWhiteRemoved } from "./images"
import { fillTokens, type NameNudge, type Recipient } from "./tokens"

export type TemplateMode = "builtin" | "upload"
export type PresetId = "classic" | "neo" | "minimal"
export type Align = "left" | "center" | "right"
export type FontWeight = 300 | 400 | 700
export type SignatureMode = "none" | "draw" | "type" | "image"
export type LineStyle = "solid" | "dashed" | "dotted"
export type SignatoryArrange = "auto" | "free"
/**
 * What happens to text that is wider than its element allows.
 * "shrink" keeps one line and makes the type smaller (what the participant name has always done),
 * "wrap" breaks it into lines at the element's width, and "wrapshrink" does both.
 */
export type TextFit = "shrink" | "wrap" | "wrapshrink"

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

/**
 * "signatureName" and "signatureLabel" no longer hold text or a position of their own: they are
 * the shared style (font, size, colour, alignment, visibility) of every signatory's name and title.
 * They keep their ids so templates saved before there were signatories still open.
 */
export type ElementId = TextElementId

/** Order used for the element picker. */
export const ELEMENT_IDS: ElementId[] = [
    "name",
    "organization",
    "heading",
    "subheading",
    "body",
    "date",
    "dateLabel",
    "signatureName",
    "signatureLabel",
]

export const TEXT_ELEMENT_IDS: TextElementId[] = ELEMENT_IDS

export const ELEMENT_LABELS: Record<ElementId, string> = {
    name: "Participant name",
    organization: "Organization",
    heading: "Heading",
    subheading: "Line above name",
    body: "Body",
    date: "Date",
    dateLabel: "Date label",
    signatureName: "Signatory name",
    signatureLabel: "Signatory title",
}

export function isSignatoryText(id: ElementId): id is "signatureName" | "signatureLabel" {
    return id === "signatureName" || id === "signatureLabel"
}

/** Draw order for the plain text elements. The participant name and the signatories are drawn on top of them. */
const DRAW_ORDER: TextElementId[] = ["organization", "heading", "subheading", "body", "dateLabel", "date"]

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
    /** Distance between wrapped lines, as a multiple of the font size. */
    lineHeight: number
    /** Text shrinks or wraps to fit this width, as `fit` decides. Percentage of canvas width. */
    maxWidth: number
    /** How text longer than `maxWidth` is made to fit. */
    fit: TextFit
    /** Most lines a wrapping element may take. Ignored when the text only shrinks. */
    maxLines: number
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

/** An uploaded signature picture. */
export interface SignatureImage {
    /** PNG, JPEG or WebP data URL. */
    src: string
    removeBackground: boolean
    /** 0 - 100: the higher it is, the darker a pixel may be and still count as background. */
    threshold: number
}

/** A signature as it appears above a signatory's line: uploaded, drawn or typed. */
export interface SignatureArt {
    mode: SignatureMode
    image: SignatureImage | null
    strokes: SignatureDrawing | null
    text: string
    font: string
    color: string
    /** Height, as a percentage of the canvas height. */
    size: number
    /** The signature shrinks to fit this width. Percentage of canvas width. */
    maxWidth: number
    /** 10 - 100. */
    opacity: number
    /** Where the signature's bottom centre sits, relative to the middle of the signatory's column. Percent of canvas width. */
    dx: number
    /** Same, relative to the baseline of the signatory's name. Percent of canvas height (negative is above). */
    dy: number
    visible: boolean
    visibleOnUpload: boolean
}

export interface SignatoryLine {
    visible: boolean
    visibleOnUpload: boolean
    style: LineStyle
    /** null follows the design's line colour (accent, or ink on the Neo Brutal style). */
    color: string | null
    /** In units of 1/1000 of the page height. */
    thickness: number
}

export interface Signatory {
    id: string
    name: string
    title: string
    line: SignatoryLine
    signature: SignatureArt
    /** Centre of the column, percent of canvas width. Only used when the signatories are placed freely. */
    x: number
    /** Baseline of the signatory's name, percent of canvas height. Only used when placed freely. */
    y: number
}

export interface SignatoryLayout {
    /** "auto" spaces the signatories evenly; "free" uses each signatory's own position. */
    arrange: SignatoryArrange
    /** Signatories per row in "auto". 0 lets the tool decide (one per signatory, up to 5). */
    columns: number
    /** Width of each signatory's column (and its line), percent of canvas width. */
    columnWidth: number
}

export interface Logo {
    id: string
    /** PNG, JPEG or WebP data URL. */
    src: string
    /** Centre of the logo, percent of canvas width. */
    x: number
    /** Centre of the logo, percent of canvas height. */
    y: number
    /** Percent of canvas width. */
    width: number
    /** 10 - 100. */
    opacity: number
    /** 0 - 50, percent of the logo's shorter side. 50 makes a square logo a circle. */
    radius: number
    visible: boolean
}

export type Selection =
    | { kind: "element"; id: ElementId }
    | { kind: "signatory"; id: string }
    | { kind: "signature"; id: string }
    | { kind: "logo"; id: string }

export function sameSelection(a: Selection | null, b: Selection | null): boolean {
    if (!a || !b) return a === b
    return a.kind === b.kind && a.id === b.id
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
    signatories: Signatory[]
    signatoryLayout: SignatoryLayout
    logos: Logo[]
}

/** Any change that can be applied to a text element. */
export type ElementPatch = Partial<Omit<TextElement, "color">> & { color?: string | null }

export interface ElementBox {
    /** Canvas pixels. */
    x: number
    y: number
    w: number
    h: number
}

/** Where one signatory's column sits, in canvas pixels. */
export interface SignatoryFrame {
    x: number
    /** Baseline of the signatory's name. The line hangs just below it and the title under the line. */
    baselineY: number
    width: number
}

export interface SignatoryRender {
    frame: SignatoryFrame
    /** The name, title and line together. Null when none of them is drawn. */
    block: ElementBox | null
    signature: ElementBox | null
}

/** The area every drawn element covers, in canvas pixels. */
export interface RenderedLayout {
    elements: Partial<Record<ElementId, ElementBox>>
    signatories: Record<string, SignatoryRender>
    logos: Record<string, ElementBox>
    /** Elements whose text did not fit: it had to shrink, or lines had to be dropped. */
    overflow: ElementId[]
}

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
export function sizeLimits(): { min: number; max: number } {
    return { min: 1, max: 20 }
}

/** Allowed height (percentage of the canvas height) of a signature. */
export const SIGNATURE_SIZE_LIMITS = { min: 2, max: 25 }
/** Allowed width (percentage of the canvas width) of a logo. */
export const LOGO_WIDTH_LIMITS = { min: 2, max: 80 }
export const LOGO_RADIUS_MAX = 50
export const LINE_THICKNESS_LIMITS = { min: 0.5, max: 12 }
export const COLUMN_WIDTH_LIMITS = { min: 5, max: 100 }
export const MAX_COLUMNS = 6

export const MIN_MAX_WIDTH = 5

/** Most lines any wrapping element may take. */
export const MAX_TEXT_LINES = 12

export const TEXT_FIT_OPTIONS: { label: string; value: TextFit }[] = [
    { label: "Shrink", value: "shrink" },
    { label: "Wrap", value: "wrap" },
    { label: "Wrap + shrink", value: "wrapshrink" },
]

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

const DEFAULT_MAX_LINES = 6
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
        fit: "shrink",
        maxLines: DEFAULT_MAX_LINES,
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

/** Baseline of a lone signatory's name, percent of canvas height: the same footer row as the date. */
export const FOOTER_BASELINE_Y = 83.2
/** Distance between rows of signatories, in units of 1/1000 of the page height. */
const ROW_PITCH = 160
/** Space kept clear at the page edges and between columns, in the same units. */
const FOOTER_MARGIN = 150
const COLUMN_GAP = 40
const MIN_COLUMN = 60
const MAX_AUTO_COLUMNS = 5
/** The line sits this fraction of the name's size below the name's baseline, like the line under the date. */
const NAME_LINE_GAP = 18 / 25
/** The title's baseline is this far below the name's baseline, in units of 1/1000 of the page height. */
const TITLE_OFFSET = 52

/** The width of a signatory column on the classic footer, as a percentage of the canvas width. */
export function defaultColumnWidth(width: number, height: number): number {
    return Math.min(100, (((300 * height) / 1000) / width) * 100)
}

export function createSignatoryLayout(width: number, height: number): SignatoryLayout {
    return { arrange: "auto", columns: 0, columnWidth: defaultColumnWidth(width, height) }
}

export function createSignatureArt(): SignatureArt {
    return {
        mode: "none",
        image: null,
        strokes: null,
        text: "",
        font: SCRIPT_FONTS[0].value,
        color: "#1E293B",
        size: 5.5,
        maxWidth: 30,
        opacity: 100,
        dx: 0,
        dy: -3.6,
        visible: true,
        visibleOnUpload: true,
    }
}

export function createSignatoryLine(): SignatoryLine {
    return { visible: true, visibleOnUpload: false, style: "solid", color: null, thickness: 3 }
}

export function createSignatory(id: string, overrides: Partial<Omit<Signatory, "id">> = {}): Signatory {
    return {
        name: "Full Name",
        title: "Title or Role",
        line: createSignatoryLine(),
        signature: createSignatureArt(),
        x: 50,
        y: FOOTER_BASELINE_Y,
        ...overrides,
        id,
    }
}

export function newId(taken: Iterable<string>): string {
    const used = new Set(taken)
    for (; ;) {
        const id = Math.random().toString(36).slice(2, 10)
        if (id && !used.has(id)) return id
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
                fit: "wrap",
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
                fit: "wrap",
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
                fit: "wrap",
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
        signatories: [createSignatory("s1", { title: "Event Coordinator" })],
        signatoryLayout: createSignatoryLayout(size.width, size.height),
        logos: [],
    }
}

/**
 * Rebuilds where every text sits for a preset and page size. Wording, visibility and
 * the participant name's settings are kept; so are the signatories' content and style,
 * which are simply spaced evenly again. Logos are placed by percentage, so they stay put.
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
            // How long text is made to fit belongs to the wording, so it survives a restyle.
            fit: current.fit,
            maxLines: current.maxLines,
            visible: current.visible,
            visibleOnUpload: current.visibleOnUpload,
        }
    }

    return {
        ...design,
        preset,
        layoutSize: { width, height },
        elements,
        signatoryLayout: { ...design.signatoryLayout, arrange: "auto", columnWidth: defaultColumnWidth(width, height) },
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

export function getElement(design: CertificateDesign, id: ElementId): TextElement {
    return design.elements[id]
}

export function patchElement(
    design: CertificateDesign,
    id: ElementId,
    patch: ElementPatch
): CertificateDesign {
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

export function autoColumnCount(count: number, columns: number): number {
    if (count <= 0) return 0
    if (columns > 0) return Math.max(1, Math.min(columns, count))
    const rows = Math.ceil(count / MAX_AUTO_COLUMNS)
    return Math.ceil(count / rows)
}

/**
 * Where each signatory's column sits, in canvas pixels. Evenly spaced signatories fill the
 * footer from the right margin, leaving the date's column free when the date is drawn;
 * a single column keeps the classic bottom-right spot. Extra rows stack upwards.
 */
export function resolveSignatoryFrames(
    design: CertificateDesign,
    onArtwork: boolean = design.mode === "upload"
): SignatoryFrame[] {
    const { width: W, height: H, signatories, signatoryLayout: layout } = design
    const u = H / 1000
    const columnPx = Math.min(W, (layout.columnWidth / 100) * W)

    if (layout.arrange === "free") {
        return signatories.map((signatory) => ({
            x: (signatory.x / 100) * W,
            baselineY: (signatory.y / 100) * H,
            width: columnPx,
        }))
    }

    const count = signatories.length
    if (count === 0) return []

    const cols = autoColumnCount(count, layout.columns)
    const rows = Math.ceil(count / cols)
    const right = W - FOOTER_MARGIN * u
    let width = columnPx
    const centres: number[] = []

    if (cols === 1) {
        centres.push(right - width / 2)
    } else {
        let left = FOOTER_MARGIN * u
        if (isElementVisible(design, "date", onArtwork)) {
            left += (design.elements.date.maxWidth / 100) * W + COLUMN_GAP * u
        }
        const band = Math.max(right - left, 0)
        const fit = (band - COLUMN_GAP * u * (cols - 1)) / cols
        width = Math.max(Math.min(columnPx, fit), MIN_COLUMN * u)
        const step = Math.max(band - width, 0) / (cols - 1)
        for (let c = 0; c < cols; c++) centres.push(left + width / 2 + c * step)
    }

    const bottomBaseline = (FOOTER_BASELINE_Y / 100) * H
    return signatories.map((_, index) => ({
        x: centres[index % cols],
        baselineY: bottomBaseline - (rows - 1 - Math.floor(index / cols)) * ROW_PITCH * u,
        width,
    }))
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Switches to free placement, keeping every signatory exactly where it is drawn now. */
function freezeSignatoryPositions(design: CertificateDesign): CertificateDesign {
    if (design.signatoryLayout.arrange === "free") return design
    const frames = resolveSignatoryFrames(design)
    return {
        ...design,
        signatoryLayout: {
            ...design.signatoryLayout,
            arrange: "free",
            columnWidth: frames.length > 0 ? round2((frames[0].width / design.width) * 100) : design.signatoryLayout.columnWidth,
        },
        signatories: design.signatories.map((signatory, index) => ({
            ...signatory,
            x: round2((frames[index].x / design.width) * 100),
            y: round2((frames[index].baselineY / design.height) * 100),
        })),
    }
}

export function patchSignatoryLayout(design: CertificateDesign, patch: Partial<SignatoryLayout>): CertificateDesign {
    const base = patch.arrange === "free" ? freezeSignatoryPositions(design) : design
    return { ...base, signatoryLayout: { ...base.signatoryLayout, ...patch } }
}

/** Places a signatory's column (centre x, line y, both in percent). Free placement is switched on if needed. */
export function moveSignatory(design: CertificateDesign, id: string, x: number, y: number): CertificateDesign {
    const frozen = freezeSignatoryPositions(design)
    return {
        ...frozen,
        signatories: frozen.signatories.map((signatory) => (signatory.id === id ? { ...signatory, x, y } : signatory)),
    }
}

export function patchSignatory(
    design: CertificateDesign,
    id: string,
    patch: Partial<Omit<Signatory, "id">>
): CertificateDesign {
    return {
        ...design,
        signatories: design.signatories.map((signatory) => (signatory.id === id ? { ...signatory, ...patch } : signatory)),
    }
}

export function patchSignatoryLine(design: CertificateDesign, id: string, patch: Partial<SignatoryLine>): CertificateDesign {
    return {
        ...design,
        signatories: design.signatories.map((signatory) =>
            signatory.id === id ? { ...signatory, line: { ...signatory.line, ...patch } } : signatory
        ),
    }
}

export function patchSignatureArt(design: CertificateDesign, id: string, patch: Partial<SignatureArt>): CertificateDesign {
    return {
        ...design,
        signatories: design.signatories.map((signatory) =>
            signatory.id === id ? { ...signatory, signature: { ...signatory.signature, ...patch } } : signatory
        ),
    }
}

/**
 * Appends a signatory with the given id (make one with `newId` outside any state updater, so
 * the caller knows it). When placing freely it starts where evenly spaced columns would put it.
 */
export function addSignatory(design: CertificateDesign, id: string): CertificateDesign {
    const signatories = [...design.signatories, createSignatory(id)]
    const next = { ...design, signatories }

    if (design.signatoryLayout.arrange !== "free") return next

    const frames = resolveSignatoryFrames({ ...next, signatoryLayout: { ...design.signatoryLayout, arrange: "auto" } })
    const frame = frames[frames.length - 1]
    return {
        ...next,
        signatories: signatories.map((signatory) =>
            signatory.id === id
                ? { ...signatory, x: round2((frame.x / design.width) * 100), y: round2((frame.baselineY / design.height) * 100) }
                : signatory
        ),
    }
}

export function removeSignatory(design: CertificateDesign, id: string): CertificateDesign {
    return { ...design, signatories: design.signatories.filter((signatory) => signatory.id !== id) }
}

/** Moves a signatory to a new place in the order. Out-of-range or unchanged moves return the design as is. */
export function reorderSignatory(design: CertificateDesign, id: string, toIndex: number): CertificateDesign {
    const from = design.signatories.findIndex((signatory) => signatory.id === id)
    const to = Math.max(0, Math.min(design.signatories.length - 1, toIndex))
    if (from < 0 || from === to) return design
    const signatories = [...design.signatories]
    const [moved] = signatories.splice(from, 1)
    signatories.splice(to, 0, moved)
    return { ...design, signatories }
}

/** Adds a logo in the top-left corner, ready to be dragged into place. */
export function addLogo(design: CertificateDesign, id: string, src: string): CertificateDesign {
    const logo: Logo = { id, src, x: 14, y: 14, width: 12, opacity: 100, radius: 0, visible: true }
    return { ...design, logos: [...design.logos, logo] }
}

export function patchLogo(design: CertificateDesign, id: string, patch: Partial<Omit<Logo, "id">>): CertificateDesign {
    return { ...design, logos: design.logos.map((logo) => (logo.id === id ? { ...logo, ...patch } : logo)) }
}

export function removeLogo(design: CertificateDesign, id: string): CertificateDesign {
    return { ...design, logos: design.logos.filter((logo) => logo.id !== id) }
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

function fontString(element: TextElement, size: number): string {
    return `${element.italic ? "italic " : ""}${element.weight} ${Math.max(1, size)}px ${element.font}`
}

/** Shrinks the font until the text fits, so long text never overflows. */
function fitFontSize(
    ctx: CanvasRenderingContext2D,
    element: TextElement,
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
    /** True when the text had to be made smaller, or lines had to be dropped, to fit. */
    overflowed: boolean
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
    element: TextElement,
    rawText: string,
    fit: TextFit
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
            overflowed: false,
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

    const maxLines = Math.max(1, Math.round(element.maxLines || DEFAULT_MAX_LINES))
    let lines: string[]
    let fontPx: number
    let overflowed = false

    if (fit === "shrink") {
        fontPx = fitFontSize(ctx, element, text, desired, maxWidth)
        lines = [text]
        overflowed = fontPx < desired - 0.01
    } else {
        fontPx = desired
        ctx.font = fontString(element, fontPx)
        let wrapped = wrapLines(ctx, text, maxWidth)

        if (fit === "wrapshrink") {
            // Re-wrap at smaller and smaller sizes: shrinking fits more words on every line.
            for (let i = 0; i < 8 && wrapped.length > maxLines && fontPx > desired * 0.25; i++) {
                fontPx = Math.max(desired * 0.25, fontPx * 0.9)
                ctx.font = fontString(element, fontPx)
                wrapped = wrapLines(ctx, text, maxWidth)
            }
            overflowed = fontPx < desired - 0.01
        }

        if (wrapped.length > maxLines) {
            wrapped = wrapped.slice(0, maxLines)
            overflowed = true
        }
        lines = wrapped
    }

    const lineHeight = fontPx * element.lineHeight
    const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width))
    // A wrapping block is boxed at its full column so its width can be dragged.
    const boxWidth = fit === "shrink" ? textWidth : maxWidth
    const left =
        element.align === "left" ? anchorX : element.align === "center" ? anchorX - boxWidth / 2 : anchorX - boxWidth

    return {
        lines,
        overflowed,
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

    if (id === "date") {
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

interface TextDrawOptions {
    color: string
    fit: TextFit
    decorate: TextElementId | null
}

/** What one drawn text left behind: where it landed, and whether it had to give way to fit. */
interface TextDrawResult {
    /** Null when there was nothing to draw. */
    box: ElementBox | null
    overflowed: boolean
}

/** Draws text (fitted or wrapped) and any preset decoration. Returns the area it covers. */
function drawTextElement(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    element: TextElement,
    rawText: string,
    { color, fit, decorate }: TextDrawOptions
): TextDrawResult {
    ctx.save()
    // letterSpacing is not implemented by every browser; harmless where missing.
    const spacingCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
    spacingCtx.letterSpacing = `${element.letterSpacing}px`

    const geometry = layoutText(ctx, design, element, rawText, fit)

    if (decorate) drawDecoration(ctx, design, decorate, element, geometry)

    if (geometry.lines.length > 0) {
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
    return { box: geometry.box, overflowed: geometry.overflowed }
}

/** Draws a signature whose bottom centre is at (anchorX, anchorY), in canvas pixels. */
function drawSignatureArt(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    art: SignatureArt,
    anchorX: number,
    anchorY: number
): ElementBox | null {
    const { width: W, height: H } = design

    if (art.mode === "type") {
        const typed = textElement({
            font: art.font,
            color: art.color,
            size: art.size,
            x: (anchorX / W) * 100,
            y: (anchorY / H) * 100,
            maxWidth: art.maxWidth,
            opacity: art.opacity,
        })
        return drawTextElement(ctx, design, typed, art.text, { color: art.color, fit: "shrink", decorate: null }).box
    }

    if (art.mode === "image") {
        if (!art.image) return null
        const image = getLoadedImage(art.image.src)
        if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) return null

        const aspect = image.naturalWidth / image.naturalHeight
        let height = (art.size / 100) * H
        let width = height * aspect
        const maxWidth = (art.maxWidth / 100) * W
        if (width > maxWidth) {
            const factor = maxWidth / width
            width *= factor
            height *= factor
        }

        const left = anchorX - width / 2
        const top = anchorY - height
        const source = art.image.removeBackground
            ? getWhiteRemoved(art.image.src, image, art.image.threshold)
            : image

        ctx.save()
        ctx.globalAlpha = art.opacity / 100
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(source, left, top, width, height)
        ctx.restore()
        return { x: left, y: top, w: width, h: height }
    }

    if (art.mode !== "draw" || !art.strokes || art.strokes.strokes.length === 0) return null

    const drawing = art.strokes
    let height = (art.size / 100) * H
    let width = height * drawing.aspect
    const maxWidth = (art.maxWidth / 100) * W
    if (width > maxWidth) {
        const factor = maxWidth / width
        width *= factor
        height *= factor
    }

    const left = anchorX - width / 2
    const top = anchorY - height

    ctx.save()
    ctx.strokeStyle = art.color
    ctx.lineWidth = Math.max((2 * H) / 1000, height * 0.035)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.globalAlpha = art.opacity / 100

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

export function resolveLineColor(design: CertificateDesign, line: SignatoryLine): string {
    if (line.color) return line.color
    return design.preset === "neo" ? design.ink : design.accent
}

function signatoryLineY(design: CertificateDesign, frame: SignatoryFrame): number {
    return frame.baselineY + ((design.elements.signatureName.size / 100) * design.height) * NAME_LINE_GAP
}

function drawSignatoryLine(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    line: SignatoryLine,
    frame: SignatoryFrame
) {
    const thickness = Math.max(0.5, line.thickness) * (design.height / 1000)
    const left = frame.x - frame.width / 2
    const y = signatoryLineY(design, frame)

    ctx.save()
    ctx.strokeStyle = resolveLineColor(design, line)
    ctx.lineWidth = thickness
    if (line.style === "dashed") {
        ctx.setLineDash([thickness * 4, thickness * 3])
    } else if (line.style === "dotted") {
        ctx.lineCap = "round"
        ctx.setLineDash([0, thickness * 2.4])
    }
    ctx.beginPath()
    ctx.moveTo(left, y)
    ctx.lineTo(left + frame.width, y)
    ctx.stroke()
    ctx.restore()
}

function unionBoxes(boxes: ElementBox[]): ElementBox | null {
    if (boxes.length === 0) return null
    const left = Math.min(...boxes.map((box) => box.x))
    const top = Math.min(...boxes.map((box) => box.y))
    const right = Math.max(...boxes.map((box) => box.x + box.w))
    const bottom = Math.max(...boxes.map((box) => box.y + box.h))
    return { x: left, y: top, w: right - left, h: bottom - top }
}

/**
 * Draws one signatory: the name sitting on the line, the title under it, and the
 * signature above. Name and title share the style of the "signatureName" and
 * "signatureLabel" elements; only their place comes from the signatory's column.
 */
function drawSignatory(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    signatory: Signatory,
    frame: SignatoryFrame,
    onArtwork: boolean
): SignatoryRender {
    const { width: W, height: H } = design
    const left = frame.x - frame.width / 2
    const anchorFor = (align: Align) => (align === "left" ? left : align === "right" ? left + frame.width : frame.x)
    const columnPercent = (frame.width / W) * 100
    const blockBoxes: ElementBox[] = []

    const drawShared = (id: "signatureName" | "signatureLabel", text: string, baselineY: number) => {
        if (!isElementVisible(design, id, onArtwork)) return
        const element = design.elements[id]
        const placed: TextElement = {
            ...element,
            x: (anchorFor(element.align) / W) * 100,
            y: (baselineY / H) * 100,
            maxWidth: columnPercent,
        }
        // A signatory's name and title always shrink: wrapping one would run into the line below it.
        const { box } = drawTextElement(ctx, design, placed, text, {
            color: resolveElementColor(design, id),
            fit: "shrink",
            decorate: null,
        })
        if (box) blockBoxes.push(box)
    }

    drawShared("signatureName", signatory.name, frame.baselineY)
    drawShared("signatureLabel", signatory.title, frame.baselineY + TITLE_OFFSET * (H / 1000))

    if (onArtwork ? signatory.line.visibleOnUpload : signatory.line.visible) {
        drawSignatoryLine(ctx, design, signatory.line, frame)
        const reach = Math.max(4, signatory.line.thickness * (H / 1000))
        blockBoxes.push({ x: left, y: signatoryLineY(design, frame) - reach, w: frame.width, h: reach * 2 })
    }

    let signature: ElementBox | null = null
    const art = signatory.signature
    if (onArtwork ? art.visibleOnUpload : art.visible) {
        signature = drawSignatureArt(
            ctx,
            design,
            art,
            frame.x + (art.dx / 100) * W,
            frame.baselineY + (art.dy / 100) * H
        )
    }

    return { frame, block: unionBoxes(blockBoxes), signature }
}

function drawLogo(ctx: CanvasRenderingContext2D, design: CertificateDesign, logo: Logo): ElementBox | null {
    const image = getLoadedImage(logo.src)
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) return null

    const { width: W, height: H } = design
    const width = (logo.width / 100) * W
    const height = (width * image.naturalHeight) / image.naturalWidth
    const left = (logo.x / 100) * W - width / 2
    const top = (logo.y / 100) * H - height / 2
    const radius = (Math.min(width, height) * Math.min(LOGO_RADIUS_MAX, Math.max(0, logo.radius))) / 100

    ctx.save()
    ctx.globalAlpha = logo.opacity / 100
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    if (radius > 0) {
        ctx.beginPath()
        ctx.moveTo(left + radius, top)
        ctx.arcTo(left + width, top, left + width, top + height, radius)
        ctx.arcTo(left + width, top + height, left, top + height, radius)
        ctx.arcTo(left, top + height, left, top, radius)
        ctx.arcTo(left, top, left + width, top, radius)
        ctx.closePath()
        ctx.clip()
    }
    ctx.drawImage(image, left, top, width, height)
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

/** The wording one element carries for one recipient: their own override if they have one, with tokens filled. */
export function elementTextFor(design: CertificateDesign, id: ElementId, recipient: Recipient): string {
    const own = recipient.overrides?.[id]
    const raw = own !== undefined ? own : id === "name" ? design.elements.name.text.trim() || "{name}" : design.elements[id].text
    return fillTokens(raw, recipient)
}

/** Applies one recipient's manual tweak to the participant name. */
export function nudgedNameElement(element: TextElement, nudge: NameNudge | undefined): TextElement {
    if (!nudge || (nudge.dx === 0 && nudge.dy === 0 && nudge.scale === 1)) return element
    const limits = sizeLimits()
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
    return {
        ...element,
        x: clamp(element.x + nudge.dx, 0, 100),
        y: clamp(element.y + nudge.dy, 0, 100),
        size: clamp(element.size * nudge.scale, limits.min, limits.max),
    }
}

/**
 * Draws one certificate for `recipient` into `ctx` and returns the area each element covers.
 * A plain name may be passed instead, for a preview with no list behind it.
 * The context is expected to already be sized to `design.width/height`.
 */
export function renderCertificate(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    recipient: Recipient | string,
    background?: CanvasImageSource | null
): RenderedLayout {
    const { width, height } = design
    const who: Recipient =
        typeof recipient === "string" ? { name: recipient, fields: { name: recipient, index: "1" } } : recipient
    const onArtwork = design.mode === "upload" && !!background
    const layout: RenderedLayout = { elements: {}, signatories: {}, logos: {}, overflow: [] }

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

    for (const logo of design.logos) {
        if (!logo.visible) continue
        const box = drawLogo(ctx, design, logo)
        if (box) layout.logos[logo.id] = box
    }

    for (const id of DRAW_ORDER) {
        if (!isElementVisible(design, id, onArtwork)) continue
        const element = design.elements[id]
        const drawn = drawTextElement(ctx, design, element, elementTextFor(design, id, who), {
            color: resolveElementColor(design, id),
            fit: element.fit,
            decorate: onArtwork ? null : id,
        })
        if (drawn.box) layout.elements[id] = drawn.box
        if (drawn.overflowed) layout.overflow.push(id)
    }

    const frames = resolveSignatoryFrames(design, onArtwork)
    design.signatories.forEach((signatory, index) => {
        layout.signatories[signatory.id] = drawSignatory(ctx, design, signatory, frames[index], onArtwork)
    })

    const nameElement = nudgedNameElement(design.elements.name, who.nudge)
    const drawnName = drawTextElement(ctx, design, nameElement, elementTextFor(design, "name", who), {
        color: resolveElementColor(design, "name"),
        fit: nameElement.fit,
        decorate: null,
    })
    if (drawnName.box) layout.elements.name = drawnName.box
    if (drawnName.overflowed) layout.overflow.push("name")

    ctx.restore()
    return layout
}

/** Sizes the canvas and renders a single certificate into it. */
export function renderToCanvas(
    canvas: HTMLCanvasElement,
    design: CertificateDesign,
    recipient: Recipient | string,
    background?: CanvasImageSource | null
): RenderedLayout | null {
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    if (canvas.width !== design.width) canvas.width = design.width
    if (canvas.height !== design.height) canvas.height = design.height
    return renderCertificate(ctx, design, recipient, background)
}

/** The distinct CSS font specs a design draws with, e.g. "italic 700 32px Georgia, serif". */
export function designFontSpecs(design: CertificateDesign): string[] {
    const specs = new Set<string>()
    for (const id of ELEMENT_IDS) {
        const element = getElement(design, id)
        specs.add(`${element.italic ? "italic " : ""}${element.weight} 32px ${element.font}`)
    }
    for (const signatory of design.signatories) {
        if (signatory.signature.mode === "type") specs.add(`400 32px ${signatory.signature.font}`)
    }
    return [...specs].sort()
}

export function designImageSources(design: CertificateDesign): string[] {
    const sources: string[] = []
    for (const signatory of design.signatories) {
        if (signatory.signature.image) sources.push(signatory.signature.image.src)
    }
    for (const logo of design.logos) sources.push(logo.src)
    return sources
}

export function loadDesignImages(design: CertificateDesign): Promise<boolean> {
    return ensureImages(designImageSources(design))
}

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