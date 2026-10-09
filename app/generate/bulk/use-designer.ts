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

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    SIZE_PRESETS,
    applyPageSize,
    createDefaultDesign,
    designFontSpecs,
    designImageSources,
    loadDesignFonts,
    loadDesignImages,
    patchElement,
    sameSelection,
    selectionKey,
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
import { cleanSelections, selectionExists } from "@/lib/bulk/editing"

/** Uploaded artwork above this width is scaled down - past here it is all weight, no sharpness. */
const MAX_BACKGROUND_WIDTH = 3000

/** Template files are JSON; anything bigger than this is not one. */
const MAX_TEMPLATE_FILE_BYTES = 40 * 1024 * 1024

/** How many steps back undo can go. */
const HISTORY_LIMIT = 100

/** Edits made this close together (typing, dragging a slider) are undone as one step. */
const COALESCE_MS = 700

/** The design as it was before a step, kept so the step can be undone. */
interface History {
    past: CertificateDesign[]
    future: CertificateDesign[]
    /** True while further edits still belong to the step that is open. */
    open: boolean
    /** True during a drag: everything until it ends is one step, however long it takes. */
    held: boolean
    /** When the last edit happened. */
    at: number
}

interface Picked {
    primary: Selection | null
    /** Things added with shift-click, for tools that work on several at once. */
    others: Selection[]
}

const NO_OTHERS: Selection[] = []

