/**
 * Everything the designer's editing tools do to a design, as plain functions: nudging,
 * aligning, distributing, snapping, stacking order, lock, hide, duplicate, delete and
 * reset. None of it touches React or the canvas, so it can be checked on its own.
 *
 * A "selection" is anything that can be picked on the preview: a text element, a
 * signatory, a signature or a logo. Positions are percentages of the page, and boxes
 * (from the last render) are in canvas pixels, exactly as the renderer reports them.
 */

import {
    DEFAULT_LOGO_POSITION,
    ELEMENT_LABELS,
    TEXT_ELEMENT_IDS,
    createNameElement,
    createPresetElements,
    createSignatureArt,
    getElement,
    isElementVisible,
    layerKeyOf,
    newId,
    patchElement,
    patchLogo,
    patchSignatoryLayout,
    patchSignatureArt,
    removeLogo,
    removeSignatory,
    resolveLayerOrder,
    resolveSignatoryFrames,
    selectionKey,
    type CertificateDesign,
    type ElementBox,
    type ElementId,
    type RenderedLayout,
    type Selection,
    type TextElementId,
} from "./renderer"

const round2 = (value: number) => Math.round(value * 100) / 100
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** How far a copy is set off from the original, in percent of the page. */
const COPY_OFFSET = 3

/** Space kept from the page edge when a single item is aligned to the page, in percent of the page. */
export const PAGE_MARGIN_PERCENT = 5

/** Which of the editing tools apply to a kind of selection. */
export interface Capabilities {
    move: boolean
    hide: boolean
    duplicate: boolean
    remove: boolean
    layer: boolean
    lock: boolean
    reset: boolean
}

export function capabilitiesOf(selection: Selection): Capabilities {
    if (selection.kind === "element") {
        const id = selection.id
        if (id === "signatureName" || id === "signatureLabel") {
            // These carry the shared style of every signatory's name and title; they have no place of their own.
            return { move: false, hide: true, duplicate: false, remove: false, layer: false, lock: false, reset: false }
        }
        return {
            move: true,
            hide: id !== "name",
            duplicate: false,
            remove: id !== "name",
            layer: true,
            lock: true,
            reset: true,
        }
    }
    return {
        move: true,
        hide: true,
        duplicate: selection.kind === "logo" || selection.kind === "signatory",
        remove: true,
        layer: true,
        lock: true,
        reset: true,
    }
}

/** A short name for a selection, for labels. */
export function describeSelection(design: CertificateDesign, selection: Selection): string {
    switch (selection.kind) {
        case "element":
            return ELEMENT_LABELS[selection.id]
        case "logo":
            return "Logo"
        case "signature":
            return "Signature"
        case "signatory": {
            const name = design.signatories.find((signatory) => signatory.id === selection.id)?.name
            return name ? `Signatory: ${name}` : "Signatory"
        }
    }
}

/** True when the thing the selection points at is still on the design. */
export function selectionExists(design: CertificateDesign, selection: Selection): boolean {
    switch (selection.kind) {
        case "element":
            return TEXT_ELEMENT_IDS.includes(selection.id)
        case "signatory":
        case "signature":
            return design.signatories.some((signatory) => signatory.id === selection.id)
        case "logo":
            return design.logos.some((logo) => logo.id === selection.id)
    }
}

/** Removes repeats and anything that no longer exists, keeping the order given. */
export function cleanSelections(design: CertificateDesign, selections: Selection[]): Selection[] {
    const seen = new Set<string>()
    const kept: Selection[] = []
    for (const selection of selections) {
        const key = selectionKey(selection)
        if (seen.has(key) || !selectionExists(design, selection)) continue
        seen.add(key)
        kept.push(selection)
    }
    return kept
}

export function isLocked(design: CertificateDesign, selection: Selection): boolean {
    return design.locked.includes(selectionKey(selection))
}

