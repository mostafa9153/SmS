"use client";

import { CheckCircle2, Clock, Plus, Trash2, ClipboardList, FileCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { TeacherManagementState } from "./use-teacher-management";

export function TasksTab({ tm }: { tm: TeacherManagementState }) {
  const { handleApproveTask, handleDeleteTask, setCreateTaskModal, tasks } = tm;
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Delegate specific tasks (e.g. Re-Admission for Class 5-A) to one or more teachers simultaneously.
        </p>
        <Button
          size="sm"
          onClick={() => setCreateTaskModal(true)}
          className="h-8 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Assign New Task</span>
        </Button>
      </div>

      <div className="grid gap-3.5">
        {tasks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border/80 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">No Tasks Assigned Yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Click &apos;Assign New Task&apos; to delegate work to teachers.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {task.task_type}
                    </span>
                    {task.target_class && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                        Class {task.target_class} ({task.target_section || "ALL"})
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {task.due_date && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-lg border border-border/50">
                      <Clock className="h-3.5 w-3.5 text-amber-500" /> Due: {task.due_date}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTask(task.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Assignees and Completion Status */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Assigned Teachers & Progress:
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(task.assignees || []).map((a: any) => {
                    const isSubmitted = a.status === "SUBMITTED" || a.status === "APPROVED";
                    return (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-foreground">{a.teacherName}</p>
                            <p className="text-[10px] text-muted-foreground">{a.designation}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              a.status === "APPROVED"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : a.status === "SUBMITTED"
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>

                        {/* Submitted Report View */}
                        {isSubmitted && a.completionReport && (
                          <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 text-[11px] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-primary flex items-center gap-1">
                                <FileCheck className="h-3 w-3" /> Completion Report:
                              </p>
                              {a.completionReport.completion_status && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                                  {a.completionReport.completion_status}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              Students: <span className="text-foreground font-bold">{a.completionReport.students_count || 0}</span> · Collected: <span className="text-foreground font-bold">₹{Number(a.completionReport.fees_collected || 0).toLocaleString()}</span>
                            </p>
                            {a.completionReport.notes && (
                              <p className="italic text-muted-foreground text-[10px] bg-muted/40 p-1.5 rounded-lg border border-border/40">“{a.completionReport.notes}”</p>
                            )}
                            {a.completionReport.attachments && a.completionReport.attachments.length > 0 && (
                              <div className="pt-1 border-t border-border/40 space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground">Proof Attachments ({a.completionReport.attachments.length}):</p>
                                <div className="flex flex-wrap gap-1">
                                  {a.completionReport.attachments.map((att: any, attIdx: number) => (
                                    <a
                                      key={attIdx}
                                      href={att.dataUrl}
                                      download={att.name}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/70 hover:bg-muted border border-border/60 text-[10px] text-foreground font-medium transition-colors"
                                    >
                                      <Download className="h-3 w-3 text-primary" />
                                      <span className="truncate max-w-[120px]">{att.name}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {a.status === "SUBMITTED" && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveTask(task.id, a.id)}
                            className="h-6 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer self-end"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve & Close
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
