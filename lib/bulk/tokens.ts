/**
 * Recipients and the `{token}` placeholders that personalise one certificate.
 *
 * Every text element may contain tokens such as `{name}`, `{course}` or `{index}`.
 * They are filled from the columns of the uploaded list, so one design can carry
 * different data on every certificate. A token nobody can fill is left as it is,
 * so it stays visible in the preview instead of quietly printing a blank.
 */

/** Tokens are matched loosely; the key is normalised before it is looked up. */
const TOKEN_PATTERN = /\{\s*([A-Za-z0-9 _.\-/]{1,60})\s*\}/g

/** Placeholder keys are compared without case, spaces or punctuation: "Course Name" and "{course name}" match. */
export function normalizeFieldKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

/** A per-recipient tweak of the participant name, relative to where the design puts it. */
export interface NameNudge {
    /** Percent of the canvas width, added to the name's position. */
    dx: number
    /** Percent of the canvas height, added to the name's position. */
    dy: number
    /** Multiplies the name's font size. 1 leaves it alone. */
    scale: number
}

export const NAME_NUDGE_ZERO: NameNudge = { dx: 0, dy: 0, scale: 1 }

export function isNudged(nudge: NameNudge | undefined): boolean {
    if (!nudge) return false
    return nudge.dx !== 0 || nudge.dy !== 0 || nudge.scale !== 1
}

/** One certificate's worth of data. */
export interface Recipient {
    /** The participant's name, as it is drawn and used for the file name. */
    name: string
    /** Every column of the list, keyed by its normalised header. Always holds `name` and `index`. */
    fields: Record<string, string>
    /** Wording that replaces an element's own text, for this recipient only. Keyed by element id. */
    overrides?: Record<string, string>
    /** A manual nudge of the participant name, for this recipient only. */
    nudge?: NameNudge
}

export function createRecipient(name: string, index: number, fields: Record<string, string> = {}): Recipient {
    return {
        name,
        fields: { ...fields, name, index: String(index) },
    }
}

/** Replaces every token that has a value. Unknown tokens are left untouched so they stay visible. */
export function fillTokens(text: string, recipient: Recipient): string {
    if (!text || text.indexOf("{") === -1) return text
    return text.replace(TOKEN_PATTERN, (match, key: string) => {
        const value = recipient.fields[normalizeFieldKey(key)]
        return value === undefined ? match : value
    })
}

/** Drops every token, filled or not. Used where leftovers would be noise, such as file names. */
export function stripTokens(text: string): string {
    return text.replace(TOKEN_PATTERN, "")
}

/** The distinct normalised keys used in a piece of text, in the order they appear. */
export function findTokens(text: string): string[] {
    if (!text || text.indexOf("{") === -1) return []
    const keys: string[] = []
    for (const match of text.matchAll(TOKEN_PATTERN)) {
        const key = normalizeFieldKey(match[1])
        if (key && !keys.includes(key)) keys.push(key)
    }
    return keys
}
