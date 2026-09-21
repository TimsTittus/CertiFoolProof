"use client"

import { useEffect, useRef, useState } from "react"
import {
    ELEMENT_LABELS,
    LOGO_WIDTH_LIMITS,
    MIN_MAX_WIDTH,
    SIGNATURE_SIZE_LIMITS,
    getElement,
    moveSignatory,
    patchLogo,
    patchSignatureArt,
    renderToCanvas,
    sameSelection,
    sizeLimits,
    type CertificateDesign,
    type ElementBox,
    type ElementId,
    type ElementPatch,
    type RenderedLayout,
    type Selection,
} from "@/lib/bulk/renderer"
import type { Recipient } from "@/lib/bulk/tokens"
import { clamp } from "./ui"

const TEXT_HIT_ORDER: ElementId[] = ["organization", "heading", "subheading", "body", "dateLabel", "date"]

const MIN_WRAP_WIDTH = 10

const round1 = (value: number) => Math.round(value * 10) / 10
const round2 = (value: number) => Math.round(value * 100) / 100

type Interaction =
    | { kind: "move"; target: Selection; startX: number; startY: number; originX: number; originY: number }
    | {
        kind: "scale"
        target: Selection
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

/** One thing on the preview that can be clicked, dragged and (mostly) resized. */
interface HitItem {
    key: string
    selection: Selection
    label: string
    box: ElementBox
    resizable: boolean
}

interface PreviewStageProps {
    design: CertificateDesign
    /** The recipient the preview is standing in for, with their data and any tweaks of their own. */
    recipient: Recipient
    background: CanvasImageSource | null
    selection: Selection | null
    onSelect: (selection: Selection | null) => void
    onPatch: (id: ElementId, patch: ElementPatch) => void
    onUpdate: (update: (design: CertificateDesign) => CertificateDesign) => void
    /** Bumps when web fonts or uploaded pictures finish loading, so anything drawn without them is redrawn. */
    assetVersion: number
    /** Called after every draw with the ids of the elements whose text did not fit, joined by commas. */
    onOverflow?: (ids: string) => void
}

const EMPTY_LAYOUT: RenderedLayout = { elements: {}, signatories: {}, logos: {}, overflow: [] }

export function PreviewStage({
    design,
    recipient,
    background,
    selection,
    onSelect,
    onPatch,
    onUpdate,
    assetVersion,
    onOverflow,
}: PreviewStageProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const interaction = useRef<Interaction | null>(null)
    const [layout, setLayout] = useState<RenderedLayout>(EMPTY_LAYOUT)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rendered = renderToCanvas(canvas, design, recipient, background)
        if (!rendered) return
        setLayout(rendered)
        // Reporting the same string twice is a no-op for React, so this cannot loop.
        onOverflow?.(rendered.overflow.join(","))
    }, [design, recipient, background, assetVersion, onOverflow])

    const items: HitItem[] = []

    for (const logo of design.logos) {
        const box = layout.logos[logo.id]
        if (box) items.push({ key: `logo:${logo.id}`, selection: { kind: "logo", id: logo.id }, label: "Logo", box, resizable: true })
    }
    for (const id of TEXT_HIT_ORDER) {
        const box = layout.elements[id]
        if (box) items.push({ key: `element:${id}`, selection: { kind: "element", id }, label: ELEMENT_LABELS[id], box, resizable: true })
    }
    for (const signatory of design.signatories) {
        const box = layout.signatories[signatory.id]?.block
        if (box) {
            items.push({
                key: `signatory:${signatory.id}`,
                selection: { kind: "signatory", id: signatory.id },
                label: signatory.name ? `Signatory: ${signatory.name}` : "Signatory",
                box,
                resizable: false,
            })
        }
    }
    for (const signatory of design.signatories) {
        const box = layout.signatories[signatory.id]?.signature
        if (box) {
            items.push({
                key: `signature:${signatory.id}`,
                selection: { kind: "signature", id: signatory.id },
                label: "Signature",
                box,
                resizable: true,
            })
        }
    }
    const nameBox = layout.elements.name
    if (nameBox) {
        items.push({ key: "element:name", selection: { kind: "element", id: "name" }, label: ELEMENT_LABELS.name, box: nameBox, resizable: true })
    }

    // A recipient's own nudge moves the drawn name away from the design's position; dragging works
    // in what is on screen and the nudge is taken off again before the design is changed, so the
    // box follows the pointer exactly and the tweak survives the drag.
    const nameNudge = recipient.nudge

    const originOf = (target: Selection): { x: number; y: number } | null => {
        switch (target.kind) {
            case "element": {
                const element = getElement(design, target.id)
                if (target.id === "name" && nameNudge) {
                    return { x: element.x + nameNudge.dx, y: element.y + nameNudge.dy }
                }
                return { x: element.x, y: element.y }
            }
            case "signatory": {
                const frame = layout.signatories[target.id]?.frame
                if (!frame) return null
                return { x: (frame.x / design.width) * 100, y: (frame.baselineY / design.height) * 100 }
            }
            case "signature": {
                const art = design.signatories.find((signatory) => signatory.id === target.id)?.signature
                return art ? { x: art.dx, y: art.dy } : null
            }
            case "logo": {
                const logo = design.logos.find((item) => item.id === target.id)
                return logo ? { x: logo.x, y: logo.y } : null
            }
        }
    }

    const scaleStartOf = (target: Selection): { size: number; maxWidth: number } | null => {
        switch (target.kind) {
            case "element": {
                const element = getElement(design, target.id)
                return { size: element.size, maxWidth: element.maxWidth }
            }
            case "signature": {
                const art = design.signatories.find((signatory) => signatory.id === target.id)?.signature
                return art ? { size: art.size, maxWidth: art.maxWidth } : null
            }
            case "logo": {
                const logo = design.logos.find((item) => item.id === target.id)
                return logo ? { size: logo.width, maxWidth: 0 } : null
            }
            case "signatory":
                return null
        }
    }

    const beginMove = (event: React.PointerEvent<HTMLElement>, target: Selection) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        event.stopPropagation()
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)

        onSelect(target)
        const origin = originOf(target)
        if (!origin) return
        interaction.current = {
            kind: "move",
            target,
            startX: event.clientX,
            startY: event.clientY,
            originX: origin.x,
            originY: origin.y,
        }
    }

    const beginScale = (event: React.PointerEvent<HTMLElement>, target: Selection, box: ElementBox) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        const rect = wrapperRef.current?.getBoundingClientRect()
        const start = scaleStartOf(target)
        if (!rect || rect.width === 0 || !start) return
        event.stopPropagation()
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)

        const centerX = rect.left + ((box.x + box.w / 2) / design.width) * rect.width
        const centerY = rect.top + ((box.y + box.h / 2) / design.height) * rect.height
        interaction.current = {
            kind: "scale",
            target,
            centerX,
            centerY,
            startDistance: Math.max(8, Math.hypot(event.clientX - centerX, event.clientY - centerY)),
            startSize: start.size,
            startMaxWidth: start.maxWidth,
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

    const applyMove = (target: Selection, x: number, y: number) => {
        switch (target.kind) {
            case "element": {
                const offsetX = target.id === "name" && nameNudge ? nameNudge.dx : 0
                const offsetY = target.id === "name" && nameNudge ? nameNudge.dy : 0
                onPatch(target.id, {
                    x: round1(clamp(x - offsetX, 0, 100)),
                    y: round1(clamp(y - offsetY, 0, 100)),
                })
                break
            }
            case "signatory":
                onUpdate((current) => moveSignatory(current, target.id, round1(clamp(x, 0, 100)), round1(clamp(y, 0, 100))))
                break
            case "signature":
                onUpdate((current) =>
                    patchSignatureArt(current, target.id, { dx: round1(clamp(x, -100, 100)), dy: round1(clamp(y, -100, 100)) })
                )
                break
            case "logo":
                onUpdate((current) => patchLogo(current, target.id, { x: round1(clamp(x, 0, 100)), y: round1(clamp(y, 0, 100)) }))
                break
        }
    }

    const applyScale = (active: Extract<Interaction, { kind: "scale" }>, factor: number) => {
        const { target, startSize, startMaxWidth } = active
        switch (target.kind) {
            case "element": {
                const limits = sizeLimits()
                // Scale text and its wrap width together so the whole block grows or shrinks as one object.
                const size = clamp(startSize * factor, limits.min, limits.max)
                const ratio = size / startSize
                onPatch(target.id, {
                    size: round2(size),
                    maxWidth: round2(clamp(startMaxWidth * ratio, MIN_MAX_WIDTH, 100)),
                })
                break
            }
            case "signature": {
                const size = clamp(startSize * factor, SIGNATURE_SIZE_LIMITS.min, SIGNATURE_SIZE_LIMITS.max)
                const ratio = size / startSize
                onUpdate((current) =>
                    patchSignatureArt(current, target.id, {
                        size: round2(size),
                        maxWidth: round2(clamp(startMaxWidth * ratio, MIN_MAX_WIDTH, 100)),
                    })
                )
                break
            }
            case "logo": {
                const width = clamp(startSize * factor, LOGO_WIDTH_LIMITS.min, LOGO_WIDTH_LIMITS.max)
                onUpdate((current) => patchLogo(current, target.id, { width: round2(width) }))
                break
            }
            case "signatory":
                break
        }
    }

    const handleMove = (event: React.PointerEvent<HTMLElement>) => {
        const active = interaction.current
        const rect = wrapperRef.current?.getBoundingClientRect()
        if (!active || !rect || rect.width === 0 || rect.height === 0) return

        if (active.kind === "move") {
            const x = active.originX + ((event.clientX - active.startX) / rect.width) * 100
            const y = active.originY + ((event.clientY - active.startY) / rect.height) * 100
            applyMove(active.target, x, y)
        } else if (active.kind === "scale") {
            const distance = Math.hypot(event.clientX - active.centerX, event.clientY - active.centerY)
            applyScale(active, distance / active.startDistance)
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
                {items.map((item) => {
                    const { box, selection: target } = item
                    const selected = sameSelection(selection, target)
                    const wraps = target.kind === "element" && getElement(design, target.id).fit !== "shrink"
                    const alignment = target.kind === "element" ? getElement(design, target.id).align : "center"

                    return (
                        <div
                            key={item.key}
                            role="button"
                            aria-label={`${item.label}${selected ? " (selected)" : ""}`}
                            aria-pressed={selected}
                            onPointerDown={(event) => beginMove(event, target)}
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
                                    <span className="pointer-events-none absolute left-0 bottom-full mb-2 max-w-[16rem] truncate whitespace-nowrap bg-black text-white text-[10px] font-black uppercase px-1.5 py-0.5">
                                        {item.label}
                                    </span>

                                    {item.resizable
                                        ? CORNERS.map(({ corner, style, cursor }) => (
                                            <span
                                                key={corner}
                                                data-handle={`scale-${corner}`}
                                                className={handleClass}
                                                style={{ ...style, cursor, touchAction: "none" }}
                                                onPointerDown={(event) => beginScale(event, target, box)}
                                            />
                                        ))
                                        : null}

                                    {wraps && target.kind === "element"
                                        ? ([-1, 1] as const)
                                            .filter(
                                                (direction) =>
                                                    alignment === "center" ||
                                                    (alignment === "left" && direction === 1) ||
                                                    (alignment === "right" && direction === -1)
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
                                                    onPointerDown={(event) => beginWidth(event, target.id, direction)}
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