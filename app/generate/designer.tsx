"use client"

/**
 * The certificate designer as the issuing page shows it: the very same editor the
 * bulk generator uses - template files, styles, every text element, signatories and
 * logos - with one extra card for the verification block that carries the QR code
 * and the certificate ID.
 */

import { useEffect, useRef } from "react"
import {
    renderToCanvas,
    type CertificateDesign,
} from "@/lib/bulk/renderer"
import type { Recipient } from "@/lib/bulk/tokens"
import { DesignBasics } from "./bulk/design-basics"
import { ElementPanel } from "./bulk/element-panel"
import { LogoPanel } from "./bulk/logo-panel"
import { SignatoryPanel } from "./bulk/signatory-panel"
import type { Designer } from "./bulk/use-designer"
import { cardClass, smallButtonClass } from "./bulk/ui"

function PanelHeading({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="mb-5 border-b-3 border-black pb-2">
            <h2 className="text-lg sm:text-xl font-black uppercase italic leading-tight">{title}</h2>
            {hint ? <p className="text-black/70 font-bold text-xs mt-0.5">{hint}</p> : null}
        </div>
    )
}

export interface VerificationControls {
    /** Whether the QR block is currently part of the design. */
    present: boolean
    /** False until the sample QR code has arrived, so the block cannot be added empty. */
    ready: boolean
    onAdd: () => void
    onRemove: () => void
}

interface CertificateDesignerProps {
    designer: Designer
    /** Placeholders the certificate's own details can fill, e.g. ["name", "title", "id"]. */
    tokens: string[]
    verification: VerificationControls
}

export function CertificateDesigner({ designer, tokens, verification }: CertificateDesignerProps) {
    const { design, selection, setSelection, selectElement, patchElement, templateVersion } = designer

    return (
        <>
            <section className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black uppercase italic leading-tight">Template</h2>
                        <p className="font-bold text-xs text-black/70 mt-0.5">
                            {designer.autosave === "failed"
                                ? "Autosave is unavailable in this browser - save the template to keep your work."
                                : designer.autosave === "saved-without-artwork"
                                    ? "Autosaved, but your uploaded artwork or images are too large to keep in this browser - save the template file to keep them."
                                    : "Your design is kept in this browser and reused for the next certificate you issue."}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void designer.downloadTemplate()}
                            className={smallButtonClass}
                        >
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
                                    if (file) void designer.handleTemplateFile(file)
                                    event.target.value = ""
                                }}
                            />
                        </label>
                        <button type="button" onClick={designer.resetDesign} className={smallButtonClass}>
                            Reset
                        </button>
                    </div>
                </div>
                <p className="font-bold text-[11px] text-black/60 mt-3">
                    Templates are shared with the{" "}
                    <span className="underline decoration-2 underline-offset-2">bulk generator</span>, so a design
                    made there can be saved and loaded here.
                </p>
            </section>

            <section className={cardClass}>
                <PanelHeading
                    title="Design the certificate"
                    hint="Start from a preset or drop in your own artwork."
                />
                <DesignBasics designer={designer} />
            </section>

            <section className={cardClass}>
                <PanelHeading
                    title="Edit the text"
                    hint="Every line is its own element. Click it on the preview, then drag, resize or restyle it."
                />
                <ElementPanel
                    design={design}
                    selectedId={selection?.kind === "element" ? selection.id : null}
                    onSelect={selectElement}
                    onPatch={patchElement}
                    tokens={tokens}
                />
            </section>

            <section className={cardClass}>
                <PanelHeading
                    title="Verification block"
                    hint="The QR code that leads to the verification page, with the certificate ID under it."
                />
                <div className="border-3 border-black bg-neo-cream p-4 space-y-3">
                    {verification.present ? (
                        <>
                            <p className="font-bold text-xs">
                                The block is on the certificate. Drag it on the preview to place it, and resize it
                                from its corners like any other logo. While you are designing it shows a sample
                                code; the real QR code and certificate ID are drawn in the moment you issue.
                            </p>
                            <button type="button" onClick={verification.onRemove} className={smallButtonClass}>
                                Remove the block
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="font-bold text-xs">
                                This certificate has no QR block, so nobody can scan their way to the verification
                                page. You can still print the ID by putting {"{id}"} in any text element.
                            </p>
                            <button
                                type="button"
                                onClick={verification.onAdd}
                                disabled={!verification.ready}
                                className={smallButtonClass}
                            >
                                {verification.ready ? "Add the QR block" : "Preparing the QR code…"}
                            </button>
                        </>
                    )}
                </div>
            </section>

            <section className={cardClass}>
                <PanelHeading
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
                            onUpdate={designer.setDesign}
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
                            onUpdate={designer.setDesign}
                        />
                    </div>
                </div>
            </section>
        </>
    )
}

interface CertificatePreviewProps {
    design: CertificateDesign
    recipient: Recipient
    background: CanvasImageSource | null
    /** Bumps when pictures or fonts finish loading, so the drawing is repeated with them. */
    assetVersion: number
}

/** The finished certificate, drawn exactly as it will be downloaded and with nothing to drag. */
export function CertificatePreview({ design, recipient, background, assetVersion }: CertificatePreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (canvas) renderToCanvas(canvas, design, recipient, background)
    }, [design, recipient, background, assetVersion])

    return <canvas ref={canvasRef} className="w-full h-auto block select-none" />
}
