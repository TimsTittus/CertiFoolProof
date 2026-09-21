"use client"

/**
 * Everything the certificate designer needs to hold on to: the design itself, the
 * uploaded artwork behind it, what is selected, saving and loading template files,
 * and keeping the work safe in the browser between visits.
 *
 * Both screens that design a certificate - the bulk generator and the issuing
 * page - drive the very same editor through this, so a change made in one is a
 * change made in both. Each passes its own autosave key, so their work is kept apart.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
    SIZE_PRESETS,
    applyPageSize,
    createDefaultDesign,
    designFontSpecs,
    loadDesignFonts,
    loadDesignImages,
    patchElement,
    type CertificateDesign,
    type ElementId,
    type ElementPatch,
    type Selection,
    type TextElementId,
} from "@/lib/bulk/renderer"
import {
    loadAutosave,
    parseTemplate,
    saveAutosave,
    serializeTemplate,
    type AutosaveOutcome,
    type TemplateBackground,
} from "@/lib/bulk/template"
import { downloadBlob } from "@/lib/bulk/export"

/** Uploaded artwork above this width is scaled down - past here it is all weight, no sharpness. */
const MAX_BACKGROUND_WIDTH = 3000

/** Template files are JSON; anything bigger than this is not one. */
const MAX_TEMPLATE_FILE_BYTES = 40 * 1024 * 1024

/** Where the uploaded artwork came from, so it can be embedded in a saved template. */
interface BackgroundSource {
    name: string
    file?: File
    dataUrl?: string
}

function readFileAsDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error ?? new Error("Could not read the artwork."))
        reader.readAsDataURL(file)
    })
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error("The artwork in that template could not be loaded."))
        image.src = url
    })
}

export interface DesignerOptions {
    /** Which browser storage slot this screen autosaves into. */
    autosaveKey: string
    /** Shown to the person when something in the designer goes wrong. An empty message clears it. */
    onError: (message: string) => void
    /** Called whenever the design changes enough that anything already generated is out of date. */
    onChange?: () => void
    /** The design a screen starts from, and goes back to when it is reset. */
    createDesign?: () => CertificateDesign
}

export interface Designer {
    design: CertificateDesign
    setDesign: React.Dispatch<React.SetStateAction<CertificateDesign>>
    /** Replaces one top-level part of the design, such as a colour. */
    update: <K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) => void
    patchElement: (id: ElementId, patch: ElementPatch) => void
    updateText: (id: TextElementId, text: string) => void

    selection: Selection | null
    setSelection: React.Dispatch<React.SetStateAction<Selection | null>>
    selectElement: (id: ElementId | null) => void

    background: HTMLImageElement | null
    backgroundName: string
    handleBackgroundFile: (file: File) => void
    clearBackground: () => void

    /** Bumps when web fonts or uploaded pictures finish loading, so anything drawn without them is redrawn. */
    assetVersion: number
    /** Bumps whenever a whole design is swapped in, so editors that keep their own state start over. */
    templateVersion: number
    /** Makes sure every picture the design uses is decoded, then redraws. */
    refreshAssets: () => void

    autosave: AutosaveOutcome | null
    /** True once whatever was saved in the browser has been brought back. */
    hydrated: boolean
    /** True when there actually was saved work to bring back. */
    restored: boolean
    notice: string
    setNotice: (message: string) => void

    downloadTemplate: () => Promise<void>
    handleTemplateFile: (file: File) => Promise<void>
    resetDesign: () => void
}

