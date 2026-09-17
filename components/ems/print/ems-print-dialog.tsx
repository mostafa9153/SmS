"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ExamAllocation } from "@/lib/ems/types";
import { EmsPrintStudio, PrintDocType } from "./ems-print-studio";

export type { PrintDocType };

export interface EmsPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ExamAllocation;
  defaultRoomId?: string;
  defaultDoc?: PrintDocType;
}

export const EmsPrintDialog: React.FC<EmsPrintDialogProps> = ({
  open,
  onOpenChange,
  allocation,
  defaultRoomId = "ALL",
  defaultDoc = "admit",
}) => {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-slate-950/45 backdrop-blur-xl"
        className="max-w-[99vw] xl:max-w-[1680px] w-full h-[98vh] p-0 flex flex-col bg-card backdrop-blur-3xl border border-border text-foreground overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.8)] ring-1 ring-border/50 print:hidden"
      >
        <EmsPrintStudio
          allocation={allocation}
          defaultRoomId={defaultRoomId}
          defaultDoc={defaultDoc}
          onClose={() => onOpenChange(false)}
          isDialog={true}
        />
      </DialogContent>
    </Dialog>
  );
};
