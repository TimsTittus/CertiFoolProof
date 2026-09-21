/** Minimal ZIP writer using the STORE method; PNG/JPEG payloads are already compressed. */
export interface ZipEntry {
    name: string
    data: Uint8Array
}

let crcTable: Uint32Array | null = null

function getCrcTable(): Uint32Array {
    if (crcTable) return crcTable
    const table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
        let c = i
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        }
        table[i] = c >>> 0
    }
    crcTable = table
    return table
}

export function crc32(data: Uint8Array): number {
    const table = getCrcTable()
    let crc = 0xffffffff
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
}

/** ZIP stores timestamps in legacy MS-DOS format. */
function toDosTime(date: Date): { time: number; date: number } {
    const year = date.getFullYear()
    // DOS epoch starts at 1980 and cannot represent anything before it.
    const dosYear = Math.max(0, Math.min(127, year - 1980))
    return {
        time:
            (date.getHours() << 11) |
            (date.getMinutes() << 5) |
            (Math.floor(date.getSeconds() / 2) & 0x1f),
        date: (dosYear << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    }
}

/** Hard ceiling imposed by the 16-bit entry counters in the ZIP end-of-central-directory record. */
export const ZIP_MAX_ENTRIES = 65535

/** Builds the archive as a Blob, avoiding one contiguous buffer for the whole archive. */
export function createZip(entries: ZipEntry[], modifiedAt: Date = new Date()): Blob {
    if (entries.length > ZIP_MAX_ENTRIES) {
        throw new Error(`A single ZIP archive can hold at most ${ZIP_MAX_ENTRIES} files.`)
    }

    const encoder = new TextEncoder()
    const { time: dosTime, date: dosDate } = toDosTime(modifiedAt)

    const fileChunks: Uint8Array[] = []
    const centralChunks: Uint8Array[] = []
    let offset = 0
    let centralSize = 0

    for (const entry of entries) {
        const nameBytes = encoder.encode(entry.name)
        const size = entry.data.length
        const crc = crc32(entry.data)

        // --- Local file header (30 bytes + name) ---
        const local = new Uint8Array(30 + nameBytes.length)
        const localView = new DataView(local.buffer)
        localView.setUint32(0, 0x04034b50, true) // signature
        localView.setUint16(4, 20, true) // version needed
        localView.setUint16(6, 0x0800, true) // flags: UTF-8 file names
        localView.setUint16(8, 0, true) // method: store
        localView.setUint16(10, dosTime, true)
        localView.setUint16(12, dosDate, true)
        localView.setUint32(14, crc, true)
        localView.setUint32(18, size, true) // compressed size
        localView.setUint32(22, size, true) // uncompressed size
        localView.setUint16(26, nameBytes.length, true)
        localView.setUint16(28, 0, true) // extra field length
        local.set(nameBytes, 30)

        fileChunks.push(local, entry.data)

        // --- Central directory header (46 bytes + name) ---
        const central = new Uint8Array(46 + nameBytes.length)
        const centralView = new DataView(central.buffer)
        centralView.setUint32(0, 0x02014b50, true) // signature
        centralView.setUint16(4, 20, true) // version made by
        centralView.setUint16(6, 20, true) // version needed
        centralView.setUint16(8, 0x0800, true) // flags: UTF-8 file names
        centralView.setUint16(10, 0, true) // method: store
        centralView.setUint16(12, dosTime, true)
        centralView.setUint16(14, dosDate, true)
        centralView.setUint32(16, crc, true)
        centralView.setUint32(20, size, true)
        centralView.setUint32(24, size, true)
        centralView.setUint16(28, nameBytes.length, true)
        centralView.setUint16(30, 0, true) // extra field length
        centralView.setUint16(32, 0, true) // comment length
        centralView.setUint16(34, 0, true) // disk number start
        centralView.setUint16(36, 0, true) // internal attributes
        centralView.setUint32(38, 0, true) // external attributes
        centralView.setUint32(42, offset, true) // local header offset
        central.set(nameBytes, 46)

        centralChunks.push(central)
        centralSize += central.length
        offset += local.length + size
    }

    // --- End of central directory record ---
    const eocd = new Uint8Array(22)
    const eocdView = new DataView(eocd.buffer)
    eocdView.setUint32(0, 0x06054b50, true) // signature
    eocdView.setUint16(4, 0, true) // this disk
    eocdView.setUint16(6, 0, true) // disk with central directory
    eocdView.setUint16(8, entries.length, true) // entries on this disk
    eocdView.setUint16(10, entries.length, true) // total entries
    eocdView.setUint32(12, centralSize, true)
    eocdView.setUint32(16, offset, true) // central directory offset
    eocdView.setUint16(20, 0, true) // comment length

    return new Blob([...fileChunks, ...centralChunks, eocd], { type: "application/zip" })
}