"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
    ELEMENT_IDS,
    ELEMENT_LABELS,
    TEXT_ELEMENT_IDS,
    isSignatoryText,
    loadDesignFonts,
    loadDesignImages,
    renderCertificate,
    type CertificateDesign,
    type ElementId,
} from "@/lib/bulk/renderer"
import {
    NAME_NUDGE_ZERO,
    createRecipient,
    findTokens,
    isNudged,
    type NameNudge,
    type Recipient,
} from "@/lib/bulk/tokens"
import {
    buildRecipients,
    columnKeys,
    guessNameColumn,
    looksLikeHeader,
    parseCsv,
    parseNameList,
    recipientsFromNames,
} from "@/lib/bulk/csv"
import { buildFileName, buildIndexCsv, downloadBlob, formatBytes } from "@/lib/bulk/export"
import { createZip, type ZipEntry } from "@/lib/bulk/zip"
import {
    createPdf,
    createPdfBytes,
    encodeCanvasForPdf,
    pdfPageSize,
    type PdfPage,
} from "@/lib/bulk/pdf"
import { BULK_AUTOSAVE_KEY } from "@/lib/bulk/template"
import { DesignBasics } from "./design-basics"
import { ElementPanel } from "./element-panel"
import { NumberField, RangeField } from "./fields"
import { LogoPanel } from "./logo-panel"
import { DesignStage } from "./design-stage"
import { SignatoryPanel } from "./signatory-panel"
import { useDesigner } from "./use-designer"
import { buttonClass, cardClass, clamp, inputClass, labelClass, smallButtonClass } from "./ui"

/** Keeps a single batch inside what a browser tab can comfortably hold in memory. */
const MAX_NAMES = 5000

type NameSource = "csv" | "paste"
type Phase = "idle" | "working" | "done"
export type ExportFormat = "png" | "jpeg" | "pdf"
/** "single" collects every certificate in one PDF; "each" gives everybody their own, inside the ZIP. */
type PdfMode = "single" | "each"

/** How sharp the picture on a PDF page is. 100 keeps every pixel; lower encodes a JPEG. */
const PDF_QUALITIES: { value: number; label: string }[] = [
    { value: 100, label: "Lossless · sharpest text" },
    { value: 92, label: "High · smaller file" },
    { value: 80, label: "Compact · smallest file" },
]

interface CsvState {
    fileName: string
    rows: string[][]
    hasHeader: boolean
    column: number
}

interface GenerationResult {
    blob: Blob
    fileName: string
    count: number
    /** A ZIP of one file per person, or a single PDF holding every certificate. */
    kind: "zip" | "pdf"
}

/** What has been changed by hand for one recipient only. */
interface RowTweak {
    /** Wording that replaces an element's own text on this certificate. */
    text?: Partial<Record<ElementId, string>>
    /** A manual shift of the participant name on this certificate. */
    nudge?: NameNudge
}

/** Elements whose wording can be overridden for a single recipient. */
const OVERRIDABLE_IDS: ElementId[] = ELEMENT_IDS.filter((id) => !isSignatoryText(id))

/** How far one tap of a nudge arrow moves the name, in percent of the page. */
const NUDGE_STEP = 0.5

const round2 = (value: number) => Math.round(value * 100) / 100

const PLACEHOLDER_RECIPIENT = createRecipient("Participant Name", 1)

function hasTweak(tweak: RowTweak | undefined): boolean {
    if (!tweak) return false
    return isNudged(tweak.nudge) || Object.values(tweak.text ?? {}).some((value) => value !== undefined)
}

/** Hands the renderer one recipient with their own wording and nudge folded in. */
function withTweak(recipient: Recipient, tweak: RowTweak | undefined): Recipient {
    if (!hasTweak(tweak)) return recipient
    return {
        ...recipient,
        overrides: tweak?.text as Record<string, string> | undefined,
        nudge: isNudged(tweak?.nudge) ? tweak?.nudge : undefined,
    }
}

function StepHeading({ step, title, hint }: { step: number; title: string; hint?: string }) {
    return (
        <div className="mb-5 flex items-start gap-3">
            <span className="shrink-0 w-8 h-8 border-3 border-black bg-neo-yellow flex items-center justify-center font-black text-sm">
                {step}
            </span>
            <div>
                <h2 className="text-lg sm:text-xl font-black uppercase italic leading-tight">{title}</h2>
                {hint ? <p className="text-black/70 font-bold text-xs mt-0.5">{hint}</p> : null}
            </div>
        </div>
    )
}

