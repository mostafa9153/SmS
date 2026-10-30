"use client";

import { ClipboardList, CheckCircle2, Clock, IndianRupee, ArrowRight, FileCheck, User, Edit2, Paperclip, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function ActiveTasks({ gen }: { gen: TeacherDashboardState }) {
  const { formatAttachmentSize, handleOpenReportModal, handleStartTask, setPreviewAttachment, tasks } = gen;
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ClipboardList className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Task Hub
          </h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/80">
          {tasks.length} Action Items
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 rounded-2xl bg-card border border-border/80 text-center shadow-xs">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto mb-2" />
          <p className="text-xs font-semibold text-foreground">All caught up!</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">You have no pending tasks assigned by the administrator.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const isSubmitted = task.myStatus === "SUBMITTED" || task.myStatus === "APPROVED";
            const isInProgress = task.myStatus === "IN_PROGRESS";

            return (
              <div
                key={task.id}
                className={`group p-5 rounded-2xl border flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 ${
                  isSubmitted
                    ? "bg-card/60 border-border/60 opacity-80"
                    : "bg-card border-border hover:border-emerald-500/40 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase ${
                          isSubmitted
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : isInProgress
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {isSubmitted ? "Submitted" : isInProgress ? "In Progress" : "To-Do"}
                      </span>
                      {task.targetClass && (
                        <span className="px-2 py-1 rounded-lg bg-muted text-foreground text-[10px] font-semibold border border-border/60">
                          Class {task.targetClass} {task.targetSection ? `(${task.targetSection})` : ""}
                        </span>
                      )}
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg border border-border/60">
                        <Clock className="h-3.5 w-3.5 text-amber-500" /> {task.dueDate}
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* If report already submitted, display rich summary with attachments */}
                  {isSubmitted && task.completionReport && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-[11px] text-foreground space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          {task.myStatus === "APPROVED" ? "Approved by Admin" : "Report Submitted"}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.completionReport.completion_status === "PARTIAL"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        }`}>
                          {task.completionReport.completion_status === "PARTIAL" ? "Partial" : "Completed"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {Number(task.completionReport.students_count) > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 font-semibold text-foreground flex items-center gap-1.5 shadow-2xs">
                            <User className="h-3 w-3 text-indigo-500" />
                            Students: <strong className="font-bold">{task.completionReport.students_count}</strong>
                          </span>
                        )}
                        {Number(task.completionReport.fees_collected) > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 font-semibold text-foreground flex items-center gap-1.5 shadow-2xs">
                            <IndianRupee className="h-3 w-3 text-emerald-500" />
                            Collected: <strong className="font-bold">₹{task.completionReport.fees_collected.toLocaleString()}</strong>
                          </span>
                        )}
                      </div>

                      {task.completionReport.notes && (
                        <p className="text-muted-foreground text-xs leading-relaxed bg-background/50 p-2.5 rounded-xl border border-border/40 italic">
                          &ldquo;{task.completionReport.notes}&rdquo;
                        </p>
                      )}

                      {/* Attachments preview */}
                      {task.completionReport.attachments && task.completionReport.attachments.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-border/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Paperclip className="h-3 w-3 text-primary" />
                            Attached Documents ({task.completionReport.attachments.length}):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {task.completionReport.attachments.map((att: any, aIdx: number) => {
                              const isImg = att.type?.startsWith("image/");
                              return (
                                <button
                                  key={aIdx}
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background border border-border/70 hover:border-primary/50 text-[11px] font-medium text-foreground transition-all cursor-pointer shadow-2xs hover:bg-muted/30 group/att"
                                >
                                  {isImg ? (
                                    <img
                                      src={att.dataUrl}
                                      alt={att.name}
                                      className="h-3.5 w-3.5 rounded object-cover"
                                    />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                                  )}
                                  <span className="truncate max-w-[130px] font-semibold">{att.name}</span>
                                  <span className="text-[9px] text-muted-foreground">({formatAttachmentSize(att.size)})</span>
                                  <Eye className="h-3 w-3 text-muted-foreground group-hover/att:text-primary ml-0.5" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                  {!isSubmitted ? (
                    <>
                      <Button
                        onClick={() => handleStartTask(task)}
                        className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer group/btn"
                      >
                        <span>Start Task</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleOpenReportModal(task)}
                        className="flex-1 h-9 rounded-xl border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer group/btn2 shadow-2xs"
                      >
                        <FileCheck className="h-3.5 w-3.5 text-emerald-500 mr-1.5 group-hover/btn2:scale-110 transition-transform" />
                        <span>Submit Report</span>
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {task.myStatus === "APPROVED" ? "Verified & Approved" : "Awaiting Admin Review"}
                      </span>
                      {task.myStatus !== "APPROVED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReportModal(task)}
                          className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3 mr-1" /> Edit Report
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
