"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createCertificate, getSampleQRCode, CreateCertificateResult } from "@/app/actions/certificate"
import {
    addLogo,
    createDefaultDesign,
    loadDesignFonts,
    loadDesignImages,
    patchElement,
    patchLogo,
    removeLogo,
    renderCertificate,
    type CertificateDesign,
} from "@/lib/bulk/renderer"
import type { Recipient } from "@/lib/bulk/tokens"
import { downloadBlob, sanitizeFileName } from "@/lib/bulk/export"
import { createPdf, encodeCanvasForPdf, pdfPageSize } from "@/lib/bulk/pdf"
import {
    SAMPLE_CERTIFICATE_ID,
    VERIFICATION_LOGO_ID,
    renderVerificationBlock,
} from "@/lib/certificate/verification-block"
import { PreviewStage } from "./bulk/preview-stage"
import { buttonClass, cardClass, smallButtonClass } from "./bulk/ui"
import { useDesigner } from "./bulk/use-designer"
import { CertificateDesigner, CertificatePreview } from "./designer"

type FormState = "form" | "loading" | "success"

type IssuedCertificate = NonNullable<CreateCertificateResult["certificate"]>

/** Where the browser keeps the design used for issued certificates, apart from the bulk generator's. */
const ISSUE_AUTOSAVE_KEY = "certifoolproof.issue.template.v1"

/** Where the QR block lands the first time it is put on a certificate: centred along the bottom. */
const VERIFICATION_PLACE = { x: 50, y: 82, width: 12 }

/** The placeholders an issued certificate can fill, in the order they are offered. */
const ISSUE_TOKENS = ["name", "title", "description", "email", "id", "date", "url"]

/**
 * What a certificate starts out as here: the shared default design, with the heading
 * following the certificate's own title so what is typed into the form is what is printed.
 */
function createIssueDesign(): CertificateDesign {
    return patchElement(createDefaultDesign(), "heading", { text: "{title}" })
}

