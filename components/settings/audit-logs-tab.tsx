"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  RefreshCw,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

export function AuditLogsTab() {
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

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

  return (
    <Card className="border-muted bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Security & Access Logs</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Immutable track log of edits, deletions, and Aadhaar/PII lookups for regulatory compliance.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoadingLogs ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            Loading audit logs...
          </div>
        ) : (
          <div className="border-t max-h-[500px] overflow-y-auto overflow-x-auto">
            <div className="min-w-[580px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/40">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target Entity</TableHead>
                    <TableHead className="w-[100px] text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData?.logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/10 text-xs">
                      <TableCell className="whitespace-nowrap py-3 font-mono text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{log.performedBy?.fullName || "System Admin"}</div>
                        <div className="text-[10px] text-muted-foreground">{log.performedBy?.role || "Admin"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            log.action === "DELETE" 
                              ? "border-red-200 bg-red-50 text-red-700" 
                              : log.action === "VIEW_AADHAAR"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-sky-200 bg-sky-50 text-sky-700"
                          }
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {log.tableName} {log.recordId ? `(${log.recordId.substring(0, 8)}...)` : ""}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 sm:h-7 text-xs sm:text-[10px] px-2.5 rounded-lg"
                          onClick={() => setSelectedLog(log)}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logsData?.logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        No audit logs registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