/** Locks or unlocks each selection that can be locked. */
export function setLocked(design: CertificateDesign, selections: Selection[], locked: boolean): CertificateDesign {
    const keys = new Set(selections.filter((selection) => capabilitiesOf(selection).lock).map(selectionKey))
    if (keys.size === 0) return design
    const rest = design.locked.filter((key) => !keys.has(key))
    const next = locked ? [...rest, ...keys] : rest
    if (next.length === design.locked.length && next.every((key) => design.locked.includes(key))) return design
    return { ...design, locked: next }
}

/** Whether the thing is currently left off the certificate. */
export function isHidden(design: CertificateDesign, selection: Selection): boolean {
    const onArtwork = design.mode === "upload"
    switch (selection.kind) {
        case "element":
            return !isElementVisible(design, selection.id)
        case "logo":
            return design.logos.find((logo) => logo.id === selection.id)?.visible === false
        case "signatory":
            return design.signatories.find((signatory) => signatory.id === selection.id)?.visible === false
        case "signature": {
            const art = design.signatories.find((signatory) => signatory.id === selection.id)?.signature
            if (!art) return false
            return onArtwork ? !art.visibleOnUpload : !art.visible
        }
    }
}

function setHiddenOne(design: CertificateDesign, selection: Selection, hidden: boolean): CertificateDesign {
    if (!capabilitiesOf(selection).hide) return design
    const onArtwork = design.mode === "upload"
    const shown = !hidden
    switch (selection.kind) {
        case "element":
            return patchElement(design, selection.id, onArtwork ? { visibleOnUpload: shown } : { visible: shown })
        case "logo":
            return patchLogo(design, selection.id, { visible: shown })
        case "signatory":
            return {
                ...design,
                signatories: design.signatories.map((signatory) =>
                    signatory.id === selection.id ? { ...signatory, visible: shown } : signatory
                ),
            }
        case "signature":
            return patchSignatureArt(design, selection.id, onArtwork ? { visibleOnUpload: shown } : { visible: shown })
    }
}

export function setHidden(design: CertificateDesign, selections: Selection[], hidden: boolean): CertificateDesign {
    return selections.reduce((current, selection) => setHiddenOne(current, selection, hidden), design)
}

/** Moves one thing by a distance in percent of the page. Locked things and things without a place stay put. */
export function moveSelectionBy(
    design: CertificateDesign,
    selection: Selection,
    dx: number,
    dy: number
): CertificateDesign {
    if (!capabilitiesOf(selection).move || isLocked(design, selection)) return design
    if (dx === 0 && dy === 0) return design

    switch (selection.kind) {
        case "element": {
            const element = getElement(design, selection.id)
            return patchElement(design, selection.id, {
                x: round2(clamp(element.x + dx, 0, 100)),
                y: round2(clamp(element.y + dy, 0, 100)),
            })
        }
        case "logo": {
            const logo = design.logos.find((item) => item.id === selection.id)
            if (!logo) return design
            return patchLogo(design, logo.id, {
                x: round2(clamp(logo.x + dx, 0, 100)),
                y: round2(clamp(logo.y + dy, 0, 100)),
            })
        }
        case "signature": {
            const art = design.signatories.find((item) => item.id === selection.id)?.signature
            if (!art) return design
            return patchSignatureArt(design, selection.id, {
                dx: round2(clamp(art.dx + dx, -100, 100)),
                dy: round2(clamp(art.dy + dy, -100, 100)),
            })
        }
        case "signatory": {
            // Placing a signatory by hand switches the row to free placement, keeping everyone where they are drawn now.
            const free = patchSignatoryLayout(design, { arrange: "free" })
            return {
                ...free,
                signatories: free.signatories.map((signatory) =>
                    signatory.id === selection.id
                        ? {
                            ...signatory,
                            x: round2(clamp(signatory.x + dx, 0, 100)),
                            y: round2(clamp(signatory.y + dy, 0, 100)),
                        }
                        : signatory
                ),
            }
        }
    }
}

/** Moves every selection by the same distance. */
export function moveSelectionsBy(
    design: CertificateDesign,
    selections: Selection[],
    dx: number,
    dy: number
): CertificateDesign {
    return selections.reduce((current, selection) => moveSelectionBy(current, selection, dx, dy), design)
}