export function useDesigner(options: DesignerOptions): Designer {
    const [design, setDesign] = useState<CertificateDesign>(options.createDesign ?? createDefaultDesign)
    const [background, setBackground] = useState<HTMLImageElement | null>(null)
    const [backgroundName, setBackgroundName] = useState("")
    const backgroundUrlRef = useRef<string | null>(null)
    const backgroundSourceRef = useRef<BackgroundSource | null>(null)

    const [selection, setSelection] = useState<Selection | null>({ kind: "element", id: "name" })
    const [hydrated, setHydrated] = useState(false)
    const [restored, setRestored] = useState(false)
    const [templateVersion, setTemplateVersion] = useState(0)
    const [notice, setNotice] = useState("")
    const [autosave, setAutosave] = useState<AutosaveOutcome | null>(null)
    const [assetVersion, setAssetVersion] = useState(0)
    const designRef = useRef(design)

    // Held in a ref so a caller that rebuilds its callbacks does not rebuild every handler here.
    const optionsRef = useRef(options)
    useEffect(() => {
        optionsRef.current = options
    })

    const { autosaveKey } = options
    const reportError = useCallback((message: string) => optionsRef.current.onError(message), [])
    const reportChange = useCallback(() => optionsRef.current.onChange?.(), [])

    const update = useCallback(
        <K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) => {
            setDesign((current) => ({ ...current, [key]: value }))
        },
        []
    )

    const patchDesignElement = useCallback((id: ElementId, patch: ElementPatch) => {
        setDesign((current) => patchElement(current, id, patch))
    }, [])

    const updateText = useCallback(
        (id: TextElementId, text: string) => patchDesignElement(id, { text }),
        [patchDesignElement]
    )

    const selectElement = useCallback(
        (id: ElementId | null) => setSelection(id ? { kind: "element", id } : null),
        []
    )

    const handleBackgroundFile = useCallback(
        (file: File) => {
            reportError("")
            reportChange()
            const url = URL.createObjectURL(file)
            const image = new window.Image()

            image.onload = () => {
                if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current)
                backgroundUrlRef.current = url

                let width = image.naturalWidth
                let height = image.naturalHeight
                if (width > MAX_BACKGROUND_WIDTH) {
                    height = Math.round((height * MAX_BACKGROUND_WIDTH) / width)
                    width = MAX_BACKGROUND_WIDTH
                }

                backgroundSourceRef.current = { name: file.name, file }
                setBackground(image)
                setBackgroundName(file.name)
                setDesign((current) => ({ ...current, mode: "upload", width, height }))
            }
            image.onerror = () => {
                URL.revokeObjectURL(url)
                reportError("That image could not be loaded. Try a PNG or JPG file.")
            }
            image.src = url
        },
        [reportChange, reportError]
    )

    const clearBackground = useCallback(() => {
        reportError("")
        reportChange()
        if (backgroundUrlRef.current) {
            URL.revokeObjectURL(backgroundUrlRef.current)
            backgroundUrlRef.current = null
        }
        backgroundSourceRef.current = null
        setBackground(null)
        setBackgroundName("")
        const size = SIZE_PRESETS[0]
        setDesign((current) => applyPageSize({ ...current, mode: "builtin" }, size.width, size.height))
    }, [reportChange, reportError])

    /** The artwork as a data URL, ready to embed in a template. Cached after the first read. */
    const getBackgroundEmbed = useCallback(async (): Promise<TemplateBackground | null> => {
        const current = backgroundSourceRef.current
        if (!current) return null
        if (!current.dataUrl && current.file) current.dataUrl = await readFileAsDataUrl(current.file)
        return current.dataUrl ? { name: current.name, dataUrl: current.dataUrl } : null
    }, [])

    /**
     * Swaps a whole design (and its artwork) in. Returns a warning to show the user
     * when the artwork could not come along, otherwise an empty string.
     */
    const applyTemplate = useCallback(
        async (next: CertificateDesign, artwork: TemplateBackground | null): Promise<string> => {
            let nextDesign = next
            let image: HTMLImageElement | null = null
            let warning = ""

            if (next.mode === "upload") {
                if (artwork) {
                    try {
                        image = await loadImage(artwork.dataUrl)
                    } catch {
                        warning =
                            "The artwork saved with that template could not be loaded, so the built-in design is shown instead."
                    }
                } else {
                    warning =
                        "That design was made on your own uploaded artwork, which is not stored with it. Upload the artwork again to keep using it; the built-in design is shown until then."
                }
                if (!image) {
                    const size = SIZE_PRESETS[0]
                    nextDesign = applyPageSize({ ...next, mode: "builtin" }, size.width, size.height)
                }
            }

            if (backgroundUrlRef.current) {
                URL.revokeObjectURL(backgroundUrlRef.current)
                backgroundUrlRef.current = null
            }
            if (image && artwork) {
                backgroundSourceRef.current = { name: artwork.name, dataUrl: artwork.dataUrl }
                setBackground(image)
                setBackgroundName(artwork.name)
            } else {
                backgroundSourceRef.current = null
                setBackground(null)
                setBackgroundName("")
            }

            setDesign(nextDesign)
            setSelection((current) => (current && current.kind !== "element" ? { kind: "element", id: "name" } : current))
            setTemplateVersion((version) => version + 1)
            reportChange()
            return warning
        },
        [reportChange]
    )

    const downloadTemplate = useCallback(async () => {
        reportError("")
        try {
            const artwork = design.mode === "upload" ? await getBackgroundEmbed() : null
            const json = serializeTemplate(design, artwork)
            const stamp = new Date().toISOString().slice(0, 10)
            downloadBlob(
                new Blob([json], { type: "application/json" }),
                `certificate-template-${stamp}.json`
            )
        } catch {
            reportError("Could not save the template. Please try again.")
        }
    }, [design, getBackgroundEmbed, reportError])

    const handleTemplateFile = useCallback(
        async (file: File) => {
            reportError("")
            setNotice("")
            if (file.size > MAX_TEMPLATE_FILE_BYTES) {
                reportError("That file is too large to be a certificate template.")
                return
            }
            try {
                const loaded = parseTemplate(await file.text())
                const warning = await applyTemplate(loaded.design, loaded.background)
                if (warning) setNotice(warning)
            } catch (caught) {
                reportError(caught instanceof Error ? caught.message : "Could not open that template.")
            }
        },
        [applyTemplate, reportError]
    )

    const resetDesign = useCallback(() => {
        if (!window.confirm("Reset the whole design back to the defaults? Your current layout will be lost.")) {
            return
        }
        if (backgroundUrlRef.current) {
            URL.revokeObjectURL(backgroundUrlRef.current)
            backgroundUrlRef.current = null
        }
        backgroundSourceRef.current = null
        setBackground(null)
        setBackgroundName("")
        setDesign((optionsRef.current.createDesign ?? createDefaultDesign)())
        setSelection({ kind: "element", id: "name" })
        setTemplateVersion((version) => version + 1)
        setNotice("")
        reportError("")
        reportChange()
    }, [reportChange, reportError])

    const refreshAssets = useCallback(() => {
        void loadDesignImages(designRef.current).then(() => setAssetVersion((version) => version + 1))
    }, [])

    // Bring back whatever was being worked on before the page was refreshed.
    useEffect(() => {
        let cancelled = false
        void (async () => {
            const saved = loadAutosave(autosaveKey)
            if (saved) {
                const warning = await applyTemplate(saved.design, saved.background)
                if (cancelled) return
                setRestored(true)
                if (warning) setNotice(warning)
            }
            if (!cancelled) setHydrated(true)
        })()
        return () => {
            cancelled = true
        }
    }, [applyTemplate, autosaveKey])

    useEffect(() => {
        designRef.current = design
    }, [design])

    // Canvas text never triggers a font download, so fetch the fonts the design uses and redraw once they arrive.
    const fontSpecs = designFontSpecs(design).join("|")
    useEffect(() => {
        let cancelled = false
        void loadDesignFonts(designRef.current).then((usedWebFont) => {
            if (usedWebFont && !cancelled) setAssetVersion((version) => version + 1)
        })
        return () => {
            cancelled = true
        }
    }, [fontSpecs])

    useEffect(() => {
        let cancelled = false
        void loadDesignImages(designRef.current).then((loaded) => {
            if (loaded && !cancelled) setAssetVersion((version) => version + 1)
        })
        return () => {
            cancelled = true
        }
    }, [design.signatories, design.logos])

    // Autosave shortly after each change, and once more as the page is left so nothing is lost.
    useEffect(() => {
        if (!hydrated) return
        let cancelled = false
        const timer = setTimeout(async () => {
            let artwork: TemplateBackground | null = null
            if (design.mode === "upload") {
                try {
                    artwork = await getBackgroundEmbed()
                } catch {
                    artwork = null
                }
            }
            if (!cancelled) setAutosave(saveAutosave(design, artwork, autosaveKey))
        }, 600)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [design, hydrated, background, getBackgroundEmbed, autosaveKey])

    useEffect(() => {
        if (!hydrated) return
        const flush = () => {
            const current = designRef.current
            const cached = backgroundSourceRef.current
            const artwork =
                current.mode === "upload" && cached?.dataUrl
                    ? { name: cached.name, dataUrl: cached.dataUrl }
                    : null
            saveAutosave(current, artwork, autosaveKey)
        }
        window.addEventListener("pagehide", flush)
        return () => window.removeEventListener("pagehide", flush)
    }, [hydrated, autosaveKey])

    useEffect(() => {
        return () => {
            if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current)
        }
    }, [])

    return {
        design,
        setDesign,
        update,
        patchElement: patchDesignElement,
        updateText,
        selection,
        setSelection,
        selectElement,
        background,
        backgroundName,
        handleBackgroundFile,
        clearBackground,
        assetVersion,
        templateVersion,
        refreshAssets,
        autosave,
        hydrated,
        restored,
        notice,
        setNotice,
        downloadTemplate,
        handleTemplateFile,
        resetDesign,
    }
}
