"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Building2,
    MapPin,
    Star,
    ShieldCheck,
    Check,
    Search,
    List,
    Filter,
    Globe,
    ChevronDown,
    Plus,
    X,
    ArrowUpDown,
    ExternalLink,
    Loader2
} from "lucide-react"
import dynamic from "next/dynamic"
import type { Supplier, ExtractedRequirement } from "@/lib/types"
import { cn } from "@/lib/utils"

const MapComponent = dynamic(() => import("@/components/map-component"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center rounded-xl">Loading Map...</div>
})

interface Metadata {
    countries: string[]
    cities: string[]
    certifications: string[]
    regulatory: string[]
}

export default function SearchPage() {
    const [requirements, setRequirements] = useState<ExtractedRequirement[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [view, setView] = useState<"list" | "map">("list")
    const [centerCoords, setCenterCoords] = useState<[number, number] | undefined>(undefined)

    // Metadata from DB
    const [metadata, setMetadata] = useState<Metadata>({
        countries: [],
        cities: [],
        certifications: [],
        regulatory: []
    })

    // Selected Filters
    const [selectedCerts, setSelectedCerts] = useState<string[]>([])
    const [selectedRegs, setSelectedRegs] = useState<string[]>([])
    const [selectedCountries, setSelectedCountries] = useState<string[]>([])
    const [city, setCity] = useState("")
    const [radius, setRadius] = useState([500])
    const [strictMode, setStrictMode] = useState(true)
    const [topK, setTopK] = useState(10)
    const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")
    const [geoError, setGeoError] = useState<string | null>(null)

    // Manual Entry States
    const [manualCountry, setManualCountry] = useState("")
    const [manualCert, setManualCert] = useState("")
    const [manualReg, setManualReg] = useState("")

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: "distance" | "suitability", direction: "asc" | "desc" }>({
        key: "suitability",
        direction: "desc"
    })

    // Fetch initial data
    useEffect(() => {
        const saved = localStorage.getItem("aria_requirements")
        if (saved) {
            setRequirements(JSON.parse(saved))
        }

        fetch("/api/metadata")
            .then(res => {
                if (!res.ok) throw new Error("Offline")
                return res.json()
            })
            .then(data => {
                if (data.success) {
                    setMetadata({
                        countries: data.countries || [],
                        cities: data.cities || [],
                        certifications: data.certifications || [],
                        regulatory: data.regulatory || []
                    })
                    setBackendStatus("online")
                } else {
                    setBackendStatus("offline")
                }
            })
            .catch(err => {
                console.error("Filter metadata fetch failed:", err)
                setBackendStatus("offline")
            })
    }, [])

    // Detect location only when requested
    // Removed automatic handleDetectLocation() from here to prioritize search

    const handleDetectLocation = () => {
        setGeoError(null)
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                        const data = await res.json()
                        const detectedCity = data.address.city || data.address.town || data.address.village
                        if (detectedCity) {
                            setCity(detectedCity)
                        } else {
                            setGeoError("Could not determine city name.")
                        }
                    } catch (err) {
                        console.error("Reverse geocoding failed:", err)
                        setGeoError("Location detected, but city name lookup failed.")
                    }
                },
                (error) => {
                    console.error("Geolocation error code:", error.code, "message:", error.message)
                    let msg = "Unknown location error"
                    if (error.code === 1) msg = "Location permission denied. Please check browser settings."
                    else if (error.code === 2) msg = "Location unavailable (Signal too weak)."
                    else if (error.code === 3) msg = "Location request timed out. Retrying might help."
                    setGeoError(msg)
                },
                { timeout: 20000, enableHighAccuracy: false }
            )
        } else {
            setGeoError("Geolocation is not supported by your browser.")
        }
    }
    // Memoized sorted suppliers
    const sortedSuppliers = useMemo(() => {
        if (!Array.isArray(suppliers)) {
            console.error("Suppliers is not an array:", suppliers)
            return []
        }
        const items = [...suppliers]
        return items.sort((a, b) => {
            if (sortConfig.key === "distance") {
                const distA = a.distance_km ?? Infinity
                const distB = b.distance_km ?? Infinity
                return sortConfig.direction === "asc" ? distA - distB : distB - distA
            }
            if (sortConfig.key === "suitability") {
                const scoreA = a.scores?.total_suitability ?? 0
                const scoreB = b.scores?.total_suitability ?? 0
                return sortConfig.direction === "desc" ? scoreB - scoreA : scoreA - scoreB
            }
            return 0
        })
    }, [suppliers, sortConfig])

    const handleSort = (key: "distance" | "suitability") => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
        }))
    }

    const handleSearch = useCallback(async () => {
        setIsLoading(true)
        const query = Array.isArray(requirements)
            ? requirements.filter(r => r && r.value).map(r => r.value).join(". ")
            : ""

        try {
            const response = await fetch("/api/discovery", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    certifications: selectedCerts,
                    regulatory: selectedRegs,
                    countries: selectedCountries,
                    near_city: city,
                    radius_km: radius[0],
                    strict_mode: strictMode,
                    top_k: topK
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || "Search failed")
            }
            const data = await response.json()
            console.log("Search Response Data:", data)

            if (data.results && Array.isArray(data.results)) {
                setSuppliers(data.results)
            } else if (data.results && data.results.results && Array.isArray(data.results.results)) {
                // Fallback for nested structure: data.results.results
                console.warn("API returned nested results structure, using fallback.")
                setSuppliers(data.results.results)
                if (data.results.center_coords && !data.center_coords) {
                    setCenterCoords(data.results.center_coords)
                }
            } else {
                console.error("API returned invalid results format (missing array):", data)
                setSuppliers([])
            }

            if (data.center_coords) setCenterCoords(data.center_coords)
        } catch (err) {
            console.error("Search Error:", err)
            setSuppliers([]) // Reset on error to prevent crash
        } finally {
            setIsLoading(false)
        }
    }, [requirements, selectedCerts, selectedRegs, selectedCountries, city, radius, strictMode, topK])

    // Multi-select helper
    const toggleSelection = (list: string[], setList: (v: string[]) => void, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item))
        } else {
            setList([...list, item])
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* Sidebar Filters */}
                <aside className="w-85 border-r border-border bg-card p-6 overflow-y-auto hidden lg:block shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Filter className="h-4 w-4 text-primary" /> Discovery Filters
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5" title={backendStatus === "online" ? "Backend connected" : "Backend unreachable"}>
                                <div className={cn("h-2 w-2 rounded-full",
                                    backendStatus === "online" ? "bg-success animate-pulse" :
                                        backendStatus === "offline" ? "bg-destructive" : "bg-muted")}
                                />
                                <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">{backendStatus}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-muted-foreground uppercase" onClick={() => {
                                setSelectedCerts([])
                                setSelectedRegs([])
                                setSelectedCountries([])
                                setCity("")
                            }}>ClearAll</Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Country Selector */}
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operating Countries</Label>
                            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-lg border border-border bg-background/50 focus-within:ring-1 focus-within:ring-primary transition-all">
                                {selectedCountries.length === 0 && <span className="text-xs text-muted-foreground/50 py-1">Type to add countries...</span>}
                                {selectedCountries.map(c => (
                                    <Badge key={c} variant="secondary" className="gap-1 pl-2 pr-1 h-6 bg-primary/10 text-primary hover:bg-primary/20 border-0 leading-none">
                                        {c}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSelection(selectedCountries, setSelectedCountries, c)} />
                                    </Badge>
                                ))}
                            </div>
                            <div className="relative group/country">
                                <Input
                                    placeholder="Search or add country..."
                                    className="h-9 text-xs bg-background/50 pr-8"
                                    value={manualCountry}
                                    onChange={e => setManualCountry(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && manualCountry.trim()) {
                                            if (!selectedCountries.includes(manualCountry.trim())) {
                                                toggleSelection(selectedCountries, setSelectedCountries, manualCountry.trim())
                                            }
                                            setManualCountry("")
                                        }
                                    }}
                                />
                                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/30 group-focus-within/country:text-primary transition-colors" />

                                {manualCountry && (
                                    <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                        {metadata.countries
                                            .filter(c => c.toLowerCase().includes(manualCountry.toLowerCase()) && !selectedCountries.includes(c))
                                            .map(c => (
                                                <button
                                                    key={c}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-foreground flex items-center justify-between"
                                                    onClick={() => {
                                                        toggleSelection(selectedCountries, setSelectedCountries, c)
                                                        setManualCountry("")
                                                    }}
                                                >
                                                    {c}
                                                    <Plus className="h-3 w-3 opacity-30" />
                                                </button>
                                            ))
                                        }
                                        {!metadata.countries.some(c => c.toLowerCase() === manualCountry.toLowerCase()) && (
                                            <button
                                                className="w-full text-left px-3 py-2 text-xs text-primary font-bold hover:bg-primary/5"
                                                onClick={() => {
                                                    toggleSelection(selectedCountries, setSelectedCountries, manualCountry.trim())
                                                    setManualCountry("")
                                                }}
                                            >
                                                Add "{manualCountry}"
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {backendStatus === "offline" && <p className="text-[9px] text-destructive/70 italic px-1 pt-1 italic">Backend offline. Using manual entry.</p>}
                        </div>

                        {/* Certifications Selector */}
                        <div className="space-y-3 pt-4 border-t border-border">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Technical Certifications</Label>
                            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-lg border border-border bg-background/50 focus-within:ring-1 focus-within:ring-primary transition-all">
                                {selectedCerts.length === 0 && <span className="text-xs text-muted-foreground/50 py-1">Search certifications...</span>}
                                {selectedCerts.map(cert => (
                                    <Badge key={cert} variant="secondary" className="gap-1 pl-2 pr-1 h-6 bg-success/10 text-success hover:bg-success/20 border-0 leading-none">
                                        {cert}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSelection(selectedCerts, setSelectedCerts, cert)} />
                                    </Badge>
                                ))}
                            </div>
                            <div className="relative group/cert">
                                <Input
                                    placeholder="Search or add certification..."
                                    className="h-9 text-xs bg-background/50 pr-8"
                                    value={manualCert}
                                    onChange={e => setManualCert(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && manualCert.trim()) {
                                            if (!selectedCerts.includes(manualCert.trim())) {
                                                toggleSelection(selectedCerts, setSelectedCerts, manualCert.trim())
                                            }
                                            setManualCert("")
                                        }
                                    }}
                                />
                                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/30 group-focus-within/cert:text-primary transition-colors" />

                                {manualCert && (
                                    <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                        {metadata.certifications
                                            .filter(c => c.toLowerCase().includes(manualCert.toLowerCase()) && !selectedCerts.includes(c))
                                            .map(c => (
                                                <button
                                                    key={c}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-foreground flex items-center justify-between"
                                                    onClick={() => {
                                                        toggleSelection(selectedCerts, setSelectedCerts, c)
                                                        setManualCert("")
                                                    }}
                                                >
                                                    {c}
                                                    <Plus className="h-3 w-3 opacity-30" />
                                                </button>
                                            ))
                                        }
                                        {!metadata.certifications.some(c => c.toLowerCase() === manualCert.toLowerCase()) && (
                                            <button
                                                className="w-full text-left px-3 py-2 text-xs text-primary font-bold hover:bg-primary/5"
                                                onClick={() => {
                                                    toggleSelection(selectedCerts, setSelectedCerts, manualCert.trim())
                                                    setManualCert("")
                                                }}
                                            >
                                                Add "{manualCert}"
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Regulatory Selector */}
                        <div className="space-y-3 pt-4 border-t border-border">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Regulatory Compliance</Label>
                            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-lg border border-border bg-background/50 focus-within:ring-1 focus-within:ring-primary transition-all">
                                {selectedRegs.length === 0 && <span className="text-xs text-muted-foreground/50 py-1">Type for regulations...</span>}
                                {selectedRegs.map(reg => (
                                    <Badge key={reg} variant="secondary" className="gap-1 pl-2 pr-1 h-6 bg-warning/10 text-warning hover:bg-warning/20 border-0 leading-none">
                                        {reg}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSelection(selectedRegs, setSelectedRegs, reg)} />
                                    </Badge>
                                ))}
                            </div>
                            <div className="relative group/reg">
                                <Input
                                    placeholder="Search or add regulation..."
                                    className="h-9 text-xs bg-background/50 pr-8"
                                    value={manualReg}
                                    onChange={e => setManualReg(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && manualReg.trim()) {
                                            if (!selectedRegs.includes(manualReg.trim())) {
                                                toggleSelection(selectedRegs, setSelectedRegs, manualReg.trim())
                                            }
                                            setManualReg("")
                                        }
                                    }}
                                />
                                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/30 group-focus-within/reg:text-primary transition-colors" />

                                {manualReg && (
                                    <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                        {metadata.regulatory
                                            .filter(r => r.toLowerCase().includes(manualReg.toLowerCase()) && !selectedRegs.includes(r))
                                            .map(reg => (
                                                <button
                                                    key={reg}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-foreground flex items-center justify-between"
                                                    onClick={() => {
                                                        toggleSelection(selectedRegs, setSelectedRegs, reg)
                                                        setManualReg("")
                                                    }}
                                                >
                                                    {reg}
                                                    <Plus className="h-3 w-3 opacity-30" />
                                                </button>
                                            ))
                                        }
                                        {!metadata.regulatory.some(r => r.toLowerCase() === manualReg.toLowerCase()) && (
                                            <button
                                                className="w-full text-left px-3 py-2 text-xs text-primary font-bold hover:bg-primary/5"
                                                onClick={() => {
                                                    toggleSelection(selectedRegs, setSelectedRegs, manualReg.trim())
                                                    setManualReg("")
                                                }}
                                            >
                                                Add "{manualReg}"
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Proximity */}
                        <div className="space-y-4 pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Geographic Focus</Label>
                                <div className="flex flex-col items-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDetectLocation}
                                        className="h-6 text-[9px] font-black text-primary hover:bg-primary/10 gap-1.5"
                                    >
                                        <MapPin className="h-3 w-3" /> DETECT MY LOCATION
                                    </Button>
                                    {geoError && <span className="text-[8px] text-destructive font-bold uppercase tracking-tighter mt-1">{geoError}</span>}
                                </div>
                            </div>
                            <div className="relative group">
                                <Input
                                    placeholder="Reference City..."
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    className="bg-background border-border pr-8 focus:ring-primary h-10 text-sm"
                                />
                                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />

                                {/* City Suggestions */}
                                {city && !metadata.cities.includes(city) && (
                                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                        {metadata.cities.filter(c => c.toLowerCase().includes(city.toLowerCase())).map(c => (
                                            <button
                                                key={c}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-foreground"
                                                onClick={() => setCity(c)}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 px-1">
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter transition-all">Search Radius</span>
                                    <span className="text-sm font-black text-primary tracking-tight transition-all">{radius[0]} km</span>
                                </div>
                                <Slider
                                    value={radius}
                                    onValueChange={setRadius}
                                    max={5000}
                                    step={50}
                                    className="py-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-border">
                            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold text-foreground">Strict Mode</Label>
                                    <p className="text-[9px] text-muted-foreground leading-none">Discard non-compliant suppliers</p>
                                </div>
                                <Switch checked={strictMode} onCheckedChange={setStrictMode} />
                            </div>
                        </div>

                        <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-7 mt-4 shadow-lg shadow-primary/20 group text-base"
                            onClick={handleSearch}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />}
                            Apply Filters
                        </Button>
                    </div>
                </aside>

                {/* Results Area */}
                <main className="flex-1 p-8 overflow-y-auto bg-background/50">
                    <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">
                                    Discovery Results
                                </h1>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {isLoading ? (
                                        <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Fetching optimized matches...</span>
                                    ) : (
                                        `Found ${suppliers.length} suppliers matching your technical requirements`
                                    )}
                                </p>
                            </div>
                            <TabsList className="bg-card border border-border rounded-xl p-1 shadow-sm">
                                <TabsTrigger value="list" className="gap-2 px-6 py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-xs font-bold uppercase tracking-wider">
                                    <List className="h-3.5 w-3.5" /> List
                                </TabsTrigger>
                                <TabsTrigger value="map" className="gap-2 px-6 py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-xs font-bold uppercase tracking-wider">
                                    <MapPin className="h-3.5 w-3.5" /> Map
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="list" className="mt-0 outline-none">
                            <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="hover:bg-transparent border-border/50">
                                            <TableHead className="w-[80px] text-[10px] font-black uppercase tracking-widest pl-6">ID</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Supplier</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Location</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">
                                                <div
                                                    className={cn(
                                                        "flex items-center gap-1 cursor-pointer transition-colors",
                                                        sortConfig.key === "distance" ? "text-primary" : "hover:text-primary/70"
                                                    )}
                                                    onClick={() => handleSort("distance")}
                                                >
                                                    Distance <ArrowUpDown className={cn("h-3 w-3", sortConfig.key === "distance" && "opacity-100")} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Compliance</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-end gap-1 cursor-pointer transition-colors",
                                                        sortConfig.key === "suitability" ? "text-primary" : "hover:text-primary/70"
                                                    )}
                                                    onClick={() => handleSort("suitability")}
                                                >
                                                    Suitability <ArrowUpDown className={cn("h-3 w-3", sortConfig.key === "suitability" && "opacity-100")} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="w-[50px] pr-6"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedSuppliers.map((supplier) => (
                                            <TableRow key={supplier.supplier_id} className="group hover:bg-muted/20 border-border/50 transition-colors cursor-pointer">
                                                <TableCell className="pl-6 py-4">
                                                    <span className="text-[10px] font-bold text-muted-foreground/60">{supplier.supplier_id}</span>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{supplier.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{supplier.materials && Array.isArray(supplier.materials) ? supplier.materials.slice(0, 2).join(", ") : ""}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                                        <MapPin className="h-3 w-3 text-primary/60" />
                                                        {supplier.city}, {supplier.country}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {(supplier.distance_km !== null && supplier.distance_km !== undefined) ? (
                                                        <Badge variant="outline" className="text-[10px] font-black bg-primary/5 text-primary border-primary/10 h-5">
                                                            {Number(supplier.distance_km) < 1
                                                                ? `${Math.round(Number(supplier.distance_km) * 1000)} M`
                                                                : `${Math.round(Number(supplier.distance_km))} KM`}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground/40 font-bold">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {supplier.certifications?.slice(0, 2).map(c => (
                                                            <div key={c} title={c} className="h-5 w-5 rounded bg-success/10 text-success flex items-center justify-center border border-success/20">
                                                                <Check className="h-3 w-3" />
                                                            </div>
                                                        ))}
                                                        {supplier.regulatory_compliance?.slice(0, 2).map(r => (
                                                            <div key={r} title={r} className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                                                <ShieldCheck className="h-3 w-3" />
                                                            </div>
                                                        ))}
                                                        {(supplier.certifications?.length || 0) + (supplier.regulatory_compliance?.length || 0) > 4 && (
                                                            <span className="text-[9px] font-bold text-muted-foreground">+{(supplier.certifications?.length || 0) + (supplier.regulatory_compliance?.length || 0) - 4}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-4">
                                                    <div className="inline-flex flex-col items-end">
                                                        <span className={cn(
                                                            "text-sm font-black tracking-tighter",
                                                            (supplier.scores?.total_suitability ?? 0) > 0.8 ? "text-success" : "text-primary"
                                                        )}>
                                                            {((supplier.scores?.total_suitability ?? 0) * 100).toFixed(0)}%
                                                        </span>
                                                        <div className="w-16 bg-muted h-1 rounded-full overflow-hidden mt-1">
                                                            <div
                                                                className={cn("h-full rounded-full transition-all duration-1000", (supplier.scores?.total_suitability ?? 0) > 0.8 ? "bg-success" : "bg-primary")}
                                                                style={{ width: `${(supplier.scores?.total_suitability ?? 0) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pr-6 text-right py-4">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {!isLoading && suppliers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-96 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="bg-muted/30 p-6 rounded-full mb-6">
                                                            <Globe className="h-12 w-12 text-muted-foreground/20 animate-pulse" />
                                                        </div>
                                                        <h3 className="text-lg font-bold text-foreground">No Suppliers Match</h3>
                                                        <p className="text-muted-foreground max-w-xs mx-auto mt-2 text-xs font-medium">
                                                            Try adjusting filters or distance to expand your search results.
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="map" className="mt-0 h-[75vh] outline-none">
                            <div className="relative h-full w-full rounded-2xl overflow-hidden border border-border shadow-2xl">
                                <MapComponent suppliers={suppliers} radiusKm={city ? radius[0] : undefined} centerCoords={centerCoords} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    )
}

