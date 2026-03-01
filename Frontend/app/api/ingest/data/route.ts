import { API_BASE_URL } from "@/lib/api-config"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL

    try {
        const body = await request.json()

        const response = await fetch(`${API_URL}/ingest-data`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
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
        console.error("Data ingestion proxy error:", error)
        return NextResponse.json(
            { error: "Failed to ingest data" },
            { status: 500 }
        )
    }
}
