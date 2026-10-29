"use client";

import React, { useState, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import { getEffectiveHeadTitle } from "@/lib/utils/school-profile";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { getSavedClassPresets, type ClassPresetItem } from "@/lib/utils/marks-config";
import { Button, buttonVariants } from "@/components/ui/button";
import { usePrintPortal } from "@/lib/hooks/use-print-portal";
import { cn } from "@/lib/utils";
import { PrintPreview } from "@/components/print/print-preview";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";
import { usePaperSettings } from "@/components/print/use-paper-settings";
import {
  ClassTeacherListPrintable,
  MIN_USABLE_MM,
  getPageCount,
  type ClassTeacherRow,
  type PrintMargins,
} from "@/components/teacher/class-teacher-list-printable";
import { Printer } from "lucide-react";
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

  const paperSettings = usePaperSettings("class-teacher-list-paper-settings", {
    paper: "A4",
    orientation: "portrait",
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
  });
  const { paper, orientation, margins, pageW, pageH } = paperSettings;

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
    const [left, right] = shrinkPair(margins.left, margins.right, pageW);
    const [top, bottom] = shrinkPair(margins.top, margins.bottom, pageH);
    return { top, right, bottom, left };
  }, [margins, pageW, pageH]);

  const pageCount = useMemo(
    () => getPageCount(rows.length, paper, orientation, effectiveMargins),
    [rows.length, paper, orientation, effectiveMargins]
  );

  const isEmpty = rows.length === 0;
  const canPrint = rows.length > 0;

  const portalEl = usePrintPortal(PRINT_PORTAL_ID);

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

  const previewShell =
    "h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 print:hidden";

  return (
    <div className="p-3 sm:p-5 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-3 lg:gap-4 items-start print:block print:p-0 print:m-0 print:max-w-none">
      <aside className="order-2 lg:order-1 print:hidden lg:sticky lg:top-4 space-y-3 bg-card border rounded-2xl p-3 shadow-2xs">
        <PageHeader back="/generate" title="Class Teacher List" />

        <PaperSettingsPanel settings={paperSettings} orientations variant="section" defaultOpen />

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
        <PrintPreview
          fitMode={pageCount > 1 ? "width" : "contain"}
          resetKey={`${paper}-${orientation}-${pageCount}`}
          className={cn(previewShell, "w-full")}
        >
          <ClassTeacherListPrintable {...printableProps} preview />
        </PrintPreview>
      )}

      {portalEl && canPrint &&
        createPortal(<ClassTeacherListPrintable {...printableProps} />, portalEl)}
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
