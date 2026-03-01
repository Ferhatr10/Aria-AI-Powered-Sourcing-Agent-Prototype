"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import type { Supplier } from "@/lib/types"

interface MapComponentProps {
    suppliers: Supplier[]
    centerCity?: string
    radiusKm?: number
    centerCoords?: [number, number]
}

function MapResizer({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
    const map = useMap()
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] })
        }
    }, [bounds, map])
    return null
}

export default function MapComponent({ suppliers, centerCoords, radiusKm }: MapComponentProps) {
    const validSuppliers = Array.isArray(suppliers)
        ? suppliers.filter(s => s.lat != null && s.lng != null)
        : []

    const bounds = validSuppliers.length > 0
        ? L.latLngBounds(validSuppliers.map(s => [s.lat!, s.lng!] as [number, number]))
        : null

    const getMarkerColor = (suitability: number) => {
        if (suitability >= 0.8) return "#22c55e" // Green
        if (suitability >= 0.5) return "#f97316" // Orange
        return "#ef4444" // Red
    }

    // Default center if none provided (e.g. Europe)
    const defaultCenter: [number, number] = [48.8566, 2.3522]

    return (
        <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
            <MapContainer
                center={centerCoords || defaultCenter}
                zoom={4}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {centerCoords && radiusKm && (
                    <Circle
                        center={centerCoords}
                        radius={radiusKm * 1000}
                        pathOptions={{ color: '#3b82f6', dashArray: '5, 10', fillOpacity: 0.1 }}
                    />
                )}

                {validSuppliers.map((supplier) => (
                    <CircleMarker
                        key={supplier.supplier_id}
                        center={[supplier.lat!, supplier.lng!]}
                        radius={10}
                        pathOptions={{
                            fillColor: getMarkerColor(supplier.scores.total_suitability),
                            color: 'white',
                            weight: 2,
                            fillOpacity: 0.8
                        }}
                    >
                        <Popup className="supplier-popup">
                            <div className="p-1">
                                <p className="font-bold text-slate-900 border-b pb-1 mb-2">{supplier.name}</p>
                                <div className="space-y-1 text-xs text-slate-600">
                                    <p>📍 {supplier.city}, {supplier.country}</p>
                                    {supplier.distance_km && (
                                        <p>📏 {Math.round(supplier.distance_km)} km away</p>
                                    )}
                                    <p>⭐ Rating: {supplier.rating}/5</p>
                                    <div className="pt-2">
                                        <p className="font-semibold text-slate-800">
                                            Suitability: <span className="text-blue-600">{(supplier.scores.total_suitability * 100).toFixed(1)}%</span>
                                        </p>
                                    </div>
                                    {supplier.certifications.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {supplier.certifications.map(c => (
                                                <span key={c} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}

                <MapResizer bounds={bounds} />
            </MapContainer>
        </div>
    )
}
