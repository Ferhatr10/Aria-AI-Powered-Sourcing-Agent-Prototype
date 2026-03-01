"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"

export function AnalysisLoading() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(timer)
          return 95
        }
        return prev + Math.random() * 15
      })
    }, 200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="mb-2 text-sm font-medium text-foreground">
          Analyzing document...
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Extracting structured requirements using AI
        </p>
        <Progress value={progress} className="mx-auto h-2 max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
