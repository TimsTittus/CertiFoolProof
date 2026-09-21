import { fillTokens, stripTokens, type Recipient } from "./tokens"

/** Characters that are illegal in file names on common operating systems. */
const ILLEGAL_FILENAME_CHARS = /[\u0000-\u001f\u007f<>:"/\\|?*]/g

/** Windows refuses these names regardless of extension. */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export function sanitizeFileName(value: string): string {
    const cleaned = value
        .replace(ILLEGAL_FILENAME_CHARS, "-")
        .replace(/\s+/g, " ")
        .trim()
        // Trailing dots and spaces are silently dropped by Windows.
        .replace(/[. ]+$/g, "")
        .slice(0, 80)
        .trim()

    if (!cleaned || RESERVED_NAMES.test(cleaned)) return `certificate-${cleaned || "unnamed"}`
    return cleaned
}

/**
 * Fills the pattern from the recipient - `{name}`, `{index}` and any column of the list -
 * and de-duplicates the result within the archive. A token nothing can fill is dropped, so
 * a stray placeholder never ends up in a file name.
 */
export function buildFileName(
    pattern: string,
    recipient: Recipient,
    index: number,
    extension: string,
    used: Map<string, number>
): string {
    const filled = stripTokens(
        fillTokens((pattern || "{name}").replace(/\{n\}/gi, String(index)), recipient)
    )

    const base = sanitizeFileName(filled)
    const key = base.toLowerCase()
    const seen = used.get(key) ?? 0
    used.set(key, seen + 1)

    return seen === 0 ? `${base}.${extension}` : `${base} (${seen + 1}).${extension}`
}

function escapeCsvValue(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function buildIndexCsv(rows: { index: number; name: string; file: string }[]): string {
    const lines = ["Index,Participant Name,File"]
    for (const row of rows) {
        lines.push(
            [String(row.index), escapeCsvValue(row.name), escapeCsvValue(row.file)].join(",")
        )
    }
    // Excel needs the BOM to read UTF-8 names correctly.
    return `﻿${lines.join("\r\n")}\r\n`
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    // Release the blob only after the browser has started the download.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}