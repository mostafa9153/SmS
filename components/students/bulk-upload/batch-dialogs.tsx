"use client";

import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { BulkUploadState } from "./use-bulk-upload";

export function BatchDialogs({ bulk }: { bulk: BulkUploadState }) {
  const { isFetchingBatches, isLoadingBatches, pastBatches, refetchBatches, rollbackConfirmBatchId, rollbackMutation, rollbackSuccessMsg, setRollbackConfirmBatchId, setShowHistoryModal, showHistoryModal } = bulk;
  return (
    <>
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>Import Batches & Batch Deletion History</DialogTitle>
              <button
                onClick={() => refetchBatches()}
                disabled={isFetchingBatches}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border rounded px-2.5 py-1 transition-colors hover:bg-muted"
                title="Refresh batch list"
              >
                <RotateCcw className={cn("h-3 w-3", isFetchingBatches && "animate-spin text-primary")} />
                Refresh
              </button>
            </div>
            <DialogDescription>
              Audit all past bulk uploads (Students & Examination Results) and delete/rollback any batch.
            </DialogDescription>
          </DialogHeader>

          {rollbackSuccessMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              {rollbackSuccessMsg}
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto rounded-lg border divide-y">
            {isLoadingBatches || isFetchingBatches ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Spinner className="h-6 w-6 text-primary" />
                <p className="text-xs text-muted-foreground font-medium">Fetching batch history from audit logs…</p>
              </div>
            ) : pastBatches.length === 0 ? (
              <EmptyState compact title="No past bulk import batches" />
            ) : (
              pastBatches.map((batch: any) => {
                const isResultBatch =
                  batch.uploadType === "exam_results" || batch.action === "RESULTS_BULK_UPLOAD";
                const isOldStudentsBatch = batch.uploadType === "old_students";
                const isRolledBack = batch.status === "Rolled_Back";

                return (
                  <div
                    key={batch.batchId}
                    className={cn(
                      "flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors",
                      isRolledBack && "opacity-60 bg-muted/20"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded border border-border/60">
                          {batch.batchId}
                        </code>

                        {isResultBatch ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            📊 Exam Results {batch.targetYear ? `(${batch.targetYear})` : ""}
                          </Badge>
                        ) : isOldStudentsBatch ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                            🏛️ Old Students Archive {batch.targetYear ? `(${batch.targetYear})` : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                            🎓 Active Students {batch.targetYear ? `(${batch.targetYear})` : ""}
                          </Badge>
                        )}

                        <Badge variant="outline" className="text-[10px]">
                          {batch.totalAffected} records
                        </Badge>

                        {isRolledBack && (
                          <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                            Rolled Back / Deleted
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Uploaded on {new Date(batch.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>

                    {!isRolledBack && (
                      <button
                        onClick={() => setRollbackConfirmBatchId(batch.batchId)}
                        className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md transition-colors font-medium ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Batch
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete / Rollback Confirmation Dialog */}
      <Dialog
        open={!!rollbackConfirmBatchId}
        onOpenChange={(open) => !open && setRollbackConfirmBatchId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-700 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirm Batch Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete / rollback batch{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border">
                {rollbackConfirmBatchId}
              </code>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-2 border-y my-2">
            <p className="font-semibold text-foreground">This deletion action will:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Permanently remove all newly created records (Students / Exam Results) in this batch.</li>
              <li>Revert any records updated during this batch back to their exact prior values.</li>
              <li>Record an administrative deletion timestamp in the security audit log.</li>
            </ul>
          </div>
          <DialogFooter>
            <button
              onClick={() => setRollbackConfirmBatchId(null)}
              className="rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                rollbackConfirmBatchId && rollbackMutation.mutate(rollbackConfirmBatchId)
              }
              disabled={rollbackMutation.isPending}
              className="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {rollbackMutation.isPending ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  Deleting Batch…
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Yes, Delete Entire Batch
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
