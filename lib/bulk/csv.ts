export interface ParsedCsv {
    /** Every row, including the header row if there is one. */
    rows: string[][]
    delimiter: string
}

const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"]

/** Picks the delimiter that appears most often outside of quoted sections. */
function detectDelimiter(text: string): string {
    const counts = new Map<string, number>(CANDIDATE_DELIMITERS.map((d) => [d, 0]))
    let inQuotes = false
    let line = 0

    for (let i = 0; i < text.length && line < 5; i++) {
        const char = text[i]
        if (char === '"') {
            inQuotes = !inQuotes
        } else if (!inQuotes && (char === "\n" || char === "\r")) {
            line++
        } else if (!inQuotes && counts.has(char)) {
            counts.set(char, (counts.get(char) ?? 0) + 1)
        }
    }

    let best = ","
    let bestCount = 0
    for (const [delimiter, count] of counts) {
        if (count > bestCount) {
            best = delimiter
            bestCount = count
        }
    }
    return best
}

export function parseCsv(input: string, forcedDelimiter?: string): ParsedCsv {
    // Strip the UTF-8 BOM Excel likes to prepend, or it becomes part of field 1.
    const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
    const delimiter = forcedDelimiter ?? detectDelimiter(text)

    const rows: string[][] = []
    let row: string[] = []
    let field = ""
    let inQuotes = false

    const endField = () => {
        row.push(field.trim())
        field = ""
    }
    const endRow = () => {
        endField()
        // Drop rows that are entirely empty (trailing newlines, blank separators).
        if (row.some((value) => value.length > 0)) rows.push(row)
        row = []
    }

    for (let i = 0; i < text.length; i++) {
        const char = text[i]

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"'
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                field += char
            }
            continue
        }

        if (char === '"') {
            inQuotes = true
        } else if (char === delimiter) {
            endField()
        } else if (char === "\n") {
            endRow()
        } else if (char === "\r") {
            // Swallow CR; the following LF (if any) closes the row.
            if (text[i + 1] !== "\n") endRow()
        } else {
            field += char
        }
    }

    if (field.length > 0 || row.length > 0) endRow()

    return { rows, delimiter }
}

/** Whether the row looks like a header, i.e. contains a common column label. */
export function looksLikeHeader(row: string[] | undefined): boolean {
    if (!row || row.length === 0) return false
    const headerWords = /^(name|full\s*name|participant|participant\s*name|student|student\s*name|attendee|candidate|recipient|email|e-?mail|roll|roll\s*no|id|s\.?\s*no|sl\.?\s*no|serial|sr\.?\s*no|index|team|department|dept|course|phone|mobile|college|branch|year|title|event)$/i
    return row.some((cell) => headerWords.test(cell.trim()))
}

/** Picks the column most likely to hold participant names. */
export function guessNameColumn(rows: string[][]): number {
    if (rows.length === 0) return 0
    const header = rows[0]

    if (looksLikeHeader(header)) {
        const exact = header.findIndex((cell) => /^(full\s*)?name$/i.test(cell.trim()))
        if (exact !== -1) return exact
        const partial = header.findIndex((cell) =>
            /(participant|student|attendee|candidate|recipient|name)/i.test(cell.trim())
        )
        if (partial !== -1) return partial
    }

    // Otherwise: the first column whose values are mostly non-numeric text.
    const sample = rows.slice(0, 20)
    const columnCount = Math.max(...sample.map((r) => r.length))
    for (let col = 0; col < columnCount; col++) {
        const values = sample.map((r) => r[col] ?? "").filter((v) => v.length > 0)
        if (values.length === 0) continue
        const texty = values.filter((v) => /[a-z]/i.test(v) && !/^\S+@\S+$/.test(v))
        if (texty.length >= values.length * 0.7) return col
    }
    return 0
}

/** Extracts the given column, collapsing whitespace and dropping empty values. */
export function extractNames(
    rows: string[][],
    columnIndex: number,
    skipFirstRow: boolean
): string[] {
    return rows
        .slice(skipFirstRow ? 1 : 0)
        .map((row) => (row[columnIndex] ?? "").replace(/\s+/g, " ").trim())
        .filter((name) => name.length > 0)
}

/** Splits a pasted block of text into one name per line. */
export function parseNameList(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter((line) => line.length > 0)
}