/** Where a logo goes back to when it is reset, by logo id. Anything not listed goes to the top-left corner. */
export type LogoHomes = Record<string, { x: number; y: number }>

function resetPositionOne(design: CertificateDesign, selection: Selection, logoHomes: LogoHomes): CertificateDesign {
    if (!capabilitiesOf(selection).reset || isLocked(design, selection)) return design

    switch (selection.kind) {
        case "element": {
            const home =
                selection.id === "name"
                    ? createNameElement()
                    : createPresetElements(design.preset, design.layoutSize.width, design.layoutSize.height)[
                    selection.id as Exclude<TextElementId, "name">
                    ]
            return patchElement(design, selection.id, { x: home.x, y: home.y })
        }
        case "logo": {
            const home = logoHomes[selection.id] ?? DEFAULT_LOGO_POSITION
            return patchLogo(design, selection.id, { x: home.x, y: home.y })
        }
        case "signature": {
            const home = createSignatureArt()
            return patchSignatureArt(design, selection.id, { dx: home.dx, dy: home.dy })
        }
        case "signatory": {
            // Evenly spaced signatories are already where they belong.
            if (design.signatoryLayout.arrange !== "free") return design
            const index = design.signatories.findIndex((signatory) => signatory.id === selection.id)
            if (index < 0) return design
            const frame = resolveSignatoryFrames({
                ...design,
                signatoryLayout: { ...design.signatoryLayout, arrange: "auto" },
            })[index]
            if (!frame) return design
            return {
                ...design,
                signatories: design.signatories.map((signatory, position) =>
                    position === index
                        ? {
                            ...signatory,
                            x: round2((frame.x / design.width) * 100),
                            y: round2((frame.baselineY / design.height) * 100),
                        }
                        : signatory
                ),
            }
        }
    }
}

export function resetPositions(
    design: CertificateDesign,
    selections: Selection[],
    logoHomes: LogoHomes = {}
): CertificateDesign {
    return selections.reduce((current, selection) => resetPositionOne(current, selection, logoHomes), design)
}

/** Inserts `key` straight above `after` in the stacking order, and saves that order on the design. */
function insertLayerAbove(design: CertificateDesign, after: string, key: string): string[] {
    const order = resolveLayerOrder(design).filter((item) => item !== key)
    const at = order.indexOf(after)
    order.splice(at < 0 ? order.length : at + 1, 0, key)
    return order
}

export interface DuplicateResult {
    design: CertificateDesign
    /** The copies, so they can be selected afterwards. */
    created: Selection[]
}

/**
 * Copies logos and signatories. Text lines are fixed slots of the design, so they cannot
 * be copied, and `uniqueLogoIds` names logos that must exist only once (the QR block).
 */
export function duplicateSelections(
    design: CertificateDesign,
    selections: Selection[],
    uniqueLogoIds: readonly string[] = []
): DuplicateResult {
    let current = design
    const created: Selection[] = []

    for (const selection of selections) {
        if (selection.kind === "logo") {
            if (uniqueLogoIds.includes(selection.id)) continue
            const original = current.logos.find((logo) => logo.id === selection.id)
            if (!original) continue
            const id = newId([...current.logos.map((logo) => logo.id), ...current.signatories.map((s) => s.id)])
            const copy = {
                ...original,
                id,
                x: round2(clamp(original.x + COPY_OFFSET, 0, 100)),
                y: round2(clamp(original.y + COPY_OFFSET, 0, 100)),
            }
            const at = current.logos.findIndex((logo) => logo.id === original.id)
            const logos = [...current.logos]
            logos.splice(at + 1, 0, copy)
            const layers = insertLayerAbove(current, `logo:${original.id}`, `logo:${id}`)
            current = { ...current, logos, layers }
            created.push({ kind: "logo", id })
        } else if (selection.kind === "signatory") {
            const original = current.signatories.find((signatory) => signatory.id === selection.id)
            if (!original) continue
            const id = newId([...current.logos.map((logo) => logo.id), ...current.signatories.map((s) => s.id)])
            const copy = {
                ...original,
                id,
                x: round2(clamp(original.x + COPY_OFFSET, 0, 100)),
                y: round2(clamp(original.y + COPY_OFFSET, 0, 100)),
            }
            const at = current.signatories.findIndex((signatory) => signatory.id === original.id)
            const signatories = [...current.signatories]
            signatories.splice(at + 1, 0, copy)
            const layers = insertLayerAbove(current, `signatory:${original.id}`, `signatory:${id}`)
            current = { ...current, signatories, layers }
            created.push({ kind: "signatory", id })
        }
    }

    return { design: current, created }
}

