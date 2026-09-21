"use client"

/**
 * The first half of the certificate designer: whether the certificate is built from a
 * preset or drawn on uploaded artwork, and, for a preset, its style, page size, colours
 * and wording. Every screen that designs a certificate shows this same panel.
 */

import {
    SIZE_PRESETS,
    applyPageSize,
    applyPreset,
    type PresetId,
} from "@/lib/bulk/renderer"
import type { Designer } from "./use-designer"
import { inputClass, labelClass } from "./ui"

const PRESETS: { id: PresetId; label: string }[] = [
    { id: "classic", label: "Classic" },
    { id: "neo", label: "Neo Brutal" },
    { id: "minimal", label: "Minimal" },
]

export function DesignBasics({ designer }: { designer: Designer }) {
    const {
        design,
        setDesign,
        update,
        updateText,
        background,
        backgroundName,
        handleBackgroundFile,
        clearBackground,
    } = designer

    return (
        <>
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
                        Drag the name on the preview to place it exactly where your artwork
                        leaves room for it. Turn on other elements under &ldquo;Edit the text&rdquo;
                        if you want them drawn over the artwork too.
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
                                        setDesign((current) => applyPreset(current, preset.id))
                                    }
                                    className={`px-2 py-2 border-3 border-black font-black uppercase text-[11px] transition-all ${design.preset === preset.id ? "bg-neo-yellow shadow-none" : "bg-white shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1"}`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <p className="font-bold text-[11px] text-black/60 mt-1.5">
                            Changing the style or page size resets where the text sits. Your
                            wording is kept.
                        </p>
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
                                    setDesign((current) =>
                                        applyPageSize(current, preset.width, preset.height)
                                    )
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
                            value={design.elements.organization.text}
                            onChange={(event) => updateText("organization", event.target.value)}
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
                            value={design.elements.heading.text}
                            onChange={(event) => updateText("heading", event.target.value)}
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
                            value={design.elements.subheading.text}
                            onChange={(event) => updateText("subheading", event.target.value)}
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
                            value={design.elements.body.text}
                            onChange={(event) => updateText("body", event.target.value)}
                            placeholder="for successfully completing..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} htmlFor="left-label">
                                Date label
                            </label>
                            <input
                                id="left-label"
                                className={inputClass}
                                value={design.elements.dateLabel.text}
                                onChange={(event) => updateText("dateLabel", event.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="left-value">
                                Date
                            </label>
                            <input
                                id="left-value"
                                className={inputClass}
                                value={design.elements.date.text}
                                onChange={(event) => updateText("date", event.target.value)}
                            />
                        </div>
                    </div>
                    <p className="font-bold text-[11px] text-black/60">
                        Names, titles and signatures of the people signing are set under Signatories.
                    </p>
                </div>
            )}
        </>
    )
}
