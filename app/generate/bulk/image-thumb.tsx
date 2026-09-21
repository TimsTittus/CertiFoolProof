"use client"

import { useEffect, useRef } from "react"
import { getLoadedImage, getWhiteRemoved, loadImage } from "@/lib/bulk/images"

const BOX_WIDTH = 240
const BOX_HEIGHT = 96

interface ImageThumbProps {
    src: string
    removeBackground?: boolean
    threshold?: number
}

/** A picture on a checkerboard, so transparent parts can be seen for what they are. */
export function ImageThumb({ src, removeBackground = false, threshold = 0 }: ImageThumbProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        let cancelled = false

        const draw = (image: HTMLImageElement) => {
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            if (cancelled || !canvas || !ctx || image.naturalWidth === 0 || image.naturalHeight === 0) return

            const scale = Math.min(BOX_WIDTH / image.naturalWidth, BOX_HEIGHT / image.naturalHeight)
            const width = Math.max(1, Math.round(image.naturalWidth * scale))
            const height = Math.max(1, Math.round(image.naturalHeight * scale))
            canvas.width = width
            canvas.height = height
            ctx.clearRect(0, 0, width, height)
            ctx.drawImage(removeBackground ? getWhiteRemoved(src, image, threshold) : image, 0, 0, width, height)
        }

        const ready = getLoadedImage(src)
        if (ready) draw(ready)
        else
            void loadImage(src).then((image) => {
                if (image) draw(image)
            })

        return () => {
            cancelled = true
        }
    }, [src, removeBackground, threshold])

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            className="block max-w-full h-auto border-3 border-black"
            style={{
                backgroundColor: "#fff",
                backgroundImage:
                    "linear-gradient(45deg, #d4d4d4 25%, transparent 25%, transparent 75%, #d4d4d4 75%), linear-gradient(45deg, #d4d4d4 25%, transparent 25%, transparent 75%, #d4d4d4 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 8px 8px",
            }}
        />
    )
}