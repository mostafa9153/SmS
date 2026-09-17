"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  RefreshCw,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTableSkeleton } from "@/components/ui/skeleton-loaders";

interface AuditLogEntry {
  id: string;
  action: string;
  tableName: string;
  recordId: string | null;
  oldValues: any;
  newValues: any;
  metadata: any;
  createdAt: string;
  performedBy: {
    id: string;
    fullName: string;
    role: string;
  };
}

const FILTER_OPTIONS = ["All", "CREATE", "UPDATE", "DELETE", "SYSTEM_CONFIG"];

export function AuditLogsTab() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter") || searchParams.get("tab");
  const initialFilter = filterParam && FILTER_OPTIONS.includes(filterParam) ? filterParam : "All";

  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [activeFilter, setActiveFilterState] = useState<string>(initialFilter);

  const setActiveFilter = (filter: string) => {
    setActiveFilterState(filter);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (filter === "All") {
        url.searchParams.delete("filter");
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("filter", filter);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-logs");
      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      return res.json() as Promise<{ logs: AuditLogEntry[] }>;
    },
    staleTime: 2 * 60 * 1000,
  });

  const filterOptions = ["All", "CREATE", "UPDATE", "DELETE", "SYSTEM_CONFIG"];

  const filteredLogs = logsData?.logs.filter((log) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "SYSTEM_CONFIG") return log.action.includes("SYSTEM") || log.action.includes("CONFIG");
    return log.action.includes(activeFilter);
  }) || [];

  return (
    <Card className="border-muted bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Security & Access Logs</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Immutable track log of edits, deletions, and Aadhaar/PII lookups for regulatory compliance.
        </CardDescription>
        
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2 mt-4">
          {filterOptions.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              className={`h-7 text-xs rounded-full cursor-pointer ${
                activeFilter === filter ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
              }`}
            >
              {filter}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoadingLogs ? (
          <div className="p-5">
            <DataTableSkeleton />
          </div>
        ) : (
          <div className="border-t max-h-[600px] overflow-y-auto p-4 sm:p-6 space-y-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No audit logs found for the selected filter.
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
                {filteredLogs.map((log) => {
                  let borderColor = "border-sky-500";
                  if (log.action.includes("DELETE")) borderColor = "border-rose-500";
                  else if (log.action.includes("UPDATE")) borderColor = "border-amber-500";
                  else if (log.action.includes("CREATE")) borderColor = "border-emerald-500";
                  else if (log.action.includes("SYSTEM") || log.action.includes("CONFIG")) borderColor = "border-blue-500";

                  // Human readable relative time
                  const logDate = new Date(log.createdAt);
                  const diffMs = Date.now() - logDate.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffMinutes = Math.floor(diffMs / (1000 * 60));
                  
                  let relativeTime = "Just now";
                  if (diffDays > 0) relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                  else if (diffHours > 0) relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                  else if (diffMinutes > 0) relativeTime = `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;

                  return (
                    <div 
                      key={log.id} 
                      className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      {/* Timeline Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Activity className="h-4 w-4" />
                      </div>
                      
                      {/* Card */}
                      <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow border-l-4 ${borderColor}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="outline" className={`font-semibold bg-background ${borderColor} border-l-2 text-[10px]`}>
                            {log.action}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {relativeTime}
                          </span>
                        </div>
                        
                        <div className="mb-2">
                          <p className="text-sm font-semibold text-foreground">
                            {log.performedBy?.fullName || "System Admin"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {log.performedBy?.role || "Admin"}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                          <span className="font-mono text-[10px] bg-muted px-2 py-1 rounded-md text-muted-foreground truncate max-w-[150px]">
                            {log.tableName} {log.recordId ? `(${log.recordId.substring(0, 8)})` : ""}
                          </span>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] px-2.5 rounded-lg cursor-pointer"
                            onClick={() => setSelectedLog(log)}
                          >
                            Inspect
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Audit Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px]">
              ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-sm">
            <div className="grid grid-cols-2 gap-2 border bg-muted/20 p-3 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Timestamp</span>
                <span>{selectedLog && new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Performer</span>
                <span>{selectedLog?.performedBy?.fullName || "System Admin"} ({selectedLog?.performedBy?.role || "Admin"})</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Action</span>
                <span className="font-semibold">{selectedLog?.action}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Table Affected</span>
                <span className="font-mono">{selectedLog?.tableName}</span>
              </div>
            </div>

            {selectedLog?.metadata && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Action Metadata</span>
                <pre className="p-2 border rounded-md bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-40">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            {(selectedLog?.oldValues || selectedLog?.newValues) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedLog.oldValues && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Previous State</span>
                    <pre className="p-2 border rounded-md bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-48">
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.newValues && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">New State</span>
                    <pre className="p-2 border rounded-md bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-48">
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setSelectedLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
