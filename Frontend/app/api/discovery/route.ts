import { API_BASE_URL } from "@/lib/api-config"
import { NextResponse } from "next/server"

export interface DiscoveryRequestBody {
  query: string
  certifications?: string[]
  regulatory?: string[]
  countries?: string[]
  near_city?: string
  radius_km?: number
  strict_mode?: boolean
  top_k?: number
}

export async function POST(request: Request) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL

  try {
    const body: DiscoveryRequestBody = await request.json()

    if (!body.query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      )
    }

    const response = await fetch(`${API_URL}/discovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: body.query,
        certifications: body.certifications || [],
        regulatory: body.regulatory || [],
        countries: body.countries || [],
        near_city: body.near_city,
        radius_km: body.radius_km,
        strict_mode: body.strict_mode ?? true,
        top_k: body.top_k || 10,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Upstream error: ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Discovery proxy error:", error)
    return NextResponse.json(
      { error: "Failed to search suppliers" },
      { status: 500 }
    )
  }
}