/** Options of the preview that help with placing things. Only kept for as long as the page is open. */
export interface StageOptions {
    /** Dragged things snap to the page centre and to each other. */
    snap: boolean
    /** Show the grid over the preview, and snap to it. */
    grid: boolean
}

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

    /** The thing the editing panels are pointed at. */
    selection: Selection | null
    /** Picks one thing (or nothing), dropping any extra selection. */
    setSelection: React.Dispatch<React.SetStateAction<Selection | null>>
    selectElement: (id: ElementId | null) => void
    /** Adds a thing to the selection, or takes it out again (shift-click). */
    toggleSelection: (target: Selection) => void
    /** Everything selected, the main selection first. Only things that still exist. */
    selections: Selection[]

    canUndo: boolean
    canRedo: boolean
    undo: () => void
    redo: () => void
    /** Makes the next change its own undo step, however soon it follows the last. */
    checkpoint: () => void
    /** Groups every change until `endGesture` into one undo step, e.g. a whole drag. */
    beginGesture: () => void
    endGesture: () => void
    /** Forgets what can be undone, keeping the design as it is now. */
    resetHistory: () => void

    stageOptions: StageOptions
    setStageOption: <K extends keyof StageOptions>(key: K, value: StageOptions[K]) => void

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
    const [design, setDesignState] = useState<CertificateDesign>(options.createDesign ?? createDefaultDesign)
    const [background, setBackground] = useState<HTMLImageElement | null>(null)
    const [backgroundName, setBackgroundName] = useState("")
    const backgroundUrlRef = useRef<string | null>(null)
    const backgroundSourceRef = useRef<BackgroundSource | null>(null)

    const [picked, setPicked] = useState<Picked>({ primary: { kind: "element", id: "name" }, others: NO_OTHERS })
    const selection = picked.primary
    const [stageOptions, setStageOptions] = useState<StageOptions>({ snap: true, grid: false })
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [hydrated, setHydrated] = useState(false)
    const [restored, setRestored] = useState(false)
    const [templateVersion, setTemplateVersion] = useState(0)
    const [notice, setNotice] = useState("")
    const [autosave, setAutosave] = useState<AutosaveOutcome | null>(null)
    const [assetVersion, setAssetVersion] = useState(0)
    // Always the design on screen: every change goes through `commit`, so it is never a render behind.
    const designRef = useRef(design)
    const historyRef = useRef<History>({ past: [], future: [], open: false, held: false, at: 0 })

    // Held in a ref so a caller that rebuilds its callbacks does not rebuild every handler here.
    const optionsRef = useRef(options)
    useEffect(() => {
        optionsRef.current = options
    })

    const { autosaveKey } = options
    const reportError = useCallback((message: string) => optionsRef.current.onError(message), [])
    const reportChange = useCallback(() => optionsRef.current.onChange?.(), [])

    const commit = useCallback((next: CertificateDesign) => {
        designRef.current = next
        setDesignState(next)
    }, [])

    const syncHistoryFlags = useCallback(() => {
        const history = historyRef.current
        setCanUndo(history.past.length > 0)
        setCanRedo(history.future.length > 0)
    }, [])

    /** Changes the design as a step that can be undone. Edits that follow closely are folded into the same step. */
    const setDesign = useCallback<React.Dispatch<React.SetStateAction<CertificateDesign>>>(
        (action) => {
            const current = designRef.current
            const next = typeof action === "function" ? action(current) : action
            if (next === current) return

            const history = historyRef.current
            const now = Date.now()
            if (!history.open || (!history.held && now - history.at > COALESCE_MS)) {
                history.past.push(current)
                if (history.past.length > HISTORY_LIMIT) history.past.shift()
                history.future = []
                history.open = true
                syncHistoryFlags()
            }
            history.at = now
            commit(next)
        },
        [commit, syncHistoryFlags]
    )

    /** Swaps the design for a new starting point: what could be undone no longer applies, so it is forgotten. */
    const replaceDesign = useCallback(
        (action: React.SetStateAction<CertificateDesign>) => {
            const next = typeof action === "function" ? action(designRef.current) : action
            historyRef.current = { past: [], future: [], open: false, held: false, at: 0 }
            syncHistoryFlags()
            commit(next)
        },
        [commit, syncHistoryFlags]
    )

    const resetHistory = useCallback(() => {
        historyRef.current = { past: [], future: [], open: false, held: false, at: 0 }
        syncHistoryFlags()
    }, [syncHistoryFlags])

    const checkpoint = useCallback(() => {
        historyRef.current.open = false
    }, [])

    const beginGesture = useCallback(() => {
        const history = historyRef.current
        history.open = false
        history.held = true
    }, [])

    const endGesture = useCallback(() => {
        const history = historyRef.current
        history.open = false
        history.held = false
    }, [])

    /** Keeps the selection to things that are still on the design after it has been rewound. */
    const pruneSelection = useCallback((restored: CertificateDesign) => {
        setPicked((current) => {
            const primary = current.primary && selectionExists(restored, current.primary) ? current.primary : null
            const others = cleanSelections(restored, current.others)
            if (primary === current.primary && others.length === current.others.length) return current
            return { primary, others: others.length > 0 ? others : NO_OTHERS }
        })
    }, [])

    const undo = useCallback(() => {
        const history = historyRef.current
        const previous = history.past.pop()
        if (!previous) return
        history.future.push(designRef.current)
        history.open = false
        history.held = false
        syncHistoryFlags()
        commit(previous)
        pruneSelection(previous)
    }, [commit, pruneSelection, syncHistoryFlags])

    const redo = useCallback(() => {
        const history = historyRef.current
        const next = history.future.pop()
        if (!next) return
        history.past.push(designRef.current)
        history.open = false
        history.held = false
        syncHistoryFlags()
        commit(next)
        pruneSelection(next)
    }, [commit, pruneSelection, syncHistoryFlags])

    const update = useCallback(
        <K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) => {
            setDesign((current) => ({ ...current, [key]: value }))
        },
        [setDesign]
    )

    const patchDesignElement = useCallback(
        (id: ElementId, patch: ElementPatch) => {
            setDesign((current) => patchElement(current, id, patch))
        },
        [setDesign]
    )

    const setSelection = useCallback<React.Dispatch<React.SetStateAction<Selection | null>>>((action) => {
        setPicked((current) => {
            const primary = typeof action === "function" ? action(current.primary) : action
            if (sameSelection(primary, current.primary) && current.others.length === 0) return current
            return { primary, others: NO_OTHERS }
        })
    }, [])

    const toggleSelection = useCallback((target: Selection) => {
        setPicked((current) => {
            const key = selectionKey(target)
            if (!current.primary) return { primary: target, others: NO_OTHERS }
            if (selectionKey(current.primary) === key) {
                // Taking the main selection out promotes the next one.
                const [first, ...rest] = current.others
                return { primary: first ?? null, others: rest.length > 0 ? rest : NO_OTHERS }
            }
            if (current.others.some((item) => selectionKey(item) === key)) {
                const rest = current.others.filter((item) => selectionKey(item) !== key)
                return { ...current, others: rest.length > 0 ? rest : NO_OTHERS }
            }
            return { ...current, others: [...current.others, target] }
        })
    }, [])

    const selections = useMemo(
        () => cleanSelections(design, picked.primary ? [picked.primary, ...picked.others] : []),
        [design, picked]
    )

    const setStageOption = useCallback(
        <K extends keyof StageOptions>(key: K, value: StageOptions[K]) => {
            setStageOptions((current) => (current[key] === value ? current : { ...current, [key]: value }))
        },
        []
    )

    const updateText = useCallback(
        (id: TextElementId, text: string) => patchDesignElement(id, { text }),
        [patchDesignElement]
    )

    const selectElement = useCallback(
        (id: ElementId | null) => setSelection(id ? { kind: "element", id } : null),
        [setSelection]
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
                replaceDesign((current) => ({ ...current, mode: "upload", width, height }))
            }
            image.onerror = () => {
                URL.revokeObjectURL(url)
                reportError("That image could not be loaded. Try a PNG or JPG file.")
            }
            image.src = url
        },
        [replaceDesign, reportChange, reportError]
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
        replaceDesign((current) => applyPageSize({ ...current, mode: "builtin" }, size.width, size.height))
    }, [replaceDesign, reportChange, reportError])

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

            replaceDesign(nextDesign)
            setSelection((current) => (current && current.kind !== "element" ? { kind: "element", id: "name" } : current))
            setTemplateVersion((version) => version + 1)
            reportChange()
            return warning
        },
        [replaceDesign, reportChange, setSelection]
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
        replaceDesign((optionsRef.current.createDesign ?? createDefaultDesign)())
        setSelection({ kind: "element", id: "name" })
        setTemplateVersion((version) => version + 1)
        setNotice("")
        reportError("")
        reportChange()
    }, [replaceDesign, reportChange, reportError, setSelection])

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

    const imageSources = designImageSources(design).join("|")
    useEffect(() => {
        let cancelled = false
        void loadDesignImages(designRef.current).then((loaded) => {
            if (loaded && !cancelled) setAssetVersion((version) => version + 1)
        })
        return () => {
            cancelled = true
        }
    }, [imageSources])

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
        toggleSelection,
        selections,
        canUndo,
        canRedo,
        undo,
        redo,
        checkpoint,
        beginGesture,
        endGesture,
        resetHistory,
        stageOptions,
        setStageOption,
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
