// Types matching the real API responses

export interface ExtractedRequirement {
  id: string
  label: string
  value: string
  confidence?: number
}

export interface SupplierScores {
  vector_similarity: number
  match_bonus: number
  total_suitability: number
}

export interface Supplier {
  supplier_id: string
  name: string
  country: string
  city: string
  lat: number | null
  lng: number | null
  certifications: string[]
  regulatory_compliance: string[]
  materials: string[]
  rating: number
  description_preview: string
  distance_km?: number | null
  scores: SupplierScores
}

export interface DiscoveryResponse {
  success: boolean
  results: Supplier[]
  center_coords?: [number, number] | null
}

export interface DiscoveryRequest {
  query: string
  certifications?: string[]
  regulatory?: string[]
  countries?: string[]
  near_city?: string
  radius_km?: number
  strict_mode?: boolean
  top_k?: number
}
