"use client";

import { CheckCircle2, Clock, IndianRupee, Send, User, Trash2, Paperclip, UploadCloud, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function TaskReportDialog({ gen }: { gen: TeacherDashboardState }) {
  const { attachmentError, formatAttachmentSize, handleAttachmentUpload, handleRemoveAttachment, handleSubmitReport, reportAttachments, reportCompletionStatus, reportFeesCollected, reportNotes, reportStudentsCount, reportSuccess, selectedTaskForReport, setPreviewAttachment, setReportCompletionStatus, setReportFeesCollected, setReportNotes, setReportStudentsCount, setSelectedTaskForReport, submittingReport } = gen;
  return (
    <Dialog open={!!selectedTaskForReport} onOpenChange={(open) => !open && setSelectedTaskForReport(null)}>
      <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-lg p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-primary/10 p-5 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30">
                  {selectedTaskForReport?.taskType || "TASK"}
                </span>
                {selectedTaskForReport?.targetClass && (
                  <span className="text-xs text-muted-foreground font-semibold">
                    Class {selectedTaskForReport.targetClass} {selectedTaskForReport.targetSection ? `(${selectedTaskForReport.targetSection})` : ""}
                  </span>
                )}
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                {selectedTaskForReport?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Submit completion breakdown, receipts, document proof &amp; remarks.
              </DialogDescription>
            </div>
          </div>
        </div>

        {reportSuccess ? (
          <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-8 w-8 animate-bounce" />
            </div>
            <p className="text-base font-bold text-foreground">Report Submitted Successfully!</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Your completion report and attached documents have been forwarded to the school administration.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitReport} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Completion Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReportCompletionStatus("COMPLETED")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    reportCompletionStatus === "COMPLETED"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                      : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Fully Completed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportCompletionStatus("PARTIAL")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    reportCompletionStatus === "PARTIAL"
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20"
                      : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>Partially Completed</span>
                </button>
              </div>
            </div>

            {/* Numerical Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  Students / Records
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 28"
                  value={reportStudentsCount}
                  onChange={(e) => setReportStudentsCount(e.target.value)}
                  className="h-10 bg-background border-border text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-emerald-500" />
                  Fees / Amount (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 5400"
                  value={reportFeesCollected}
                  onChange={(e) => setReportFeesCollected(e.target.value)}
                  className="h-10 bg-background border-border text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground">
                Task Execution Notes &amp; Observations
              </label>
              <Textarea
                placeholder="Summarize the action taken, pending items, absent students, or any relevant remarks..."
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                className="bg-background border-border text-xs rounded-xl min-h-[85px] leading-relaxed"
                required
              />
            </div>

            {/* File Attachments Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                  Proof Attachments &amp; Documents
                </label>
                <span className="text-[10px] text-muted-foreground">PDF, Images, Excel, Docs (Max 5MB)</span>
              </div>

              <label className="border-2 border-dashed border-border/80 hover:border-emerald-500/50 hover:bg-muted/30 transition-all rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  className="hidden"
                  onChange={(e) => handleAttachmentUpload(e.target.files)}
                />
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Click or drag files here to attach proof
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Bills, collection receipts, signed forms, or spreadsheets
                </p>
              </label>

              {attachmentError && (
                <p className="text-[11px] text-destructive font-medium">{attachmentError}</p>
              )}

              {/* Attached Files List */}
              {reportAttachments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Attached Files ({reportAttachments.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reportAttachments.map((att, idx) => {
                      const isImage = att.type?.startsWith("image/");
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2 text-xs hover:bg-muted/60 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isImage ? (
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="h-8 w-8 rounded-lg object-cover border border-border/50 shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate text-[11px]">
                                {att.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatAttachmentSize(att.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Preview"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedTaskForReport(null)}
                className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingReport}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
              >
                {submittingReport ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Submit to Administrator</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
