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
    resolveLayerOrder,
    sameSelection,
    selectionKey,
    sizeLimits,
    type CertificateDesign,
    type ElementBox,
    type ElementId,
    type ElementPatch,
    type RenderedLayout,
    type Selection,
} from "@/lib/bulk/renderer"
import { GRID_STEP_PERCENT, buildSnapTargets, gridStepPx, snapBox, type SnapTargets } from "@/lib/bulk/editing"
import type { Recipient } from "@/lib/bulk/tokens"
import { clamp } from "./ui"

const MIN_WRAP_WIDTH = 10

/** How close, in screen pixels, a dragged box has to come to a guide before it snaps to it. */
const SNAP_SCREEN_PX = 6

const round1 = (value: number) => Math.round(value * 10) / 10
const round2 = (value: number) => Math.round(value * 100) / 100

type Interaction =
    | {
        kind: "move"
        target: Selection
        startX: number
        startY: number
        originX: number
        originY: number
        /** Where the thing was drawn when the drag began, in canvas pixels. */
        box: ElementBox
        /** What it may snap to. Null when snapping is off. */
        targets: SnapTargets | null
        lastClientX?: number
        lastClientY?: number
    }
    | {
        kind: "scale"
        target: Selection
        centerX: number
        centerY: number
        startDistance: number
        startSize: number
        startMaxWidth: number
        lastDistance?: number
    }
    | { kind: "width"; id: ElementId; startX: number; startMaxWidth: number; direction: 1 | -1; factor: 1 | 2; lastClientX?: number }

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
    locked: boolean
}

/** Whether two selections belong to the same signatory, whose name block and signature travel together. */
function sameOwner(a: Selection, b: Selection): boolean {
    if (sameSelection(a, b)) return true
    const signatory = (item: Selection) => item.kind === "signatory" || item.kind === "signature"
    return signatory(a) && signatory(b) && a.id === b.id
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

    /** Everything else that is selected along with `selection`. */
    others?: Selection[]
    /** Shift-click: adds a thing to the selection or takes it out. */
    onToggle?: (selection: Selection) => void
    /** Dragged things snap to the page centre and to each other. */
    snap?: boolean
    /** Draws a grid over the preview; dragged things snap to it too. */
    grid?: boolean
    /** A drag, resize or width change begins or ends, so its many small changes can be undone as one. */
    onGestureStart?: () => void
    onGestureEnd?: () => void
    /** Called after every draw with where everything landed, in canvas pixels. Pass a stable function. */
    onLayout?: (layout: RenderedLayout) => void
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
}

