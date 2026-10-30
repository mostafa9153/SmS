"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { AllotmentRowItem } from "@/components/routine/demand-allotment/allotment-row-item";
import type { DemandAllotmentState } from "./use-routine-demand-allotment";

export function DemandTable({ da }: { da: DemandAllotmentState }) {
  const { allotmentRows, expandedClassIds, filteredRows, grandTotals, toggleExpand } = da;
  return (
    <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
              <th className="py-2.5 px-3 w-10"></th>
              <th className="py-2.5 px-4">Class & Section</th>
              <th className="py-2.5 px-4">Stream</th>
              <th className="py-2.5 px-4 text-center">Subjects</th>
              <th className="py-2.5 px-4 text-center">Class Capacity</th>
              <th className="py-2.5 px-4 text-center">Subject Demand</th>
              <th className="py-2.5 px-4 text-center">Teacher Allotted</th>
              <th className="py-2.5 px-4 w-40">Allotment Progress</th>
              <th className="py-2.5 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState compact icon={Scale} title="No matching class allotments found" />
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <AllotmentRowItem
                  key={row.classId}
                  row={row}
                  isExpanded={Boolean(expandedClassIds[row.classId])}
                  onToggleExpand={toggleExpand}
                />
              ))
            )}
          </tbody>
          {/* Grand Total Summary Footer */}
          <tfoot>
            <tr className="bg-muted/40 border-t-2 font-bold text-foreground">
              <td className="py-3 px-3"></td>
              <td className="py-3 px-4" colSpan={2}>
                Grand Total ({grandTotals.totalRows} Sections & Streams)
              </td>
              <td className="py-3 px-4 text-center font-mono">
                {allotmentRows.reduce((sum, r) => sum + r.subjectsCount, 0)}
              </td>
              <td className="py-3 px-4 text-center">
                <Badge variant="outline" className="font-mono text-xs font-bold bg-background">
                  {grandTotals.totalCapacity} p/wk
                </Badge>
              </td>
              <td className="py-3 px-4 text-center">
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {grandTotals.totalDemand} p/wk
                </Badge>
              </td>
              <td className="py-3 px-4 text-center">
                <Badge
                  variant={grandTotals.totalAssigned >= grandTotals.totalDemand ? "secondary" : "outline"}
                  className={cn(
                    "font-mono text-xs font-bold",
                    grandTotals.totalAssigned >= grandTotals.totalDemand && grandTotals.totalDemand > 0
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                      : "text-amber-700 dark:text-amber-400 border-amber-300"
                  )}
                >
                  {grandTotals.totalAssigned} p/wk
                </Badge>
              </td>
              <td className="py-3 px-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>{grandTotals.fulfillmentPercent}% School Total</span>
                    <span>
                      {grandTotals.totalAssigned}/{grandTotals.totalDemand} p
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-200"
                      style={{ width: `${grandTotals.fulfillmentPercent}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-xs font-mono font-bold text-foreground">
                  {grandTotals.totalAssigned >= grandTotals.totalDemand
                    ? "100% Complete"
                    : `-${grandTotals.totalDemand - grandTotals.totalAssigned} p gap`}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