/** Drops saved layer and lock entries for things that no longer exist. */
function withoutStaleKeys(design: CertificateDesign): CertificateDesign {
    const alive = new Set<string>()
    for (const logo of design.logos) alive.add(`logo:${logo.id}`)
    for (const signatory of design.signatories) {
        alive.add(`signatory:${signatory.id}`)
        alive.add(`signature:${signatory.id}`)
    }
    for (const id of TEXT_ELEMENT_IDS) alive.add(`element:${id}`)
    const layers = design.layers.filter((key) => alive.has(key))
    const locked = design.locked.filter((key) => alive.has(key))
    if (layers.length === design.layers.length && locked.length === design.locked.length) return design
    return { ...design, layers, locked }
}

/**
 * Takes things off the certificate. Logos and signatories are removed; a signature is cleared;
 * a text line is emptied and hidden (its slot stays in the design). The participant name and
 * anything locked are left alone.
 */
export function deleteSelections(design: CertificateDesign, selections: Selection[]): CertificateDesign {
    let current = design
    for (const selection of selections) {
        if (!capabilitiesOf(selection).remove || isLocked(current, selection)) continue
        switch (selection.kind) {
            case "logo":
                current = removeLogo(current, selection.id)
                break
            case "signatory":
                current = removeSignatory(current, selection.id)
                break
            case "signature":
                current = patchSignatureArt(current, selection.id, {
                    mode: "none",
                    image: null,
                    strokes: null,
                    text: "",
                })
                break
            case "element":
                current = patchElement(current, selection.id, { text: "", visible: false, visibleOnUpload: false })
                break
        }
    }
    return current === design ? design : withoutStaleKeys(current)
}

/** The area a selection covers on the last render, or null when it is not drawn. */
export function selectionBox(layout: RenderedLayout, selection: Selection): ElementBox | null {
    switch (selection.kind) {
        case "element":
            return layout.elements[selection.id] ?? null
        case "logo":
            return layout.logos[selection.id] ?? null
        case "signatory":
            return layout.signatories[selection.id]?.block ?? null
        case "signature":
            return layout.signatories[selection.id]?.signature ?? null
    }
}

/** The area a whole stacking layer covers (a signatory and its signature together). */
export function layerBox(layout: RenderedLayout, key: string): ElementBox | null {
    const at = key.indexOf(":")
    const kind = key.slice(0, at)
    const id = key.slice(at + 1)
    if (kind === "element") return layout.elements[id as ElementId] ?? null
    if (kind === "logo") return layout.logos[id] ?? null
    if (kind === "signatory") {
        const parts = [layout.signatories[id]?.block, layout.signatories[id]?.signature].filter(
            (box): box is ElementBox => !!box
        )
        return unionBoxes(parts)
    }
    return null
}

export function unionBoxes(boxes: ElementBox[]): ElementBox | null {
    if (boxes.length === 0) return null
    const left = Math.min(...boxes.map((box) => box.x))
    const top = Math.min(...boxes.map((box) => box.y))
    const right = Math.max(...boxes.map((box) => box.x + box.w))
    const bottom = Math.max(...boxes.map((box) => box.y + box.h))
    return { x: left, y: top, w: right - left, h: bottom - top }
}

