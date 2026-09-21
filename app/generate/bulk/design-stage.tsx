"use client"

/**
 * The live preview together with the tools for working on it: undo and redo, snapping and a
 * grid, lock / hide / copy / delete, stacking order, aligning and spacing, and resetting a
 * position. Both screens that design a certificate show this in place of the bare preview.
 *
 * Every tool works on the current selection - the main one plus anything shift-clicked - and
 * each is a plain function from `lib/bulk/editing`; this file only wires them to buttons and keys.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
    AlignCenterHorizontal,
    AlignCenterVertical,
    AlignEndHorizontal,
    AlignEndVertical,
    AlignHorizontalSpaceBetween,
    AlignStartHorizontal,
    AlignStartVertical,
    AlignVerticalSpaceBetween,
    BringToFront,
    Copy,
    Eye,
    EyeOff,
    Grid3x3,
    Lock,
    LockOpen,
    Magnet,
    Redo2,
    RotateCcw,
    SendToBack,
    Trash2,
    Undo2,
} from "lucide-react"
import {
    alignSelections,
    canDistribute,
    capabilitiesOf,
    deleteSelections,
    describeSelection,
    distributeSelections,
    duplicateSelections,
    isHidden,
    isLocked,
    moveSelectionsBy,
    placedSelections,
    resetPositions,
    setHidden,
    setLocked,
    stepLayers,
    type AlignMode,
    type DistributeAxis,
    type LogoHomes,
} from "@/lib/bulk/editing"
import { sameSelection, type CertificateDesign, type RenderedLayout, type Selection } from "@/lib/bulk/renderer"
import type { Recipient } from "@/lib/bulk/tokens"
import { PreviewStage } from "./preview-stage"
import type { Designer } from "./use-designer"

/** How far an arrow key moves the selection, in percent of the page. Shift makes it ten times bigger. */
const NUDGE_STEP = 0.1
const NUDGE_STEP_BIG = 1

const EMPTY_LAYOUT: RenderedLayout = { elements: {}, signatories: {}, logos: {}, overflow: [] }

/** Typing in these has undo of its own; the designer's undo must leave them alone. */
function isTextEntry(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    if (target.isContentEditable || target.tagName === "TEXTAREA") return true
    if (target.tagName !== "INPUT") return false
    const type = (target as HTMLInputElement).type
    return !["checkbox", "radio", "range", "color", "button", "submit", "reset", "file", "image"].includes(type)
}

interface DesignStageProps {
    designer: Designer
    recipient: Recipient
    /** Called after every draw with the ids of the elements whose text did not fit, joined by commas. */
    onOverflow?: (ids: string) => void
    /** Logos that may only exist once, such as the QR block: they cannot be copied. */
    uniqueLogoIds?: readonly string[]
    /** Where a logo goes back to when its position is reset. Logos not listed go to the top-left corner. */
    logoHomes?: LogoHomes
}