const NO_SELECTIONS: Selection[] = []

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
    others = NO_SELECTIONS,
    onToggle,
    snap = false,
    grid = false,
    onGestureStart,
    onGestureEnd,
    onLayout,
    onKeyDown,
}: PreviewStageProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const interaction = useRef<Interaction | null>(null)
    const [layout, setLayout] = useState<RenderedLayout>(EMPTY_LAYOUT)
    /** The guide lines a dragged thing is snapped to right now, in canvas pixels. */
    const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rendered = renderToCanvas(canvas, design, recipient, background)
        if (!rendered) return
        setLayout(rendered)
        onLayout?.(rendered)
        // Reporting the same string twice is a no-op for React, so this cannot loop.
        onOverflow?.(rendered.overflow.join(","))
    }, [design, recipient, background, assetVersion, onOverflow, onLayout])

    const lockedKeys = new Set(design.locked)
    const isLocked = (target: Selection) => lockedKeys.has(selectionKey(target))

    // Listed in stacking order, so whatever is drawn on top is also the first thing a click reaches.
    const items: HitItem[] = []

    for (const layerKey of resolveLayerOrder(design)) {
        const at = layerKey.indexOf(":")
        const kind = layerKey.slice(0, at)
        const id = layerKey.slice(at + 1)

        if (kind === "logo") {
            const box = layout.logos[id]
            const target: Selection = { kind: "logo", id }
            if (box) items.push({ key: layerKey, selection: target, label: "Logo", box, resizable: true, locked: isLocked(target) })
        } else if (kind === "signatory") {
            const signatory = design.signatories.find((item) => item.id === id)
            const rendered = layout.signatories[id]
            if (!signatory || !rendered) continue
            if (rendered.block) {
                const target: Selection = { kind: "signatory", id }
                items.push({
                    key: layerKey,
                    selection: target,
                    label: signatory.name ? `Signatory: ${signatory.name}` : "Signatory",
                    box: rendered.block,
                    resizable: false,
                    locked: isLocked(target),
                })
            }
            if (rendered.signature) {
                const target: Selection = { kind: "signature", id }
                items.push({
                    key: `signature:${id}`,
                    selection: target,
                    label: "Signature",
                    box: rendered.signature,
                    resizable: true,
                    locked: isLocked(target),
                })
            }
        } else {
            const box = layout.elements[id as ElementId]
            const target: Selection = { kind: "element", id: id as ElementId }
            if (box) {
                items.push({
                    key: layerKey,
                    selection: target,
                    label: ELEMENT_LABELS[id as ElementId],
                    box,
                    resizable: true,
                    locked: isLocked(target),
                })
            }
        }
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

    /** Keyboard shortcuts work while the preview has focus; pressing on a thing does not focus it by itself. */
    const focusStage = () => wrapperRef.current?.focus({ preventScroll: true })

    const beginMove = (event: React.PointerEvent<HTMLElement>, target: Selection, box: ElementBox, locked: boolean) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        event.stopPropagation()
        event.preventDefault()
        focusStage()

        if (event.shiftKey && onToggle) {
            onToggle(target)
            return
        }

        onSelect(target)
        // A locked thing can be picked, but not dragged.
        if (locked) return

        const origin = originOf(target)
        if (!origin) return
        event.currentTarget.setPointerCapture(event.pointerId)
        onGestureStart?.()
        interaction.current = {
            kind: "move",
            target,
            startX: event.clientX,
            startY: event.clientY,
            originX: origin.x,
            originY: origin.y,
            box,
            targets: snap
                ? buildSnapTargets(
                    design,
                    items.filter((item) => !sameOwner(item.selection, target)).map((item) => item.box),
                    grid
                )
                : null,
        }
    }

    const beginScale = (event: React.PointerEvent<HTMLElement>, target: Selection, box: ElementBox) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        const rect = wrapperRef.current?.getBoundingClientRect()
        const start = scaleStartOf(target)
        if (!rect || rect.width === 0 || !start) return
        event.stopPropagation()
        event.preventDefault()
        focusStage()
        event.currentTarget.setPointerCapture(event.pointerId)
        onGestureStart?.()

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
        focusStage()
        event.currentTarget.setPointerCapture(event.pointerId)
        onGestureStart?.()

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

    /** `round` is coarser while free-dragging; a snapped position keeps a finer one so it lands exactly on its guide. */
    const applyMove = (target: Selection, x: number, y: number, round: (value: number) => number) => {
        const nextX = round(clamp(x, 0, 100))
        const nextY = round(clamp(y, 0, 100))
        switch (target.kind) {
            case "element": {
                const offsetX = target.id === "name" && nameNudge ? nameNudge.dx : 0
                const offsetY = target.id === "name" && nameNudge ? nameNudge.dy : 0
                const targetX = round(clamp(x - offsetX, 0, 100))
                const targetY = round(clamp(y - offsetY, 0, 100))
                const existing = getElement(design, target.id)
                if (existing && (existing.x !== targetX || existing.y !== targetY)) {
                    onPatch(target.id, {
                        x: targetX,
                        y: targetY,
                    })
                }
                break
            }
            case "signatory": {
                const existing = design.signatories.find((s) => s.id === target.id)
                if (!existing || existing.x !== nextX || existing.y !== nextY) {
                    onUpdate((current) => moveSignatory(current, target.id, nextX, nextY))
                }
                break
            }
            case "signature": {
                const signX = round(clamp(x, -100, 100))
                const signY = round(clamp(y, -100, 100))
                const existing = design.signatories.find((s) => s.id === target.id)
                if (!existing || existing.signature.dx !== signX || existing.signature.dy !== signY) {
                    onUpdate((current) =>
                        patchSignatureArt(current, target.id, { dx: signX, dy: signY })
                    )
                }
                break
            }
            case "logo": {
                const existing = design.logos.find((l) => l.id === target.id)
                if (!existing || existing.x !== nextX || existing.y !== nextY) {
                    onUpdate((current) => patchLogo(current, target.id, { x: nextX, y: nextY }))
                }
                break
            }
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
                const nextSize = round2(size)
                const nextMaxWidth = round2(clamp(startMaxWidth * ratio, MIN_MAX_WIDTH, 100))
                const existing = getElement(design, target.id)
                if (existing && (existing.size !== nextSize || existing.maxWidth !== nextMaxWidth)) {
                    onPatch(target.id, {
                        size: nextSize,
                        maxWidth: nextMaxWidth,
                    })
                }
                break
            }
            case "signature": {
                const size = clamp(startSize * factor, SIGNATURE_SIZE_LIMITS.min, SIGNATURE_SIZE_LIMITS.max)
                const ratio = size / startSize
                const nextSize = round2(size)
                const nextMaxWidth = round2(clamp(startMaxWidth * ratio, MIN_MAX_WIDTH, 100))
                const existing = design.signatories.find((s) => s.id === target.id)?.signature
                if (!existing || existing.size !== nextSize || existing.maxWidth !== nextMaxWidth) {
                    onUpdate((current) =>
                        patchSignatureArt(current, target.id, {
                            size: nextSize,
                            maxWidth: nextMaxWidth,
                        })
                    )
                }
                break
            }
            case "logo": {
                const width = clamp(startSize * factor, LOGO_WIDTH_LIMITS.min, LOGO_WIDTH_LIMITS.max)
                const nextWidth = round2(width)
                const existing = design.logos.find((l) => l.id === target.id)
                if (!existing || existing.width !== nextWidth) {
                    onUpdate((current) => patchLogo(current, target.id, { width: nextWidth }))
                }
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
            if (active.lastClientX === event.clientX && active.lastClientY === event.clientY) {
                return
            }
            active.lastClientX = event.clientX
            active.lastClientY = event.clientY

            const shiftX = ((event.clientX - active.startX) / rect.width) * 100
            const shiftY = ((event.clientY - active.startY) / rect.height) * 100
            let x = active.originX + shiftX
            let y = active.originY + shiftY
            let snapped = false

            // Holding Ctrl (or Cmd) while dragging places things freely.
            if (active.targets && !event.ctrlKey && !event.metaKey) {
                const proposed: ElementBox = {
                    x: active.box.x + (shiftX / 100) * design.width,
                    y: active.box.y + (shiftY / 100) * design.height,
                    w: active.box.w,
                    h: active.box.h,
                }
                const result = snapBox(proposed, active.targets, SNAP_SCREEN_PX * (design.width / rect.width))
                x += (result.dx / design.width) * 100
                y += (result.dy / design.height) * 100
                snapped = result.guideX !== null || result.guideY !== null
                setGuides((current) =>
                    current.x === result.guideX && current.y === result.guideY
                        ? current
                        : { x: result.guideX, y: result.guideY }
                )
            } else {
                setGuides((current) => (current.x === null && current.y === null ? current : { x: null, y: null }))
            }
            applyMove(active.target, x, y, snapped ? round2 : round1)
        } else if (active.kind === "scale") {
            const distance = Math.hypot(event.clientX - active.centerX, event.clientY - active.centerY)
            if (active.lastDistance !== undefined && Math.abs(active.lastDistance - distance) < 0.2) {
                return
            }
            active.lastDistance = distance
            applyScale(active, distance / active.startDistance)
        } else {
            if (active.lastClientX === event.clientX) return
            active.lastClientX = event.clientX
            const delta = ((event.clientX - active.startX) / rect.width) * 100
            const maxWidth = round1(clamp(active.startMaxWidth + active.direction * delta * active.factor, MIN_WRAP_WIDTH, 100))
            const existing = getElement(design, active.id)
            if (existing && existing.maxWidth !== maxWidth) {
                onPatch(active.id, { maxWidth })
            }
        }
    }

    // The browser releases pointer capture by itself when the pointer is lifted or cancelled.
    // Moves and releases from a handle bubble up to its box, so the box handles them all.
    const endInteraction = () => {
        interaction.current = null
        setGuides((current) => (current.x === null && current.y === null ? current : { x: null, y: null }))
        onGestureEnd?.()
    }

    return (
        <div
            ref={wrapperRef}
            className="relative outline-none focus-visible:ring-2 focus-visible:ring-black"
            tabIndex={0}
            role="group"
            aria-label="Certificate preview. Select something, then use the arrow keys to nudge it."
            onKeyDown={onKeyDown}
            // Anything that is not an element (the artwork or empty space) clears the selection.
            onPointerDown={(event) => {
                if (!event.shiftKey) onSelect(null)
            }}
        >
            <canvas ref={canvasRef} className="w-full h-auto block select-none" />

            {grid ? (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(0,0,0,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.16) 1px, transparent 1px)",
                        backgroundSize: `${GRID_STEP_PERCENT}% ${(gridStepPx(design) / design.height) * 100}%`,
                    }}
                >
                    <span className="absolute inset-y-0 w-px bg-black/40" style={{ left: "50%" }} />
                    <span className="absolute inset-x-0 h-px bg-black/40" style={{ top: "50%" }} />
                </div>
            ) : null}

            <div className="pointer-events-none absolute inset-0">
                {items.map((item) => {
                    const { box, selection: target, locked } = item
                    const selected = sameSelection(selection, target)
                    const alsoSelected = !selected && others.some((other) => sameSelection(other, target))
                    const wraps = target.kind === "element" && getElement(design, target.id).fit !== "shrink"
                    const alignment = target.kind === "element" ? getElement(design, target.id).align : "center"

                    return (
                        <div
                            key={item.key}
                            role="button"
                            aria-label={`${item.label}${locked ? " (locked)" : ""}${selected || alsoSelected ? " (selected)" : ""}`}
                            aria-pressed={selected || alsoSelected}
                            onPointerDown={(event) => beginMove(event, target, box, locked)}
                            onPointerMove={handleMove}
                            onPointerUp={endInteraction}
                            onPointerCancel={endInteraction}
                            onLostPointerCapture={endInteraction}
                            style={{
                                left: `${(box.x / design.width) * 100}%`,
                                top: `${(box.y / design.height) * 100}%`,
                                width: `${(box.w / design.width) * 100}%`,
                                height: `${(box.h / design.height) * 100}%`,
                                minWidth: 16,
                                minHeight: 16,
                                touchAction: "none",
                                zIndex: selected ? 20 : alsoSelected ? 15 : 10,
                            }}
                            className={`pointer-events-auto absolute ${locked ? "cursor-pointer" : "cursor-move"} outline-offset-2 ${selected
                                ? "outline outline-2 outline-dashed outline-black"
                                : alsoSelected
                                    ? "outline outline-2 outline-dashed outline-black/60"
                                    : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-black/60"
                                }`}
                        >
                            {selected ? (
                                <>
                                    <span className="pointer-events-none absolute left-0 bottom-full mb-2 max-w-[16rem] truncate whitespace-nowrap bg-black text-white text-[10px] font-black uppercase px-1.5 py-0.5">
                                        {item.label}
                                        {locked ? " · Locked" : ""}
                                    </span>

                                    {item.resizable && !locked
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

                                    {wraps && !locked && target.kind === "element"
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

                {guides.x !== null ? (
                    <span
                        aria-hidden
                        className="absolute inset-y-0 w-px bg-fuchsia-500"
                        style={{ left: `${(guides.x / design.width) * 100}%`, zIndex: 30 }}
                    />
                ) : null}
                {guides.y !== null ? (
                    <span
                        aria-hidden
                        className="absolute inset-x-0 h-px bg-fuchsia-500"
                        style={{ top: `${(guides.y / design.height) * 100}%`, zIndex: 30 }}
                    />
                ) : null}
            </div>
        </div>
    )
}