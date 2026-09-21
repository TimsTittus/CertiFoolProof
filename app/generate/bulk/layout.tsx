import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Bulk Certificate Generator - CertiFoolProof",
    description:
        "Upload a CSV of participant names and download personalised certificates for everyone as a single ZIP. Free, no sign-up, runs entirely in your browser.",
}

export default function BulkLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}