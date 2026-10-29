"use client";

import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

import type { TeacherManagementState } from "./use-teacher-management";

export function ActivityLogsDialog({ tm }: { tm: TeacherManagementState }) {
  const { loadingTeacherLogs, selectedTeacherForLogs, setSelectedTeacherForLogs, teacherLogs } = tm;
  return (
    <Dialog open={!!selectedTeacherForLogs} onOpenChange={(open) => !open && setSelectedTeacherForLogs(null)}>
      <DialogContent className="rounded-3xl max-w-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Activity Audit Trail: {selectedTeacherForLogs?.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Chronological log of re-admissions, fee collections, and generators executed by this teacher.
          </DialogDescription>
        </DialogHeader>

        {loadingTeacherLogs ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <Spinner className="h-6 w-6 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Loading teacher activity logs...</p>
          </div>
        ) : teacherLogs.length === 0 ? (
          <EmptyState compact title="No activity logs recorded for this teacher yet." />
        ) : (
          <div className="max-h-96 overflow-y-auto border border-border/80 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Action</th>
                  <th className="p-2.5">Student</th>
                  <th className="p-2.5">Class / Sec</th>
                  <th className="p-2.5 text-right">Fee Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {teacherLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="p-2.5 text-muted-foreground text-[10px]">
                      {new Date(log.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        {log.action_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-2.5 font-medium text-foreground">{log.target_student_name || "—"}</td>
                    <td className="p-2.5 text-muted-foreground">
                      {log.student_class ? `Class ${log.student_class} (${log.section || "—"})` : "—"}
                    </td>
                    <td className="p-2.5 text-right font-bold text-foreground">
                      {log.amount_collected > 0 ? `₹${Number(log.amount_collected).toLocaleString()}` : "₹0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedTeacherForLogs(null)}
            className="text-xs rounded-xl"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
