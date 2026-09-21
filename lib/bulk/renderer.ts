/**
 * Canvas rendering for the bulk certificate generator.
 * All measurements derive from the canvas height, so the preview and the
 * full-resolution export render identically.
 */

export type TemplateMode = "builtin" | "upload"
export type PresetId = "classic" | "neo" | "minimal"
export type Align = "left" | "center" | "right"

export interface CertificateDesign {
    mode: TemplateMode
    preset: PresetId
    width: number
    height: number

    background: string
    accent: string
    ink: string

    organization: string
    heading: string
    subheading: string
    body: string
    leftLabel: string
    leftValue: string
    rightLabel: string
    rightValue: string

    nameFont: string
    nameColor: string
    nameSizePct: number
    nameXPct: number
    nameYPct: number
    nameAlign: Align
    nameUppercase: boolean
    nameMaxWidthPct: number
    nameUnderline: boolean
    nameLetterSpacing: number
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

export const NAME_FONTS: { label: string; value: string }[] = [
    { label: "Georgia (Serif)", value: "Georgia, 'Times New Roman', serif" },
    { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
    { label: "Helvetica / Arial", value: "Helvetica, Arial, sans-serif" },
    { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
    { label: "Trebuchet", value: "'Trebuchet MS', Tahoma, sans-serif" },
    { label: "Courier (Mono)", value: "'Courier New', Courier, monospace" },
    { label: "Brush Script (Cursive)", value: "'Brush Script MT', 'Segoe Script', cursive" },
    { label: "Palatino", value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
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

export function createDefaultDesign(): CertificateDesign {
    const size = SIZE_PRESETS[0]
    return {
        mode: "builtin",
        preset: "classic",
        width: size.width,
        height: size.height,
        ...PRESET_PALETTES.classic,
        organization: "Your Organization",
        heading: "Certificate of Participation",
        subheading: "This is proudly presented to",
        body: "for actively participating in the event and successfully completing all the required sessions.",
        leftLabel: "Date",
        leftValue: new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
        rightLabel: "Signature",
        rightValue: "Event Coordinator",
        nameFont: "Georgia, 'Times New Roman', serif",
        nameColor: "#1A1A1A",
        nameSizePct: 8,
        nameXPct: 50,
        nameYPct: 47,
        nameAlign: "center",
        nameUppercase: false,
        nameMaxWidthPct: 78,
        nameUnderline: true,
        nameLetterSpacing: 0,
    }
}

function setFont(ctx: CanvasRenderingContext2D, style: string, size: number, family: string) {
    ctx.font = `${style} ${Math.max(1, size)}px ${family}`
}

/** Shrinks the font until the text fits, so long names never overflow. */
function fitFontSize(
    ctx: CanvasRenderingContext2D,
    text: string,
    style: string,
    family: string,
    desiredSize: number,
    maxWidth: number
): number {
    let size = desiredSize
    for (let i = 0; i < 6; i++) {
        setFont(ctx, style, size, family)
        const width = ctx.measureText(text).width
        if (width <= maxWidth || width === 0) break
        size = Math.max(desiredSize * 0.25, size * (maxWidth / width) * 0.98)
    }
    setFont(ctx, style, size, family)
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

function drawCenteredLines(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    centerX: number,
    startY: number,
    lineHeight: number
) {
    ctx.textAlign = "center"
    lines.forEach((line, index) => {
        ctx.fillText(line, centerX, startY + index * lineHeight)
    })
}

function drawParticipantName(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    rawName: string
) {
    const { width, height } = design
    const text = design.nameUppercase ? rawName.toUpperCase() : rawName
    if (!text) return

    const x = (design.nameXPct / 100) * width
    const y = (design.nameYPct / 100) * height
    const maxWidth = (design.nameMaxWidthPct / 100) * width
    const desiredSize = (design.nameSizePct / 100) * height

    ctx.save()
    // letterSpacing is not implemented by every browser; harmless where missing.
    const spacingCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
    spacingCtx.letterSpacing = `${design.nameLetterSpacing}px`

    const size = fitFontSize(ctx, text, "bold", design.nameFont, desiredSize, maxWidth)
    ctx.fillStyle = design.nameColor
    ctx.textAlign = design.nameAlign
    ctx.textBaseline = "alphabetic"
    ctx.fillText(text, x, y)

    if (design.nameUnderline) {
        const textWidth = Math.min(ctx.measureText(text).width, maxWidth)
        const lineY = y + size * 0.3
        let startX = x
        if (design.nameAlign === "center") startX = x - textWidth / 2
        else if (design.nameAlign === "right") startX = x - textWidth
        const padding = size * 0.25
        ctx.strokeStyle = design.nameColor
        ctx.lineWidth = Math.max(1, size * 0.035)
        ctx.beginPath()
        ctx.moveTo(startX - padding, lineY)
        ctx.lineTo(startX + textWidth + padding, lineY)
        ctx.stroke()
    }

    ctx.restore()
}

function drawClassic(ctx: CanvasRenderingContext2D, design: CertificateDesign) {
    const { width: W, height: H, accent, ink } = design
    const u = H / 1000
    const font = PRESET_FONTS.classic

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

    ctx.textBaseline = "alphabetic"
    ctx.fillStyle = ink

    if (design.organization) {
        setFont(ctx, "bold", 26 * u, font)
        ctx.fillStyle = accent
        ctx.textAlign = "center"
        ctx.fillText(design.organization.toUpperCase(), W / 2, 130 * u)
    }

    if (design.heading) {
        ctx.fillStyle = ink
        fitFontSize(ctx, design.heading, "bold", font, 62 * u, W - 220 * u)
        ctx.textAlign = "center"
        ctx.fillText(design.heading, W / 2, 230 * u)

        ctx.strokeStyle = accent
        ctx.lineWidth = 3 * u
        const ruleWidth = Math.min(ctx.measureText(design.heading).width, W - 220 * u) * 0.45
        ctx.beginPath()
        ctx.moveTo(W / 2 - ruleWidth, 260 * u)
        ctx.lineTo(W / 2 + ruleWidth, 260 * u)
        ctx.stroke()
    }

    if (design.subheading) {
        setFont(ctx, "italic", 30 * u, font)
        ctx.fillStyle = ink
        ctx.textAlign = "center"
        ctx.fillText(design.subheading, W / 2, 340 * u)
    }

    if (design.body) {
        setFont(ctx, "", 27 * u, font)
        ctx.fillStyle = ink
        const lines = wrapLines(ctx, design.body, W - 300 * u).slice(0, 3)
        drawCenteredLines(ctx, lines, W / 2, 620 * u, 42 * u)
    }

    drawFooter(ctx, design, font, accent, ink)
}

function drawNeo(ctx: CanvasRenderingContext2D, design: CertificateDesign) {
    const { width: W, height: H, accent, ink } = design
    const u = H / 1000
    const font = PRESET_FONTS.neo

    // Offset shadow block plus hard border
    ctx.fillStyle = ink
    ctx.fillRect(56 * u, 56 * u, W - 82 * u, H - 82 * u)
    ctx.fillStyle = design.background
    ctx.fillRect(40 * u, 40 * u, W - 82 * u, H - 82 * u)
    ctx.strokeStyle = ink
    ctx.lineWidth = 8 * u
    ctx.strokeRect(40 * u, 40 * u, W - 82 * u, H - 82 * u)

    ctx.textBaseline = "alphabetic"

    if (design.organization) {
        setFont(ctx, "bold", 24 * u, font)
        const label = design.organization.toUpperCase()
        const padding = 18 * u
        const textWidth = ctx.measureText(label).width
        const tagW = textWidth + padding * 2
        const tagH = 52 * u
        const tagX = 90 * u
        const tagY = 100 * u
        ctx.fillStyle = accent
        ctx.fillRect(tagX, tagY, tagW, tagH)
        ctx.strokeStyle = ink
        ctx.lineWidth = 4 * u
        ctx.strokeRect(tagX, tagY, tagW, tagH)
        ctx.fillStyle = ink
        ctx.textAlign = "left"
        ctx.fillText(label, tagX + padding, tagY + tagH * 0.68)
    }

    if (design.heading) {
        ctx.fillStyle = ink
        fitFontSize(ctx, design.heading.toUpperCase(), "italic bold", font, 60 * u, W - 200 * u)
        ctx.textAlign = "center"
        ctx.fillText(design.heading.toUpperCase(), W / 2, 265 * u)
    }

    if (design.subheading) {
        setFont(ctx, "bold", 26 * u, font)
        const label = design.subheading.toUpperCase()
        const textWidth = ctx.measureText(label).width
        const stripW = Math.min(textWidth + 44 * u, W - 180 * u)
        ctx.fillStyle = accent
        ctx.fillRect(W / 2 - stripW / 2, 315 * u, stripW, 46 * u)
        ctx.strokeStyle = ink
        ctx.lineWidth = 4 * u
        ctx.strokeRect(W / 2 - stripW / 2, 315 * u, stripW, 46 * u)
        ctx.fillStyle = ink
        ctx.textAlign = "center"
        ctx.fillText(label, W / 2, 347 * u)
    }

    if (design.body) {
        setFont(ctx, "bold", 25 * u, font)
        ctx.fillStyle = ink
        const lines = wrapLines(ctx, design.body, W - 320 * u).slice(0, 3)
        drawCenteredLines(ctx, lines, W / 2, 625 * u, 40 * u)
    }

    drawFooter(ctx, design, font, ink, ink)
}

function drawMinimal(ctx: CanvasRenderingContext2D, design: CertificateDesign) {
    const { width: W, height: H, accent, ink } = design
    const u = H / 1000
    const font = PRESET_FONTS.minimal

    ctx.fillStyle = accent
    ctx.fillRect(0, 0, 22 * u, H)

    ctx.textBaseline = "alphabetic"

    if (design.organization) {
        setFont(ctx, "bold", 24 * u, font)
        ctx.fillStyle = accent
        ctx.textAlign = "center"
        ctx.fillText(design.organization.toUpperCase(), W / 2, 150 * u)
    }

    if (design.heading) {
        ctx.fillStyle = ink
        fitFontSize(ctx, design.heading, "300", font, 58 * u, W - 240 * u)
        ctx.textAlign = "center"
        ctx.fillText(design.heading, W / 2, 250 * u)
    }

    if (design.subheading) {
        setFont(ctx, "", 28 * u, font)
        ctx.fillStyle = ink
        ctx.globalAlpha = 0.65
        ctx.textAlign = "center"
        ctx.fillText(design.subheading, W / 2, 335 * u)
        ctx.globalAlpha = 1
    }

    if (design.body) {
        setFont(ctx, "", 26 * u, font)
        ctx.fillStyle = ink
        ctx.globalAlpha = 0.8
        const lines = wrapLines(ctx, design.body, W - 320 * u).slice(0, 3)
        drawCenteredLines(ctx, lines, W / 2, 620 * u, 40 * u)
        ctx.globalAlpha = 1
    }

    drawFooter(ctx, design, font, accent, ink)
}

function drawFooter(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    font: string,
    lineColor: string,
    ink: string
) {
    const { width: W, height: H } = design
    const u = H / 1000
    const baseline = H - 150 * u
    const columnWidth = 300 * u
    const leftX = 150 * u
    const rightX = W - 150 * u - columnWidth

    const column = (x: number, label: string, value: string, align: Align) => {
        if (!label && !value) return
        const anchor = align === "right" ? x + columnWidth : x
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 3 * u
        ctx.beginPath()
        ctx.moveTo(x, baseline)
        ctx.lineTo(x + columnWidth, baseline)
        ctx.stroke()

        ctx.textAlign = align
        if (value) {
            setFont(ctx, "bold", 25 * u, font)
            ctx.fillStyle = ink
            ctx.fillText(value, anchor, baseline - 18 * u)
        }
        if (label) {
            setFont(ctx, "", 21 * u, font)
            ctx.fillStyle = ink
            ctx.globalAlpha = 0.7
            ctx.fillText(label.toUpperCase(), anchor, baseline + 34 * u)
            ctx.globalAlpha = 1
        }
    }

    column(leftX, design.leftLabel, design.leftValue, "left")
    column(rightX, design.rightLabel, design.rightValue, "right")
}

/**
 * Draws one certificate for `name` into `ctx`.
 * The context is expected to already be sized to `design.width/height`.
 */
export function renderCertificate(
    ctx: CanvasRenderingContext2D,
    design: CertificateDesign,
    name: string,
    background?: CanvasImageSource | null
) {
    const { width, height } = design

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)

    if (design.mode === "upload" && background) {
        // The canvas matches the artwork's aspect ratio, so this never distorts.
        ctx.drawImage(background, 0, 0, width, height)
    } else {
        ctx.fillStyle = design.background
        ctx.fillRect(0, 0, width, height)

        if (design.preset === "neo") drawNeo(ctx, design)
        else if (design.preset === "minimal") drawMinimal(ctx, design)
        else drawClassic(ctx, design)
    }

    drawParticipantName(ctx, design, name)
    ctx.restore()
}

/** Sizes the canvas and renders a single certificate into it. */
export function renderToCanvas(
    canvas: HTMLCanvasElement,
    design: CertificateDesign,
    name: string,
    background?: CanvasImageSource | null
): boolean {
    const ctx = canvas.getContext("2d")
    if (!ctx) return false
    if (canvas.width !== design.width) canvas.width = design.width
    if (canvas.height !== design.height) canvas.height = design.height
    renderCertificate(ctx, design, name, background)
    return true
}