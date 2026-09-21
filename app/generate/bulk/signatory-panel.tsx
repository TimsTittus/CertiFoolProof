"use client"

import { useState } from "react"
import {
    COLUMN_WIDTH_LIMITS,
    LINE_THICKNESS_LIMITS,
    MAX_COLUMNS,
    SCRIPT_FONTS,
    SIGNATURE_SIZE_LIMITS,
    addSignatory,
    createSignatureArt,
    newId,
    patchElement,
    patchSignatoryLayout,
    patchSignatory,
    patchSignatoryLine,
    patchSignatureArt,
    removeSignatory,
    reorderSignatory,
    resolveLineColor,
    type CertificateDesign,
    type LineStyle,
    type Selection,
    type Signatory,
    type SignatureMode,
} from "@/lib/bulk/renderer"
import { SIGNATURE_IMAGE_SIDE, prepareImageFile } from "@/lib/bulk/images"
import { ChoiceButtons, NumberField, RangeField } from "./fields"
import { ImageThumb } from "./image-thumb"
import { SignaturePad } from "./signature-pad"
import { checkboxClass, inputClass, labelClass, smallButtonClass } from "./ui"

type UpdateDesign = (update: (design: CertificateDesign) => CertificateDesign) => void

const SIGNATURE_MODES: { value: SignatureMode; label: string }[] = [
    { value: "none", label: "None" },
    { value: "image", label: "Upload" },
    { value: "draw", label: "Draw" },
    { value: "type", label: "Type" },
]

const LINE_STYLES: { value: LineStyle; label: string }[] = [
    { value: "solid", label: "Solid" },
    { value: "dashed", label: "Dashed" },
    { value: "dotted", label: "Dotted" },
]

const COLUMN_OPTIONS = [
    { value: 0, label: "Automatic" },
    ...Array.from({ length: MAX_COLUMNS }, (_, index) => ({
        value: index + 1,
        label: `${index + 1} column${index === 0 ? "" : "s"}`,
    })),
]

interface SignatoryPanelProps {
    design: CertificateDesign
    selection: Selection | null
    /** Changes whenever a template is loaded, so the drawing pad starts from the new signature. */
    padKey: number
    onSelect: (selection: Selection | null) => void
    onUpdate: UpdateDesign
}

