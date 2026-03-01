"use client"

import { useState, useCallback } from "react"
import { Upload, X, FileText } from "lucide-react"
import { API_BASE_URL } from "@/lib/api-config"
import type { ExtractedRequirement } from "@/lib/types"

interface FileUploaderProps {
    onAnalyzing: () => void
    onComplete: (requirements: ExtractedRequirement[]) => void
    onError: (message: string) => void
}

export function FileUploader({ onAnalyzing, onComplete, onError }: FileUploaderProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleFile = (selectedFile: File) => {
        const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
        if (!validTypes.includes(selectedFile.type)) {
            alert("Invalid file type. Please upload PDF, DOCX, or TXT.")
            return
        }
        setFile(selectedFile)
        startAnalysis(selectedFile)
    }

    const startAnalysis = async (fileToAnalyze: File) => {
        onAnalyzing()
        const formData = new FormData()
        formData.append("file", fileToAnalyze)

        try {
            // Direct call to proxy or backend?
            // Existing app/api/extract-pdf/route.ts proxies to backend
            const response = await fetch("/api/extract-pdf", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                throw new Error("Failed to analyze document")
            }

            const rawResponse = await response.json()
            const data = rawResponse.data || rawResponse

            // Flatten nested schema for UI (Reuse logic from previous handleAnalyze)
            const reqs: ExtractedRequirement[] = []
            let reqIdCounter = 0

            const flattenObject = (obj: any, prefix = "") => {
                if (!obj || typeof obj !== "object") return
                Object.entries(obj).forEach(([key, val]) => {
                    const label = prefix
                        ? `${prefix}: ${key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`
                        : key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                    if (val === null || val === undefined) return
                    if (typeof val === "object" && !Array.isArray(val) && (val as any).value !== undefined) {
                        const v = val as any
                        const displayValue = Array.isArray(v.value) ? v.value.join(", ") : String(v.value)
                        reqs.push({
                            id: `req-${reqIdCounter++}`,
                            label,
                            value: displayValue,
                            confidence: typeof v.confidence === "number" ? v.confidence : 100
                        })
                        return
                    }
                    if (typeof val === "object" && !Array.isArray(val)) {
                        flattenObject(val, label)
                    } else {
                        let displayValue = ""
                        if (Array.isArray(val)) {
                            displayValue = val.every(v => typeof v === "string") ? val.join(", ") : JSON.stringify(val)
                        } else {
                            displayValue = String(val)
                        }
                        reqs.push({
                            id: `req-${reqIdCounter++}`,
                            label,
                            value: displayValue,
                            confidence: 100 // Synthesis results often don't have per-field confidence
                        })
                    }
                })
            }

            const skipKeys = ["success", "error", "status", "message", "filename", "elapsed_seconds"]
            const filteredData: Record<string, any> = {}
            Object.entries(data).forEach(([key, val]) => {
                if (!skipKeys.includes(key)) filteredData[key] = val
            })

            flattenObject(filteredData)
            onComplete(reqs)
        } catch (err: any) {
            onError(err.message)
        }
    }

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) handleFile(droppedFile)
    }, [])

    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all cursor-pointer shadow-sm
        ${isDragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-muted-foreground/30"}`}
            onClick={() => document.getElementById("fileInput")?.click()}
        >
            <input
                id="fileInput"
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                accept=".pdf,.docx,.txt"
            />
            <div className="rounded-full bg-primary/10 p-4 text-primary mb-4 shadow-sm">
                <Upload className="h-8 w-8" />
            </div>
            <p className="text-xl font-medium text-foreground">
                Drop your RFQ here
            </p>
            <p className="mt-2 text-muted-foreground">
                or <span className="text-primary hover:underline">browse files</span>
            </p>
            <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                PDF, DOCX, TXT UP TO 20MB
            </p>
        </div>
    )
}
