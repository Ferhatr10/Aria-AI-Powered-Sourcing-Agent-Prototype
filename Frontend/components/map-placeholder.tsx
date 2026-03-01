"use client"

import { MapPin } from "lucide-react"

interface MapPlaceholderProps {
  supplierCount: number
}

const pinPositions = [
  { top: "20%", left: "25%", label: "Munich" },
  { top: "35%", left: "72%", label: "Tokyo" },
  { top: "45%", left: "80%", label: "Seoul" },
  { top: "50%", left: "76%", label: "Shanghai" },
  { top: "30%", left: "15%", label: "Detroit" },
  { top: "55%", left: "68%", label: "Taipei" },
  { top: "60%", left: "65%", label: "Chennai" },
  { top: "65%", left: "35%", label: "Monterrey" },
  { top: "25%", left: "30%", label: "Stuttgart" },
  { top: "40%", left: "78%", label: "Osaka" },
  { top: "38%", left: "70%", label: "Nagoya" },
  { top: "48%", left: "73%", label: "Shenzhen" },
]

export function MapPlaceholder({ supplierCount }: MapPlaceholderProps) {
  return (
    <div className="relative flex h-96 items-center justify-center overflow-hidden rounded-xl border border-border bg-accent/50 shadow-sm">
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Supplier pins */}
      {pinPositions.slice(0, supplierCount).map((pin, i) => (
        <div
          key={i}
          className="group absolute flex flex-col items-center"
          style={{ top: pin.top, left: pin.left }}
        >
          <div className="relative">
            <div className="absolute -inset-2 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary shadow-md">
              <MapPin className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          </div>
          <span className="mt-1.5 rounded-md bg-card/90 px-2 py-0.5 text-[10px] font-medium text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
            {pin.label}
          </span>
        </div>
      ))}

      {/* Center label */}
      <div className="relative rounded-xl border border-border bg-card/90 px-6 py-4 text-center shadow-lg backdrop-blur-sm">
        <div className="mb-1 text-2xl font-bold tabular-nums text-foreground">
          {supplierCount}
        </div>
        <div className="text-xs text-muted-foreground">
          Suppliers pinned on map
        </div>
      </div>
    </div>
  )
}
