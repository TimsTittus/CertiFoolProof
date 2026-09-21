"use client"

import { useEffect, useRef, useState } from "react"
import {
    ELEMENT_LABELS,
    MIN_MAX_WIDTH,
    getElement,
    renderToCanvas,
    sizeLimits,
    type CertificateDesign,
    type ElementBox,
    type ElementId,
    type ElementPatch,
    type RenderedLayout,
} from "@/lib/bulk/renderer"
import { clamp } from "./ui"

/** Top-most first when boxes overlap: the name and signature are drawn last, so they win. */
const HIT_ORDER: ElementId[] = [
    "organization",
    "heading",
    "subheading",
    "body",
    "dateLabel",
    "date",
    "signatureLabel",
    "signatureName",
    "signature",
    "name",
]

const MIN_WRAP_WIDTH = 10

const round1 = (value: number) => Math.round(value * 10) / 10
const round2 = (value: number) => Math.round(value * 100) / 100

type Interaction =
    | { kind: "move"; id: ElementId; startX: number; startY: number; originX: number; originY: number }
    | {
        kind: "scale"
        id: ElementId
        centerX: number
        centerY: number
        startDistance: number
        startSize: number
        startMaxWidth: number
    }
    | { kind: "width"; id: ElementId; startX: number; startMaxWidth: number; direction: 1 | -1; factor: 1 | 2 }

type Corner = "nw" | "ne" | "sw" | "se"

const CORNERS: { corner: Corner; style: React.CSSProperties; cursor: string }[] = [
    { corner: "nw", style: { left: 0, top: 0 }, cursor: "nwse-resize" },
    { corner: "ne", style: { left: "100%", top: 0 }, cursor: "nesw-resize" },
    { corner: "sw", style: { left: 0, top: "100%" }, cursor: "nesw-resize" },
    { corner: "se", style: { left: "100%", top: "100%" }, cursor: "nwse-resize" },
]

const handleClass =
    "absolute w-3.5 h-3.5 border-2 border-black bg-neo-yellow -translate-x-1/2 -translate-y-1/2 pointer-events-auto"

interface PreviewStageProps {
    design: CertificateDesign
    name: string
    background: CanvasImageSource | null
    selectedId: ElementId | null
    onSelect: (id: ElementId | null) => void
    onPatch: (id: ElementId, patch: ElementPatch) => void
    /** Bumps when web fonts finish loading, so text drawn in a fallback font is redrawn. */
    fontVersion: number
}

