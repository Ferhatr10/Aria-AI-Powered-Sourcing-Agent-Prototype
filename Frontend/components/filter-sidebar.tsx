"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronDown, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"

const certificationOptions = [
  "ISO 9001",
  "ISO 14001",
  "IATF 16949",
  "ISO 45001",
  "AS9100",
  "ISO 13485",
  "NADCAP",
]

const regulatoryOptions = [
  "RoHS",
  "REACH",
  "TSCA",
  "UL",
  "VDA 6.3",
  "CE",
]

export interface FiltersState {
  certifications: string[]
  regulatory: string[]
  strict_mode: boolean
  top_k: number
}

interface FilterSidebarProps {
  filters: FiltersState
  onFiltersChange: (filters: FiltersState) => void
  onApply: () => void
  isLoading?: boolean
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/40",
              selected.length > 0 ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selected.length > 0
                ? `${selected.length} selected`
                : `Select ${label.toLowerCase()}`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selected, option])
                    } else {
                      onChange(selected.filter((s) => s !== option))
                    }
                  }}
                />
                <span className="text-foreground">{option}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              {item}
              <button
                onClick={() => onChange(selected.filter((s) => s !== item))}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function FilterSidebar({ filters, onFiltersChange, onApply, isLoading }: FilterSidebarProps) {
  const handleCertChange = useCallback(
    (certifications: string[]) => {
      onFiltersChange({ ...filters, certifications })
    },
    [filters, onFiltersChange]
  )

  const handleRegulatoryChange = useCallback(
    (regulatory: string[]) => {
      onFiltersChange({ ...filters, regulatory })
    },
    [filters, onFiltersChange]
  )

  return (
    <aside className="flex h-fit w-full shrink-0 flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm lg:w-72">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
      </div>

      <MultiSelectDropdown
        label="Certifications"
        options={certificationOptions}
        selected={filters.certifications}
        onChange={handleCertChange}
      />

      <MultiSelectDropdown
        label="Regulatory Compliance"
        options={regulatoryOptions}
        selected={filters.regulatory}
        onChange={handleRegulatoryChange}
      />

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Results Count</Label>
        <Input
          type="number"
          min={1}
          max={50}
          placeholder="10"
          value={filters.top_k || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, top_k: parseInt(e.target.value) || 10 })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="strict-mode" className="text-sm font-medium text-foreground">
          Strict Mode
        </Label>
        <Switch
          id="strict-mode"
          checked={filters.strict_mode}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, strict_mode: checked })
          }
        />
      </div>

      <Button
        onClick={onApply}
        disabled={isLoading}
        className="w-full rounded-lg font-medium"
      >
        {isLoading ? "Searching..." : "Apply Filters"}
      </Button>
    </aside>
  )
}