export default function BulkGeneratePage() {
    const [error, setError] = useState("")
    const [result, setResult] = useState<GenerationResult | null>(null)

    // Anything already generated no longer matches the design once it is edited.
    const invalidateResult = useCallback(() => setResult(null), [])

    const designer = useDesigner({
        autosaveKey: BULK_AUTOSAVE_KEY,
        onError: setError,
        onChange: invalidateResult,
    })
    const {
        design,
        setDesign,
        patchElement: patchDesignElement,
        selection,
        setSelection,
        selectElement,
        background,
        templateVersion,
        autosave,
        notice,
        setNotice,
        downloadTemplate,
        handleTemplateFile,
        resetDesign,
    } = designer

    const [source, setSource] = useState<NameSource>("csv")
    const [csv, setCsv] = useState<CsvState | null>(null)
    const [pasted, setPasted] = useState("")
    /** Which recipient the preview is standing on. */
    const [previewIndex, setPreviewIndex] = useState(0)
    /** Hand-made changes for one recipient only, keyed by their position in the list. */
    const [tweaks, setTweaks] = useState<Record<number, RowTweak>>({})
    /** Which element the tweak editor is pointed at. */
    const [overrideId, setOverrideId] = useState<ElementId>("name")
    /** Ids of the elements whose text did not fit on the previewed certificate. */
    const [overflowIds, setOverflowIds] = useState("")

    const [format, setFormat] = useState<ExportFormat>("png")
    const [quality, setQuality] = useState(92)
    const [pdfQuality, setPdfQuality] = useState(PDF_QUALITIES[0].value)
    const [pdfMode, setPdfMode] = useState<PdfMode>("single")
    const [scale, setScale] = useState(1)
    const [pattern, setPattern] = useState("{name}")

    const [phase, setPhase] = useState<Phase>("idle")
    const [progress, setProgress] = useState(0)
    const cancelRef = useRef(false)

    const recipients = useMemo(() => {
        if (source === "paste") return recipientsFromNames(parseNameList(pasted))
        if (!csv) return []
        return buildRecipients(csv.rows, csv.column, csv.hasHeader)
    }, [source, pasted, csv])

    const tooMany = recipients.length > MAX_NAMES
    const usable = useMemo(() => recipients.slice(0, MAX_NAMES), [recipients])

    /** The tokens this list can fill. `{name}` and `{index}` always work. */
    const tokenKeys = useMemo(() => {
        if (source === "paste" || !csv) return ["name", "index"]
        const extra = columnKeys(csv.rows, csv.hasHeader).filter(
            (key: string) => key && key !== "name" && key !== "index"
        )
        return ["name", "index", ...extra]
    }, [source, csv])

    /** Tokens written into the design or the file name that nothing in the list can fill. */
    const unknownTokens = useMemo(() => {
        const known = new Set(tokenKeys)
        const unknown: string[] = []
        const scan = (text: string) => {
            for (const token of findTokens(text)) {
                if (!known.has(token) && !unknown.includes(token)) unknown.push(token)
            }
        }
        for (const id of TEXT_ELEMENT_IDS) scan(design.elements[id].text)
        for (const tweak of Object.values(tweaks)) {
            for (const text of Object.values(tweak.text ?? {})) if (text) scan(text)
        }
        scan(pattern)
        return unknown
    }, [design.elements, tokenKeys, tweaks, pattern])

    // The index is kept in range here rather than in state, so a shorter list can never point past its end.
    const safeIndex = usable.length > 0 ? Math.min(previewIndex, usable.length - 1) : 0
    const previewTweak = tweaks[safeIndex]
    const baseRecipient = usable[safeIndex] ?? PLACEHOLDER_RECIPIENT
    const previewRecipient = useMemo(
        () => withTweak(baseRecipient, previewTweak),
        [baseRecipient, previewTweak]
    )
    const previewName = baseRecipient.name

    /** The recipient with the longest name: the one most likely to overflow. */
    const longestIndex = useMemo(() => {
        let best = 0
        for (let i = 1; i < usable.length; i++) {
            if (usable[i].name.length > usable[best].name.length) best = i
        }
        return best
    }, [usable])

    const stepPreview = useCallback(
        (delta: number) => {
            setPreviewIndex((current) => {
                if (usable.length === 0) return 0
                const from = Math.min(current, usable.length - 1)
                return (from + delta + usable.length) % usable.length
            })
        },
        [usable.length]
    )

    /** Changes what has been tweaked for the recipient currently in the preview. */
    const patchTweak = useCallback(
        (index: number, change: (tweak: RowTweak) => RowTweak) => {
            setTweaks((current) => {
                const next = change(current[index] ?? {})
                if (!hasTweak(next)) {
                    if (!current[index]) return current
                    const copy = { ...current }
                    delete copy[index]
                    return copy
                }
                return { ...current, [index]: next }
            })
        },
        []
    )

    /** A new list means the old per-recipient tweaks no longer point at anybody. */
    const resetRecipientState = useCallback(() => {
        setTweaks({})
        setPreviewIndex(0)
    }, [])

    const nudge = previewTweak?.nudge ?? NAME_NUDGE_ZERO

    const setNudge = useCallback(
        (next: NameNudge) => {
            patchTweak(safeIndex, (tweak) => ({ ...tweak, nudge: next }))
        },
        [patchTweak, safeIndex]
    )

    const nudgePreview = useCallback(
        (dx: number, dy: number) => {
            patchTweak(safeIndex, (tweak) => {
                const current = tweak.nudge ?? NAME_NUDGE_ZERO
                return {
                    ...tweak,
                    nudge: {
                        ...current,
                        dx: round2(clamp(current.dx + dx, -50, 50)),
                        dy: round2(clamp(current.dy + dy, -50, 50)),
                    },
                }
            })
        },
        [patchTweak, safeIndex]
    )

    /** Plain names for the "did not fit" warning under the preview. */
    const overflowLabels = useMemo(
        () =>
            overflowIds
                .split(",")
                .filter((id): id is ElementId => id.length > 0 && id in ELEMENT_LABELS)
                .map((id) => ELEMENT_LABELS[id]),
        [overflowIds]
    )

    const columnOptions = useMemo(() => {
        if (!csv || csv.rows.length === 0) return []
        const width = Math.max(...csv.rows.map((row) => row.length))
        return Array.from({ length: width }, (_, index) => ({
            index,
            label: csv.hasHeader && csv.rows[0][index] ? csv.rows[0][index] : `Column ${index + 1}`,
        }))
    }, [csv])

    const handleCsvFile = useCallback(async (file: File) => {
        setError("")
        setResult(null)
        resetRecipientState()
        try {
            const text = await file.text()
            const { rows } = parseCsv(text)
            if (rows.length === 0) {
                setError("That file has no readable rows. Check that it is a CSV with at least one name.")
                setCsv(null)
                return
            }
            const hasHeader = looksLikeHeader(rows[0])
            setCsv({ fileName: file.name, rows, hasHeader, column: guessNameColumn(rows) })
        } catch {
            setError("Could not read that file. Please upload a plain .csv or .txt file.")
        }
    }, [resetRecipientState])

    const downloadSampleCsv = useCallback(() => {
        const sample =
            "﻿Name,Email\r\nRavi Kumar,ravi@example.com\r\nAnita Shah,anita@example.com\r\nJohn Doe,john@example.com\r\n"
        downloadBlob(new Blob([sample], { type: "text/csv;charset=utf-8" }), "sample-participants.csv")
    }, [])

    /**
     * Draws one certificate at full export resolution. `opaque` paints white behind
     * anything transparent, for the formats that have no alpha channel of their own.
     */
    const drawOne = useCallback(
        (
            canvas: HTMLCanvasElement,
            ctx: CanvasRenderingContext2D,
            exportDesign: CertificateDesign,
            recipient: Recipient,
            opaque: boolean
        ) => {
            renderCertificate(ctx, exportDesign, recipient, background)
            if (!opaque) return
            ctx.save()
            ctx.globalCompositeOperation = "destination-over"
            ctx.fillStyle = "#FFFFFF"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.restore()
        },
        [background]
    )

    /** Renders one certificate as a PNG or JPEG and returns its bytes. */
    const renderOne = useCallback(
        async (
            canvas: HTMLCanvasElement,
            ctx: CanvasRenderingContext2D,
            exportDesign: CertificateDesign,
            recipient: Recipient,
            mimeType: string
        ): Promise<Uint8Array> => {
            drawOne(canvas, ctx, exportDesign, recipient, mimeType === "image/jpeg")

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, mimeType, mimeType === "image/jpeg" ? quality / 100 : undefined)
            )
            if (!blob) throw new Error("The browser could not encode the certificate image.")
            return new Uint8Array(await blob.arrayBuffer())
        },
        [drawOne, quality]
    )

    /** Renders one certificate as a single PDF page at the design's real print size. */
    const renderPdfPage = useCallback(
        async (
            canvas: HTMLCanvasElement,
            ctx: CanvasRenderingContext2D,
            exportDesign: CertificateDesign,
            recipient: Recipient,
            page: { width: number; height: number }
        ): Promise<PdfPage> => {
            // A PDF page is paper: there is nothing behind it for transparency to show through.
            drawOne(canvas, ctx, exportDesign, recipient, true)
            return {
                image: await encodeCanvasForPdf(canvas, pdfQuality),
                width: page.width,
                height: page.height,
            }
        },
        [drawOne, pdfQuality]
    )

    const exportDesign = useMemo<CertificateDesign>(() => {
        // Uploaded artwork is exported at its own resolution; upscaling it would only add weight.
        const factor = design.mode === "upload" ? 1 : scale
        return {
            ...design,
            width: Math.round(design.width * factor),
            height: Math.round(design.height * factor),
        }
    }, [design, scale])

    /**
     * The sheet of paper a PDF page is. It comes from the design's own size, not the
     * exported one: a higher resolution puts more pixels on the same piece of paper.
     */
    const pageSize = useMemo(() => pdfPageSize(design.width, design.height), [design.width, design.height])

    const downloadSampleCertificate = useCallback(async () => {
        setError("")
        try {
            await loadDesignFonts(exportDesign)
            await loadDesignImages(exportDesign)
            const canvas = document.createElement("canvas")
            canvas.width = exportDesign.width
            canvas.height = exportDesign.height
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("Canvas is not available in this browser.")

            if (format === "pdf") {
                const page = await renderPdfPage(canvas, ctx, exportDesign, previewRecipient, pageSize)
                downloadBlob(createPdf([page], { title: "Sample certificate" }), "sample-certificate.pdf")
                return
            }

            const mimeType = format === "png" ? "image/png" : "image/jpeg"
            const bytes = await renderOne(canvas, ctx, exportDesign, previewRecipient, mimeType)
            downloadBlob(new Blob([bytes as BlobPart], { type: mimeType }), `sample-certificate.${format}`)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not create the sample certificate.")
        }
    }, [exportDesign, format, pageSize, previewRecipient, renderOne, renderPdfPage])

    const generate = useCallback(async () => {
        if (usable.length === 0) return

        setError("")
        setResult(null)
        setProgress(0)
        setPhase("working")
        cancelRef.current = false

        try {
            await loadDesignFonts(exportDesign)
            await loadDesignImages(exportDesign)
            const canvas = document.createElement("canvas")
            canvas.width = exportDesign.width
            canvas.height = exportDesign.height
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("Canvas is not available in this browser.")

            const mimeType = format === "png" ? "image/png" : "image/jpeg"
            const extension = format === "png" ? "png" : format === "jpeg" ? "jpg" : "pdf"
            // One PDF holding everybody is downloaded on its own; everything else is zipped up.
            const onePdf = format === "pdf" && pdfMode === "single"
            const pdfPages: PdfPage[] = []
            const entries: ZipEntry[] = []
            const manifest: { index: number; name: string; file: string }[] = []
            const usedNames = new Map<string, number>()

            for (let i = 0; i < usable.length; i++) {
                if (cancelRef.current) {
                    setPhase("idle")
                    setProgress(0)
                    return
                }

                const recipient = withTweak(usable[i], tweaks[i])

                if (format === "pdf") {
                    const page = await renderPdfPage(canvas, ctx, exportDesign, recipient, pageSize)
                    if (onePdf) {
                        pdfPages.push(page)
                    } else {
                        const fileName = buildFileName(pattern, recipient, i + 1, extension, usedNames)
                        entries.push({ name: fileName, data: createPdfBytes([page], { title: recipient.name }) })
                        manifest.push({ index: i + 1, name: recipient.name, file: fileName })
                    }
                } else {
                    const fileName = buildFileName(pattern, recipient, i + 1, extension, usedNames)
                    const data = await renderOne(canvas, ctx, exportDesign, recipient, mimeType)
                    entries.push({ name: fileName, data })
                    manifest.push({ index: i + 1, name: recipient.name, file: fileName })
                }

                setProgress(i + 1)

                // Hand the main thread back so the progress bar paints and the tab stays responsive.
                if (i % 5 === 4) await new Promise((resolve) => setTimeout(resolve, 0))
            }

            const stamp = new Date().toISOString().slice(0, 10)

            if (onePdf) {
                const pdf = createPdf(pdfPages, { title: `Certificates (${pdfPages.length})` })
                const pdfName = `certificates-${pdfPages.length}-${stamp}.pdf`

                setResult({ blob: pdf, fileName: pdfName, count: pdfPages.length, kind: "pdf" })
                setPhase("done")
                downloadBlob(pdf, pdfName)
                return
            }

            entries.push({
                name: "_index.csv",
                data: new TextEncoder().encode(buildIndexCsv(manifest)),
            })

            const zip = createZip(entries)
            const zipName = `certificates-${entries.length - 1}-${stamp}.zip`

            setResult({ blob: zip, fileName: zipName, count: entries.length - 1, kind: "zip" })
            setPhase("done")
            downloadBlob(zip, zipName)
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Something went wrong while generating the certificates."
            )
            setPhase("idle")
        }
    }, [usable, tweaks, exportDesign, format, pageSize, pattern, pdfMode, renderOne, renderPdfPage])

    const progressPercent = usable.length > 0 ? Math.round((progress / usable.length) * 100) : 0
    /** Everything lands in one PDF rather than a ZIP of separate files. */
    const singlePdf = format === "pdf" && pdfMode === "single"

    return (
        <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono">
            <nav className="border-b-3 border-black bg-white sticky top-0 z-50 shadow-neo">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        <Link
                            href="/"
                            className="text-lg sm:text-2xl font-black bg-black text-white px-3 py-1 border-3 border-black shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 uppercase tracking-tight"
                        >
                            CertiFoolProof
                        </Link>
                        <div className="flex items-center gap-3 sm:gap-6">
                            <Link
                                href="/verify"
                                className="text-black font-black hover:underline decoration-3 underline-offset-4 text-xs sm:text-sm uppercase tracking-wider"
                            >
                                Verify
                            </Link>
                            <Link
                                href="/login"
                                className="px-3 py-1.5 sm:px-4 sm:py-2 border-3 border-black bg-neo-yellow text-black font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-all shadow-neo hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="border-3 border-black bg-neo-cream p-6 sm:p-8 shadow-neo mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 border-3 border-black bg-white font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-neo mb-4">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-black animate-pulse" />
                        Free · No sign-up · Runs in your browser
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black uppercase italic leading-tight mb-3">
                        Bulk Certificate{" "}
                        <span className="bg-neo-yellow px-2 border-3 border-black shadow-neo not-italic inline-block">
                            Generator
                        </span>
                    </h1>
                    <p className="font-bold text-sm sm:text-base border-t-3 border-black pt-4 max-w-3xl">
                        Design a certificate, upload a CSV of participant names, and download every
                        personalised certificate as one ZIP. Nothing is uploaded to a server - your list
                        never leaves this device.
                    </p>
                    <p className="font-bold text-xs sm:text-sm mt-4 bg-white border-3 border-black p-3">
                        Need certificates with unique IDs, QR verification and revocation?{" "}
                        <Link href="/login" className="underline decoration-3 underline-offset-2">
                            Sign in
                        </Link>{" "}
                        to issue verifiable certificates from the{" "}
                        <Link href="/generate" className="underline decoration-3 underline-offset-2">
                            issuing page
                        </Link>
                        .
                    </p>
                </div>

                {error ? (
                    <div className="mb-6 p-4 border-3 border-black bg-red-500 text-white font-black uppercase text-sm shadow-neo">
                        {error}
                    </div>
                ) : null}

                {notice ? (
                    <div className="mb-6 p-4 border-3 border-black bg-neo-yellow font-black text-sm shadow-neo flex items-start justify-between gap-4">
                        <span>{notice}</span>
                        <button
                            type="button"
                            onClick={() => setNotice("")}
                            className="shrink-0 uppercase text-xs underline decoration-2 underline-offset-2"
                        >
                            Dismiss
                        </button>
                    </div>
                ) : null}

                {tooMany ? (
                    <div className="mb-6 p-4 border-3 border-black bg-neo-yellow font-black text-sm shadow-neo">
                        Your list has {recipients.length.toLocaleString()} names. Only the first{" "}
                        {MAX_NAMES.toLocaleString()} will be generated in this batch - split the file and run
                        it again for the rest.
                    </div>
                ) : null}

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
                    <div className="space-y-6 min-w-0">
                        <section className={cardClass}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black uppercase italic leading-tight">Template</h2>
                                    <p className="font-bold text-xs text-black/70 mt-0.5">
                                        {autosave === "failed"
                                            ? "Autosave is unavailable in this browser - save the template to keep your work."
                                            : autosave === "saved-without-artwork"
                                                ? "Autosaved, but your uploaded artwork or images are too large to keep in this browser - save the template file to keep them."
                                                : "Your design is autosaved in this browser, so a refresh will not lose it."}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => void downloadTemplate()} className={smallButtonClass}>
                                        Save template
                                    </button>
                                    <label className={`${smallButtonClass} cursor-pointer`}>
                                        Load template
                                        <input
                                            type="file"
                                            accept=".json,application/json"
                                            className="hidden"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0]
                                                if (file) void handleTemplateFile(file)
                                                event.target.value = ""
                                            }}
                                        />
                                    </label>
                                    <button type="button" onClick={resetDesign} className={smallButtonClass}>
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className={cardClass}>
                            <StepHeading step={1} title="Design the certificate" hint="Start from a preset or drop in your own artwork." />

                            <DesignBasics designer={designer} />
                        </section>

                        <section className={cardClass}>
                            <StepHeading
                                step={2}
                                title="Edit the text"
                                hint="Every line is its own element. Click it on the preview, then drag, resize or restyle it."
                            />

                            <ElementPanel
                                design={design}
                                selectedId={selection?.kind === "element" ? selection.id : null}
                                onSelect={selectElement}
                                onPatch={patchDesignElement}
                                tokens={tokenKeys}
                            />
                        </section>

                        <section className={cardClass}>
                            <StepHeading
                                step={3}
                                title="Signatories and logos"
                                hint="Add as many signatories as you need, each with a signature, and place your logos."
                            />

                            <div className="space-y-8">
                                <div>
                                    <h3 className="mb-3 font-black uppercase italic text-sm border-b-3 border-black pb-1">
                                        Signatories
                                    </h3>
                                    <SignatoryPanel
                                        design={design}
                                        selection={selection}
                                        padKey={templateVersion}
                                        onSelect={setSelection}
                                        onUpdate={setDesign}
                                    />
                                </div>
                                <div>
                                    <h3 className="mb-3 font-black uppercase italic text-sm border-b-3 border-black pb-1">
                                        Logos
                                    </h3>
                                    <LogoPanel
                                        design={design}
                                        selection={selection}
                                        onSelect={setSelection}
                                        onUpdate={setDesign}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className={cardClass}>
                            <StepHeading
                                step={4}
                                title="Add the participants"
                                hint="Upload a CSV, or paste one name per line."
                            />

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {(
                                    [
                                        ["csv", "Upload CSV"],
                                        ["paste", "Paste names"],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            if (value !== source) resetRecipientState()
                                            setSource(value)
                                        }}
                                        className={`px-3 py-2.5 border-3 border-black font-black uppercase text-[11px] sm:text-xs transition-all ${source === value ? "bg-black text-white shadow-none" : "bg-white shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1"}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {source === "csv" ? (
                                <div className="space-y-4">
                                    <label className="block border-3 border-dashed border-black bg-neo-cream p-6 text-center cursor-pointer hover:bg-neo-yellow transition-all">
                                        <span className="block font-black uppercase italic text-sm mb-1">
                                            {csv ? "Choose a different CSV" : "Choose a CSV file"}
                                        </span>
                                        <span className="block font-bold text-xs text-black/70">
                                            .csv or .txt · commas, semicolons or tabs
                                        </span>
                                        <input
                                            type="file"
                                            accept=".csv,.txt,text/csv,text/plain"
                                            className="hidden"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0]
                                                if (file) void handleCsvFile(file)
                                                event.target.value = ""
                                            }}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={downloadSampleCsv}
                                        className="font-black uppercase text-[11px] underline decoration-3 underline-offset-4"
                                    >
                                        Download a sample CSV
                                    </button>

                                    {csv ? (
                                        <div className="border-3 border-black bg-neo-cream p-4 space-y-3">
                                            <p className="font-bold text-sm break-all">{csv.fileName}</p>

                                            <label className="flex items-center gap-2 font-black uppercase text-xs cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={csv.hasHeader}
                                                    onChange={(event) => {
                                                        resetRecipientState()
                                                        setCsv({ ...csv, hasHeader: event.target.checked })
                                                    }}
                                                    className="w-5 h-5 border-3 border-black accent-black"
                                                />
                                                First row is a header
                                            </label>

                                            <div>
                                                <label className={labelClass} htmlFor="name-column">
                                                    Column with the names
                                                </label>
                                                <select
                                                    id="name-column"
                                                    className={inputClass}
                                                    value={csv.column}
                                                    onChange={(event) => {
                                                        resetRecipientState()
                                                        setCsv({ ...csv, column: Number(event.target.value) })
                                                    }}
                                                >
                                                    {columnOptions.map((option) => (
                                                        <option key={option.index} value={option.index}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <textarea
                                    rows={8}
                                    className={`${inputClass} resize-y`}
                                    placeholder={"Ravi Kumar\nAnita Shah\nJohn Doe"}
                                    value={pasted}
                                    onChange={(event) => setPasted(event.target.value)}
                                />
                            )}

                            {recipients.length > 0 ? (
                                <div className="mt-4 border-3 border-black bg-white p-4">
                                    <p className="font-black uppercase text-sm mb-2">
                                        {recipients.length.toLocaleString()} name
                                        {recipients.length === 1 ? "" : "s"} detected
                                    </p>
                                    <ul className="font-bold text-xs space-y-1">
                                        {usable.slice(0, 5).map((recipient: Recipient, index: number) => (
                                            <li key={`${recipient.name}-${index}`} className="truncate">
                                                {index + 1}. {recipient.name}
                                            </li>
                                        ))}
                                    </ul>
                                    {usable.length > 5 ? (
                                        <p className="font-bold text-xs text-black/60 mt-2">
                                            + {(usable.length - 5).toLocaleString()} more
                                        </p>
                                    ) : null}

                                    <div className="mt-4 border-t-3 border-black pt-3">
                                        <p className="font-black uppercase text-[11px] mb-2">
                                            Tokens from this list
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {tokenKeys.map((token) => (
                                                <span
                                                    key={token}
                                                    className="px-2 py-1 border-3 border-black bg-neo-cream font-black text-[11px]"
                                                >
                                                    {`{${token}}`}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="font-bold text-[11px] text-black/60 mt-2">
                                            Write a token into any text in step 2 and every certificate gets that
                                            person&apos;s own value. {"{index}"} is their place in this batch.
                                            {source === "paste"
                                                ? " Upload a CSV instead to bring in columns such as course or score."
                                                : null}
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            {unknownTokens.length > 0 ? (
                                <div className="mt-4 border-3 border-black bg-neo-yellow p-3 font-bold text-xs">
                                    Nothing in your list fills{" "}
                                    <span className="font-black">
                                        {unknownTokens.map((token) => `{${token}}`).join(" ")}
                                    </span>
                                    . It is left as it is on the certificate, so either add that column to your CSV
                                    or take the token out of the text.
                                </div>
                            ) : null}
                        </section>
                    </div>

                    <div className="space-y-6 min-w-0">
                        <div className="lg:sticky lg:top-24 space-y-6">
                            <section className={cardClass}>
                                <div className="flex items-baseline justify-between gap-3 mb-4">
                                    <h2 className="text-lg sm:text-xl font-black uppercase italic">Live preview</h2>
                                    <span className="font-bold text-[11px] text-black/60 uppercase text-right">
                                        Click to select · drag to move
                                    </span>
                                </div>
                                <DesignStage
                                    designer={designer}
                                    recipient={previewRecipient}
                                    onOverflow={setOverflowIds}
                                />

                                <div className="mt-3 flex items-stretch gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewIndex(0)}
                                        disabled={usable.length < 2}
                                        aria-label="First recipient"
                                        title="First recipient"
                                        className={`${smallButtonClass} px-2.5`}
                                    >
                                        |◀
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => stepPreview(-1)}
                                        disabled={usable.length < 2}
                                        aria-label="Previous recipient"
                                        title="Previous recipient"
                                        className={`${smallButtonClass} px-2.5`}
                                    >
                                        ◀
                                    </button>
                                    <div className="flex-1 min-w-0 border-3 border-black bg-neo-cream px-3 py-1.5">
                                        <p className="font-black text-xs truncate">{previewName}</p>
                                        <p className="font-bold text-[11px] text-black/60">
                                            {usable.length > 0
                                                ? `${safeIndex + 1} of ${usable.length.toLocaleString()}${hasTweak(previewTweak) ? " · tweaked" : ""}`
                                                : "Sample name - add participants in step 4"}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => stepPreview(1)}
                                        disabled={usable.length < 2}
                                        aria-label="Next recipient"
                                        title="Next recipient"
                                        className={`${smallButtonClass} px-2.5`}
                                    >
                                        ▶
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewIndex(longestIndex)}
                                        disabled={usable.length < 2}
                                        title="Jump to the longest name"
                                        className={smallButtonClass}
                                    >
                                        Longest
                                    </button>
                                </div>

                                {overflowLabels.length > 0 ? (
                                    <p className="mt-3 border-3 border-black bg-neo-yellow p-3 font-bold text-xs">
                                        Did not fit as set: {overflowLabels.join(", ")}. It was made smaller or cut
                                        short to stay inside its width - widen it, shrink the type, or let it wrap in
                                        step 2.
                                    </p>
                                ) : null}

                                {usable.length > 0 ? (
                                    <div className="mt-4 border-3 border-black bg-neo-cream p-4 space-y-4">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <h3 className="font-black uppercase italic text-sm">
                                                Only for {previewName}
                                            </h3>
                                            {hasTweak(previewTweak) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setTweaks((current) => {
                                                        const copy = { ...current }
                                                        delete copy[safeIndex]
                                                        return copy
                                                    })}
                                                    className="font-black uppercase text-[10px] underline decoration-2 underline-offset-2"
                                                >
                                                    Reset this recipient
                                                </button>
                                            ) : null}
                                        </div>

                                        <div>
                                            <label className={labelClass} htmlFor="override-element">
                                                Different wording for this certificate
                                            </label>
                                            <select
                                                id="override-element"
                                                className={`${inputClass} mb-2`}
                                                value={overrideId}
                                                onChange={(event) => setOverrideId(event.target.value as ElementId)}
                                            >
                                                {OVERRIDABLE_IDS.map((id) => (
                                                    <option key={id} value={id}>
                                                        {ELEMENT_LABELS[id]}
                                                        {previewTweak?.text?.[id] !== undefined ? " · changed" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                id="override-text"
                                                className={inputClass}
                                                value={previewTweak?.text?.[overrideId] ?? ""}
                                                placeholder={
                                                    overrideId === "name"
                                                        ? design.elements.name.text || "{name}"
                                                        : design.elements[overrideId].text || "(empty)"
                                                }
                                                onChange={(event) => {
                                                    const value = event.target.value
                                                    patchTweak(safeIndex, (tweak) => {
                                                        const text = { ...tweak.text }
                                                        if (value === "") delete text[overrideId]
                                                        else text[overrideId] = value
                                                        return { ...tweak, text }
                                                    })
                                                }}
                                            />
                                            <p className="font-bold text-[11px] text-black/60 mt-1.5">
                                                Leave it empty to keep what the design says. Tokens work here too, so
                                                one runner-up can read {"Runner-up · {course}"} while everyone else
                                                keeps the usual wording.
                                            </p>
                                        </div>

                                        <div className="border-t-3 border-black/20 pt-3">
                                            <span className={labelClass}>Nudge this name</span>
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                {(
                                                    [
                                                        ["←", -NUDGE_STEP, 0, "Move the name left"],
                                                        ["↑", 0, -NUDGE_STEP, "Move the name up"],
                                                        ["↓", 0, NUDGE_STEP, "Move the name down"],
                                                        ["→", NUDGE_STEP, 0, "Move the name right"],
                                                    ] as const
                                                ).map(([glyph, dx, dy, label]) => (
                                                    <button
                                                        key={glyph}
                                                        type="button"
                                                        aria-label={label}
                                                        title={label}
                                                        onClick={() => nudgePreview(dx, dy)}
                                                        className={`${smallButtonClass} px-3`}
                                                    >
                                                        {glyph}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <NumberField
                                                    id="nudge-dx"
                                                    label="Left / right"
                                                    value={nudge.dx}
                                                    min={-50}
                                                    max={50}
                                                    onChange={(dx) => setNudge({ ...nudge, dx })}
                                                />
                                                <NumberField
                                                    id="nudge-dy"
                                                    label="Up / down"
                                                    value={nudge.dy}
                                                    min={-50}
                                                    max={50}
                                                    onChange={(dy) => setNudge({ ...nudge, dy })}
                                                />
                                            </div>
                                            <div className="mt-3">
                                                <RangeField
                                                    id="nudge-scale"
                                                    label="Name size"
                                                    display={`${Math.round(nudge.scale * 100)}%`}
                                                    value={Math.round(nudge.scale * 100)}
                                                    min={50}
                                                    max={200}
                                                    step={1}
                                                    onChange={(percent) => setNudge({ ...nudge, scale: percent / 100 })}
                                                />
                                            </div>
                                            <p className="font-bold text-[11px] text-black/60 mt-1.5">
                                                Moves and resizes the name on this certificate only, on top of where
                                                the design puts it. Dragging the name on the preview still moves it on
                                                every certificate.
                                            </p>
                                        </div>
                                    </div>
                                ) : null}
                            </section>

                            <section className={cardClass}>
                                <StepHeading
                                    step={5}
                                    title={singlePdf ? "Download the PDF" : "Download the ZIP"}
                                />

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass} htmlFor="format">
                                                File format
                                            </label>
                                            <select
                                                id="format"
                                                className={inputClass}
                                                value={format}
                                                onChange={(event) =>
                                                    setFormat(event.target.value as ExportFormat)
                                                }
                                            >
                                                <option value="png">PNG · sharpest</option>
                                                <option value="jpeg">JPG · smallest files</option>
                                                <option value="pdf">PDF · ready to print</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass} htmlFor="scale">
                                                Resolution
                                            </label>
                                            <select
                                                id="scale"
                                                className={inputClass}
                                                value={scale}
                                                disabled={design.mode === "upload"}
                                                onChange={(event) => setScale(Number(event.target.value))}
                                            >
                                                <option value={1}>Standard · print ready</option>
                                                <option value={1.5}>High · 1.5×</option>
                                                <option value={2}>Maximum · 2×</option>
                                            </select>
                                        </div>
                                    </div>

                                    {format === "jpeg" ? (
                                        <div>
                                            <label className={labelClass} htmlFor="quality">
                                                JPG quality · {quality}%
                                            </label>
                                            <input
                                                id="quality"
                                                type="range"
                                                min={60}
                                                max={100}
                                                step={1}
                                                value={quality}
                                                onChange={(event) => setQuality(Number(event.target.value))}
                                                className="w-full accent-black"
                                            />
                                        </div>
                                    ) : null}

                                    {format === "pdf" ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass} htmlFor="pdf-mode">
                                                    PDF layout
                                                </label>
                                                <select
                                                    id="pdf-mode"
                                                    className={inputClass}
                                                    value={pdfMode}
                                                    onChange={(event) =>
                                                        setPdfMode(event.target.value === "each" ? "each" : "single")
                                                    }
                                                >
                                                    <option value="single">One PDF · a page each</option>
                                                    <option value="each">One PDF per person · in a ZIP</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass} htmlFor="pdf-quality">
                                                    Page quality
                                                </label>
                                                <select
                                                    id="pdf-quality"
                                                    className={inputClass}
                                                    value={pdfQuality}
                                                    onChange={(event) => setPdfQuality(Number(event.target.value))}
                                                >
                                                    {PDF_QUALITIES.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {design.mode === "upload" && pdfQuality === 100 ? (
                                                <p className="col-span-2 font-bold text-[11px] text-black/60">
                                                    Lossless keeps photographic artwork pixel for pixel, which makes
                                                    much larger files. Pick High for a big batch.
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <div>
                                        <label className={labelClass} htmlFor="pattern">
                                            File name pattern
                                        </label>
                                        <input
                                            id="pattern"
                                            className={inputClass}
                                            value={pattern}
                                            onChange={(event) => setPattern(event.target.value)}
                                            placeholder="{name}"
                                        />
                                        <p className="font-bold text-[11px] text-black/60 mt-1.5">
                                            {singlePdf
                                                ? "Every certificate is a page of one PDF, so the pattern is not used."
                                                : `Use {name} and {index} · e.g. {index}-{name}`}
                                        </p>
                                    </div>

                                    <p className="font-bold text-xs border-3 border-black bg-neo-cream p-3">
                                        Exporting at {exportDesign.width} × {exportDesign.height} px ·{" "}
                                        {usable.length.toLocaleString()} certificate
                                        {usable.length === 1 ? "" : "s"}
                                        {format === "pdf" ? ` · pages are ${pageSize.label}` : ""}
                                    </p>

                                    {phase === "working" ? (
                                        <div className="space-y-3">
                                            <div className="h-6 border-3 border-black bg-white overflow-hidden">
                                                <div
                                                    className="h-full bg-neo-yellow border-r-3 border-black transition-all duration-150"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                            <p className="font-black uppercase text-xs text-center">
                                                Generating {progress.toLocaleString()} /{" "}
                                                {usable.length.toLocaleString()} · {progressPercent}%
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    cancelRef.current = true
                                                }}
                                                className={`${buttonClass} w-full bg-white`}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <button
                                                type="button"
                                                onClick={() => void generate()}
                                                disabled={usable.length === 0}
                                                className={`${buttonClass} w-full bg-neo-yellow text-base`}
                                            >
                                                {usable.length === 0
                                                    ? "Add participants first"
                                                    : `Generate ${usable.length.toLocaleString()} certificate${usable.length === 1 ? "" : "s"}`}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void downloadSampleCertificate()}
                                                className={`${buttonClass} w-full bg-white`}
                                            >
                                                Download one sample
                                            </button>
                                        </div>
                                    )}

                                    {phase === "done" && result ? (
                                        <div className="border-3 border-black bg-neo-pink p-4 shadow-neo space-y-3">
                                            <p className="font-black uppercase italic text-base">
                                                {result.count.toLocaleString()} certificates ready
                                            </p>
                                            <p className="font-bold text-xs break-all">
                                                {result.fileName} · {formatBytes(result.blob.size)}
                                            </p>
                                            <p className="font-bold text-xs">
                                                {result.kind === "pdf" ? (
                                                    <>
                                                        One page per participant, {pageSize.label}, in the order of
                                                        your list.
                                                    </>
                                                ) : (
                                                    <>
                                                        The ZIP also contains{" "}
                                                        <span className="underline">_index.csv</span> mapping every
                                                        participant to their file.
                                                    </>
                                                )}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => downloadBlob(result.blob, result.fileName)}
                                                className={`${buttonClass} w-full bg-white`}
                                            >
                                                Download again
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="border-t-3 border-black bg-white px-4 sm:px-6 lg:px-8 py-6 mt-8">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="font-black text-xs uppercase">
                        © 2026 CertiFoolProof. All rights reserved.
                    </span>
                    <div className="flex gap-6 text-xs font-black uppercase">
                        <Link href="/" className="hover:underline decoration-3 underline-offset-4">
                            Home
                        </Link>
                        <Link href="/verify" className="hover:underline decoration-3 underline-offset-4">
                            Verify
                        </Link>
                        <Link href="/login" className="hover:underline decoration-3 underline-offset-4">
                            Sign In
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}