export function PreviewStage({
    design,
    name,
    background,
    selectedId,
    onSelect,
    onPatch,
    fontVersion,
}: PreviewStageProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const interaction = useRef<Interaction | null>(null)
    const [boxes, setBoxes] = useState<RenderedLayout>({})

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const layout = renderToCanvas(canvas, design, name, background)
        if (layout) setBoxes(layout)
    }, [design, name, background, fontVersion])

    const beginMove = (event: React.PointerEvent<HTMLElement>, id: ElementId) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        event.stopPropagation()
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)

        const element = getElement(design, id)
        onSelect(id)
        interaction.current = {
            kind: "move",
            id,
            startX: event.clientX,
            startY: event.clientY,
            originX: element.x,
            originY: element.y,
        }
    }

    const beginScale = (event: React.PointerEvent<HTMLElement>, id: ElementId, box: ElementBox) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        const rect = wrapperRef.current?.getBoundingClientRect()
        if (!rect || rect.width === 0) return
        event.stopPropagation()
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)

        const centerX = rect.left + ((box.x + box.w / 2) / design.width) * rect.width
        const centerY = rect.top + ((box.y + box.h / 2) / design.height) * rect.height
        const element = getElement(design, id)
        interaction.current = {
            kind: "scale",
            id,
            centerX,
            centerY,
            startDistance: Math.max(8, Math.hypot(event.clientX - centerX, event.clientY - centerY)),
            startSize: element.size,
            startMaxWidth: element.maxWidth,
        }
    }

    const beginWidth = (event: React.PointerEvent<HTMLElement>, id: ElementId, direction: 1 | -1) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        event.stopPropagation()
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)

        const element = getElement(design, id)
        interaction.current = {
            kind: "width",
            id,
            startX: event.clientX,
            startMaxWidth: element.maxWidth,
            direction,
            factor: element.align === "center" ? 2 : 1,
        }
    }

    const handleMove = (event: React.PointerEvent<HTMLElement>) => {
        const active = interaction.current
        const rect = wrapperRef.current?.getBoundingClientRect()
        if (!active || !rect || rect.width === 0 || rect.height === 0) return

        if (active.kind === "move") {
            const x = active.originX + ((event.clientX - active.startX) / rect.width) * 100
            const y = active.originY + ((event.clientY - active.startY) / rect.height) * 100
            onPatch(active.id, { x: round1(clamp(x, 0, 100)), y: round1(clamp(y, 0, 100)) })
        } else if (active.kind === "scale") {
            const distance = Math.hypot(event.clientX - active.centerX, event.clientY - active.centerY)
            const limits = sizeLimits(active.id)
            // Scale text and its wrap width together so the whole block grows or shrinks as one object.
            const size = clamp(active.startSize * (distance / active.startDistance), limits.min, limits.max)
            const ratio = size / active.startSize
            onPatch(active.id, {
                size: round2(size),
                maxWidth: round2(clamp(active.startMaxWidth * ratio, MIN_MAX_WIDTH, 100)),
            })
        } else {
            const delta = ((event.clientX - active.startX) / rect.width) * 100
            const maxWidth = active.startMaxWidth + active.direction * delta * active.factor
            onPatch(active.id, { maxWidth: round1(clamp(maxWidth, MIN_WRAP_WIDTH, 100)) })
        }
    }

    // The browser releases pointer capture by itself when the pointer is lifted or cancelled.
    // Moves and releases from a handle bubble up to its box, so the box handles them all.
    const endInteraction = () => {
        interaction.current = null
    }

    return (
        <div
            ref={wrapperRef}
            className="relative"
            // Anything that is not an element (the artwork or empty space) clears the selection.
            onPointerDown={() => onSelect(null)}
        >
            <canvas ref={canvasRef} className="w-full h-auto block select-none" />

            <div className="pointer-events-none absolute inset-0">
                {HIT_ORDER.map((id) => {
                    const box = boxes[id]
                    if (!box) return null
                    const selected = id === selectedId
                    const element = getElement(design, id)
                    const wraps = id === "body"

                    return (
                        <div
                            key={id}
                            role="button"
                            aria-label={`${ELEMENT_LABELS[id]}${selected ? " (selected)" : ""}`}
                            aria-pressed={selected}
                            onPointerDown={(event) => beginMove(event, id)}
                            onPointerMove={handleMove}
                            onPointerUp={endInteraction}
                            onPointerCancel={endInteraction}
                            style={{
                                left: `${(box.x / design.width) * 100}%`,
                                top: `${(box.y / design.height) * 100}%`,
                                width: `${(box.w / design.width) * 100}%`,
                                height: `${(box.h / design.height) * 100}%`,
                                minWidth: 16,
                                minHeight: 16,
                                touchAction: "none",
                                zIndex: selected ? 20 : 10,
                            }}
                            className={`pointer-events-auto absolute cursor-move outline-offset-2 ${selected
                                ? "outline outline-2 outline-dashed outline-black"
                                : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-black/60"
                                }`}
                        >
                            {selected ? (
                                <>
                                    <span className="pointer-events-none absolute left-0 bottom-full mb-2 whitespace-nowrap bg-black text-white text-[10px] font-black uppercase px-1.5 py-0.5">
                                        {ELEMENT_LABELS[id]}
                                    </span>

                                    {CORNERS.map(({ corner, style, cursor }) => (
                                        <span
                                            key={corner}
                                            data-handle={`scale-${corner}`}
                                            className={handleClass}
                                            style={{ ...style, cursor, touchAction: "none" }}
                                            onPointerDown={(event) => beginScale(event, id, box)}
                                        />
                                    ))}

                                    {wraps
                                        ? ([-1, 1] as const)
                                            .filter(
                                                (direction) =>
                                                    element.align === "center" ||
                                                    (element.align === "left" && direction === 1) ||
                                                    (element.align === "right" && direction === -1)
                                            )
                                            .map((direction) => (
                                                <span
                                                    key={direction}
                                                    data-handle={direction === 1 ? "width-right" : "width-left"}
                                                    className={handleClass}
                                                    style={{
                                                        left: direction === 1 ? "100%" : 0,
                                                        top: "50%",
                                                        cursor: "ew-resize",
                                                        touchAction: "none",
                                                    }}
                                                    onPointerDown={(event) => beginWidth(event, id, direction)}
                                                />
                                            ))
                                        : null}
                                </>
                            ) : null}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}