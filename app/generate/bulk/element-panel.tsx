"use client"

import {
    ELEMENT_IDS,
    ELEMENT_LABELS,
    FONT_OPTIONS,
    FONT_WEIGHTS,
    MIN_MAX_WIDTH,
    SCRIPT_FONTS,
    getElement,
    isElementVisible,
    resolveElementColor,
    sizeLimits,
    type Align,
    type CertificateDesign,
    type ElementId,
    type ElementPatch,
    type FontWeight,
    type SignatureChange,
    type SignatureMode,
} from "@/lib/bulk/renderer"
import { SignaturePad } from "./signature-pad"
import { checkboxClass, clamp, inputClass, labelClass } from "./ui"

const SIGNATURE_MODES: { value: SignatureMode; label: string }[] = [
    { value: "none", label: "None" },
    { value: "draw", label: "Draw" },
    { value: "type", label: "Type" },
]

interface ElementPanelProps {
    design: CertificateDesign
    selectedId: ElementId | null
    /** Changes whenever a template is loaded, so the drawing pad starts from the new signature. */
    padKey: number
    onSelect: (id: ElementId | null) => void
    onPatch: (id: ElementId, patch: ElementPatch) => void
    onSignatureChange: (change: SignatureChange) => void
}

export function ElementPanel({
    design,
    selectedId,
    padKey,
    onSelect,
    onPatch,
    onSignatureChange,
}: ElementPanelProps) {
    const onArtwork = design.mode === "upload"

    return (
        <div className="space-y-5">
            <div>
                <span className={labelClass}>Pick an element</span>
                <div className="flex flex-wrap gap-2">
                    {ELEMENT_IDS.map((id) => {
                        const active = id === selectedId
                        const shown = isElementVisible(design, id)
                        return (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => onSelect(active ? null : id)}
                                className={`px-2.5 py-1.5 border-3 border-black font-black uppercase text-[10px] sm:text-[11px] transition-all ${
                                    active
                                        ? "bg-black text-white"
                                        : shown
                                          ? "bg-white hover:bg-neo-yellow"
                                          : "bg-white text-black/40 line-through hover:bg-neo-yellow"
                                }`}
                            >
                                {ELEMENT_LABELS[id]}
                            </button>
                        )
                    })}
                </div>
            </div>

            {selectedId ? (
                <ElementFields
                    key={selectedId}
                    design={design}
                    id={selectedId}
                    onArtwork={onArtwork}
                    padKey={padKey}
                    onPatch={onPatch}
                    onSignatureChange={onSignatureChange}
                />
            ) : (
                <p className="border-3 border-dashed border-black bg-neo-cream p-4 font-bold text-xs">
                    Click any text on the preview, or pick an element above, to change its text, font, size,
                    colour and position.
                </p>
            )}
        </div>
    )
}

interface ElementFieldsProps {
    design: CertificateDesign
    id: ElementId
    onArtwork: boolean
    padKey: number
    onPatch: (id: ElementId, patch: ElementPatch) => void
    onSignatureChange: (change: SignatureChange) => void
}

