"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  RotateCcw,
  CheckCircle2,
  Printer,
  Calendar,
  Trash2,
} from "lucide-react";
import {
  getPrintHistory,
  undoPrintBatch,
  clearPrintHistory,
  type PrintBatchRecord,
} from "@/lib/utils/print-history";
import type { DocumentType } from "@/lib/utils/document-sequence";

interface PrintHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: DocumentType;
  title?: string;
  onUndoBatch?: (newNextSerial: number) => void;
}

export function PrintHistoryModal({
  isOpen,
  onClose,
  docType,
  title = "Print History & Batch Undo",
  onUndoBatch,
}: PrintHistoryModalProps) {
  const [history, setHistory] = useState<PrintBatchRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(getPrintHistory(docType));
    }
  }, [isOpen, docType]);

  const handleUndo = (batchId: string) => {
    const { updatedHistory, newStartSerial } = undoPrintBatch(docType, batchId);
    setHistory(updatedHistory);
    if (onUndoBatch) {
      onUndoBatch(newStartSerial);
    }
  };

  const handleUndoLatest = () => {
    const activeBatches = history.filter((h) => !h.undone);
    if (activeBatches.length > 0) {
      handleUndo(activeBatches[0].id);
    }
  };

  const handleClearAll = () => {
    clearPrintHistory(docType);
    setHistory([]);
  };

  const activeBatches = history.filter((h) => !h.undone);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-5 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <History className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Track all printed batches and undo any sequence allocation anytime.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeBatches.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleUndoLatest}
                  className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Undo Latest Batch</span>
                </Button>
              )}
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs text-muted-foreground hover:text-destructive gap-1 h-8 px-2.5 cursor-pointer"
                  title="Clear history log"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Log</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Printer className="h-8 w-8 mx-auto opacity-40 text-muted-foreground" />
              <p className="text-sm font-semibold">No print history found for this session</p>
              <p className="text-xs max-w-sm mx-auto">
                Whenever you print single or bulk forms, details will be automatically logged here so you can undo any batch.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isUndone = !!item.undone;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isUndone
                      ? "bg-muted/30 border-dashed border-border/60 opacity-60"
                      : "bg-card border-border/80 shadow-2xs hover:border-amber-400/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {item.formattedStart} {item.count > 1 ? `— ${item.formattedEnd}` : ""}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          item.mode === "bulk"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200"
                            : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200"
                        }`}
                      >
                        {item.mode === "bulk" ? "Bulk Batch" : "Single Print"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-muted/50 font-mono">
                        {item.count} {item.count > 1 ? "Items" : "Item"}
                      </Badge>
                      {item.classInfo && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          &bull; {item.classInfo}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{item.timestamp}</span>
                      {isUndone && (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          &bull; Undone {item.undoneAt ? `at ${item.undoneAt}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {isUndone ? (
                      <span className="text-xs text-muted-foreground font-semibold px-3 py-1.5 rounded-lg bg-muted inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Undone
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUndo(item.id)}
                        className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-lg border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Undo Batch</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
