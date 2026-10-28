"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { getEffectiveHeadTitle } from "@/lib/utils/school-profile";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { getSavedClassPresets, type ClassPresetItem } from "@/lib/utils/marks-config";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ZoomPanViewport } from "@/components/generate/zoom-pan-viewport";
import {
  ClassTeacherListPrintable,
  MIN_USABLE_MM,
  PAPER_MM,
  getPageCount,
  type ClassTeacherRow,
  type PaperOrientation,
  type PaperSize,
  type PrintMargins,
} from "@/components/teacher/class-teacher-list-printable";
import { Printer, Loader2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";

type PresetWithTeachers = ClassPresetItem & {
  classTeacher?: string;
  sectionTeachers?: Record<string, string>;
};

const PRINT_PORTAL_ID = "class-teacher-list-print-portal";

function shrinkPair(a: number, b: number, total: number): [number, number] {
  const maxSum = total - MIN_USABLE_MM;
  const sum = a + b;
  if (sum <= maxSum) return [a, b];
  const f = Math.max(0, maxSum) / sum;
  return [a * f, b * f];
}

function ClassTeacherListContent() {
  const classPresets = useMemo(() => getSavedClassPresets() as PresetWithTeachers[], []);
  const academicYear = new Date().getFullYear();

  const [paper, setPaper] = useState<PaperSize>("A4");
  const [orientation, setOrientation] = useState<PaperOrientation>("portrait");
  const [margins, setMargins] = useState<PrintMargins>({ top: 10, right: 10, bottom: 10, left: 10 });

  const { profile: schoolProfile } = useSchoolProfile();

  // Presets (synced two-way with Routine) are the source of truth for section → class teacher.
  const rows = useMemo<ClassTeacherRow[]>(() => {
    const list: ClassTeacherRow[] = [];
    for (const preset of classPresets) {
      for (const section of preset.sections) {
        list.push({
          className: preset.code,
          section,
          teacherName: preset.sectionTeachers?.[section] || preset.classTeacher || null,
        });
      }
    }
    return list;
  }, [classPresets]);

  const effectiveMargins = useMemo<PrintMargins>(() => {
    const base = PAPER_MM[paper];
    const pageW = orientation === "landscape" ? base.h : base.w;
    const pageH = orientation === "landscape" ? base.w : base.h;
    const [left, right] = shrinkPair(margins.left, margins.right, pageW);
    const [top, bottom] = shrinkPair(margins.top, margins.bottom, pageH);
    return { top, right, bottom, left };
  }, [margins, paper, orientation]);

  const pageCount = useMemo(
    () => getPageCount(rows.length, paper, orientation, effectiveMargins),
    [rows.length, paper, orientation, effectiveMargins]
  );

  const isEmpty = rows.length === 0;
  const canPrint = rows.length > 0;

  const portalRef = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    let el = document.getElementById(PRINT_PORTAL_ID) as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = PRINT_PORTAL_ID;
      document.body.appendChild(el);
    }
    portalRef.current = el;
    setPortalReady(true);
    return () => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
      portalRef.current = null;
    };
  }, []);

  const printableProps = {
    rows,
    paper,
    orientation,
    margins: effectiveMargins,
    academicYear,
    schoolName: schoolProfile?.schoolName || "",
    schoolLogoUrl: schoolProfile?.schoolLogoUrl || "/school-logo.png",
    headName: schoolProfile?.headmasterName,
    headDesignation: getEffectiveHeadTitle(schoolProfile),
    headSignatureUrl: schoolProfile?.headSignatureUrl,
  };

  const updateMargin = (side: keyof PrintMargins, raw: string) => {
    const value = Math.max(0, Number(raw) || 0);
    setMargins((prev) => ({ ...prev, [side]: value }));
  };

  const previewShell =
    "h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 print:hidden";

  return (
    <div className="p-3 sm:p-5 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-3 lg:gap-4 items-start print:block print:p-0 print:m-0 print:max-w-none">
      <aside className="order-2 lg:order-1 print:hidden lg:sticky lg:top-4 space-y-3 bg-card border rounded-2xl p-3 shadow-2xs">
        <PageHeader back="/generate" title="Class Teacher List" />

        <div className="space-y-2 border-t pt-3">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paper</p>
          <Select value={paper} onValueChange={(val) => val && setPaper(val as PaperSize)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A5">A5</SelectItem>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="A3">A3</SelectItem>
            </SelectContent>
          </Select>

          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Orientation</p>
          <Select
            value={orientation}
            onValueChange={(val) => val && setOrientation(val as PaperOrientation)}
          >
            <SelectTrigger className="w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Margin (mm)</p>
          <div className="grid grid-cols-2 gap-2">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <label key={side} className="space-y-1">
                <span className="px-1 text-[10px] font-semibold capitalize text-muted-foreground">{side}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  value={margins[side]}
                  onChange={(e) => updateMargin(side, e.target.value)}
                  className="h-9 text-sm"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="border-t pt-3">
          <Button
            onClick={() => window.print()}
            disabled={!canPrint}
            className="h-10 w-full gap-1.5 font-bold rounded-xl shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </aside>

      {isEmpty ? (
        <div
          className={cn(
            previewShell,
            "rounded-2xl border bg-muted/30 flex items-center justify-center w-full text-sm text-muted-foreground"
          )}
        >
          No classes configured.
        </div>
      ) : (
        <ZoomPanViewport
          fitMode={pageCount > 1 ? "width" : "contain"}
          resetKey={`${paper}-${orientation}-${pageCount}`}
          className={cn(previewShell, "w-full")}
        >
          <ClassTeacherListPrintable {...printableProps} preview />
        </ZoomPanViewport>
      )}

      {portalReady && portalRef.current && canPrint &&
        createPortal(<ClassTeacherListPrintable {...printableProps} />, portalRef.current)}
    </div>
  );
}

export default function ClassTeacherListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      }
    >
      <ClassTeacherListContent />
    </Suspense>
  );
}
