import type { Metadata } from "next"
// The script fonts for typed signatures, so a design made here looks the same everywhere.
import "./bulk/fonts.css"

export const metadata: Metadata = {
    title: "Issue a Certificate - CertiFoolProof",
    description:
        "Design a certificate and issue it with a unique ID and a QR code that leads to its verification page.",
}

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