function formatDate(value: Date): string {
    return value.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

/** One certificate's details, keyed the way `{token}` placeholders look them up. */
function certificateFields(details: {
    name: string
    title: string
    description: string
    email: string
    certificateId: string
    issuedAt: Date
    verificationUrl: string
}): Record<string, string> {
    const date = formatDate(details.issuedAt)
    return {
        name: details.name,
        index: "1",
        title: details.title,
        description: details.description,
        email: details.email,
        id: details.certificateId,
        certificateid: details.certificateId,
        date,
        issuedon: date,
        url: details.verificationUrl,
    }
}

/** Puts the QR block on the design, or refreshes the picture of the one already there. */
function withVerificationBlock(design: CertificateDesign, src: string): CertificateDesign {
    if (design.logos.some((logo) => logo.id === VERIFICATION_LOGO_ID)) {
        return patchLogo(design, VERIFICATION_LOGO_ID, { src })
    }
    return patchLogo(addLogo(design, VERIFICATION_LOGO_ID, src), VERIFICATION_LOGO_ID, VERIFICATION_PLACE)
}

export default function GeneratePage() {
    const [formState, setFormState] = useState<FormState>("form")
    const [error, setError] = useState("")
    const [issued, setIssued] = useState<{ certificate: IssuedCertificate; blockSrc: string } | null>(null)

    // Form fields
    const [recipientName, setRecipientName] = useState("")
    const [recipientEmail, setRecipientEmail] = useState("")
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [expiresAt, setExpiresAt] = useState("")

    const designer = useDesigner({
        autosaveKey: ISSUE_AUTOSAVE_KEY,
        onError: setError,
        createDesign: createIssueDesign,
    })
    const { design, background, hydrated, restored, setDesign, refreshAssets } = designer

    /** The QR block as it looks before a certificate exists: a sample code and a sample ID. */
    const [sampleBlock, setSampleBlock] = useState("")
    const [origin, setOrigin] = useState("")
    const [issuedAssets, setIssuedAssets] = useState(0)
    const restoredRef = useRef(restored)
    restoredRef.current = restored

    useEffect(() => {
        setOrigin(window.location.origin)
    }, [])

    // Draw the sample block once the saved design (if any) is back, so it is not added twice.
    useEffect(() => {
        if (!hydrated) return
        let cancelled = false

        void (async () => {
            const qrDataUrl = await getSampleQRCode()
            if (cancelled) return
            const src = await renderVerificationBlock({
                qrDataUrl,
                certificateId: SAMPLE_CERTIFICATE_ID,
            })
            if (cancelled) return

            setSampleBlock(src)
            setDesign((current) => {
                // A design that came back without the block is one somebody took the block off.
                const hasBlock = current.logos.some((logo) => logo.id === VERIFICATION_LOGO_ID)
                if (!hasBlock && restoredRef.current) return current
                return withVerificationBlock(current, src)
            })
        })()

        return () => {
            cancelled = true
        }
    }, [hydrated, setDesign])

    const hasVerification = design.logos.some((logo) => logo.id === VERIFICATION_LOGO_ID)

    const addVerification = useCallback(() => {
        if (!sampleBlock) return
        setDesign((current) => withVerificationBlock(current, sampleBlock))
    }, [sampleBlock, setDesign])

    const removeVerification = useCallback(() => {
        setDesign((current) => removeLogo(current, VERIFICATION_LOGO_ID))
    }, [setDesign])

    /** What the preview stands for while the certificate is only being designed. */
    const previewRecipient = useMemo<Recipient>(() => {
        const name = recipientName.trim() || "Participant Name"
        return {
            name,
            fields: certificateFields({
                name,
                title: title.trim() || "Certificate Title",
                description: description.trim(),
                email: recipientEmail.trim(),
                certificateId: SAMPLE_CERTIFICATE_ID,
                issuedAt: new Date(),
                verificationUrl: `${origin}/verify/${SAMPLE_CERTIFICATE_ID}`,
            }),
        }
    }, [recipientName, recipientEmail, title, description, origin])

    /** The certificate as issued: the same design, carrying the real ID and QR code. */
    const issuedRecipient = useMemo<Recipient | null>(() => {
        if (!issued) return null
        const certificate = issued.certificate
        return {
            name: certificate.recipientName,
            fields: certificateFields({
                name: certificate.recipientName,
                title: certificate.title,
                description: certificate.description ?? "",
                email: certificate.recipientEmail,
                certificateId: certificate.certificateId,
                issuedAt: new Date(certificate.issuedAt),
                verificationUrl: certificate.verificationUrl,
            }),
        }
    }, [issued])

    const issuedDesign = useMemo<CertificateDesign>(() => {
        if (!issued || !hasVerification) return design
        return patchLogo(design, VERIFICATION_LOGO_ID, { src: issued.blockSrc })
    }, [design, issued, hasVerification])

    // The real QR code is a picture of its own: decode it before it can be drawn.
    useEffect(() => {
        if (!issued) return
        let cancelled = false
        void loadDesignImages(issuedDesign).then(() => {
            if (!cancelled) setIssuedAssets((version) => version + 1)
        })
        return () => {
            cancelled = true
        }
    }, [issued, issuedDesign])

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError("")
        setFormState("loading")

        const response = await createCertificate({
            recipientName,
            recipientEmail,
            title,
            description: description || undefined,
            expiresAt: expiresAt || undefined,
        })

        if (!response.success || !response.certificate) {
            setError(response.error || "Failed to create certificate")
            setFormState("form")
            return
        }

        const certificate = response.certificate
        let blockSrc = ""
        try {
            blockSrc = await renderVerificationBlock({
                qrDataUrl: certificate.qrCodeDataUrl,
                certificateId: certificate.certificateId,
            })
        } catch {
            // The certificate is issued either way; it simply goes out without the block.
            setError("The certificate was issued, but its QR block could not be drawn on the design.")
        }

        setIssued({ certificate, blockSrc })
        setFormState("success")
    }

    const handleReset = () => {
        setFormState("form")
        setIssued(null)
        setError("")
        setRecipientName("")
        setRecipientEmail("")
        setTitle("")
        setDescription("")
        setExpiresAt("")
        // The sample block was dropped from the cache while the issued one was drawn.
        refreshAssets()
    }

    /** Downloads the issued certificate exactly as it is previewed. */
    const downloadIssued = useCallback(
        async (kind: "png" | "pdf") => {
            if (!issued || !issuedRecipient) return
            setError("")

            try {
                await loadDesignFonts(issuedDesign)
                await loadDesignImages(issuedDesign)

                const canvas = document.createElement("canvas")
                canvas.width = issuedDesign.width
                canvas.height = issuedDesign.height
                const ctx = canvas.getContext("2d")
                if (!ctx) throw new Error("Canvas is not available in this browser.")

                renderCertificate(ctx, issuedDesign, issuedRecipient, background)

                const certificate = issued.certificate
                const base = sanitizeFileName(`${certificate.recipientName} ${certificate.certificateId}`)

                if (kind === "png") {
                    const blob = await new Promise<Blob | null>((resolve) =>
                        canvas.toBlob(resolve, "image/png")
                    )
                    if (!blob) throw new Error("The browser could not encode the certificate image.")
                    downloadBlob(blob, `${base}.png`)
                    return
                }

                // A PDF page is paper: there is nothing behind it for transparency to show through.
                ctx.save()
                ctx.globalCompositeOperation = "destination-over"
                ctx.fillStyle = "#FFFFFF"
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.restore()

                const page = pdfPageSize(issuedDesign.width, issuedDesign.height)
                const image = await encodeCanvasForPdf(canvas, 100)
                downloadBlob(
                    createPdf([{ image, width: page.width, height: page.height }], {
                        title: `${certificate.title} - ${certificate.recipientName}`,
                    }),
                    `${base}.pdf`
                )
            } catch (caught) {
                setError(
                    caught instanceof Error ? caught.message : "Could not download the certificate."
                )
            }
        },
        [background, issued, issuedDesign, issuedRecipient]
    )

    const pageSize = pdfPageSize(design.width, design.height)

    return (
        <div className="min-h-screen min-h-[100dvh] bg-neo-mint text-black font-mono">
            {/* Navigation */}
            <nav className="border-b-3 border-black bg-white sticky top-0 z-50 shadow-neo">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        <Link
                            href="/"
                            className="text-xl sm:text-2xl font-black bg-black text-white px-3 py-1 border-3 border-black shadow-neo hover:shadow-neo-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100"
                        >
                            CertiFoolProof
                        </Link>
                        <div className="flex items-center gap-6">
                            <Link href="/dashboard" className="text-black font-bold hover:underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider">
                                Dashboard
                            </Link>
                            <Link href="/generate" className="text-black font-bold underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider">
                                Generate
                            </Link>
                            <Link href="/generate/bulk" className="text-black font-bold hover:underline decoration-3 underline-offset-4 text-sm uppercase tracking-wider">
                                Bulk
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {error ? (
                    <div className="mb-6 p-4 border-3 border-black bg-red-500 text-white font-black uppercase text-sm shadow-neo">
                        {error}
                    </div>
                ) : null}

                {designer.notice ? (
                    <div className="mb-6 p-4 border-3 border-black bg-neo-yellow font-black text-sm shadow-neo flex items-start justify-between gap-4">
                        <span>{designer.notice}</span>
                        <button
                            type="button"
                            onClick={() => designer.setNotice("")}
                            className="shrink-0 uppercase text-xs underline decoration-2 underline-offset-2"
                        >
                            Dismiss
                        </button>
                    </div>
                ) : null}

                {formState === "success" && issued && issuedRecipient ? (
                    <div className="space-y-6">
                        <div className="border-3 border-black bg-neo-pink p-6 sm:p-8 shadow-neo">
                            <div className="mb-6 border-b-3 border-black pb-6">
                                <div className="w-16 h-16 mb-4 bg-black flex items-center justify-center border-3 border-black shadow-neo">
                                    <svg className="w-10 h-10 text-neo-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h1 className="text-3xl font-black text-black mb-2 uppercase italic">Certificate Issued</h1>
                                <p className="text-black font-bold">
                                    It is stored, verifiable, and drawn on your design below.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
                                <div className="space-y-4">
                                    <div className="border-3 border-black bg-neo-cream p-2 shadow-neo">
                                        <CertificatePreview
                                            design={issuedDesign}
                                            recipient={issuedRecipient}
                                            background={background}
                                            assetVersion={issuedAssets}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => void downloadIssued("png")}
                                            className={`${buttonClass} bg-neo-yellow`}
                                        >
                                            Download PNG
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void downloadIssued("pdf")}
                                            className={`${buttonClass} bg-white`}
                                        >
                                            Download PDF · {pageSize.label}
                                        </button>
                                    </div>
                                    <p className="font-bold text-xs">
                                        {hasVerification
                                            ? "The QR code on the certificate leads to its verification page."
                                            : "This design carries no QR block - add one under Verification block before issuing the next certificate."}{" "}
                                        Download it now: the design is kept in this browser, but the issued
                                        picture is not stored anywhere.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-white border-3 border-black p-5 shadow-neo space-y-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tighter text-black/60">Certificate ID</p>
                                            <p className="text-black font-black text-lg break-all">{issued.certificate.certificateId}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tighter text-black/60">Recipient</p>
                                            <p className="text-black font-black text-lg">{issued.certificate.recipientName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tighter text-black/60">Title</p>
                                            <p className="text-black font-black text-lg">{issued.certificate.title}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tighter text-black/60">Issued On</p>
                                            <p className="text-black font-black text-lg">
                                                {formatDate(new Date(issued.certificate.issuedAt))}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white border-3 border-black p-5 shadow-neo flex flex-col items-center">
                                        <p className="text-black font-black uppercase italic mb-3 underline decoration-3 underline-offset-4">
                                            Scan to verify
                                        </p>
                                        <div className="p-3 bg-white border-3 border-black shadow-neo">
                                            <Image
                                                src={issued.certificate.qrCodeDataUrl}
                                                alt="Certificate QR Code"
                                                width={176}
                                                height={176}
                                            />
                                        </div>
                                        <p className="text-black font-bold text-[11px] mt-3 break-all border-2 border-black p-2 w-full text-center">
                                            {issued.certificate.verificationUrl}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                                <button type="button" onClick={handleReset} className={`${buttonClass} bg-neo-yellow`}>
                                    Issue Another
                                </button>
                                <Link href="/dashboard" className={`${buttonClass} bg-white text-center`}>
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 border-3 border-black bg-neo-cream p-6 sm:p-8 shadow-neo">
                            <h1 className="text-3xl sm:text-4xl font-black text-black mb-2 uppercase italic">
                                Issue Certificate
                            </h1>
                            <p className="text-black font-bold text-sm sm:text-base border-t-3 border-black pt-3 max-w-3xl">
                                Design the certificate, fill in who it is for, and issue it. Every certificate
                                gets a unique ID and a QR code that leads to its verification page - both drawn
                                onto the design itself.
                            </p>
                        </div>

                        <div className="mb-6 border-3 border-black bg-neo-pink p-5 sm:p-6 shadow-neo flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                            <div>
                                <h2 className="text-lg sm:text-xl font-black uppercase italic mb-1">
                                    Issuing for a whole event?
                                </h2>
                                <p className="text-black font-bold text-xs sm:text-sm">
                                    Upload a CSV of participant names and download every certificate as one ZIP or PDF.
                                </p>
                            </div>
                            <Link
                                href="/generate/bulk"
                                className="shrink-0 px-6 py-3 border-3 border-black bg-white text-center font-black uppercase italic text-sm shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-[2px] active:translate-y-[2px] transition-all"
                            >
                                Bulk Generate →
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
                            <div className="space-y-6 min-w-0">
                                <section className={cardClass}>
                                    <div className="mb-5 border-b-3 border-black pb-2">
                                        <h2 className="text-lg sm:text-xl font-black uppercase italic leading-tight">
                                            Who it is for
                                        </h2>
                                        <p className="text-black/70 font-bold text-xs mt-0.5">
                                            These details are stored with the certificate and fill the{" "}
                                            {"{name}"}, {"{title}"} and {"{description}"} placeholders.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2" htmlFor="recipient-name">
                                                    Full Name *
                                                </label>
                                                <input
                                                    id="recipient-name"
                                                    type="text"
                                                    value={recipientName}
                                                    onChange={(e) => setRecipientName(e.target.value)}
                                                    placeholder="John Doe"
                                                    required
                                                    disabled={formState === "loading"}
                                                    className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2" htmlFor="recipient-email">
                                                    Email Address *
                                                </label>
                                                <input
                                                    id="recipient-email"
                                                    type="email"
                                                    value={recipientEmail}
                                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                                    placeholder="john@example.com"
                                                    required
                                                    disabled={formState === "loading"}
                                                    className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2" htmlFor="certificate-title">
                                                Certificate Title *
                                            </label>
                                            <input
                                                id="certificate-title"
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Workshop Completion Certificate"
                                                required
                                                disabled={formState === "loading"}
                                                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2" htmlFor="certificate-description">
                                                Description (Optional)
                                            </label>
                                            <textarea
                                                id="certificate-description"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={3}
                                                placeholder="Awarded for successful completion of..."
                                                disabled={formState === "loading"}
                                                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all resize-none disabled:opacity-50"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-tighter text-black mb-2" htmlFor="certificate-expiry">
                                                Expiry Date (Optional)
                                            </label>
                                            <input
                                                id="certificate-expiry"
                                                type="date"
                                                value={expiresAt}
                                                onChange={(e) => setExpiresAt(e.target.value)}
                                                disabled={formState === "loading"}
                                                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-bold focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={formState === "loading"}
                                            className={`${buttonClass} w-full bg-neo-yellow text-base`}
                                        >
                                            {formState === "loading" ? (
                                                <span className="flex items-center justify-center gap-3">
                                                    <svg className="animate-spin h-6 w-6 text-black" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Issuing...
                                                </span>
                                            ) : (
                                                "Issue the certificate"
                                            )}
                                        </button>
                                    </form>
                                </section>

                                <CertificateDesigner
                                    designer={designer}
                                    tokens={ISSUE_TOKENS}
                                    verification={{
                                        present: hasVerification,
                                        ready: sampleBlock !== "",
                                        onAdd: addVerification,
                                        onRemove: removeVerification,
                                    }}
                                />
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
                                        <div className="border-3 border-black bg-neo-cream p-2 shadow-neo">
                                            <PreviewStage
                                                design={design}
                                                recipient={previewRecipient}
                                                background={background}
                                                selection={designer.selection}
                                                onSelect={designer.setSelection}
                                                onPatch={designer.patchElement}
                                                onUpdate={setDesign}
                                                assetVersion={designer.assetVersion}
                                            />
                                        </div>
                                        <p className="font-bold text-[11px] text-black/60 mt-3">
                                            {design.width} × {design.height} px · prints as {pageSize.label}. The QR
                                            code and the ID shown here are samples until the certificate is issued.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="font-black uppercase text-[10px] px-2 py-1 border-3 border-black bg-neo-cream">
                                                Placeholders
                                            </span>
                                            {ISSUE_TOKENS.map((token) => (
                                                <span
                                                    key={token}
                                                    className="font-bold text-[11px] px-2 py-1 border-2 border-black bg-white"
                                                >
                                                    {`{${token}}`}
                                                </span>
                                            ))}
                                        </div>
                                    </section>

                                    <section className={`${cardClass} hidden lg:block`}>
                                        <h2 className="text-sm font-black uppercase italic mb-2">How it works</h2>
                                        <ol className="font-bold text-xs space-y-1.5 list-decimal list-inside text-black/80">
                                            <li>Design the certificate, or load a template from the bulk generator.</li>
                                            <li>Place the QR block where it belongs on the page.</li>
                                            <li>Fill in the recipient and issue - the real ID and QR are drawn in.</li>
                                            <li>Download it as a PNG or a print-ready PDF.</li>
                                        </ol>
                                        <Link
                                            href="/verify"
                                            className={`${smallButtonClass} inline-block mt-4 no-underline`}
                                        >
                                            Verification page
                                        </Link>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}