export function DesignStage({ designer, recipient, onOverflow, uniqueLogoIds = [], logoHomes = {} }: DesignStageProps) {
    const {
        design,
        selection,
        selections,
        setDesign,
        setSelection,
        toggleSelection,
        checkpoint,
        beginGesture,
        endGesture,
        undo,
        redo,
        stageOptions,
    } = designer
    const [layout, setLayout] = useState<RenderedLayout>(EMPTY_LAYOUT)

    const others = useMemo(
        () => selections.filter((item) => !sameSelection(item, selection)),
        [selections, selection]
    )

    /** Runs one tool as a single undo step of its own. */
    const run = useCallback(
        (change: (current: CertificateDesign) => CertificateDesign) => {
            checkpoint()
            setDesign(change)
            checkpoint()
        },
        [checkpoint, setDesign]
    )

    const removeSelected = useCallback(() => {
        let changed = false
        run((current) => {
            const next = deleteSelections(current, selections)
            changed = next !== current
            return next
        })
        if (changed) setSelection(null)
    }, [run, selections, setSelection])

    const duplicateSelected = useCallback(() => {
        let created: Selection[] = []
        // The change is applied on the spot, so the copies are known as soon as `run` returns.
        run((current) => {
            const result = duplicateSelections(current, selections, uniqueLogoIds)
            created = result.created
            return result.design
        })
        if (created.length === 0) return
        setSelection(created[0])
        for (const copy of created.slice(1)) toggleSelection(copy)
    }, [run, selections, setSelection, toggleSelection, uniqueLogoIds])

    // Undo and redo work anywhere on the page except inside a text box, which keeps its own.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.altKey || !(event.ctrlKey || event.metaKey)) return
            const key = event.key.toLowerCase()
            if (key !== "z" && key !== "y") return
            if (isTextEntry(event.target)) return
            event.preventDefault()
            if (key === "y" || event.shiftKey) redo()
            else undo()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [undo, redo])

    // A gesture left open (the preview went away mid-drag) must not swallow later edits into one step.
    useEffect(() => endGesture, [endGesture])

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        // Only while the preview itself has focus, so arrow keys still scroll the page and work in fields.
        if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return

        if (event.key === "Delete") {
            if (selections.length === 0) return
            event.preventDefault()
            removeSelected()
            return
        }

        const step = event.shiftKey ? NUDGE_STEP_BIG : NUDGE_STEP
        const move =
            event.key === "ArrowLeft" ? [-step, 0]
                : event.key === "ArrowRight" ? [step, 0]
                    : event.key === "ArrowUp" ? [0, -step]
                        : event.key === "ArrowDown" ? [0, step]
                            : null
        if (!move || !selections.some((item) => capabilitiesOf(item).move)) return

        event.preventDefault()
        // Holding a key down repeats it: those repeats belong to the step the first press began.
        if (!event.repeat) checkpoint()
        setDesign((current) => moveSelectionsBy(current, selections, move[0], move[1]))
    }

    const placed = useMemo(() => placedSelections(layout, selections), [layout, selections])

    const lockable = selections.filter((item) => capabilitiesOf(item).lock)
    const hideable = selections.filter((item) => capabilitiesOf(item).hide)
    const allLocked = lockable.length > 0 && lockable.every((item) => isLocked(design, item))
    const allHidden = hideable.length > 0 && hideable.every((item) => isHidden(design, item))
    const canDuplicate = selections.some(
        (item) => capabilitiesOf(item).duplicate && !(item.kind === "logo" && uniqueLogoIds.includes(item.id))
    )
    const canRemove = selections.some((item) => capabilitiesOf(item).remove && !isLocked(design, item))
    const canReset = selections.some((item) => capabilitiesOf(item).reset && !isLocked(design, item))
    const canAlign = placed.some((item) => !isLocked(design, item.selection))
    const canSpace = canDistribute(design, placed)
    const canForward = selections.length > 0 && stepLayers(design, selections, 1, layout) !== design
    const canBack = selections.length > 0 && stepLayers(design, selections, -1, layout) !== design

    const align = (mode: AlignMode) => run((current) => alignSelections(current, placed, mode))
    const distribute = (axis: DistributeAxis) => run((current) => distributeSelections(current, placed, axis))

    const summary =
        selections.length === 0
            ? "Nothing selected"
            : selections.length === 1
                ? describeSelection(design, selections[0])
                : `${selections.length} selected`

    return (
        <div className="space-y-3">
            <div className="border-3 border-black bg-white p-2 space-y-2" role="toolbar" aria-label="Design tools">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Group label="History">
                        <ToolButton label="Undo (Ctrl+Z)" disabled={!designer.canUndo} onClick={undo}>
                            <Undo2 size={16} />
                        </ToolButton>
                        <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={!designer.canRedo} onClick={redo}>
                            <Redo2 size={16} />
                        </ToolButton>
                    </Group>

                    <Group label="Guides">
                        <ToolButton
                            label="Snap to guides and the page centre (hold Ctrl while dragging to skip)"
                            active={stageOptions.snap}
                            onClick={() => designer.setStageOption("snap", !stageOptions.snap)}
                        >
                            <Magnet size={16} />
                        </ToolButton>
                        <ToolButton
                            label="Show a grid over the preview"
                            active={stageOptions.grid}
                            onClick={() => designer.setStageOption("grid", !stageOptions.grid)}
                        >
                            <Grid3x3 size={16} />
                        </ToolButton>
                    </Group>

                    <Group label="Arrange">
                        <ToolButton label="Bring forward" disabled={!canForward} onClick={() => run((c) => stepLayers(c, selections, 1, layout))}>
                            <BringToFront size={16} />
                        </ToolButton>
                        <ToolButton label="Send back" disabled={!canBack} onClick={() => run((c) => stepLayers(c, selections, -1, layout))}>
                            <SendToBack size={16} />
                        </ToolButton>
                    </Group>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Group label="Align">
                        <ToolButton label="Align left" disabled={!canAlign} onClick={() => align("left")}>
                            <AlignStartVertical size={16} />
                        </ToolButton>
                        <ToolButton label="Align centre" disabled={!canAlign} onClick={() => align("center")}>
                            <AlignCenterVertical size={16} />
                        </ToolButton>
                        <ToolButton label="Align right" disabled={!canAlign} onClick={() => align("right")}>
                            <AlignEndVertical size={16} />
                        </ToolButton>
                        <ToolButton label="Align top" disabled={!canAlign} onClick={() => align("top")}>
                            <AlignStartHorizontal size={16} />
                        </ToolButton>
                        <ToolButton label="Align middle" disabled={!canAlign} onClick={() => align("middle")}>
                            <AlignCenterHorizontal size={16} />
                        </ToolButton>
                        <ToolButton label="Align bottom" disabled={!canAlign} onClick={() => align("bottom")}>
                            <AlignEndHorizontal size={16} />
                        </ToolButton>
                    </Group>

                    <Group label="Space evenly">
                        <ToolButton
                            label="Space evenly across (select three or more, none locked)"
                            disabled={!canSpace}
                            onClick={() => distribute("horizontal")}
                        >
                            <AlignHorizontalSpaceBetween size={16} />
                        </ToolButton>
                        <ToolButton
                            label="Space evenly down (select three or more, none locked)"
                            disabled={!canSpace}
                            onClick={() => distribute("vertical")}
                        >
                            <AlignVerticalSpaceBetween size={16} />
                        </ToolButton>
                    </Group>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-3 border-black/20 pt-2">
                    <span className="min-w-0 max-w-[14rem] truncate font-black uppercase text-[11px]" aria-live="polite">
                        {summary}
                    </span>
                    <Group label="Selected">
                        <ToolButton
                            label={allLocked ? "Unlock (lets it be moved again)" : "Lock (stops it being moved, resized or deleted on the preview)"}
                            disabled={lockable.length === 0}
                            active={allLocked}
                            onClick={() => run((c) => setLocked(c, selections, !allLocked))}
                        >
                            {allLocked ? <Lock size={16} /> : <LockOpen size={16} />}
                        </ToolButton>
                        <ToolButton
                            label={allHidden ? "Show on the certificate" : "Hide from the certificate"}
                            disabled={hideable.length === 0}
                            active={allHidden}
                            onClick={() => run((c) => setHidden(c, selections, !allHidden))}
                        >
                            {allHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </ToolButton>
                        <ToolButton
                            label="Duplicate (logos and signatories)"
                            disabled={!canDuplicate}
                            onClick={duplicateSelected}
                        >
                            <Copy size={16} />
                        </ToolButton>
                        <ToolButton
                            label="Delete (Delete key). A text line is emptied and hidden; the participant name cannot be deleted"
                            disabled={!canRemove}
                            onClick={removeSelected}
                        >
                            <Trash2 size={16} />
                        </ToolButton>
                        <ToolButton
                            label="Reset to its default position"
                            disabled={!canReset}
                            onClick={() => run((c) => resetPositions(c, selections, logoHomes))}
                        >
                            <RotateCcw size={16} />
                        </ToolButton>
                    </Group>
                </div>
            </div>

            <div className="border-3 border-black bg-neo-cream p-2 shadow-neo">
                <PreviewStage
                    design={design}
                    recipient={recipient}
                    background={designer.background}
                    selection={selection}
                    others={others}
                    onSelect={setSelection}
                    onToggle={toggleSelection}
                    onPatch={designer.patchElement}
                    onUpdate={setDesign}
                    assetVersion={designer.assetVersion}
                    onOverflow={onOverflow}
                    snap={stageOptions.snap}
                    grid={stageOptions.grid}
                    onGestureStart={beginGesture}
                    onGestureEnd={endGesture}
                    onLayout={setLayout}
                    onKeyDown={handleKeyDown}
                />
            </div>

            <p className="font-bold text-[11px] text-black/60">
                Shift-click to select several · arrow keys nudge the selection (Shift for bigger steps) · Ctrl+Z and
                Ctrl+Shift+Z undo and redo · hold Ctrl while dragging to skip snapping. A locked item can still be
                edited from the panels.
            </p>
        </div>
    )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1.5" role="group" aria-label={label}>
            {children}
        </div>
    )
}

interface ToolButtonProps {
    label: string
    onClick: () => void
    disabled?: boolean
    active?: boolean
    children: React.ReactNode
}

function ToolButton({ label, onClick, disabled = false, active, children }: ToolButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            className={`h-9 w-9 shrink-0 flex items-center justify-center border-3 border-black transition-all disabled:opacity-35 disabled:cursor-not-allowed ${active ? "bg-black text-white" : "bg-white hover:bg-neo-yellow disabled:hover:bg-white"
                }`}
        >
            {children}
        </button>
    )
}
