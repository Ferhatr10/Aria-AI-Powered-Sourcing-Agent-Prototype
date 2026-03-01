"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExternalLink, Star } from "lucide-react"
import type { Supplier } from "@/lib/types"

interface SupplierTableProps {
  suppliers: Supplier[]
}

function getScoreColor(score: number) {
  if (score >= 0.8) return "bg-success text-success-foreground"
  if (score >= 0.5) return "bg-primary text-primary-foreground"
  return "bg-muted text-muted-foreground"
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`
}

export function SupplierTable({ suppliers }: SupplierTableProps) {
  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">No suppliers found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try adjusting your filters or search query.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-3 pl-6 font-semibold">Company Name</TableHead>
            <TableHead className="py-3 font-semibold">Certifications</TableHead>
            <TableHead className="py-3 font-semibold">Materials</TableHead>
            <TableHead className="py-3 text-right font-semibold">Rating</TableHead>
            <TableHead className="py-3 text-right font-semibold">Match</TableHead>
            <TableHead className="py-3 pr-6 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow
              key={supplier.supplier_id}
              className="group transition-colors"
            >
              <TableCell className="py-4 pl-6">
                <div>
                  <p className="font-medium text-foreground">{supplier.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{supplier.supplier_id}</p>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex flex-wrap gap-1.5">
                  {supplier.certifications.map((cert) => (
                    <Badge
                      key={cert}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {cert}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex flex-wrap gap-1.5">
                  {supplier.materials.map((mat) => (
                    <Badge
                      key={mat}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {mat}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="py-4 text-right">
                <div className="inline-flex items-center gap-1 text-sm tabular-nums text-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {supplier.rating.toFixed(1)}
                </div>
              </TableCell>
              <TableCell className="py-4 text-right">
                <Badge
                  className={`${getScoreColor(supplier.scores.total_suitability)} border-0 text-xs font-semibold tabular-nums`}
                >
                  {formatScore(supplier.scores.total_suitability)}
                </Badge>
              </TableCell>
              <TableCell className="py-4 pr-6 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Details
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
