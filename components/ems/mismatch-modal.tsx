"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle, Info, Sparkles } from "lucide-react";
import { MismatchReport, MismatchItem } from "@/lib/ems/types";

interface MismatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed?: () => void;
  report: MismatchReport | null;
  allowProceedOnError?: boolean;
}

export function MismatchModal({
  isOpen,
  onClose,
  onProceed,
  report,
  allowProceedOnError = false,
}: MismatchModalProps) {
  if (!report || report.items.length === 0) return null;

  const hasErrors = report.hasErrors;
  const errorCount = report.items.filter((i) => i.severity === "error").length;
  const warningCount = report.items.filter((i) => i.severity === "warning").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 border border-border/80 shadow-2xl backdrop-blur-xl bg-card rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                hasErrors
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {hasErrors ? (
                <AlertCircle className="h-6 w-6 animate-pulse" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                <span>{hasErrors ? "Data Mismatch Detected" : "Seating Allocation Notices"}</span>
                <Badge
                  variant={hasErrors ? "destructive" : "secondary"}
                  className="text-xs font-mono font-semibold"
                >
                  {report.items.length} Notice{report.items.length > 1 ? "s" : ""}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {hasErrors
                  ? `${errorCount} critical error(s) and ${warningCount} notice(s) require review before proceeding`
                  : `${warningCount} informational notice(s) regarding student rolls and seating capacity`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {report.items.map((item, idx) => (
            <MismatchCard key={idx} item={item} />
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-3 mt-3 border-t border-border/60 pt-3.5 flex flex-col-reverse sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold cursor-pointer"
          >
            Cancel & Adjust Classes
          </Button>

          {(!hasErrors || allowProceedOnError) && onProceed && (
            <Button
              type="button"
              onClick={() => {
                onProceed();
                onClose();
              }}
              className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle className="h-4 w-4" />
              Skip Missing & Generate Seating Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MismatchCard({ item }: { item: MismatchItem }) {
  const getBadge = () => {
    switch (item.severity) {
      case "error":
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider shrink-0">
            Critical Error
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold tracking-wider shrink-0">
            Warning
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] uppercase font-bold tracking-wider shrink-0">
            Notice
          </Badge>
        );
    }
  };

  const getCardStyle = () => {
    switch (item.severity) {
      case "error":
        return "border-rose-500/30 bg-rose-500/5";
      case "warning":
        return "border-amber-500/30 bg-amber-500/5";
      default:
        return "border-blue-500/30 bg-blue-500/5";
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${getCardStyle()} space-y-2.5 transition-all shadow-2xs`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
          {item.severity === "error" ? (
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          ) : item.severity === "warning" ? (
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
          )}
          <span>{item.title}</span>
        </h4>
        {getBadge()}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
        {item.message}
      </p>

      {item.details && item.details.length > 0 && (
        <div className="pl-6 pt-0.5">
          <div className="text-[11px] font-mono bg-background p-2.5 rounded-lg border border-border/70 text-muted-foreground break-words break-all whitespace-normal shadow-2xs leading-relaxed">
            {item.details.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
        </div>
      )}

      {item.suggestedAction && (
        <div className="pl-6 pt-1 flex items-start gap-1.5 text-[11px] text-foreground font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p>
            <strong className="text-primary">Recommendation:</strong> {item.suggestedAction}
          </p>
        </div>
      )}
    </div>
  );
}