function overlaps(a: ElementBox, b: ElementBox): boolean {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * Moves the selected layers one step forward (towards the front) or back. A step jumps over the
 * next layer that overlaps it, so the change can be seen; when nothing overlaps it goes all the
 * way to the front or back. Selected layers keep their order relative to each other.
 */
export function stepLayers(
    design: CertificateDesign,
    selections: Selection[],
    direction: 1 | -1,
    layout: RenderedLayout
): CertificateDesign {
    const chosen = new Set(selections.filter((selection) => capabilitiesOf(selection).layer).map(layerKeyOf))
    if (chosen.size === 0) return design

    const order = resolveLayerOrder(design)
    const boxOf = (key: string) => layerBox(layout, key)
    const moving = order.filter((key) => chosen.has(key))
    // The layer nearest the end it is heading for goes first, so the others never block it.
    if (direction === 1) moving.reverse()

    const next = [...order]
    /** The selected layer placed just before this one; the next may not pass it, or the group's order would flip. */
    let placed: string | null = null
    for (const key of moving) {
        const from = next.indexOf(key)
        const box = boxOf(key)
        // Layers already at the very end of the stack stay put, so a group is never pushed past itself.
        const beyond = direction === 1 ? next.slice(from + 1) : next.slice(0, from)
        if (beyond.every((other) => chosen.has(other))) continue

        let to = direction === 1 ? next.length - 1 : 0

        for (let i = from + direction; i >= 0 && i < next.length; i += direction) {
            const other = next[i]
            if (chosen.has(other)) continue
            const otherBox = boxOf(other)
            if (!box || !otherBox || overlaps(box, otherBox)) {
                to = i
                break
            }
        }

        next.splice(from, 1)
        if (placed !== null) {
            const edge = next.indexOf(placed)
            to = direction === 1 ? Math.min(to, edge) : Math.max(to, edge + 1)
        }
        // Never against the direction asked for.
        to = direction === 1 ? Math.max(to, from) : Math.min(to, from)
        next.splice(to, 0, key)
        placed = key
    }

    if (next.every((key, index) => key === order[index])) return design
    return { ...design, layers: next }
}

/** Whether the stacking order would change for these selections, for enabling the buttons. */
export function canStepLayers(
    design: CertificateDesign,
    selections: Selection[],
    direction: 1 | -1,
    layout: RenderedLayout
): boolean {
    return stepLayers(design, selections, direction, layout) !== design
}

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom"
export type DistributeAxis = "horizontal" | "vertical"

/** A selection together with the area it covers. */
export interface Placed {
    selection: Selection
    box: ElementBox
}

/** The selections that are drawn, with their boxes. Repeats are dropped. */
export function placedSelections(layout: RenderedLayout, selections: Selection[]): Placed[] {
    const seen = new Set<string>()
    const placed: Placed[] = []
    for (const selection of selections) {
        const key = selectionKey(selection)
        if (seen.has(key)) continue
        seen.add(key)
        const box = selectionBox(layout, selection)
        if (box && capabilitiesOf(selection).move) placed.push({ selection, box })
    }
    return placed
}

/**
 * Lines the selections up. One selection is lined up with the page (inside a margin); several are
 * lined up with the box that holds them all. Locked ones count for where that box is but do not move.
 */
export function alignSelections(
    design: CertificateDesign,
    placed: Placed[],
    mode: AlignMode
): CertificateDesign {
    if (placed.length === 0) return design
    const { width: W, height: H } = design
    const horizontal = mode === "left" || mode === "center" || mode === "right"

    let start: number
    let end: number
    if (placed.length === 1) {
        const size = horizontal ? W : H
        const margin = (PAGE_MARGIN_PERCENT / 100) * size
        start = margin
        end = size - margin
    } else {
        const group = unionBoxes(placed.map((item) => item.box))
        if (!group) return design
        start = horizontal ? group.x : group.y
        end = horizontal ? group.x + group.w : group.y + group.h
    }
    // Centred on the middle of the page for one item, on the middle of the group for several.
    const centre = placed.length === 1 ? (horizontal ? W : H) / 2 : (start + end) / 2

    let current = design
    for (const { selection, box } of placed) {
        let dx = 0
        let dy = 0
        switch (mode) {
            case "left":
                dx = start - box.x
                break
            case "center":
                dx = centre - (box.x + box.w / 2)
                break
            case "right":
                dx = end - (box.x + box.w)
                break
            case "top":
                dy = start - box.y
                break
            case "middle":
                dy = centre - (box.y + box.h / 2)
                break
            case "bottom":
                dy = end - (box.y + box.h)
                break
        }
        current = moveSelectionBy(current, selection, (dx / W) * 100, (dy / H) * 100)
    }
    return current
}

/** True when at least three things are drawn and none of them is locked: the case where spacing can be made equal. */
export function canDistribute(design: CertificateDesign, placed: Placed[]): boolean {
    return placed.length >= 3 && placed.every((item) => !isLocked(design, item.selection))
}

/** Spaces the selections so the gaps between them are equal, keeping the outermost two where they are. */
export function distributeSelections(
    design: CertificateDesign,
    placed: Placed[],
    axis: DistributeAxis
): CertificateDesign {
    if (!canDistribute(design, placed)) return design
    const { width: W, height: H } = design
    const horizontal = axis === "horizontal"
    const at = (box: ElementBox) => (horizontal ? box.x : box.y)
    const size = (box: ElementBox) => (horizontal ? box.w : box.h)

    const middle = (box: ElementBox) => at(box) + size(box) / 2
    const sorted = [...placed].sort((a, b) => middle(a.box) - middle(b.box))
    const first = sorted[0].box
    const last = sorted[sorted.length - 1].box
    const span = at(last) + size(last) - at(first)
    const total = sorted.reduce((sum, item) => sum + size(item.box), 0)
    const gap = (span - total) / (sorted.length - 1)

    let current = design
    let cursor = at(first)
    for (const { selection, box } of sorted) {
        const delta = cursor - at(box)
        current = horizontal
            ? moveSelectionBy(current, selection, (delta / W) * 100, 0)
            : moveSelectionBy(current, selection, 0, (delta / H) * 100)
        cursor += size(box) + gap
    }
    return current
}

/** Positions (canvas pixels) that a dragged box may snap to. */
export interface SnapTargets {
    xs: number[]
    ys: number[]
}

/** Distance between the lines of the optional grid, in percent of the page width. */
export const GRID_STEP_PERCENT = 5

/** The grid's line spacing in canvas pixels; squares, so it is the same across and down. */
export function gridStepPx(design: CertificateDesign): number {
    return (GRID_STEP_PERCENT / 100) * design.width
}

/**
 * What a dragged thing can snap to: the page's edges and centre, the edges and centre of every other
 * thing that is drawn, and (when the grid is showing) its lines.
 */
export function buildSnapTargets(
    design: CertificateDesign,
    others: ElementBox[],
    grid: boolean
): SnapTargets {
    const { width: W, height: H } = design
    const xs = [0, W / 2, W]
    const ys = [0, H / 2, H]
    for (const box of others) {
        xs.push(box.x, box.x + box.w / 2, box.x + box.w)
        ys.push(box.y, box.y + box.h / 2, box.y + box.h)
    }
    if (grid) {
        const step = gridStepPx(design)
        if (step > 0) {
            for (let x = step; x < W; x += step) xs.push(x)
            for (let y = step; y < H; y += step) ys.push(y)
        }
    }
    return { xs, ys }
}

export interface SnapResult {
    /** Pixels to add to the box's position so it lands on a target. */
    dx: number
    dy: number
    /** The line the box snapped to along each axis, in canvas pixels. Null when it did not snap. */
    guideX: number | null
    guideY: number | null
}

function snapAxis(edges: number[], targets: number[], threshold: number): { delta: number; guide: number } | null {
    let best: { delta: number; guide: number } | null = null
    for (const edge of edges) {
        for (const target of targets) {
            const delta = target - edge
            if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
                best = { delta, guide: target }
            }
        }
    }
    return best
}

/** Finds how far a box being dragged should shift so its edges or centre land on a nearby target. */
export function snapBox(box: ElementBox, targets: SnapTargets, threshold: number): SnapResult {
    const x = snapAxis([box.x, box.x + box.w / 2, box.x + box.w], targets.xs, threshold)
    const y = snapAxis([box.y, box.y + box.h / 2, box.y + box.h], targets.ys, threshold)
    return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, guideX: x?.guide ?? null, guideY: y?.guide ?? null }
}
