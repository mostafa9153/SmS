"use client";

import { FileText, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function AttachmentPreviewDialog({ gen }: { gen: TeacherDashboardState }) {
  const { previewAttachment, setPreviewAttachment } = gen;
  return (
    <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
      <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-2xl p-5 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-sm font-bold truncate max-w-md">
              {previewAttachment?.name}
            </DialogTitle>
          </div>
          {previewAttachment && (
            <a
              href={previewAttachment.dataUrl}
              download={previewAttachment.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs mr-6"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          )}
        </DialogHeader>
        <div className="py-4 flex items-center justify-center max-h-[70vh] overflow-auto">
          {previewAttachment?.type?.startsWith("image/") ? (
            <img
              src={previewAttachment.dataUrl}
              alt={previewAttachment.name}
              className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-sm"
            />
          ) : (
            <div className="p-8 text-center space-y-3">
              <FileText className="h-16 w-16 text-primary/60 mx-auto" />
              <p className="text-sm font-semibold">{previewAttachment?.name}</p>
              <p className="text-xs text-muted-foreground">Document file attached.</p>
              <a
                href={previewAttachment?.dataUrl}
                download={previewAttachment?.name}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                <Download className="h-4 w-4" /> Download File
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
