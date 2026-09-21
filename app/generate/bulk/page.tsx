"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
    NAME_FONTS,
    PRESET_PALETTES,
    SIZE_PRESETS,
    createDefaultDesign,
    renderCertificate,
    renderToCanvas,
    type Align,
    type CertificateDesign,
    type PresetId,
} from "@/lib/bulk/renderer"
import {
    extractNames,
    guessNameColumn,
    looksLikeHeader,
    parseCsv,
    parseNameList,
} from "@/lib/bulk/csv"
import { buildFileName, buildIndexCsv, downloadBlob, formatBytes } from "@/lib/bulk/export"
import { createZip, type ZipEntry } from "@/lib/bulk/zip"

/** Keeps a single batch inside what a browser tab can comfortably hold in memory. */
const MAX_NAMES = 5000
/** Uploaded artwork above this width is scaled down - past here it is all weight, no sharpness. */
const MAX_BACKGROUND_WIDTH = 3000

const PRESETS: { id: PresetId; label: string }[] = [
    { id: "classic", label: "Classic" },
    { id: "neo", label: "Neo Brutal" },
    { id: "minimal", label: "Minimal" },
]

const inputClass =
    "w-full px-3 py-2 border-3 border-black bg-white text-black font-bold text-sm placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
const labelClass = "block text-[11px] font-black uppercase tracking-tighter text-black mb-1.5"
const cardClass = "border-3 border-black bg-white p-5 sm:p-6 shadow-neo"
const buttonClass =
    "px-5 py-3 border-3 border-black font-black uppercase italic text-sm shadow-neo transition-all hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-neo disabled:hover:translate-x-0 disabled:hover:translate-y-0"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type NameSource = "csv" | "paste"
