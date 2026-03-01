"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FileText, Trash2 } from "lucide-react"
import type { ExtractedRequirement } from "@/lib/types"

interface RequirementCardProps {
  requirement: ExtractedRequirement
  onValueChange?: (id: string, newValue: string) => void
  onRemove?: (id: string) => void
}

export function RequirementCard({ requirement, onValueChange, onRemove }: RequirementCardProps) {
  const [value, setValue] = useState(requirement.value)

  const handleChange = (newValue: string) => {
    setValue(newValue)
    onValueChange?.(requirement.id, newValue)
  }

  const isLongValue = requirement.value.length > 100

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-success text-success-foreground"
    if (score >= 50) return "bg-primary text-primary-foreground"
    return "bg-destructive text-destructive-foreground"
  }

  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {requirement.confidence !== undefined && (
          <Badge className={`${getConfidenceColor(requirement.confidence)} border-0 text-[11px] font-semibold`}>
            {requirement.confidence}%
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove?.(requirement.id)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-3 pr-20">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <Label
          htmlFor={requirement.id}
          className="text-sm font-medium text-muted-foreground"
        >
          {requirement.label}
        </Label>
      </div>

      {isLongValue ? (
        <Textarea
          id={requirement.id}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          rows={3}
          className="border-border bg-background text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      ) : (
        <Input
          id={requirement.id}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="border-border bg-background text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      )}
    </div>
  )
}
