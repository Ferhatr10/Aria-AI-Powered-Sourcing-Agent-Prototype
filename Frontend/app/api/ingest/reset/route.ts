import { API_BASE_URL } from "@/lib/api-config"
import { NextResponse } from "next/server"

export async function POST() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL

    try {
        const response = await fetch(`${API_URL}/reset-db`, {
            method: "POST",
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
        console.error("Reset database proxy error:", error)
        return NextResponse.json(
            { error: "Failed to reset database" },
            { status: 500 }
        )
    }
}
