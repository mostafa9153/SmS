"use client";

import type { EmsPrintStudioProps } from "@/components/ems/print/studio/props";
import { cn } from "@/lib/utils";

import { StudioHeader } from "@/components/ems/print/studio/studio-header";
import { ControlRow } from "@/components/ems/print/studio/control-row";
import { OptionsPanel } from "@/components/ems/print/studio/options-panel";
import { PreviewCanvas } from "@/components/ems/print/studio/preview-canvas";
import { PrintPortal } from "@/components/ems/print/studio/print-portal";
import { useEmsPrintStudio } from "@/components/ems/print/studio/use-ems-print-studio";

export type { EmsPrintStudioProps };

export const EmsPrintStudio: React.FC<EmsPrintStudioProps> = (props) => {
  const studio = useEmsPrintStudio(props);
  const { isDialog } = studio;

  return (
    <div className={cn("flex flex-col gap-3 w-full", isDialog ? "h-full min-h-[90vh]" : "min-h-[860px]")}>
      {/* ============================================================== */}
      {/* 1. HEADER: Minimalist, Clean & Primary Print Action            */}
      {/* ============================================================== */}
      <StudioHeader studio={studio} />

      {/* ============================================================== */}
      {/* 2. TOP CONTROL DECK: Split into 2 Rows (Row 1 + Collapsible Row 2) */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-border/80 bg-card/90 shadow-2xs p-3 sm:p-4 space-y-3 shrink-0">
        {/* ── ROW 1: Always Visible Modern Controls ─────────────────── */}
        <ControlRow studio={studio} />

        {/* ── ROW 2: Collapsible Options Drawer ─────────────────────── */}
        <OptionsPanel studio={studio} />
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM PREVIEW CANVAS: Full-Width Clean Document Viewport   */}
      {/* ============================================================== */}
      <PreviewCanvas studio={studio} />

      {/* ============================================================== */}
      {/* 4. DEDICATED DIRECT-TO-BODY PRINT PORTAL                        */}
      {/* Completely isolated from zoom, flex, and transforms            */}
      {/* ============================================================== */}
      <PrintPortal studio={studio} />
    </div>
  );
};
