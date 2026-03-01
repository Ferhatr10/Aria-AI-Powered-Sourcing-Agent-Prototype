"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { FileUploader } from "@/components/file-uploader"
import { RequirementCard } from "@/components/requirement-card"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Plus } from "lucide-react"
import type { ExtractedRequirement } from "@/lib/types"

export default function UploadPage() {
    const router = useRouter()
    const [phase, setPhase] = useState<"idle" | "analyzing" | "results" | "error">("idle")
    const [requirements, setRequirements] = useState<ExtractedRequirement[]>([])
    const [errorMessage, setErrorMessage] = useState("")

    const handleAnalysisComplete = (extractedRequirements: ExtractedRequirement[]) => {
        setRequirements(extractedRequirements)
        setPhase("results")
    }

    const handleValueChange = (id: string, newValue: string) => {
        setRequirements(prev => prev.map(req =>
            req.id === id ? { ...req, value: newValue } : req
        ))
    }

    const handleRemoveRequirement = (id: string) => {
        setRequirements(prev => prev.filter(req => req.id !== id))
    }

    const handleAddRequirement = () => {
        const newId = `manual-${Date.now()}`
        setRequirements(prev => [
            { id: newId, label: "Manual Requirement", value: "", confidence: 100 },
            ...prev
        ])
    }

    const handleFindSuppliers = () => {
        localStorage.setItem("aria_requirements", JSON.stringify(requirements))
        router.push("/search")
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="mx-auto max-w-5xl px-6 py-12">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">RFQ Analysis</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Upload your document and let AI extract the key requirements for you.
                    </p>
                </div>

                <div className="flex flex-col gap-8">
                    <FileUploader
                        onAnalyzing={() => setPhase("analyzing")}
                        onComplete={handleAnalysisComplete}
                        onError={(msg: string) => {
                            setErrorMessage(msg)
                            setPhase("error")
                        }}
                    />

                    {phase === "analyzing" && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="mt-4 text-muted-foreground animate-pulse font-medium">
                                Analyzing document with Local AI...
                            </p>
                        </div>
                    )}

                    {phase === "error" && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
                            <p className="font-semibold">Analysis Failed</p>
                            <p className="mt-1 text-sm">{errorMessage}</p>
                        </div>
                    )}

                    {phase === "results" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                    Extracted Requirements
                                </h2>
                                <div className="flex gap-3">
                                    <Button variant="outline" size="sm" onClick={handleAddRequirement} className="gap-2">
                                        <Plus className="h-4 w-4" /> Add Field
                                    </Button>
                                    <Button size="sm" onClick={handleFindSuppliers} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 px-6">
                                        <Search className="h-4 w-4" /> Find Suppliers
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {requirements.map((req) => (
                                    <RequirementCard
                                        key={req.id}
                                        requirement={req}
                                        onValueChange={handleValueChange}
                                        onRemove={handleRemoveRequirement}
                                    />
                                ))}
                            </div>

                            {requirements.length === 0 && (
                                <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center">
                                    <p className="text-muted-foreground font-medium">No requirements extracted yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