function ElementFields({ design, id, onArtwork, padKey, onPatch, onSignatureChange }: ElementFieldsProps) {
    const element = getElement(design, id)
    const isSignature = id === "signature"
    const isName = id === "name"
    const isBody = id === "body"
    const patch = (change: ElementPatch) => onPatch(id, change)
    const limits = sizeLimits(id)
    const fieldId = (suffix: string) => `el-${id}-${suffix}`
    const colour = resolveElementColor(design, id)
    const signature = design.signature
    const drawing = isSignature && signature.mode === "draw"
    const typed = isSignature && signature.mode === "type"
    // Only a signature that has been drawn or typed has any text style to adjust.
    const showStyleControls = !isSignature || signature.mode !== "none"

    const scriptOptions = SCRIPT_FONTS.some((font) => font.value === element.font)
        ? SCRIPT_FONTS
        : [{ label: "Custom", value: element.font }, ...SCRIPT_FONTS]

    const visible = onArtwork ? element.visibleOnUpload : element.visible

    return (
        <div className="border-3 border-black bg-neo-cream p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-black uppercase italic text-sm">{ELEMENT_LABELS[id]}</h3>
                {!isName ? (
                    <label className="flex items-center gap-2 font-black uppercase text-[11px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={visible}
                            onChange={(event) =>
                                patch(
                                    onArtwork
                                        ? { visibleOnUpload: event.target.checked }
                                        : { visible: event.target.checked }
                                )
                            }
                            className={checkboxClass}
                        />
                        {onArtwork ? "Show on artwork" : "Show"}
                    </label>
                ) : null}
            </div>

            {isSignature ? (
                <div className="space-y-4">
                    <div>
                        <span className={labelClass}>How to sign</span>
                        <div className="grid grid-cols-3 gap-2">
                            {SIGNATURE_MODES.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={signature.mode === option.value}
                                    onClick={() => onSignatureChange({ mode: option.value })}
                                    className={`px-2 py-2 border-3 border-black font-black uppercase text-[11px] transition-all ${
                                        signature.mode === option.value
                                            ? "bg-neo-yellow"
                                            : "bg-white hover:bg-neo-yellow"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {drawing ? (
                        <SignaturePad
                            key={padKey}
                            color={signature.color}
                            value={signature.strokes}
                            onChange={(strokes) => onSignatureChange({ strokes })}
                        />
                    ) : null}

                    {typed ? (
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass} htmlFor={fieldId("typed")}>
                                    Type your signature
                                </label>
                                <input
                                    id={fieldId("typed")}
                                    className={inputClass}
                                    value={element.text}
                                    onChange={(event) => patch({ text: event.target.value })}
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor={fieldId("script")}>
                                    Script font
                                </label>
                                <select
                                    id={fieldId("script")}
                                    className={inputClass}
                                    value={element.font}
                                    onChange={(event) => patch({ font: event.target.value })}
                                >
                                    {scriptOptions.map((font) => (
                                        <option key={font.value} value={font.value}>
                                            {font.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="font-bold text-[11px] text-black/60 mt-1.5">
                                    Script fonts come from your device, so they may look different on another
                                    computer.
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {signature.mode === "none" ? (
                        <p className="font-bold text-xs text-black/70">
                            Choose Draw to sign with your mouse, finger or stylus, or Type to use a script font.
                        </p>
                    ) : null}
                </div>
            ) : isName ? (
                <p className="font-bold text-xs bg-white border-3 border-black p-3">
                    Each certificate gets its own participant&apos;s name here. Style and place it below.
                </p>
            ) : (
                <div>
                    <label className={labelClass} htmlFor={fieldId("text")}>
                        Text
                    </label>
                    {isBody ? (
                        <textarea
                            id={fieldId("text")}
                            rows={3}
                            className={`${inputClass} resize-none`}
                            value={element.text}
                            onChange={(event) => patch({ text: event.target.value })}
                        />
                    ) : (
                        <input
                            id={fieldId("text")}
                            className={inputClass}
                            value={element.text}
                            onChange={(event) => patch({ text: event.target.value })}
                        />
                    )}
                </div>
            )}

            {showStyleControls ? (
                <div className="space-y-4">
                    {!isSignature ? (
                        <div>
                            <label className={labelClass} htmlFor={fieldId("font")}>
                                Font
                            </label>
                            <select
                                id={fieldId("font")}
                                className={inputClass}
                                value={element.font}
                                onChange={(event) => patch({ font: event.target.value })}
                            >
                                {FONT_OPTIONS.map((font) => (
                                    <option key={font.value} value={font.value}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {!isSignature ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass} htmlFor={fieldId("weight")}>
                                    Weight
                                </label>
                                <select
                                    id={fieldId("weight")}
                                    className={inputClass}
                                    value={element.weight}
                                    onChange={(event) =>
                                        patch({ weight: Number(event.target.value) as FontWeight })
                                    }
                                >
                                    {FONT_WEIGHTS.map((weight) => (
                                        <option key={weight.value} value={weight.value}>
                                            {weight.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 font-black uppercase text-xs cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={element.italic}
                                        onChange={(event) => patch({ italic: event.target.checked })}
                                        className={checkboxClass}
                                    />
                                    Italic
                                </label>
                            </div>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} htmlFor={fieldId("color")}>
                                Colour
                            </label>
                            <input
                                id={fieldId("color")}
                                type="color"
                                value={colour}
                                onChange={(event) => patch({ color: event.target.value })}
                                className="w-full h-10 border-3 border-black bg-white cursor-pointer p-0.5"
                            />
                            {element.color === null ? (
                                <p className="font-bold text-[10px] text-black/60 mt-1 uppercase">
                                    Follows the design colours
                                </p>
                            ) : !isName && !isSignature ? (
                                <button
                                    type="button"
                                    onClick={() => patch({ color: null })}
                                    className="font-black uppercase text-[10px] underline decoration-2 underline-offset-2 mt-1"
                                >
                                    Use design colour
                                </button>
                            ) : null}
                        </div>
                        <div>
                            <span className={labelClass}>Alignment</span>
                            <div className="grid grid-cols-3 gap-1">
                                {(["left", "center", "right"] as Align[]).map((align) => (
                                    <button
                                        key={align}
                                        type="button"
                                        aria-label={`Align ${align}`}
                                        aria-pressed={element.align === align}
                                        onClick={() => patch({ align })}
                                        className={`h-10 border-3 border-black font-black uppercase text-[10px] transition-all ${
                                            element.align === align ? "bg-black text-white" : "bg-white hover:bg-neo-yellow"
                                        }`}
                                    >
                                        {align[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor={fieldId("size")}>
                            {drawing ? "Height" : "Size"} · {element.size.toFixed(1)}% of height
                        </label>
                        <input
                            id={fieldId("size")}
                            type="range"
                            min={limits.min}
                            max={limits.max}
                            step={0.1}
                            value={clamp(element.size, limits.min, limits.max)}
                            onChange={(event) => patch({ size: Number(event.target.value) })}
                            className="w-full accent-black"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} htmlFor={fieldId("opacity")}>
                                Opacity · {Math.round(element.opacity)}%
                            </label>
                            <input
                                id={fieldId("opacity")}
                                type="range"
                                min={10}
                                max={100}
                                step={1}
                                value={element.opacity}
                                onChange={(event) => patch({ opacity: Number(event.target.value) })}
                                className="w-full accent-black"
                            />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor={fieldId("width")}>
                                {isBody ? "Wrap width" : "Max width"} · {Math.round(element.maxWidth)}%
                            </label>
                            <input
                                id={fieldId("width")}
                                type="range"
                                min={MIN_MAX_WIDTH}
                                max={100}
                                step={1}
                                value={element.maxWidth}
                                onChange={(event) => patch({ maxWidth: Number(event.target.value) })}
                                className="w-full accent-black"
                            />
                        </div>
                    </div>

                    {!isSignature ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass} htmlFor={fieldId("spacing")}>
                                    Letter spacing · {element.letterSpacing}px
                                </label>
                                <input
                                    id={fieldId("spacing")}
                                    type="range"
                                    min={0}
                                    max={20}
                                    step={1}
                                    value={clamp(element.letterSpacing, 0, 20)}
                                    onChange={(event) => patch({ letterSpacing: Number(event.target.value) })}
                                    className="w-full accent-black"
                                />
                            </div>
                            {isBody ? (
                                <div>
                                    <label className={labelClass} htmlFor={fieldId("leading")}>
                                        Line spacing · {element.lineHeight.toFixed(2)}
                                    </label>
                                    <input
                                        id={fieldId("leading")}
                                        type="range"
                                        min={1}
                                        max={2.5}
                                        step={0.05}
                                        value={clamp(element.lineHeight, 1, 2.5)}
                                        onChange={(event) => patch({ lineHeight: Number(event.target.value) })}
                                        className="w-full accent-black"
                                    />
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass} htmlFor={fieldId("x")}>
                        Horizontal · {Number(element.x.toFixed(2))}%
                    </label>
                    <input
                        id={fieldId("x")}
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={Number(element.x.toFixed(2))}
                        onChange={(event) => patch({ x: clamp(Number(event.target.value) || 0, 0, 100) })}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className={labelClass} htmlFor={fieldId("y")}>
                        Vertical · {Number(element.y.toFixed(2))}%
                    </label>
                    <input
                        id={fieldId("y")}
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={Number(element.y.toFixed(2))}
                        onChange={(event) => patch({ y: clamp(Number(event.target.value) || 0, 0, 100) })}
                        className={inputClass}
                    />
                </div>
            </div>

            {showStyleControls && !isSignature && !isBody ? (
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 font-black uppercase text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={element.uppercase}
                            onChange={(event) => patch({ uppercase: event.target.checked })}
                            className={checkboxClass}
                        />
                        Uppercase
                    </label>
                    <label className="flex items-center gap-2 font-black uppercase text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={element.underline}
                            onChange={(event) => patch({ underline: event.target.checked })}
                            className={checkboxClass}
                        />
                        Underline
                    </label>
                </div>
            ) : null}

            {showStyleControls && isBody ? (
                <label className="flex items-center gap-2 font-black uppercase text-xs cursor-pointer">
                    <input
                        type="checkbox"
                        checked={element.uppercase}
                        onChange={(event) => patch({ uppercase: event.target.checked })}
                        className={checkboxClass}
                    />
                    Uppercase
                </label>
            ) : null}

        </div>
    )
}
