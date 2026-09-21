"use client"

import { useState } from "react"
import {
    LOGO_RADIUS_MAX,
    LOGO_WIDTH_LIMITS,
    addLogo,
    newId,
    patchLogo,
    removeLogo,
    type CertificateDesign,
    type Logo,
    type Selection,
} from "@/lib/bulk/renderer"
import { LOGO_IMAGE_SIDE, prepareImageFile } from "@/lib/bulk/images"
import { NumberField, RangeField } from "./fields"
import { ImageThumb } from "./image-thumb"
import { checkboxClass, labelClass, smallButtonClass } from "./ui"

type UpdateDesign = (update: (design: CertificateDesign) => CertificateDesign) => void

interface LogoPanelProps {
    design: CertificateDesign
    selection: Selection | null
    onSelect: (selection: Selection | null) => void
    onUpdate: UpdateDesign
}

export function LogoPanel({ design, selection, onSelect, onUpdate }: LogoPanelProps) {
    const [error, setError] = useState("")
    const [busy, setBusy] = useState(false)

    const count = design.logos.length
    const selectedId = selection?.kind === "logo" ? selection.id : null
    const selected = design.logos.find((logo) => logo.id === selectedId) ?? null

    const addFromFile = async (file: File) => {
        setError("")
        setBusy(true)
        try {
            const src = await prepareImageFile(file, LOGO_IMAGE_SIDE)
            const id = newId(design.logos.map((logo) => logo.id))
            onUpdate((current) => addLogo(current, id, src))
            onSelect({ kind: "logo", id })
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not use that image.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <span className={labelClass}>
                    {count} logo{count === 1 ? "" : "s"}
                </span>
                <label className={`${smallButtonClass} cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}>
                    {busy ? "Reading..." : "+ Add logo"}
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void addFromFile(file)
                            event.target.value = ""
                        }}
                    />
                </label>
            </div>

            {error ? (
                <p className="border-3 border-black bg-red-500 text-white font-black uppercase text-[11px] p-2">{error}</p>
            ) : null}

            {count === 0 ? (
                <p className="border-3 border-dashed border-black bg-neo-cream p-4 font-bold text-xs">
                    Add your organization&apos;s or a sponsor&apos;s logo (PNG, JPG or WebP). Then drag it on the preview to
                    place it, and drag a corner to resize it.
                </p>
            ) : (
                <ul className="space-y-2">
                    {design.logos.map((logo, index) => {
                        const active = logo.id === selectedId
                        return (
                            <li
                                key={logo.id}
                                className={`flex items-center gap-2 border-3 border-black p-2 ${active ? "bg-neo-yellow" : "bg-white"}`}
                            >
                                <button
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onSelect(active ? null : { kind: "logo", id: logo.id })}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >
                                    <span
                                        aria-hidden
                                        className="h-10 w-14 shrink-0 border-2 border-black bg-white bg-contain bg-center bg-no-repeat"
                                        style={{ backgroundImage: `url("${logo.src}")` }}
                                    />
                                    <span className="block truncate font-black text-xs uppercase">
                                        Logo {index + 1}
                                        {logo.visible ? "" : " (hidden)"}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Remove logo ${index + 1}`}
                                    onClick={() => {
                                        if (active) onSelect(null)
                                        onUpdate((current) => removeLogo(current, logo.id))
                                    }}
                                    className={smallButtonClass}
                                >
                                    ✕
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}

            {selected ? (
                <LogoEditor key={selected.id} logo={selected} onUpdate={onUpdate} onError={setError} />
            ) : count > 0 ? (
                <p className="border-3 border-dashed border-black bg-neo-cream p-4 font-bold text-xs">
                    Pick a logo above, or click it on the preview, to change its size, opacity and corners.
                </p>
            ) : null}
        </div>
    )
}

interface LogoEditorProps {
    logo: Logo
    onUpdate: UpdateDesign
    onError: (message: string) => void
}

function LogoEditor({ logo, onUpdate, onError }: LogoEditorProps) {
    const [busy, setBusy] = useState(false)
    const { id } = logo
    const fieldId = (suffix: string) => `logo-${id}-${suffix}`
    const patch = (change: Partial<Omit<Logo, "id">>) => onUpdate((current) => patchLogo(current, id, change))

    const replace = async (file: File) => {
        onError("")
        setBusy(true)
        try {
            const src = await prepareImageFile(file, LOGO_IMAGE_SIDE)
            patch({ src })
        } catch (caught) {
            onError(caught instanceof Error ? caught.message : "Could not use that image.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="border-3 border-black bg-neo-cream p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-black uppercase italic text-sm">Edit logo</h3>
                <label className="flex items-center gap-2 font-black uppercase text-[11px] cursor-pointer">
                    <input
                        type="checkbox"
                        checked={logo.visible}
                        onChange={(event) => patch({ visible: event.target.checked })}
                        className={checkboxClass}
                    />
                    Show
                </label>
            </div>

            <ImageThumb src={logo.src} />

            <label className={`${smallButtonClass} inline-block cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}>
                {busy ? "Reading..." : "Replace image"}
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void replace(file)
                        event.target.value = ""
                    }}
                />
            </label>

            <RangeField
                id={fieldId("width")}
                label="Size"
                display={`${Number(logo.width.toFixed(1))}% of page width`}
                value={logo.width}
                min={LOGO_WIDTH_LIMITS.min}
                max={LOGO_WIDTH_LIMITS.max}
                step={0.5}
                onChange={(width) => patch({ width })}
            />

            <div className="grid grid-cols-2 gap-3">
                <RangeField
                    id={fieldId("opacity")}
                    label="Opacity"
                    display={`${Math.round(logo.opacity)}%`}
                    value={logo.opacity}
                    min={10}
                    max={100}
                    step={1}
                    onChange={(opacity) => patch({ opacity })}
                />
                <RangeField
                    id={fieldId("radius")}
                    label="Corner radius"
                    display={`${Math.round(logo.radius)}%`}
                    value={logo.radius}
                    min={0}
                    max={LOGO_RADIUS_MAX}
                    step={1}
                    onChange={(radius) => patch({ radius })}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <NumberField
                    id={fieldId("x")}
                    label="Horizontal"
                    value={logo.x}
                    min={0}
                    max={100}
                    onChange={(x) => patch({ x })}
                />
                <NumberField
                    id={fieldId("y")}
                    label="Vertical"
                    value={logo.y}
                    min={0}
                    max={100}
                    onChange={(y) => patch({ y })}
                />
            </div>
        </div>
    )
}