"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
    Upload,
    Database,
    FileJson,
    FileSpreadsheet,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Info
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function IngestPage() {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [jsonData, setJsonData] = useState("")
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
    const [isResetting, setIsResetting] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setMessage(null)
        }
    }

    const handleFileUpload = async () => {
        if (!file) return
        setIsUploading(true)
        setMessage(null)

        const formData = new FormData()
        formData.append("file", file)

        try {
            const response = await fetch("/api/ingest/file", {
                method: "POST",
                body: formData,
            })
            const data = await response.json()
            if (response.ok) {
                setMessage({ type: "success", text: data.message || "File uploaded successfully!" })
                setFile(null)
            } else {
                setMessage({ type: "error", text: data.error || "Upload failed" })
            }
        } catch (err) {
            setMessage({ type: "error", text: "Network error occurred" })
        } finally {
            setIsUploading(false)
        }
    }

    const handleDataIngest = async () => {
        if (!jsonData.trim()) return
        setIsUploading(true)
        setMessage(null)

        try {
            let parsedData
            try {
                parsedData = JSON.parse(jsonData)
            } catch (e) {
                setMessage({ type: "error", text: "Invalid JSON format" })
                setIsUploading(false)
                return
            }

            const response = await fetch("/api/ingest/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Array.isArray(parsedData) ? parsedData : [parsedData]),
            })
            const data = await response.json()
            if (response.ok) {
                setMessage({ type: "success", text: data.message || "Data ingested successfully!" })
                setJsonData("")
            } else {
                setMessage({ type: "error", text: data.error || "Ingestion failed" })
            }
        } catch (err) {
            setMessage({ type: "error", text: "Network error occurred" })
        } finally {
            setIsUploading(false)
        }
    }

    const handleResetDb = async () => {
        if (!confirm("Are you sure you want to delete ALL supplier data? This cannot be undone.")) return
        setIsResetting(true)
        setMessage(null)

        try {
            const response = await fetch("/api/ingest/reset", { method: "POST" })
            const data = await response.json()
            if (response.ok) {
                setMessage({ type: "success", text: "Database has been reset successfully." })
            } else {
                setMessage({ type: "error", text: data.error || "Reset failed" })
            }
        } catch (err) {
            setMessage({ type: "error", text: "Network error occurred" })
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-4xl mx-auto p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">Data Management</h1>
                        <p className="text-muted-foreground font-medium">Populate and maintain your supplier intelligence database</p>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="font-bold gap-2"
                        onClick={handleResetDb}
                        disabled={isResetting}
                    >
                        {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Reset Database
                    </Button>
                </div>

                {message && (
                    <div className={cn(
                        "mb-6 p-4 rounded-xl flex items-center gap-3 border shadow-sm animate-in fade-in slide-in-from-top-2",
                        message.type === "success" ? "bg-success/10 border-success/20 text-success" : "bg-destructive/10 border-destructive/20 text-destructive"
                    )}>
                        {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <span className="text-sm font-bold tracking-tight">{message.text}</span>
                    </div>
                )}

                <Tabs defaultValue="file" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted/30 rounded-2xl border border-border">
                        <TabsTrigger value="file" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold uppercase text-xs tracking-widest gap-2">
                            <Upload className="h-4 w-4" /> File Upload
                        </TabsTrigger>
                        <TabsTrigger value="raw" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold uppercase text-xs tracking-widest gap-2">
                            <FileJson className="h-4 w-4" /> Raw JSON
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="file">
                        <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden">
                            <CardHeader className="bg-muted/30 pb-4">
                                <CardTitle className="text-xl font-bold">Upload Source Data</CardTitle>
                                <CardDescription>Support for CSV, JSON, and SQLite (.db) files</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-6">
                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
                                        file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
                                    )}
                                    onClick={() => document.getElementById("file-upload")?.click()}
                                >
                                    <input
                                        id="file-upload"
                                        type="file"
                                        className="hidden"
                                        accept=".csv,.json,.db,.sqlite,.sqlite3"
                                        onChange={handleFileChange}
                                    />
                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                        <Upload className="h-8 w-8 text-primary" />
                                    </div>
                                    {file ? (
                                        <div className="text-center">
                                            <p className="font-bold text-lg">{file.name}</p>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to ingest
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className="font-bold">Click or drag & drop to upload</p>
                                            <p className="text-xs text-muted-foreground mt-1">CSV, JSON, or SQLite database files</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3">
                                        <FileSpreadsheet className="h-8 w-8 text-blue-500/50" />
                                        <div className="text-[10px] font-bold uppercase tracking-tighter">CSV Data</div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3">
                                        <FileJson className="h-8 w-8 text-yellow-500/50" />
                                        <div className="text-[10px] font-bold uppercase tracking-tighter">JSON Array</div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3">
                                        <Database className="h-8 w-8 text-purple-500/50" />
                                        <div className="text-[10px] font-bold uppercase tracking-tighter">SQLite DB</div>
                                    </div>
                                </div>

                                <Button
                                    className="w-full font-bold h-14 rounded-2xl shadow-lg shadow-primary/20 text-lg"
                                    onClick={handleFileUpload}
                                    disabled={!file || isUploading}
                                >
                                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Database className="h-5 w-5 mr-3" />}
                                    Ingest File into Database
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="raw">
                        <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden">
                            <CardHeader className="bg-muted/30 pb-4">
                                <CardTitle className="text-xl font-bold">Direct JSON Ingestion</CardTitle>
                                <CardDescription>Paste raw supplier objects or arrays directly</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">JSON Payload</Label>
                                    <Textarea
                                        placeholder='[{"company_name": "Example Corp", "capabilities": ["CNC"], "city": "Berlin"}]'
                                        className="min-h-[300px] font-mono text-sm p-6 rounded-2xl border-border/50 bg-muted/20 focus:ring-primary h-[400px]"
                                        value={jsonData}
                                        onChange={(e) => setJsonData(e.target.value)}
                                    />
                                </div>

                                <div className="p-4 bg-muted/50 rounded-2xl border border-border flex gap-3">
                                    <Info className="h-5 w-5 text-primary shrink-0" />
                                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                        Ensure your data matches the expected schema: <code className="text-primary font-bold">supplier_id, company_name, city, country, capabilities, materials, certifications, rating, lat, lng</code>.
                                    </p>
                                </div>

                                <Button
                                    className="w-full font-bold h-14 rounded-2xl shadow-lg shadow-primary/20 text-lg"
                                    onClick={handleDataIngest}
                                    disabled={!jsonData.trim() || isUploading}
                                >
                                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-3" />}
                                    Ingest Records
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="mt-12 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Aria Intelligence Data Management System © 2026</p>
                </div>
            </main>
        </div>
    )
}
