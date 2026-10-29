"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { getSavedClassPresets } from "@/lib/utils/marks-config";
import { Button, buttonVariants } from "@/components/ui/button";
import { usePrintPortal } from "@/lib/hooks/use-print-portal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AttendanceRegisterPrintable,
  ACTIVE_STATUSES,
} from "@/components/students/attendance-register-printable";
import type { Student } from "@/lib/types";
import { Printer, ChevronDown, Users, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ZoomPanViewport } from "@/components/generate/zoom-pan-viewport";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";

type PaperSize = "A5" | "A4" | "A3";
type PaperOrientation = "portrait" | "landscape";
interface PrintMargins { top: number; right: number; bottom: number; left: number; }
const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  A5: { w: 148, h: 210 }, A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 },
};

function AttendanceRegisterContent() {
  const searchParams = useSearchParams();
  const classPresets = useMemo(() => getSavedClassPresets(), []);

  const [selectedClass, setSelectedClass] = useState(
    searchParams.get("class") || classPresets[0]?.code || "V"
  );
  const [selectedSection, setSelectedSection] = useState(
    searchParams.get("section") || "A"
  );
  const [paper, setPaper] = useState<PaperSize>("A4");
  const [orientation, setOrientation] = useState<PaperOrientation>("landscape");
  const [margins, setMargins] = useState<PrintMargins>({ top: 5, right: 5, bottom: 5, left: 5 });
  const [paperOpen, setPaperOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("attendance-paper-settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.paper) setPaper(s.paper as PaperSize);
        if (s.orientation) setOrientation(s.orientation as PaperOrientation);
        if (s.margins) setMargins(s.margins);
      }
    } catch {}
  }, []);
  const savePaperSettings = () => {
    try {
      localStorage.setItem("attendance-paper-settings", JSON.stringify({ paper, orientation, margins }));
    } catch {}
  };
  const updateMargin = (side: keyof PrintMargins, raw: string) => {
    const value = Math.max(0, Number(raw) || 0);
    setMargins((prev) => ({ ...prev, [side]: value }));
  };
  const pageW = orientation === "landscape" ? PAPER_MM[paper].h : PAPER_MM[paper].w;
  const pageH = orientation === "landscape" ? PAPER_MM[paper].w : PAPER_MM[paper].h;

  const { profile: schoolProfile } = useSchoolProfile();

  const sectionsForClass = useMemo(() => {
    const preset = classPresets.find((p) => p.code === selectedClass);
    return preset?.sections || ["A", "B"];
  }, [classPresets, selectedClass]);

  const {
    data: rawStudents = [],
    isLoading,
    isError,
  } = useQuery<Student[]>({
    queryKey: ["attendance-register-students", selectedClass, selectedSection],
    queryFn: async () => {
      const res = await fetch(
        `/api/students?paginated=false&projection=full&class=${encodeURIComponent(selectedClass)}&section=${encodeURIComponent(selectedSection)}`
      );
      if (!res.ok) throw new Error("Failed to fetch students");
      const json = await res.json();
      return json.data || [];
    },
  });

  const students = useMemo(() => {
    return rawStudents
      .filter((s) => ACTIVE_STATUSES.includes(s.currentStatus))
      .sort((a, b) => (a.presentRoll || 0) - (b.presentRoll || 0));
  }, [rawStudents]);

  const isEmpty = !isLoading && students.length === 0;

  const portalEl = usePrintPortal("attendance-register-print-portal");

  return (
    <div className="p-3 sm:p-5 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-4 items-start print:block print:p-0 print:m-0 print:max-w-none">
      {/* Sidebar */}
      <aside className="order-2 lg:order-1 print:hidden lg:sticky lg:top-4 space-y-3 bg-card border rounded-2xl p-3 shadow-2xs">
        <PageHeader back="/generate" title="Attendance Register" />

        <div className="space-y-2 border-t pt-3">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Class
          </p>
          <Select
            value={selectedClass}
            onValueChange={(val) => {
              if (!val) return;
              setSelectedClass(val);
              const preset = classPresets.find((p) => p.code === val);
              const secs = preset?.sections || ["A", "B"];
              if (!secs.includes(selectedSection)) {
                setSelectedSection(secs[0] || "A");
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classPresets.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  Class {p.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Section
          </p>
          <Select value={selectedSection} onValueChange={(val) => val && setSelectedSection(val)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sectionsForClass.map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Student count */}
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {isLoading ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <span className="font-semibold">
              {students.length} active student{students.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Paper & Margin + Print */}
        <div className="border-t pt-2 space-y-2">
          <button
            type="button"
            onClick={() => setPaperOpen((v) => !v)}
            className="w-full flex items-center justify-between px-1 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Paper &amp; Margin</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", paperOpen && "rotate-180")} />
          </button>
          {paperOpen && (
            <div className="space-y-2 pt-1">
              <Select value={paper} onValueChange={(v) => v && setPaper(v as PaperSize)}>
                <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A5">A5</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A3">A3</SelectItem>
                </SelectContent>
              </Select>
              <Select value={orientation} onValueChange={(v) => v && setOrientation(v as PaperOrientation)}>
                <SelectTrigger className="w-full h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
              <p className="px-1 text-[10px] font-semibold text-muted-foreground">Margin (mm)</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <label key={side} className="space-y-0.5">
                    <span className="px-1 text-[10px] capitalize text-muted-foreground">{side}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={margins[side]}
                      onChange={(e) => updateMargin(side, e.target.value)}
                      className="h-8 text-xs"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={savePaperSettings}
                className="w-full mt-1 h-8 flex items-center justify-center gap-1.5 text-xs font-semibold border rounded-lg hover:bg-accent transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Save Settings
              </button>
            </div>
          )}
          <Button
            onClick={() => window.print()}
            disabled={isEmpty || isLoading}
            className="h-9 w-full gap-1.5 font-bold rounded-xl shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </aside>

      {isLoading ? (
        <div className="min-w-0 w-full flex justify-center items-center h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 bg-muted/15 border rounded-2xl print:hidden">
          <div className="text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Spinner className="h-5 w-5" />
            Loading students...
          </div>
        </div>
      ) : isError ? (
        <div className="min-w-0 w-full flex justify-center items-center h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 text-sm text-destructive border rounded-2xl print:hidden">
          Failed to load students.
        </div>
      ) : isEmpty ? (
        <div className="min-w-0 w-full flex justify-center items-center h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 text-sm text-muted-foreground border rounded-2xl print:hidden">
          No active students in Class {selectedClass}-{selectedSection}.
        </div>
      ) : (
        <ZoomPanViewport
          fitMode="width"
          resetKey={`${selectedClass}-${selectedSection}-${paper}-${orientation}`}
          className="min-w-0 w-full h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 print:hidden"
        >
          <AttendanceRegisterPrintable
            students={students}
            className={selectedClass}
            section={selectedSection}
            schoolLogoUrl={schoolProfile?.schoolLogoUrl || "/school-logo.png"}
          />
        </ZoomPanViewport>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: ${pageW}mm ${pageH}mm; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; } }` }} />

      {/* Print portal: rendered at body level so print CSS can isolate it */}
      {portalEl && !isEmpty && !isLoading && createPortal(
        <AttendanceRegisterPrintable
          students={students}
          className={selectedClass}
          section={selectedSection}
          schoolLogoUrl={schoolProfile?.schoolLogoUrl || "/school-logo.png"}
        />,
        portalEl
      )}
    </div>
  );
}

export default function AttendanceRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      }
    >
      <AttendanceRegisterContent />
    </Suspense>
  );
}
