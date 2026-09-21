"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { normalizeStrokes, type SignatureDrawing } from "@/lib/bulk/renderer"
import { smallButtonClass } from "./ui"

const PAD_WIDTH = 900
const PAD_HEIGHT = 300
const PEN_WIDTH = 5
/** Points closer than this add nothing to a stroke and only bloat the saved template. */
const MIN_STEP = 2
const MAX_POINTS = 8000

type Stroke = [number, number][]

/** Fits an existing drawing into the pad so it can be edited again. */
function strokesFromDrawing(drawing: SignatureDrawing | null): Stroke[] {
    if (!drawing) return []
    const height = Math.min(PAD_HEIGHT * 0.8, (PAD_WIDTH * 0.8) / drawing.aspect)
    const width = height * drawing.aspect
    const left = (PAD_WIDTH - width) / 2
    const top = (PAD_HEIGHT - height) / 2
    return drawing.strokes.map((stroke) =>
        stroke.map(([x, y]) => [left + x * width, top + y * height] as [number, number])
    )
}

interface SignaturePadProps {
    color: string
    value: SignatureDrawing | null
    onChange: (drawing: SignatureDrawing | null) => void
}

export function SignaturePad({ color, value, onChange }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    // Only the drawing present when the pad opens matters; after that the pad owns its strokes.
    const [initialStrokes] = useState(() => strokesFromDrawing(value))
    const strokesRef = useRef<Stroke[]>(initialStrokes)
    const activePointer = useRef<number | null>(null)
    const [strokeCount, setStrokeCount] = useState(initialStrokes.length)

    const redraw = useCallback(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = PEN_WIDTH
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        for (const stroke of strokesRef.current) {
            if (stroke.length === 1) {
                ctx.beginPath()
                ctx.arc(stroke[0][0], stroke[0][1], PEN_WIDTH / 2, 0, Math.PI * 2)
                ctx.fill()
                continue
            }
            ctx.beginPath()
            ctx.moveTo(stroke[0][0], stroke[0][1])
            for (let i = 1; i < stroke.length - 1; i++) {
                const midX = (stroke[i][0] + stroke[i + 1][0]) / 2
                const midY = (stroke[i][1] + stroke[i + 1][1]) / 2
                ctx.quadraticCurveTo(stroke[i][0], stroke[i][1], midX, midY)
            }
            const last = stroke[stroke.length - 1]
            ctx.lineTo(last[0], last[1])
            ctx.stroke()
        }
    }, [color])

    useEffect(() => {
        redraw()
    }, [redraw])

    const commit = useCallback(() => {
        setStrokeCount(strokesRef.current.length)
        onChange(normalizeStrokes(strokesRef.current))
    }, [onChange])

    const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
        const rect = event.currentTarget.getBoundingClientRect()
        return [
            ((event.clientX - rect.left) * PAD_WIDTH) / rect.width,
            ((event.clientY - rect.top) * PAD_HEIGHT) / rect.height,
        ]
    }

    const totalPoints = () => strokesRef.current.reduce((sum, stroke) => sum + stroke.length, 0)

    const finishStroke = () => {
        if (activePointer.current === null) return
        activePointer.current = null
        commit()
    }

    return (
        <div className="space-y-3">
            <div className="relative border-3 border-black bg-white">
                <canvas
                    ref={canvasRef}
                    width={PAD_WIDTH}
                    height={PAD_HEIGHT}
                    aria-label="Signature drawing pad"
                    style={{ touchAction: "none" }}
                    className="block w-full h-auto cursor-crosshair select-none"
                    onPointerDown={(event) => {
                        if (activePointer.current !== null) return
                        if (event.pointerType === "mouse" && event.button !== 0) return
                        if (totalPoints() >= MAX_POINTS) return
                        event.currentTarget.setPointerCapture(event.pointerId)
                        activePointer.current = event.pointerId
                        strokesRef.current = [...strokesRef.current, [pointFrom(event)]]
                        redraw()
                    }}
                    onPointerMove={(event) => {
                        if (activePointer.current !== event.pointerId) return
                        if (totalPoints() >= MAX_POINTS) return
                        const stroke = strokesRef.current[strokesRef.current.length - 1]
                        const [x, y] = pointFrom(event)
                        const previous = stroke[stroke.length - 1]
                        if (Math.hypot(x - previous[0], y - previous[1]) < MIN_STEP) return
                        stroke.push([x, y])
                        redraw()
                    }}
                    onPointerUp={(event) => {
                        if (activePointer.current !== event.pointerId) return
                        finishStroke()
                    }}
                    onPointerCancel={(event) => {
                        if (activePointer.current !== event.pointerId) return
                        finishStroke()
                    }}
                />
                <span
                    aria-hidden
                    className="pointer-events-none absolute left-4 right-4 border-b-2 border-dashed border-black/25"
                    style={{ bottom: "22%" }}
                />
                {strokeCount === 0 ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-black uppercase text-xs text-black/30">
                        Draw your signature here
                    </span>
                ) : null}
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={strokeCount === 0}
                    onClick={() => {
                        strokesRef.current = strokesRef.current.slice(0, -1)
                        redraw()
                        commit()
                    }}
                    className={smallButtonClass}
                >
                    Undo stroke
                </button>
                <button
                    type="button"
                    disabled={strokeCount === 0}
                    onClick={() => {
                        strokesRef.current = []
                        redraw()
                        commit()
                    }}
                    className={smallButtonClass}
                >
                    Clear
                </button>
            </div>
        </div>
    )
}