type Phase = "idle" | "working" | "done"

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
    const [design, setDesign] = useState<CertificateDesign>(createDefaultDesign)
    const [error, setError] = useState("")

    const [background, setBackground] = useState<HTMLImageElement | null>(null)
    const [backgroundName, setBackgroundName] = useState("")
    const backgroundUrlRef = useRef<string | null>(null)

    const [source, setSource] = useState<NameSource>("csv")
    const [csv, setCsv] = useState<CsvState | null>(null)
    const [pasted, setPasted] = useState("")

    const [format, setFormat] = useState<"png" | "jpeg">("png")
    const [quality, setQuality] = useState(92)
    const [scale, setScale] = useState(1)
    const [pattern, setPattern] = useState("{name}")

    const [phase, setPhase] = useState<Phase>("idle")
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<GenerationResult | null>(null)
    const cancelRef = useRef(false)

    const previewRef = useRef<HTMLCanvasElement | null>(null)
    const [dragging, setDragging] = useState(false)

    const update = useCallback(
        <K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) => {
            setDesign((current) => ({ ...current, [key]: value }))
        },
        []
    )

    const names = useMemo(() => {
        if (source === "paste") return parseNameList(pasted)
        if (!csv) return []
        return extractNames(csv.rows, csv.column, csv.hasHeader)
    }, [source, pasted, csv])

    const tooMany = names.length > MAX_NAMES
    const usableNames = useMemo(() => names.slice(0, MAX_NAMES), [names])
    const previewName = usableNames[0] || "Participant Name"

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
    }, [])

    const downloadSampleCsv = useCallback(() => {
        const sample =
            "﻿Name,Email\r\nRavi Kumar,ravi@example.com\r\nAnita Shah,anita@example.com\r\nJohn Doe,john@example.com\r\n"
        downloadBlob(new Blob([sample], { type: "text/csv;charset=utf-8" }), "sample-participants.csv")
    }, [])

    const handleBackgroundFile = useCallback((file: File) => {
        setError("")
        setResult(null)
        const url = URL.createObjectURL(file)
        const image = new window.Image()

        image.onload = () => {
            if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current)
            backgroundUrlRef.current = url

            let width = image.naturalWidth
            let height = image.naturalHeight
            if (width > MAX_BACKGROUND_WIDTH) {
                height = Math.round((height * MAX_BACKGROUND_WIDTH) / width)
                width = MAX_BACKGROUND_WIDTH
            }

            setBackground(image)
            setBackgroundName(file.name)
            setDesign((current) => ({ ...current, mode: "upload", width, height }))
        }
        image.onerror = () => {
            URL.revokeObjectURL(url)
            setError("That image could not be loaded. Try a PNG or JPG file.")
        }
        image.src = url
    }, [])

    const clearBackground = useCallback(() => {
        if (backgroundUrlRef.current) {
            URL.revokeObjectURL(backgroundUrlRef.current)
            backgroundUrlRef.current = null
        }
        setBackground(null)
        setBackgroundName("")
        const size = SIZE_PRESETS[0]
        setDesign((current) => ({ ...current, mode: "builtin", width: size.width, height: size.height }))
    }, [])

    useEffect(() => {
        return () => {
            if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current)
        }
    }, [])

    useEffect(() => {
        const canvas = previewRef.current
        if (canvas) renderToCanvas(canvas, design, previewName, background)
    }, [design, previewName, background])

    const moveNameTo = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
        const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
        setDesign((current) => ({
            ...current,
            nameXPct: Math.round(x * 10) / 10,
            nameYPct: Math.round(y * 10) / 10,
        }))
    }, [])

    /** Renders one certificate at full export resolution and returns its bytes. */
    const renderOne = useCallback(
        async (
            canvas: HTMLCanvasElement,
            ctx: CanvasRenderingContext2D,
            exportDesign: CertificateDesign,
            name: string,
            mimeType: string
        ): Promise<Uint8Array> => {
            renderCertificate(ctx, exportDesign, name, background)

            if (mimeType === "image/jpeg") {
                // JPEG has no alpha channel: paint white behind anything transparent.
                ctx.save()
                ctx.globalCompositeOperation = "destination-over"
                ctx.fillStyle = "#FFFFFF"
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.restore()
            }

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, mimeType, mimeType === "image/jpeg" ? quality / 100 : undefined)
            )
            if (!blob) throw new Error("The browser could not encode the certificate image.")
            return new Uint8Array(await blob.arrayBuffer())
        },
        [background, quality]
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

    const downloadSampleCertificate = useCallback(async () => {
        setError("")
        try {
            const canvas = document.createElement("canvas")
            canvas.width = exportDesign.width
            canvas.height = exportDesign.height
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("Canvas is not available in this browser.")

            const mimeType = format === "png" ? "image/png" : "image/jpeg"
            const bytes = await renderOne(canvas, ctx, exportDesign, previewName, mimeType)
            downloadBlob(new Blob([bytes as BlobPart], { type: mimeType }), `sample-certificate.${format}`)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not create the sample certificate.")
        }
    }, [exportDesign, format, previewName, renderOne])

    const generate = useCallback(async () => {
        if (usableNames.length === 0) return

        setError("")
        setResult(null)
        setProgress(0)
        setPhase("working")
        cancelRef.current = false

        try {
            const canvas = document.createElement("canvas")
            canvas.width = exportDesign.width
            canvas.height = exportDesign.height
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("Canvas is not available in this browser.")

            const mimeType = format === "png" ? "image/png" : "image/jpeg"
            const extension = format === "png" ? "png" : "jpg"
            const entries: ZipEntry[] = []
            const manifest: { index: number; name: string; file: string }[] = []
            const usedNames = new Map<string, number>()

            for (let i = 0; i < usableNames.length; i++) {
                if (cancelRef.current) {
                    setPhase("idle")
                    setProgress(0)
                    return
                }

                const name = usableNames[i]
                const fileName = buildFileName(pattern, name, i + 1, extension, usedNames)
                const data = await renderOne(canvas, ctx, exportDesign, name, mimeType)

                entries.push({ name: fileName, data })
                manifest.push({ index: i + 1, name, file: fileName })
                setProgress(i + 1)

                // Hand the main thread back so the progress bar paints and the tab stays responsive.
                if (i % 5 === 4) await new Promise((resolve) => setTimeout(resolve, 0))
            }

            entries.push({
                name: "_index.csv",
                data: new TextEncoder().encode(buildIndexCsv(manifest)),
            })

            const zip = createZip(entries)
            const stamp = new Date().toISOString().slice(0, 10)
            const zipName = `certificates-${entries.length - 1}-${stamp}.zip`

            setResult({ blob: zip, fileName: zipName, count: entries.length - 1 })
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
    }, [usableNames, exportDesign, format, pattern, renderOne])

    const progressPercent =
        usableNames.length > 0 ? Math.round((progress / usableNames.length) * 100) : 0

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

                {tooMany ? (
                    <div className="mb-6 p-4 border-3 border-black bg-neo-yellow font-black text-sm shadow-neo">
                        Your list has {names.length.toLocaleString()} names. Only the first{" "}
                        {MAX_NAMES.toLocaleString()} will be generated in this batch - split the file and run
                        it again for the rest.
                    </div>
                ) : null}

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
                    <div className="space-y-6 min-w-0">
                        <section className={cardClass}>
                            <StepHeading step={1} title="Design the certificate" hint="Start from a preset or drop in your own artwork." />

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <button
                                    type="button"
                                    onClick={() => background && clearBackground()}
                                    className={`px-3 py-2.5 border-3 border-black font-black uppercase text-[11px] sm:text-xs transition-all ${design.mode === "builtin" ? "bg-black text-white shadow-none" : "bg-white shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1"}`}
                                >
                                    Built-in design
                                </button>
                                <label
                                    className={`px-3 py-2.5 border-3 border-black font-black uppercase text-[11px] sm:text-xs text-center cursor-pointer transition-all ${design.mode === "upload" ? "bg-black text-white shadow-none" : "bg-white shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1"}`}
                                >
                                    Upload background
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0]
                                            if (file) handleBackgroundFile(file)
                                            event.target.value = ""
                                        }}
                                    />
                                </label>
                            </div>

                            {design.mode === "upload" ? (
                                <div className="border-3 border-black bg-neo-cream p-4">
                                    <p className="font-black text-xs uppercase mb-1">Background artwork</p>
                                    <p className="font-bold text-sm break-all mb-1">{backgroundName}</p>
                                    <p className="font-bold text-xs text-black/70 mb-3">
                                        Exporting at {design.width} × {design.height} px
                                    </p>
                                    <p className="font-bold text-xs mb-3">
                                        Drag on the preview to place the name exactly where your artwork leaves
                                        room for it.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={clearBackground}
                                        className="px-4 py-2 border-3 border-black bg-white font-black uppercase text-xs shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                    >
                                        Remove image
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <span className={labelClass}>Style</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {PRESETS.map((preset) => (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setDesign((current) => ({
                                                            ...current,
                                                            preset: preset.id,
                                                            ...PRESET_PALETTES[preset.id],
                                                            nameColor: PRESET_PALETTES[preset.id].ink,
                                                        }))
                                                    }
                                                    className={`px-2 py-2 border-3 border-black font-black uppercase text-[11px] transition-all ${design.preset === preset.id ? "bg-neo-yellow shadow-none" : "bg-white shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1"}`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass} htmlFor="size-preset">
                                            Page size
                                        </label>
                                        <select
                                            id="size-preset"
                                            className={inputClass}
                                            value={`${design.width}x${design.height}`}
                                            onChange={(event) => {
                                                const preset = SIZE_PRESETS.find(
                                                    (item) => `${item.width}x${item.height}` === event.target.value
                                                )
                                                if (preset) {
                                                    setDesign((current) => ({
                                                        ...current,
                                                        width: preset.width,
                                                        height: preset.height,
                                                    }))
                                                }
                                            }}
                                        >
                                            {SIZE_PRESETS.map((preset) => (
                                                <option key={preset.id} value={`${preset.width}x${preset.height}`}>
                                                    {preset.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {(
                                            [
                                                ["background", "Background"],
                                                ["accent", "Accent"],
                                                ["ink", "Text"],
                                            ] as const
                                        ).map(([key, label]) => (
                                            <div key={key}>
                                                <label className={labelClass} htmlFor={`color-${key}`}>
                                                    {label}
                                                </label>
                                                <input
                                                    id={`color-${key}`}
                                                    type="color"
                                                    value={design[key]}
                                                    onChange={(event) => update(key, event.target.value)}
                                                    className="w-full h-10 border-3 border-black bg-white cursor-pointer p-0.5"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <label className={labelClass} htmlFor="organization">
                                            Organization / club name
                                        </label>
                                        <input
                                            id="organization"
                                            className={inputClass}
                                            value={design.organization}
                                            onChange={(event) => update("organization", event.target.value)}
                                            placeholder="Computer Science Club"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass} htmlFor="heading">
                                            Heading
                                        </label>
                                        <input
                                            id="heading"
                                            className={inputClass}
                                            value={design.heading}
                                            onChange={(event) => update("heading", event.target.value)}
                                            placeholder="Certificate of Participation"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass} htmlFor="subheading">
                                            Line above the name
                                        </label>
                                        <input
                                            id="subheading"
                                            className={inputClass}
                                            value={design.subheading}
                                            onChange={(event) => update("subheading", event.target.value)}
                                            placeholder="This is proudly presented to"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass} htmlFor="body">
                                            Body text
                                        </label>
                                        <textarea
                                            id="body"
                                            rows={3}
                                            className={`${inputClass} resize-none`}
                                            value={design.body}
                                            onChange={(event) => update("body", event.target.value)}
                                            placeholder="for successfully completing..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass} htmlFor="left-label">
                                                Bottom-left label
                                            </label>
                                            <input
                                                id="left-label"
                                                className={inputClass}
                                                value={design.leftLabel}
                                                onChange={(event) => update("leftLabel", event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass} htmlFor="left-value">
                                                Bottom-left value
                                            </label>
                                            <input
                                                id="left-value"
                                                className={inputClass}
                                                value={design.leftValue}
                                                onChange={(event) => update("leftValue", event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass} htmlFor="right-label">
                                                Bottom-right label
                                            </label>
                                            <input
                                                id="right-label"
                                                className={inputClass}
                                                value={design.rightLabel}
                                                onChange={(event) => update("rightLabel", event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass} htmlFor="right-value">
                                                Bottom-right value
                                            </label>
                                            <input
                                                id="right-value"
                                                className={inputClass}
                                                value={design.rightValue}
                                                onChange={(event) => update("rightValue", event.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className={cardClass}>
                            <StepHeading
                                step={2}
                                title="Place the participant name"
                                hint="Click or drag anywhere on the preview to move the name."
                            />

                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass} htmlFor="name-font">
                                        Font
                                    </label>
                                    <select
                                        id="name-font"
                                        className={inputClass}
                                        value={design.nameFont}
                                        onChange={(event) => update("nameFont", event.target.value)}
                                    >
                                        {NAME_FONTS.map((font) => (
                                            <option key={font.value} value={font.value}>
                                                {font.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass} htmlFor="name-color">
                                            Name colour
                                        </label>
                                        <input
                                            id="name-color"
                                            type="color"
                                            value={design.nameColor}
                                            onChange={(event) => update("nameColor", event.target.value)}
                                            className="w-full h-10 border-3 border-black bg-white cursor-pointer p-0.5"
                                        />
                                    </div>
                                    <div>
                                        <span className={labelClass}>Alignment</span>
                                        <div className="grid grid-cols-3 gap-1">
                                            {(["left", "center", "right"] as Align[]).map((align) => (
                                                <button
                                                    key={align}
                                                    type="button"
                                                    onClick={() => update("nameAlign", align)}
                                                    className={`h-10 border-3 border-black font-black uppercase text-[10px] transition-all ${design.nameAlign === align ? "bg-black text-white" : "bg-white hover:bg-neo-yellow"}`}
                                                >
                                                    {align[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass} htmlFor="name-size">
                                        Name size · {design.nameSizePct.toFixed(1)}% of height
                                    </label>
                                    <input
                                        id="name-size"
                                        type="range"
                                        min={2}
                                        max={20}
                                        step={0.5}
                                        value={design.nameSizePct}
                                        onChange={(event) => update("nameSizePct", Number(event.target.value))}
                                        className="w-full accent-black"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass} htmlFor="name-width">
                                            Max width · {design.nameMaxWidthPct}%
                                        </label>
                                        <input
                                            id="name-width"
                                            type="range"
                                            min={20}
                                            max={100}
                                            step={1}
                                            value={design.nameMaxWidthPct}
                                            onChange={(event) =>
                                                update("nameMaxWidthPct", Number(event.target.value))
                                            }
                                            className="w-full accent-black"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="name-spacing">
                                            Letter spacing · {design.nameLetterSpacing}px
                                        </label>
                                        <input
                                            id="name-spacing"
                                            type="range"
                                            min={0}
                                            max={20}
                                            step={1}
                                            value={design.nameLetterSpacing}
                                            onChange={(event) =>
                                                update("nameLetterSpacing", Number(event.target.value))
                                            }
                                            className="w-full accent-black"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass} htmlFor="name-x">
                                            Horizontal · {design.nameXPct}%
                                        </label>
                                        <input
                                            id="name-x"
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={design.nameXPct}
                                            onChange={(event) =>
                                                update("nameXPct", clamp(Number(event.target.value) || 0, 0, 100))
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="name-y">
                                            Vertical · {design.nameYPct}%
                                        </label>
                                        <input
                                            id="name-y"
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={design.nameYPct}
                                            onChange={(event) =>
                                                update("nameYPct", clamp(Number(event.target.value) || 0, 0, 100))
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-1">
                                    <label className="flex items-center gap-2 font-black uppercase text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={design.nameUppercase}
                                            onChange={(event) => update("nameUppercase", event.target.checked)}
                                            className="w-5 h-5 border-3 border-black accent-black"
                                        />
                                        Uppercase
                                    </label>
                                    <label className="flex items-center gap-2 font-black uppercase text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={design.nameUnderline}
                                            onChange={(event) => update("nameUnderline", event.target.checked)}
                                            className="w-5 h-5 border-3 border-black accent-black"
                                        />
                                        Underline
                                    </label>
                                </div>
                            </div>
                        </section>

                        <section className={cardClass}>
                            <StepHeading
                                step={3}
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
                                        onClick={() => setSource(value)}
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
                                                    onChange={(event) =>
                                                        setCsv({ ...csv, hasHeader: event.target.checked })
                                                    }
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
                                                    onChange={(event) =>
                                                        setCsv({ ...csv, column: Number(event.target.value) })
                                                    }
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

                            {names.length > 0 ? (
                                <div className="mt-4 border-3 border-black bg-white p-4">
                                    <p className="font-black uppercase text-sm mb-2">
                                        {names.length.toLocaleString()} name
                                        {names.length === 1 ? "" : "s"} detected
                                    </p>
                                    <ul className="font-bold text-xs space-y-1">
                                        {usableNames.slice(0, 5).map((name, index) => (
                                            <li key={`${name}-${index}`} className="truncate">
                                                {index + 1}. {name}
                                            </li>
                                        ))}
                                    </ul>
                                    {usableNames.length > 5 ? (
                                        <p className="font-bold text-xs text-black/60 mt-2">
                                            + {(usableNames.length - 5).toLocaleString()} more
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </section>
                    </div>

                    <div className="space-y-6 min-w-0">
                        <div className="lg:sticky lg:top-24 space-y-6">
                            <section className={cardClass}>
                                <div className="flex items-baseline justify-between gap-3 mb-4">
                                    <h2 className="text-lg sm:text-xl font-black uppercase italic">Live preview</h2>
                                    <span className="font-bold text-[11px] text-black/60 uppercase">
                                        Drag to place the name
                                    </span>
                                </div>
                                <div className="border-3 border-black bg-neo-cream p-2 shadow-neo">
                                    <canvas
                                        ref={previewRef}
                                        onPointerDown={(event) => {
                                            event.currentTarget.setPointerCapture(event.pointerId)
                                            setDragging(true)
                                            moveNameTo(event)
                                        }}
                                        onPointerMove={(event) => {
                                            if (dragging) moveNameTo(event)
                                        }}
                                        onPointerUp={(event) => {
                                            event.currentTarget.releasePointerCapture(event.pointerId)
                                            setDragging(false)
                                        }}
                                        onPointerCancel={() => setDragging(false)}
                                        style={{ touchAction: "none" }}
                                        className="w-full h-auto block cursor-crosshair select-none"
                                    />
                                </div>
                                <p className="font-bold text-xs text-black/70 mt-3">
                                    Showing: <span className="text-black">{previewName}</span>
                                </p>
                            </section>

                            <section className={cardClass}>
                                <StepHeading step={4} title="Download the ZIP" />

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
                                                    setFormat(event.target.value === "jpeg" ? "jpeg" : "png")
                                                }
                                            >
                                                <option value="png">PNG · sharpest</option>
                                                <option value="jpeg">JPG · smallest files</option>
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
                                            Use {"{name}"} and {"{index}"} · e.g. {"{index}-{name}"}
                                        </p>
                                    </div>

                                    <p className="font-bold text-xs border-3 border-black bg-neo-cream p-3">
                                        Exporting at {exportDesign.width} × {exportDesign.height} px ·{" "}
                                        {usableNames.length.toLocaleString()} certificate
                                        {usableNames.length === 1 ? "" : "s"}
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
                                                {usableNames.length.toLocaleString()} · {progressPercent}%
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
                                                disabled={usableNames.length === 0}
                                                className={`${buttonClass} w-full bg-neo-yellow text-base`}
                                            >
                                                {usableNames.length === 0
                                                    ? "Add participants first"
                                                    : `Generate ${usableNames.length.toLocaleString()} certificate${usableNames.length === 1 ? "" : "s"}`}
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
                                                The ZIP also contains <span className="underline">_index.csv</span>{" "}
                                                mapping every participant to their file.
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