export function SignatoryPanel({ design, selection, padKey, onSelect, onUpdate }: SignatoryPanelProps) {
    const [dragId, setDragId] = useState<string | null>(null)
    const [overId, setOverId] = useState<string | null>(null)

    const onArtwork = design.mode === "upload"
    const layout = design.signatoryLayout
    const count = design.signatories.length
    const selectedId = selection?.kind === "signatory" || selection?.kind === "signature" ? selection.id : null
    const selected = design.signatories.find((signatory) => signatory.id === selectedId) ?? null

    const nameStyle = design.elements.signatureName
    const titleStyle = design.elements.signatureLabel

    const endDrag = () => {
        setDragId(null)
        setOverId(null)
    }

    return (
        <div className="space-y-5">
            <div className="border-3 border-black bg-neo-cream p-4 space-y-4">
                <ChoiceButtons
                    label="Arrange signatories"
                    value={layout.arrange}
                    options={[
                        { value: "auto", label: "Even columns" },
                        { value: "free", label: "Place freely" },
                    ]}
                    onChange={(arrange) => onUpdate((current) => patchSignatoryLayout(current, { arrange }))}
                />

                {layout.arrange === "auto" ? (
                    <div>
                        <label className={labelClass} htmlFor="signatory-columns">
                            Columns per row
                        </label>
                        <select
                            id="signatory-columns"
                            className={inputClass}
                            value={layout.columns}
                            onChange={(event) =>
                                onUpdate((current) => patchSignatoryLayout(current, { columns: Number(event.target.value) }))
                            }
                        >
                            {COLUMN_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                <RangeField
                    id="signatory-column-width"
                    label="Column and line width"
                    display={`${Math.round(layout.columnWidth)}%`}
                    value={layout.columnWidth}
                    min={COLUMN_WIDTH_LIMITS.min}
                    max={COLUMN_WIDTH_LIMITS.max}
                    step={1}
                    onChange={(columnWidth) => onUpdate((current) => patchSignatoryLayout(current, { columnWidth }))}
                />

                <p className="font-bold text-[11px] text-black/60">
                    {layout.arrange === "auto"
                        ? "Evenly spaced, with room left for the date. Drag a signatory on the preview to place it freely instead."
                        : "Drag each signatory on the preview, or type its position below."}
                </p>

                <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <label className="flex items-center gap-2 font-black uppercase text-[11px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={onArtwork ? nameStyle.visibleOnUpload : nameStyle.visible}
                            onChange={(event) =>
                                onUpdate((current) =>
                                    patchElement(
                                        current,
                                        "signatureName",
                                        onArtwork ? { visibleOnUpload: event.target.checked } : { visible: event.target.checked }
                                    )
                                )
                            }
                            className={checkboxClass}
                        />
                        {onArtwork ? "Show names on artwork" : "Show names"}
                    </label>
                    <label className="flex items-center gap-2 font-black uppercase text-[11px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={onArtwork ? titleStyle.visibleOnUpload : titleStyle.visible}
                            onChange={(event) =>
                                onUpdate((current) =>
                                    patchElement(
                                        current,
                                        "signatureLabel",
                                        onArtwork ? { visibleOnUpload: event.target.checked } : { visible: event.target.checked }
                                    )
                                )
                            }
                            className={checkboxClass}
                        />
                        {onArtwork ? "Show titles on artwork" : "Show titles"}
                    </label>
                </div>
                <p className="font-bold text-[11px] text-black/60">
                    Font, size and colour of names and titles: pick &ldquo;Signatory name&rdquo; or &ldquo;Signatory
                    title&rdquo; in the text step above.
                </p>
            </div>

            <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                    <span className={labelClass}>
                        {count} signator{count === 1 ? "y" : "ies"}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            const id = newId(design.signatories.map((signatory) => signatory.id))
                            onUpdate((current) => addSignatory(current, id))
                            onSelect({ kind: "signatory", id })
                        }}
                        className={smallButtonClass}
                    >
                        + Add signatory
                    </button>
                </div>

                {count === 0 ? (
                    <p className="border-3 border-dashed border-black bg-neo-cream p-4 font-bold text-xs">
                        No signatories. Add one to give the certificate a name, title and signature line.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {design.signatories.map((signatory, index) => {
                            const active = signatory.id === selectedId
                            return (
                                <li
                                    key={signatory.id}
                                    draggable
                                    onDragStart={(event) => {
                                        setDragId(signatory.id)
                                        event.dataTransfer.effectAllowed = "move"
                                        event.dataTransfer.setData("text/plain", signatory.id)
                                    }}
                                    onDragOver={(event) => {
                                        if (!dragId) return
                                        event.preventDefault()
                                        event.dataTransfer.dropEffect = "move"
                                        if (overId !== signatory.id) setOverId(signatory.id)
                                    }}
                                    onDrop={(event) => {
                                        event.preventDefault()
                                        if (dragId && dragId !== signatory.id) {
                                            const moving = dragId
                                            onUpdate((current) => reorderSignatory(current, moving, index))
                                        }
                                        endDrag()
                                    }}
                                    onDragEnd={endDrag}
                                    className={`flex items-center gap-2 border-3 border-black p-2 ${active ? "bg-neo-yellow" : "bg-white"
                                        } ${dragId === signatory.id ? "opacity-40" : ""} ${overId === signatory.id && dragId !== signatory.id ? "shadow-neo" : ""
                                        }`}
                                >
                                    <span
                                        aria-hidden
                                        title="Drag to reorder"
                                        className="cursor-grab select-none px-1 font-black text-black/50"
                                    >
                                        ⠿
                                    </span>
                                    <button
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => onSelect(active ? null : { kind: "signatory", id: signatory.id })}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <span className="block truncate font-black text-xs uppercase">
                                            {index + 1}. {signatory.name || "Unnamed"}
                                        </span>
                                        <span className="block truncate font-bold text-[11px] text-black/60">
                                            {signatory.title || "No title"}
                                        </span>
                                    </button>
                                    <div className="flex shrink-0 gap-1">
                                        <button
                                            type="button"
                                            aria-label={`Move ${signatory.name || "signatory"} up`}
                                            disabled={index === 0}
                                            onClick={() => onUpdate((current) => reorderSignatory(current, signatory.id, index - 1))}
                                            className={smallButtonClass}
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Move ${signatory.name || "signatory"} down`}
                                            disabled={index === count - 1}
                                            onClick={() => onUpdate((current) => reorderSignatory(current, signatory.id, index + 1))}
                                            className={smallButtonClass}
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Remove ${signatory.name || "signatory"}`}
                                            onClick={() => {
                                                if (active) onSelect(null)
                                                onUpdate((current) => removeSignatory(current, signatory.id))
                                            }}
                                            className={smallButtonClass}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            {selected ? (
                <SignatoryEditor
                    key={selected.id}
                    signatory={selected}
                    design={design}
                    padKey={padKey}
                    onUpdate={onUpdate}
                />
            ) : count > 0 ? (
                <p className="border-3 border-dashed border-black bg-neo-cream p-4 font-bold text-xs">
                    Pick a signatory above, or click one on the preview, to edit their name, title, signature and line.
                </p>
            ) : null}
        </div>
    )
}

interface SignatoryEditorProps {
    signatory: Signatory
    design: CertificateDesign
    padKey: number
    onUpdate: UpdateDesign
}

function SignatoryEditor({ signatory, design, padKey, onUpdate }: SignatoryEditorProps) {
    const [error, setError] = useState("")
    const [busy, setBusy] = useState(false)

    const { id, line } = signatory
    const art = signatory.signature
    const onArtwork = design.mode === "upload"
    const free = design.signatoryLayout.arrange === "free"
    const fieldId = (suffix: string) => `sig-${id}-${suffix}`

    const patchArt = (patch: Parameters<typeof patchSignatureArt>[2]) =>
        onUpdate((current) => patchSignatureArt(current, id, patch))
    const patchLine = (patch: Parameters<typeof patchSignatoryLine>[2]) =>
        onUpdate((current) => patchSignatoryLine(current, id, patch))

    const scriptOptions = SCRIPT_FONTS.some((font) => font.value === art.font)
        ? SCRIPT_FONTS
        : [{ label: "Custom", value: art.font }, ...SCRIPT_FONTS]

    const uploadSignature = async (file: File) => {
        setError("")
        setBusy(true)
        try {
            const src = await prepareImageFile(file, SIGNATURE_IMAGE_SIDE)
            onUpdate((current) => {
                const previous = current.signatories.find((item) => item.id === id)?.signature.image
                return patchSignatureArt(current, id, {
                    mode: "image",
                    image: {
                        src,
                        removeBackground: previous?.removeBackground ?? false,
                        threshold: previous?.threshold ?? 35,
                    },
                })
            })
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not use that image.")
        } finally {
            setBusy(false)
        }
    }

    const showOnDesign = onArtwork ? art.visibleOnUpload : art.visible
    const showLine = onArtwork ? line.visibleOnUpload : line.visible
    const hasInk = art.mode === "draw" || art.mode === "type"

    return (
        <div className="border-3 border-black bg-neo-cream p-4 space-y-5">
            <h3 className="font-black uppercase italic text-sm">Edit signatory</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className={labelClass} htmlFor={fieldId("name")}>
                        Name
                    </label>
                    <input
                        id={fieldId("name")}
                        className={inputClass}
                        value={signatory.name}
                        onChange={(event) => onUpdate((current) => patchSignatory(current, id, { name: event.target.value }))}
                        placeholder="Jane Doe"
                    />
                </div>
                <div>
                    <label className={labelClass} htmlFor={fieldId("title")}>
                        Title or role
                    </label>
                    <input
                        id={fieldId("title")}
                        className={inputClass}
                        value={signatory.title}
                        onChange={(event) => onUpdate((current) => patchSignatory(current, id, { title: event.target.value }))}
                        placeholder="Event Coordinator"
                    />
                </div>
            </div>

            <div className="space-y-4 border-t-3 border-black pt-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="font-black uppercase text-xs">Signature</h4>
                    {art.mode !== "none" ? (
                        <label className="flex items-center gap-2 font-black uppercase text-[11px] cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showOnDesign}
                                onChange={(event) =>
                                    patchArt(onArtwork ? { visibleOnUpload: event.target.checked } : { visible: event.target.checked })
                                }
                                className={checkboxClass}
                            />
                            {onArtwork ? "Show on artwork" : "Show"}
                        </label>
                    ) : null}
                </div>

                <ChoiceButtons
                    label="How to sign"
                    value={art.mode}
                    options={SIGNATURE_MODES}
                    onChange={(mode) => patchArt({ mode })}
                />

                {art.mode === "image" ? (
                    <div className="space-y-4">
                        <label
                            className={`block border-3 border-dashed border-black bg-white p-4 text-center cursor-pointer hover:bg-neo-yellow transition-all ${busy ? "opacity-50 pointer-events-none" : ""
                                }`}
                        >
                            <span className="block font-black uppercase italic text-sm mb-1">
                                {busy ? "Reading image..." : art.image ? "Choose a different image" : "Choose a signature image"}
                            </span>
                            <span className="block font-bold text-xs text-black/70">
                                PNG with a transparent background works best · JPG and WebP too
                            </span>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    if (file) void uploadSignature(file)
                                    event.target.value = ""
                                }}
                            />
                        </label>

                        {art.image ? (
                            <div className="space-y-4">
                                <ImageThumb
                                    src={art.image.src}
                                    removeBackground={art.image.removeBackground}
                                    threshold={art.image.threshold}
                                />
                                <label className="flex items-center gap-2 font-black uppercase text-xs cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={art.image.removeBackground}
                                        onChange={(event) =>
                                            art.image && patchArt({ image: { ...art.image, removeBackground: event.target.checked } })
                                        }
                                        className={checkboxClass}
                                    />
                                    Remove white background
                                </label>
                                {art.image.removeBackground ? (
                                    <div>
                                        <RangeField
                                            id={fieldId("threshold")}
                                            label="Threshold"
                                            display={`${Math.round(art.image.threshold)}%`}
                                            value={art.image.threshold}
                                            min={0}
                                            max={100}
                                            step={1}
                                            onChange={(threshold) => art.image && patchArt({ image: { ...art.image, threshold } })}
                                        />
                                        <p className="font-bold text-[11px] text-black/60 mt-1.5">
                                            Higher removes more. Raise it until the paper disappears; lower it if the pen
                                            strokes start to fade.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="font-bold text-[11px] text-black/60">
                                        Signature on white paper? Turn this on to make the white see-through.
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {art.mode === "draw" ? (
                    <SignaturePad
                        key={`${padKey}-${id}`}
                        color={art.color}
                        value={art.strokes}
                        onChange={(strokes) => patchArt({ strokes })}
                    />
                ) : null}

                {art.mode === "type" ? (
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass} htmlFor={fieldId("typed")}>
                                Type the signature
                            </label>
                            <input
                                id={fieldId("typed")}
                                className={inputClass}
                                value={art.text}
                                onChange={(event) => patchArt({ text: event.target.value })}
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor={fieldId("script")}>
                                Script font
                            </label>
                            <select
                                id={fieldId("script")}
                                className={inputClass}
                                value={art.font}
                                onChange={(event) => patchArt({ font: event.target.value })}
                            >
                                {scriptOptions.map((font) => (
                                    <option key={font.value} value={font.value}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                            <p className="font-bold text-[11px] text-black/60 mt-1.5">
                                Dancing Script, Great Vibes and Caveat are built in. Brush Script comes from your device, so
                                it may look different on another computer.
                            </p>
                        </div>
                    </div>
                ) : null}

                {art.mode === "none" ? (
                    <p className="font-bold text-xs text-black/70">
                        Upload a picture of the signature, draw it with a mouse, finger or stylus, or type it in a script
                        font.
                    </p>
                ) : null}

                {error ? (
                    <p className="border-3 border-black bg-red-500 text-white font-black uppercase text-[11px] p-2">{error}</p>
                ) : null}

                {art.mode !== "none" ? (
                    <div className="space-y-4">
                        {hasInk ? (
                            <div>
                                <label className={labelClass} htmlFor={fieldId("ink")}>
                                    Ink colour
                                </label>
                                <input
                                    id={fieldId("ink")}
                                    type="color"
                                    value={art.color}
                                    onChange={(event) => patchArt({ color: event.target.value })}
                                    className="w-full h-10 border-3 border-black bg-white cursor-pointer p-0.5"
                                />
                            </div>
                        ) : null}

                        <RangeField
                            id={fieldId("size")}
                            label="Height"
                            display={`${art.size.toFixed(1)}% of page`}
                            value={art.size}
                            min={SIGNATURE_SIZE_LIMITS.min}
                            max={SIGNATURE_SIZE_LIMITS.max}
                            step={0.1}
                            onChange={(size) => patchArt({ size })}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <RangeField
                                id={fieldId("opacity")}
                                label="Opacity"
                                display={`${Math.round(art.opacity)}%`}
                                value={art.opacity}
                                min={10}
                                max={100}
                                step={1}
                                onChange={(opacity) => patchArt({ opacity })}
                            />
                            <RangeField
                                id={fieldId("max-width")}
                                label="Max width"
                                display={`${Math.round(art.maxWidth)}%`}
                                value={art.maxWidth}
                                min={5}
                                max={100}
                                step={1}
                                onChange={(maxWidth) => patchArt({ maxWidth })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <NumberField
                                id={fieldId("dx")}
                                label="Left / right"
                                value={art.dx}
                                min={-100}
                                max={100}
                                onChange={(dx) => patchArt({ dx })}
                            />
                            <NumberField
                                id={fieldId("dy")}
                                label="Up / down"
                                value={art.dy}
                                min={-100}
                                max={100}
                                onChange={(dy) => patchArt({ dy })}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => patchArt({ dx: 0, dy: createSignatureArt().dy })}
                                className={smallButtonClass}
                            >
                                Reset position
                            </button>
                            <span className="font-bold text-[11px] text-black/60">
                                Or drag the signature on the preview to sit it above the line.
                            </span>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="space-y-4 border-t-3 border-black pt-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="font-black uppercase text-xs">Signature line</h4>
                    <label className="flex items-center gap-2 font-black uppercase text-[11px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showLine}
                            onChange={(event) =>
                                patchLine(onArtwork ? { visibleOnUpload: event.target.checked } : { visible: event.target.checked })
                            }
                            className={checkboxClass}
                        />
                        {onArtwork ? "Show line on artwork" : "Show line"}
                    </label>
                </div>

                <ChoiceButtons label="Line style" value={line.style} options={LINE_STYLES} onChange={(style) => patchLine({ style })} />

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass} htmlFor={fieldId("line-colour")}>
                            Line colour
                        </label>
                        <input
                            id={fieldId("line-colour")}
                            type="color"
                            value={resolveLineColor(design, line)}
                            onChange={(event) => patchLine({ color: event.target.value })}
                            className="w-full h-10 border-3 border-black bg-white cursor-pointer p-0.5"
                        />
                        {line.color === null ? (
                            <p className="font-bold text-[10px] text-black/60 mt-1 uppercase">Follows the design colours</p>
                        ) : (
                            <button
                                type="button"
                                onClick={() => patchLine({ color: null })}
                                className="font-black uppercase text-[10px] underline decoration-2 underline-offset-2 mt-1"
                            >
                                Use design colour
                            </button>
                        )}
                    </div>
                    <RangeField
                        id={fieldId("line-thickness")}
                        label="Thickness"
                        display={`${Number(line.thickness.toFixed(1))}`}
                        value={line.thickness}
                        min={LINE_THICKNESS_LIMITS.min}
                        max={LINE_THICKNESS_LIMITS.max}
                        step={0.5}
                        onChange={(thickness) => patchLine({ thickness })}
                    />
                </div>
            </div>

            {free ? (
                <div className="grid grid-cols-2 gap-3 border-t-3 border-black pt-4">
                    <NumberField
                        id={fieldId("x")}
                        label="Column centre"
                        value={signatory.x}
                        min={0}
                        max={100}
                        onChange={(x) => onUpdate((current) => patchSignatory(current, id, { x }))}
                    />
                    <NumberField
                        id={fieldId("y")}
                        label="Name baseline"
                        value={signatory.y}
                        min={0}
                        max={100}
                        onChange={(y) => onUpdate((current) => patchSignatory(current, id, { y }))}
                    />
                </div>
            ) : null}
        </div>
    )
}