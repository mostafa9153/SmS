"use client";

import type { EmsPrintDialogProps } from "@/components/ems/print/dialog/props";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { DialogHeader } from "@/components/ems/print/dialog/dialog-header";
import { DocTypeSwitcher } from "@/components/ems/print/dialog/doc-type-switcher";
import { RoomFilter } from "@/components/ems/print/dialog/room-filter";
import { OptionsSection } from "@/components/ems/print/dialog/options-section";
import { SummaryAndPrint } from "@/components/ems/print/dialog/summary-and-print";
import { PreviewToolbar } from "@/components/ems/print/dialog/preview-toolbar";
import { PreviewCanvas } from "@/components/ems/print/dialog/preview-canvas";
import { PrintPortal } from "@/components/ems/print/dialog/print-portal";
import { useEmsPrintDialog } from "@/components/ems/print/dialog/use-ems-print-dialog";

export type { EmsPrintDialogProps };

export const EmsPrintDialog: React.FC<EmsPrintDialogProps> = (props) => {
  const studio = useEmsPrintDialog(props);
  const { onOpenChange, open } = studio;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-slate-950/45 backdrop-blur-xl"
        className="max-w-[99vw] xl:max-w-[1680px] w-full h-[98vh] p-0 flex flex-col bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl border border-white/70 dark:border-white/15 text-slate-900 dark:text-slate-100 overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.8)] ring-1 ring-white/50 dark:ring-white/10 print:hidden"
      >

        {/* ============================================================== */}
        {/* PRO FULL-HEIGHT STUDIO: Left (Options & Print) | Right (Preview) */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden print:overflow-visible">

          {/* ──────────────────────────────────────────────────────────── */}
          {/* LEFT SIDEBAR: Glossy Frosted Glass Options Panel            */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="w-full md:w-[430px] xl:w-[470px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-r border-white/60 dark:border-white/10 flex flex-col shrink-0 overflow-y-auto p-4 sm:p-5 space-y-4 print:hidden shadow-xs relative z-10">

            {/* Header: Title, Exam Badge & School Context */}
            <DialogHeader studio={studio} />

            {/* SECTION 1: Document Type Switcher (Modern 4-Column Segmented Grid) */}
            <DocTypeSwitcher studio={studio} />

            {/* SECTION 2: Target Room Filter (Spacious & Clean Chips) */}
            <RoomFilter studio={studio} />

            {/* SECTION 3: Document Customization Options */}
            <OptionsSection studio={studio} />

            {/* SECTION 4: Document Summary Pill & Master Print Button */}
            <SummaryAndPrint studio={studio} />
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* RIGHT VIEWPORT: Glossy Glass Document Preview Studio Canvas */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-white/30 dark:bg-slate-950/30 backdrop-blur-2xl relative overflow-hidden print:overflow-visible print:bg-white">

            {/* Ambient Glossy Glow Spheres & Frosted Blur Canvas Backing (Hidden during print) */}
            <div className="print:hidden absolute -top-28 -left-28 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-300/15 to-purple-300/15 dark:from-blue-600/15 dark:via-indigo-600/10 dark:to-transparent blur-[110px] pointer-events-none animate-pulse" />
            <div className="print:hidden absolute -bottom-28 -right-28 w-[540px] h-[540px] rounded-full bg-gradient-to-br from-violet-400/20 via-purple-300/15 to-pink-300/15 dark:from-violet-600/10 dark:via-pink-600/10 dark:to-transparent blur-[120px] pointer-events-none" />
            <div className="print:hidden absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-300/10 dark:bg-indigo-700/5 blur-[120px] pointer-events-none" />
            <div className="print:hidden absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

            {/* Slim Floating Glossy Header: Quick status, Zoom controls & Close (X) */}
            <PreviewToolbar studio={studio} />

            {/* Document canvas: shared print preview (zoom, drag, fit) */}
            <PreviewCanvas studio={studio} />
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* ============================================================== */}
    {/* DEDICATED DIRECT-TO-BODY PRINT PORTAL                          */}
    {/* Completely isolated from dialog zoom, flex, and transforms     */}
    {/* ============================================================== */}
    <PrintPortal studio={studio} />
    </>
  );
};
