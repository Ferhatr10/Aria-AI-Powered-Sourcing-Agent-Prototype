import { API_BASE_URL } from "@/lib/api-config"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL

    try {
        const formData = await request.formData()
        const file = formData.get("file")

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        const backendFormData = new FormData()
        backendFormData.append("file", file)

        const response = await fetch(`${API_URL}/ingest-file`, {
            method: "POST",
            body: backendFormData,
        })

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json(
                { error: `Backend error: ${errorText}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error("File ingestion proxy error:", error)
        return NextResponse.json(
            { error: "Failed to ingest file" },
            { status: 500 }
        )
    }
}
